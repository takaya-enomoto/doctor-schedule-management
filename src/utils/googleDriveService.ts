import { GOOGLE_DRIVE_CONFIG, type GoogleAPIState } from './googleDriveConfig'

export type { GoogleAPIState }
import type { BackupData } from './backup'

declare global {
  interface Window {
    gapi: any
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any
          revoke: (token: string) => void
        }
      }
    }
  }
}

class GoogleDriveService {
  private isInitialized = false
  private authInstance: any = null
  private driveAPI: any = null
  private tokenClient: any = null
  private initializationPromise: Promise<void> | null = null

  // Google API の初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    if (this.initializationPromise) return this.initializationPromise

    this.initializationPromise = this.doInitialize()
    return this.initializationPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      // Google API スクリプトが読み込まれていない場合は読み込む
      if (!window.gapi) {
        await this.loadGoogleAPI()
      }

      // Google Identity Services (GIS) スクリプトの読み込み
      if (!window.google) {
        await this.loadGoogleIdentityServices()
      }

      // clientの初期化を待つ（auth2は使用しない）
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('client', async () => {
          try {
            // auth2を使わずにclientのみ初期化
            await window.gapi.client.init({
              apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
              discoveryDocs: GOOGLE_DRIVE_CONFIG.DISCOVERY_DOCS,
            })
            this.driveAPI = window.gapi.client.drive
            
            // トークンクライアントを事前に作成
            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
              scope: GOOGLE_DRIVE_CONFIG.SCOPES.join(' '),
              callback: () => {} // 実際のコールバックはsignInで設定
            })
            
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })

      this.isInitialized = true
      this.initializationPromise = null
    } catch (error) {
      this.initializationPromise = null
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
      script.onload = () => {
        // auth2の自動初期化を防ぐ
        if (window.gapi && window.gapi.auth2) {
          // 既存のauth2インスタンスをクリア
          delete window.gapi.auth2
        }
        resolve()
      }
      script.onerror = () => reject(new Error('Google API スクリプトの読み込みに失敗しました'))
      document.head.appendChild(script)
    })
  }

  // Google Identity Services スクリプトの動的読み込み
  private loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Google Identity Services スクリプトの読み込みに失敗しました'))
      document.head.appendChild(script)
    })
  }

  // サインイン
  async signIn(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.tokenClient) {
          reject(new Error('Token client が初期化されていません'))
          return
        }

        // コールバックを設定
        this.tokenClient.callback = (response: any) => {
          if (response.error) {
            console.error('認証エラー:', response.error)
            reject(new Error('Google Driveへの認証に失敗しました'))
            return
          }
          
          // アクセストークンを設定
          window.gapi.client.setToken({
            access_token: response.access_token
          })
          
          console.log('Google Drive にサインインしました')
          this.authInstance = { isSignedIn: true, accessToken: response.access_token }
          resolve()
        }

        // 認証を開始
        this.tokenClient.requestAccessToken()
      } catch (error) {
        console.error('サインインエラー:', error)
        reject(new Error('Google Driveへのサインインに失敗しました'))
      }
    })
  }

  // サインアウト
  async signOut(): Promise<void> {
    if (this.authInstance) {
      // トークンを取り消し
      if (this.authInstance.accessToken) {
        window.google.accounts.oauth2.revoke(this.authInstance.accessToken)
      }
      
      // gapi トークンをクリア
      window.gapi.client.setToken(null)
      
      this.authInstance = null
      console.log('Google Drive からサインアウトしました')
    }
  }

  // サインイン状態の取得
  isSignedIn(): boolean {
    return this.authInstance && 
           this.authInstance.isSignedIn === true && 
           this.authInstance.accessToken &&
           window.gapi?.client?.getToken()?.access_token
  }

  // ユーザー情報の取得
  getCurrentUser(): GoogleAPIState['user'] | null {
    if (!this.isSignedIn()) return null

    // Google Identity Services では詳細なユーザー情報は別途取得が必要
    // 現在は基本情報のみ返す
    return {
      name: 'ユーザー',
      email: '',
      imageUrl: ''
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
          'Authorization': `Bearer ${this.authInstance.accessToken}`
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