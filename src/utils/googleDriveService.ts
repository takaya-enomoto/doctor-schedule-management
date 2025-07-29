import { GOOGLE_DRIVE_CONFIG, type GoogleAPIState } from './googleDriveConfig'

export type { GoogleAPIState }
import type { BackupData } from './backup'

declare global {
  interface Window {
    gapi: any
    google: any
  }
}

class GoogleDriveService {
  private isInitialized = false
  private authInstance: any = null
  private driveAPI: any = null

  // Google API の初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Google API スクリプトが読み込まれていない場合は読み込む
      if (!window.gapi) {
        await this.loadGoogleAPI()
      }

      // auth2の初期化を待つ
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('auth2', async () => {
          try {
            await window.gapi.auth2.init({
              client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
            })
            this.authInstance = window.gapi.auth2.getAuthInstance()
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })

      // clientの初期化を待つ
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
              clientId: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
              discoveryDocs: GOOGLE_DRIVE_CONFIG.DISCOVERY_DOCS,
              scope: GOOGLE_DRIVE_CONFIG.SCOPES.join(' ')
            })
            this.driveAPI = window.gapi.client.drive
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })

      this.isInitialized = true
    } catch (error) {
      console.error('Google API 初期化エラー:', error)
      throw new Error('Google Drive APIの初期化に失敗しました')
    }
  }

  // Google API スクリプトの動的読み込み
  private loadGoogleAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.gapi) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Google API スクリプトの読み込みに失敗しました'))
      document.head.appendChild(script)
    })
  }

  // サインイン
  async signIn(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // authInstanceが正しく初期化されているか確認
    if (!this.authInstance) {
      throw new Error('Google認証の初期化が完了していません。再度初期化してください。')
    }

    try {
      const user = await this.authInstance.signIn()
      console.log('Google Drive にサインインしました:', user.getBasicProfile().getName())
    } catch (error) {
      console.error('サインインエラー:', error)
      throw new Error('Google Driveへのサインインに失敗しました')
    }
  }

  // サインアウト
  async signOut(): Promise<void> {
    if (this.authInstance) {
      await this.authInstance.signOut()
      console.log('Google Drive からサインアウトしました')
    }
  }

  // サインイン状態の取得
  isSignedIn(): boolean {
    return this.authInstance && this.authInstance.isSignedIn.get()
  }

  // ユーザー情報の取得
  getCurrentUser(): GoogleAPIState['user'] | null {
    if (!this.isSignedIn()) return null

    const user = this.authInstance.currentUser.get()
    const profile = user.getBasicProfile()
    
    return {
      name: profile.getName(),
      email: profile.getEmail(),
      imageUrl: profile.getImageUrl()
    }
  }

  // アプリケーション専用フォルダの作成または取得
  async getOrCreateAppFolder(): Promise<string> {
    if (!this.isSignedIn()) {
      throw new Error('Google Driveにサインインしてください')
    }

    try {
      // 既存フォルダを検索
      const response = await this.driveAPI.files.list({
        q: `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        spaces: 'drive'
      })

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id
      }

      // フォルダが存在しない場合は作成
      const createResponse = await this.driveAPI.files.create({
        resource: {
          name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        }
      })

      return createResponse.result.id
    } catch (error) {
      console.error('フォルダ作成エラー:', error)
      throw new Error('Google Drive フォルダの作成に失敗しました')
    }
  }

  // バックアップファイルの保存
  async saveBackup(backupData: BackupData): Promise<string> {
    if (!this.isSignedIn()) {
      throw new Error('Google Driveにサインインしてください')
    }

    try {
      const folderId = await this.getOrCreateAppFolder()
      const fileName = `${GOOGLE_DRIVE_CONFIG.BACKUP_FILE_PREFIX}${new Date().toISOString().split('T')[0]}_${Date.now()}.json`
      
      const fileMetadata = {
        name: fileName,
        parents: [folderId]
      }

      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }))
      form.append('file', new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' }))

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authInstance.currentUser.get().getAuthResponse().access_token}`
        },
        body: form
      })

      if (!response.ok) {
        throw new Error('ファイルアップロードに失敗しました')
      }

      const result = await response.json()
      console.log('バックアップファイルを保存しました:', fileName)
      return result.id
    } catch (error) {
      console.error('バックアップ保存エラー:', error)
      throw new Error('Google Drive へのバックアップ保存に失敗しました')
    }
  }

  // バックアップファイル一覧の取得
  async listBackupFiles(): Promise<Array<{ id: string, name: string, modifiedTime: string, size: string }>> {
    if (!this.isSignedIn()) {
      throw new Error('Google Driveにサインインしてください')
    }

    try {
      const folderId = await this.getOrCreateAppFolder()
      
      const response = await this.driveAPI.files.list({
        q: `'${folderId}' in parents and name contains '${GOOGLE_DRIVE_CONFIG.BACKUP_FILE_PREFIX}' and trashed=false`,
        fields: 'files(id,name,modifiedTime,size)',
        orderBy: 'modifiedTime desc'
      })

      return response.result.files || []
    } catch (error) {
      console.error('ファイル一覧取得エラー:', error)
      throw new Error('バックアップファイル一覧の取得に失敗しました')
    }
  }

  // バックアップファイルの読み込み
  async loadBackup(fileId: string): Promise<BackupData> {
    if (!this.isSignedIn()) {
      throw new Error('Google Driveにサインインしてください')
    }

    try {
      const response = await this.driveAPI.files.get({
        fileId: fileId,
        alt: 'media'
      })

      const backupData = JSON.parse(response.body)
      
      // 日付文字列をDateオブジェクトに変換
      if (backupData.data) {
        ['schedules', 'leaveRequests', 'oneTimeWork', 'onCalls', 'nurseOnCalls'].forEach(key => {
          if (backupData.data[key]) {
            backupData.data[key] = backupData.data[key].map((item: any) => {
              if (item.date) item.date = new Date(item.date)
              if (item.startDate) item.startDate = new Date(item.startDate)
              if (item.endDate) item.endDate = new Date(item.endDate)
              return item
            })
          }
        })
      }

      return backupData
    } catch (error) {
      console.error('バックアップ読み込みエラー:', error)
      throw new Error('Google Drive からのバックアップ読み込みに失敗しました')
    }
  }

  // バックアップファイルの削除
  async deleteBackup(fileId: string): Promise<void> {
    if (!this.isSignedIn()) {
      throw new Error('Google Driveにサインインしてください')
    }

    try {
      await this.driveAPI.files.delete({
        fileId: fileId
      })
      console.log('バックアップファイルを削除しました')
    } catch (error) {
      console.error('ファイル削除エラー:', error)
      throw new Error('バックアップファイルの削除に失敗しました')
    }
  }

  // 状態の取得
  getState(): GoogleAPIState {
    return {
      isLoaded: !!window.gapi,
      isSignedIn: this.isSignedIn(),
      isInitialized: this.isInitialized,
      user: this.getCurrentUser() || undefined
    }
  }
}

// シングルトンインスタンス
export const googleDriveService = new GoogleDriveService()
export default googleDriveService