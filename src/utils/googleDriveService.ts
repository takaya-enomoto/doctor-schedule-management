import { GOOGLE_DRIVE_CONFIG, type GoogleAPIState } from './googleDriveConfig'
import type { BackupData } from './backup'

declare global {
  interface Window {
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
  private accessToken: string | null = null
  private tokenClient: any = null
  private initializationPromise: Promise<void> | null = null

  // Google Identity Services の初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    if (this.initializationPromise) return this.initializationPromise

    this.initializationPromise = this.doInitialize()
    return this.initializationPromise
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('Google Drive service initialization started')
      
      // Google Identity Services スクリプトの読み込み
      if (!window.google) {
        console.log('Loading Google Identity Services script')
        await this.loadGoogleIdentityServices()
      }

      // Google Identity Services が利用可能かチェック
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services が正しく読み込まれていません')
      }

      console.log('Creating token client with client ID:', GOOGLE_DRIVE_CONFIG.CLIENT_ID)

      // トークンクライアントを作成
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
        scope: GOOGLE_DRIVE_CONFIG.SCOPES.join(' '),
        callback: () => {} // コールバックはsignInで設定
      })

      if (!this.tokenClient) {
        throw new Error('Token client の作成に失敗しました')
      }

      console.log('Google Drive service initialization completed')
      this.isInitialized = true
      this.initializationPromise = null
    } catch (error) {
      this.initializationPromise = null
      console.error('Google Identity Services 初期化エラー:', error)
      throw new Error(`Google Drive APIの初期化に失敗しました: ${error}`)
    }
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
    console.log('Google Drive sign-in started')
    
    if (!this.isInitialized) {
      console.log('Initializing service before sign-in')
      await this.initialize()
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.tokenClient) {
          console.error('Token client is null')
          reject(new Error('Token client が初期化されていません'))
          return
        }

        console.log('Setting up token client callback')
        
        // コールバックを設定
        this.tokenClient.callback = (response: any) => {
          console.log('Token client callback received:', response)
          
          if (response.error) {
            console.error('認証エラー:', response.error)
            reject(new Error(`Google Driveへの認証に失敗しました: ${response.error}`))
            return
          }
          
          if (!response.access_token) {
            console.error('Access token not received')
            reject(new Error('アクセストークンが取得できませんでした'))
            return
          }
          
          this.accessToken = response.access_token
          console.log('Google Drive にサインインしました. Token:', this.accessToken?.substring(0, 20) + '...')
          resolve()
        }

        console.log('Requesting access token')
        // 認証を開始
        this.tokenClient.requestAccessToken()
      } catch (error) {
        console.error('サインインエラー:', error)
        reject(new Error(`Google Driveへのサインインに失敗しました: ${error}`))
      }
    })
  }

  // サインアウト
  async signOut(): Promise<void> {
    if (this.accessToken) {
      // トークンを取り消し
      window.google.accounts.oauth2.revoke(this.accessToken)
      this.accessToken = null
      console.log('Google Drive からサインアウトしました')
    }
  }

  // サインイン状態の取得
  isSignedIn(): boolean {
    return this.accessToken !== null
  }

  // ユーザー情報の取得
  getCurrentUser(): GoogleAPIState['user'] | null {
    if (!this.isSignedIn()) return null

    return {
      name: 'ユーザー',
      email: '',
      imageUrl: ''
    }
  }

  // REST APIを使った直接のHTTPリクエスト
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Google Driveにサインインしてください')
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API request failed: ${response.status} ${error}`)
    }

    return response.json()
  }

  // アプリケーション専用フォルダの作成または取得
  async getOrCreateAppFolder(): Promise<string> {
    if (!this.isSignedIn()) {
      throw new Error('Google Driveにサインインしてください')
    }

    try {
      // 既存フォルダを検索
      const searchQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const response = await this.apiRequest(`files?q=${encodeURIComponent(searchQuery)}&spaces=drive`)

      if (response.files && response.files.length > 0) {
        return response.files[0].id
      }

      // フォルダが存在しない場合は作成
      const createResponse = await this.apiRequest('files', {
        method: 'POST',
        body: JSON.stringify({
          name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      })

      return createResponse.id
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
          'Authorization': `Bearer ${this.accessToken}`
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
      
      const searchQuery = `'${folderId}' in parents and name contains '${GOOGLE_DRIVE_CONFIG.BACKUP_FILE_PREFIX}' and trashed=false`
      const response = await this.apiRequest(
        `files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`
      )

      return response.files || []
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
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('ファイル読み込みに失敗しました')
      }

      const backupData = await response.json()
      
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
      await this.apiRequest(`files/${fileId}`, {
        method: 'DELETE'
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
      isLoaded: !!window.google,
      isSignedIn: this.isSignedIn(),
      isInitialized: this.isInitialized,
      user: this.getCurrentUser() || undefined
    }
  }
}

// シングルトンインスタンス
export const googleDriveService = new GoogleDriveService()
export default googleDriveService