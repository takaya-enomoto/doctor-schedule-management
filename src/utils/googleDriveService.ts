// Google Drive API - 完全に新しい実装
// gapi.auth2との競合を完全に回避

import { GOOGLE_DRIVE_CONFIG, type GoogleAPIState } from './googleDriveConfig'
import type { BackupData } from './backup'

// Google Identity Services の型定義
declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: TokenClientConfig) => TokenClient
          revoke: (accessToken: string, done?: () => void) => void
        }
      }
    }
  }
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (response: TokenResponse) => void
  error_callback?: (error: any) => void
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
  callback: (response: TokenResponse) => void
}

interface TokenResponse {
  access_token: string
  error?: string
  error_description?: string
}

class GoogleDriveService {
  private accessToken: string | null = null
  private tokenClient: TokenClient | null = null
  private isInitialized = false

  // 初期化
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      console.log('🔧 Google Drive service initialization started')
      
      // Google Identity Services のスクリプトを読み込み
      await this.loadGoogleIdentityScript()
      
      // TokenClient の作成
      await this.createTokenClient()
      
      this.isInitialized = true
      console.log('✅ Google Drive service initialized successfully')
    } catch (error) {
      console.error('❌ Google Drive service initialization failed:', error)
      throw error
    }
  }

  // Google Identity Services スクリプトの読み込み
  private loadGoogleIdentityScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 既に読み込まれている場合
      if (window.google?.accounts?.oauth2) {
        console.log('📦 Google Identity Services already loaded')
        resolve()
        return
      }

      console.log('📦 Loading Google Identity Services script')
      
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      
      script.onload = () => {
        console.log('📦 Google Identity Services script loaded')
        // スクリプト読み込み後、APIが利用可能になるまで少し待つ
        setTimeout(() => {
          if (window.google?.accounts?.oauth2) {
            console.log('✅ Google Identity Services API available')
            resolve()
          } else {
            reject(new Error('Google Identity Services API not available after script load'))
          }
        }, 100)
      }
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services script'))
      }
      
      document.head.appendChild(script)
    })
  }

  // TokenClient の作成
  private createTokenClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!window.google?.accounts?.oauth2) {
          reject(new Error('Google Identity Services not available'))
          return
        }

        console.log('🔑 Creating token client with client ID:', GOOGLE_DRIVE_CONFIG.CLIENT_ID)

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
          scope: GOOGLE_DRIVE_CONFIG.SCOPES.join(' '),
          callback: (_response: TokenResponse) => {
            // この callback は requestAccessToken 時に使用される
            console.log('🔑 Token response received in default callback')
          },
          error_callback: (error: any) => {
            console.error('❌ Token client error:', error)
          }
        })

        if (this.tokenClient) {
          console.log('✅ Token client created successfully')
          resolve()
        } else {
          reject(new Error('Failed to create token client'))
        }
      } catch (error) {
        console.error('❌ Error creating token client:', error)
        reject(error)
      }
    })
  }

  // サインイン
  async signIn(): Promise<void> {
    console.log('🚀 Starting Google Drive sign-in')
    
    if (!this.isInitialized) {
      await this.initialize()
    }

    if (!this.tokenClient) {
      throw new Error('Token client not initialized')
    }

    return new Promise((resolve, reject) => {
      try {
        // 動的にコールバックを設定
        const originalCallback = this.tokenClient!.callback
        
        this.tokenClient!.callback = (response: TokenResponse) => {
          console.log('🔑 Sign-in token response:', { 
            has_token: !!response.access_token,
            error: response.error 
          })
          
          if (response.error) {
            console.error('❌ Sign-in error:', response.error, response.error_description)
            reject(new Error(`認証エラー: ${response.error_description || response.error}`))
            return
          }

          if (!response.access_token) {
            console.error('❌ No access token received')
            reject(new Error('アクセストークンが取得できませんでした'))
            return
          }

          this.accessToken = response.access_token
          console.log('✅ Successfully signed in to Google Drive')
          resolve()
          
          // 元のコールバックに戻す
          this.tokenClient!.callback = originalCallback
        }

        console.log('🔑 Requesting access token')
        this.tokenClient!.requestAccessToken({ prompt: 'consent' })
        
      } catch (error) {
        console.error('❌ Sign-in error:', error)
        reject(new Error(`サインインに失敗しました: ${error}`))
      }
    })
  }

  // サインアウト
  signOut(): void {
    if (this.accessToken && window.google?.accounts?.oauth2) {
      console.log('🚪 Signing out from Google Drive')
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('✅ Access token revoked')
      })
    }
    this.accessToken = null
  }

  // サインイン状態の確認
  isSignedIn(): boolean {
    const signedIn = this.accessToken !== null
    console.log('🔍 Sign-in status:', signedIn)
    return signedIn
  }

  // Google Drive API 呼び出し
  private async apiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Google Driveにサインインしてください')
    }

    const url = `https://www.googleapis.com/drive/v3/${endpoint}`
    console.log('📡 API call:', endpoint)

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API call failed:', response.status, errorText)
      throw new Error(`API呼び出しに失敗しました: ${response.status} ${errorText}`)
    }

    return response.json()
  }

  // 共有フォルダを自動検出・優先使用
  async getOrCreateAppFolder(): Promise<string> {
    console.log('📁 Getting or creating app folder (auto-detect shared folder)')
    console.log('🔍 Searching for folder name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
    
    // 1. 共有されたフォルダを優先検索
    console.log('🔍 Step 1: Searching for shared folders...')
    const sharedFolderId = await this.findSharedAppFolder()
    if (sharedFolderId) {
      console.log('✅ Using shared app folder:', sharedFolderId)
      return sharedFolderId
    }
    console.log('❌ No shared folders found')

    // 2. 自分が所有するフォルダを検索
    console.log('🔍 Step 2: Searching for owned non-shared folders...')
    const ownedFolderId = await this.findOwnedAppFolder()
    if (ownedFolderId) {
      console.log('⚠️ Using owned non-shared app folder:', ownedFolderId)
      return ownedFolderId
    }
    console.log('❌ No owned non-shared folders found')

    // 3. フォルダが存在しない場合は作成
    console.log('🔍 Step 3: Creating new app folder...')
    const createResult = await this.apiCall('files', {
      method: 'POST',
      body: JSON.stringify({
        name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    })

    console.log('✅ New app folder created:', createResult.id)
    return createResult.id
  }

  // 共有されたアプリフォルダを検索
  private async findSharedAppFolder(): Promise<string | null> {
    try {
      // まず他のユーザーから共有されたフォルダを検索
      const sharedWithMeQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and sharedWithMe=true`
      const sharedResult = await this.apiCall(`files?q=${encodeURIComponent(sharedWithMeQuery)}`)

      if (sharedResult.files && sharedResult.files.length > 0) {
        const sortedFiles = sharedResult.files.sort((a: any, b: any) => 
          new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
        )
        console.log('📁 Shared app folder found (sharedWithMe):', sortedFiles[0].id)
        return sortedFiles[0].id
      }

      // 次に自分が所有しているが他のユーザーと共有しているフォルダを検索
      const ownedButSharedQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'me' in owners`
      const ownedResult = await this.apiCall(`files?q=${encodeURIComponent(ownedButSharedQuery)}&fields=files(id,name,shared,permissions,modifiedTime)`)

      if (ownedResult.files && ownedResult.files.length > 0) {
        // 共有されているフォルダを優先
        const sharedFolders = ownedResult.files.filter((file: any) => 
          file.shared === true || (file.permissions && file.permissions.length > 1)
        )
        
        if (sharedFolders.length > 0) {
          const sortedSharedFolders = sharedFolders.sort((a: any, b: any) => 
            new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
          )
          console.log('📁 Shared app folder found (owned but shared):', sortedSharedFolders[0].id)
          return sortedSharedFolders[0].id
        }
      }
    } catch (error) {
      console.warn('📁 Error searching for shared folders:', error)
    }
    
    return null
  }

  // 自分が所有するアプリフォルダを検索（共有されていない個人用フォルダ）
  private async findOwnedAppFolder(): Promise<string | null> {
    try {
      // 自分が所有する非共有フォルダを検索
      const searchQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'me' in owners`
      const searchResult = await this.apiCall(`files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name,shared,permissions,modifiedTime)`)

      if (searchResult.files && searchResult.files.length > 0) {
        // 共有されていないフォルダのみを対象
        const nonSharedFolders = searchResult.files.filter((file: any) => 
          file.shared !== true && (!file.permissions || file.permissions.length <= 1)
        )
        
        if (nonSharedFolders.length > 0) {
          console.log('📁 Owned non-shared app folder found:', nonSharedFolders[0].id)
          return nonSharedFolders[0].id
        }
      }
    } catch (error) {
      console.warn('📁 Error searching for owned folders:', error)
    }
    
    return null
  }

  // バックアップファイルの保存（常に共同編集モード）
  async saveBackup(backupData: BackupData): Promise<string> {
    console.log('💾 Saving backup to Google Drive (collaborative mode)')
    
    const folderId = await this.getOrCreateAppFolder()
    
    // 常に共同編集用の固定ファイル名を使用
    const fileName = 'shared_schedule_data.json'

    // 既存の共有ファイルを検索
    const searchQuery = `name='${fileName}' and '${folderId}' in parents and trashed=false`
    const existingFiles = await this.apiCall(`files?q=${encodeURIComponent(searchQuery)}`)
    
    if (existingFiles.files && existingFiles.files.length > 0) {
      // 既存ファイルを更新
      const fileId = existingFiles.files[0].id
      console.log('📝 Updating existing shared file:', fileId)
      
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(backupData, null, 2)
      })

      if (!response.ok) {
        throw new Error('共有ファイルの更新に失敗しました')
      }

      const result = await response.json()
      console.log('✅ Shared backup updated:', fileName)
      return result.id
    }

    // 新規ファイル作成
    const metadata = {
      name: fileName,
      parents: [folderId]
    }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' }))

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: form
    })

    if (!response.ok) {
      throw new Error('バックアップの保存に失敗しました')
    }

    const result = await response.json()
    console.log('✅ Backup saved:', fileName)
    return result.id
  }

  // バックアップファイル一覧の取得
  async listBackupFiles(): Promise<Array<{ id: string, name: string, modifiedTime: string, size: string }>> {
    console.log('📋 Listing backup files')
    
    const folderId = await this.getOrCreateAppFolder()
    const query = `'${folderId}' in parents and name contains '${GOOGLE_DRIVE_CONFIG.BACKUP_FILE_PREFIX}' and trashed=false`
    
    const result = await this.apiCall(
      `files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`
    )

    console.log('📋 Found backup files:', result.files?.length || 0)
    return result.files || []
  }

  // バックアップファイルの読み込み
  async loadBackup(fileId: string): Promise<BackupData> {
    console.log('📂 Loading backup from Google Drive:', fileId)
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('バックアップの読み込みに失敗しました')
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

    console.log('✅ Backup loaded successfully')
    return backupData
  }

  // バックアップファイルの削除
  async deleteBackup(fileId: string): Promise<void> {
    console.log('🗑️ Deleting backup file:', fileId)
    
    await this.apiCall(`files/${fileId}`, {
      method: 'DELETE'
    })
    
    console.log('✅ Backup file deleted')
  }

  // フォルダ検出状況の取得
  async getFolderStatus(): Promise<{
    hasSharedFolder: boolean
    hasOwnedFolder: boolean
    folderType: 'shared' | 'owned' | 'none'
  }> {
    if (!this.isSignedIn()) {
      return { hasSharedFolder: false, hasOwnedFolder: false, folderType: 'none' }
    }

    try {
      const sharedFolderId = await this.findSharedAppFolder()
      const ownedFolderId = await this.findOwnedAppFolder()
      
      return {
        hasSharedFolder: !!sharedFolderId,
        hasOwnedFolder: !!ownedFolderId,
        folderType: sharedFolderId ? 'shared' : (ownedFolderId ? 'owned' : 'none')
      }
    } catch (error) {
      console.error('Error getting folder status:', error)
      return { hasSharedFolder: false, hasOwnedFolder: false, folderType: 'none' }
    }
  }

  // 状態の取得
  getState(): GoogleAPIState {
    return {
      isLoaded: !!window.google?.accounts?.oauth2,
      isSignedIn: this.isSignedIn(),
      isInitialized: this.isInitialized,
      user: this.isSignedIn() ? {
        name: 'ユーザー',
        email: '',
        imageUrl: ''
      } : undefined
    }
  }
}

// シングルトンインスタンス
export const googleDriveService = new GoogleDriveService()
export default googleDriveService