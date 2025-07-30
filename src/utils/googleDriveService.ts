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
    // ログの頻度を制限（本番環境では出力しない）
    if (import.meta.env.DEV) {
      console.log('🔍 Sign-in status:', signedIn)
    }
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

  // フォルダ名による確実な検索（同じフォルダを常に選択）
  async getOrCreateAppFolder(): Promise<string> {
    console.log('📁 Getting or creating app folder by name search')
    console.log('🔍 Searching for folder name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
    
    // 1. フォルダ名で全てのフォルダを検索（共有・個人問わず）
    console.log('🔍 Step 1: Searching all folders by name...')
    const allFolders = await this.findAllAppFolders()
    
    if (allFolders.length > 0) {
      // 2. 共有ドライブ内のフォルダを最優先
      const sharedDriveFolders = allFolders.filter(folder => folder.driveId)
      if (sharedDriveFolders.length > 0) {
        const latestSharedDrive = sharedDriveFolders.sort((a, b) => 
          new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
        )[0]
        console.log('✅ Using shared drive folder:', latestSharedDrive.id, latestSharedDrive.name, `(DriveId: ${latestSharedDrive.driveId})`)
        return latestSharedDrive.id
      }

      // 3. 共有フォルダを次に優先
      const sharedFolders = allFolders.filter(folder => {
        const isSharedByFlag = folder.shared === true
        const hasMultiplePermissions = folder.permissions && folder.permissions.length > 1
        const isNotOnlyOwned = folder.ownedByMe !== true
        
        console.log(`🔍 Checking folder ${folder.id}:`)
        console.log(`  - shared flag: ${isSharedByFlag}`)
        console.log(`  - multiple permissions: ${hasMultiplePermissions}`)
        console.log(`  - not only owned: ${isNotOnlyOwned}`)
        
        return isSharedByFlag || hasMultiplePermissions || isNotOnlyOwned
      })
      
      if (sharedFolders.length > 0) {
        // 最新の共有フォルダを使用
        const latestShared = sharedFolders.sort((a, b) => 
          new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
        )[0]
        console.log('✅ Using shared app folder:', latestShared.id, latestShared.name)
        return latestShared.id
      }
      
      // 4. 共有フォルダがない場合は最新のフォルダを使用
      const latestFolder = allFolders.sort((a, b) => 
        new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
      )[0]
      console.log('⚠️ Using latest app folder (not shared):', latestFolder.id, latestFolder.name)
      return latestFolder.id
    }

    // 4. フォルダが存在しない場合は共有ドライブ内に作成
    console.log('🔍 Step 2: No folders found, creating new app folder in shared drive...')
    
    // 「みそらグループ業務用」共有ドライブを検索
    const sharedDriveId = await this.findTargetSharedDrive()
    
    if (sharedDriveId) {
      console.log('📁 Creating folder in shared drive:', sharedDriveId)
      const createResult = await this.apiCall('files?supportsAllDrives=true', {
        method: 'POST',
        body: JSON.stringify({
          name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [sharedDriveId]
        })
      })
      console.log('✅ New app folder created in shared drive:', createResult.id)
      return createResult.id
    } else {
      // 共有ドライブが見つからない場合はマイドライブに作成
      console.log('⚠️ Shared drive not found, creating in personal drive')
      const createResult = await this.apiCall('files', {
        method: 'POST',
        body: JSON.stringify({
          name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        })
      })
      console.log('✅ New app folder created in personal drive:', createResult.id)
      return createResult.id
    }
  }

  // 「みそらグループ業務用」共有ドライブのIDを取得
  private async findTargetSharedDrive(): Promise<string | null> {
    try {
      console.log('🔍 Searching for target shared drive: みそらグループ業務用')
      
      const result = await this.apiCall('drives?fields=drives(id,name)')
      
      if (result.drives && result.drives.length > 0) {
        console.log('📁 Available shared drives:')
        result.drives.forEach((drive: any, index: number) => {
          console.log(`  ${index + 1}. ${drive.name} (ID: ${drive.id})`)
        })
        
        const targetDrive = result.drives.find((drive: any) => 
          drive.name === 'みそらグループ業務用'
        )
        
        if (targetDrive) {
          console.log('✅ Found target shared drive:', targetDrive.id)
          return targetDrive.id
        } else {
          console.log('❌ Target shared drive "みそらグループ業務用" not found')
          return null
        }
      } else {
        console.log('❌ No shared drives found')
        return null
      }
    } catch (error) {
      console.warn('📁 Error searching for shared drives:', error)
      return null
    }
  }

  // フォルダ名で全てのアプリフォルダを検索（マイドライブ + 共有ドライブ）
  private async findAllAppFolders(): Promise<any[]> {
    try {
      console.log('🔍 Searching all folders with name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
      
      // 1. マイドライブ内での検索
      const personalSearchQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const personalResult = await this.apiCall(
        `files?q=${encodeURIComponent(personalSearchQuery)}&fields=files(id,name,shared,permissions(id,type,role,emailAddress),modifiedTime,ownedByMe,owners(displayName,emailAddress))`
      )

      // 2. 共有ドライブ内での検索
      const sharedDriveSearchQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const sharedDriveResult = await this.apiCall(
        `files?q=${encodeURIComponent(sharedDriveSearchQuery)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,shared,permissions(id,type,role,emailAddress),modifiedTime,ownedByMe,owners(displayName,emailAddress),driveId)`
      )

      // 3. 結果を結合
      const allFiles = [
        ...(personalResult.files || []),
        ...(sharedDriveResult.files || [])
      ]

      console.log('📁 Search results:')
      console.log(`  - Personal drive: ${personalResult.files?.length || 0} folders`)
      console.log(`  - Shared drives: ${sharedDriveResult.files?.length || 0} folders`)

      if (allFiles.length > 0) {
        console.log(`📁 Found ${allFiles.length} folder(s) with name "${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}":`)
        allFiles.forEach((folder: any, index: number) => {
          const isShared = folder.shared === true || (folder.permissions && folder.permissions.length > 1)
          const isInSharedDrive = folder.driveId ? true : false
          console.log(`  ${index + 1}. ID: ${folder.id}`)
          console.log(`    - Name: ${folder.name}`)
          console.log(`    - In Shared Drive: ${isInSharedDrive}`)
          console.log(`    - DriveId: ${folder.driveId || 'N/A'}`)
          console.log(`    - Shared: ${folder.shared}`)
          console.log(`    - OwnedByMe: ${folder.ownedByMe}`)
          console.log(`    - Permissions count: ${folder.permissions ? folder.permissions.length : 'undefined'}`)
          console.log(`    - IsShared (calculated): ${isShared}`)
          console.log(`    - ModifiedTime: ${folder.modifiedTime}`)
        })
        return allFiles
      } else {
        console.log('📁 No folders found with name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
        return []
      }
    } catch (error) {
      console.warn('📁 Error searching for all app folders:', error)
      return []
    }
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
    
    // 共同編集ファイルと従来のバックアップファイルの両方を検索
    const sharedFileQuery = `'${folderId}' in parents and name='shared_schedule_data.json' and trashed=false`
    const backupFileQuery = `'${folderId}' in parents and name contains '${GOOGLE_DRIVE_CONFIG.BACKUP_FILE_PREFIX}' and trashed=false`
    
    // 共有ドライブ対応のパラメータ
    const driveParams = `&supportsAllDrives=true&includeItemsFromAllDrives=true`
    
    // 共同編集ファイルを取得
    const sharedResult = await this.apiCall(
      `files?q=${encodeURIComponent(sharedFileQuery)}&fields=files(id,name,modifiedTime,size)${driveParams}`
    )
    
    // 従来のバックアップファイルを取得
    const backupResult = await this.apiCall(
      `files?q=${encodeURIComponent(backupFileQuery)}&fields=files(id,name,modifiedTime,size)${driveParams}`
    )
    
    // 両方のファイルを結合し、更新日時でソート
    const allFiles = [
      ...(sharedResult.files || []),
      ...(backupResult.files || [])
    ].sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())

    console.log('📋 Found backup files:', allFiles.length)
    console.log('  - Shared files:', sharedResult.files?.length || 0)
    console.log('  - Legacy backup files:', backupResult.files?.length || 0)
    
    return allFiles
  }

  // バックアップファイルの読み込み
  async loadBackup(fileId: string): Promise<BackupData> {
    console.log('📂 Loading backup from Google Drive:', fileId)
    
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
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
    
    await this.apiCall(`files/${fileId}?supportsAllDrives=true`, {
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
      const allFolders = await this.findAllAppFolders()
      
      if (allFolders.length === 0) {
        return { hasSharedFolder: false, hasOwnedFolder: false, folderType: 'none' }
      }
      
      // 共有フォルダの存在確認（共有ドライブを含む統一されたロジック）
      const sharedFolders = allFolders.filter(folder => {
        if (folder.driveId) return true // 共有ドライブは常に共有扱い
        const isSharedByFlag = folder.shared === true
        const hasMultiplePermissions = folder.permissions && folder.permissions.length > 1
        const isNotOnlyOwned = folder.ownedByMe !== true
        return isSharedByFlag || hasMultiplePermissions || isNotOnlyOwned
      })
      
      // 個人フォルダの存在確認
      const ownedFolders = allFolders.filter(folder => 
        !folder.driveId && folder.ownedByMe === true && !sharedFolders.includes(folder)
      )
      
      return {
        hasSharedFolder: sharedFolders.length > 0,
        hasOwnedFolder: ownedFolders.length > 0,
        folderType: sharedFolders.length > 0 ? 'shared' : (ownedFolders.length > 0 ? 'owned' : 'none')
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