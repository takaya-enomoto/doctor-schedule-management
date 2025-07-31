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
  ux_mode?: 'popup' | 'redirect'
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
  private userInfo: { name: string; email: string; imageUrl: string } | null = null

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
            if (error.type === 'popup_blocked_by_browser') {
              alert('ポップアップがブロックされました。ブラウザの設定でポップアップを許可してください。')
            } else if (error.type === 'popup_closed_by_user') {
              console.log('ユーザーがポップアップを閉じました')
            } else {
              console.error('認証エラー:', error)
            }
          },
          // COOP問題対応：ポップアップ方式を明示的に指定
          ux_mode: 'popup'
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
          
          // ユーザー情報を取得
          this.fetchUserInfo().then(() => {
            resolve()
          }).catch((error) => {
            console.warn('⚠️ Failed to fetch user info, but sign-in successful:', error)
            resolve() // ユーザー情報取得に失敗してもサインインは成功とする
          })
          
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

  // ユーザー情報を取得
  private async fetchUserInfo(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    try {
      console.log('👤 Fetching user information...')
      
      // Google Drive APIを使用してユーザー情報を取得
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`)
      }

      const data = await response.json()
      console.log('👤 User data received:', data)

      if (data.user) {
        this.userInfo = {
          name: data.user.displayName || 'ユーザー',
          email: data.user.emailAddress || '',
          imageUrl: data.user.photoLink || ''
        }
        console.log('✅ User info updated:', this.userInfo)
      }
    } catch (error) {
      console.error('❌ Error fetching user info:', error)
      throw error
    }
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
    this.userInfo = null // ユーザー情報もクリア
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
    console.log('📁 Getting or creating app folder')
    
    // 0. 固定フォルダIDが設定されている場合はそれを使用
    if (GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID) {
      console.log('📌 Using fixed folder ID from config:', GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID)
      
      // フォルダの存在確認
      try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID}?supportsAllDrives=true&fields=id,name,mimeType`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const folderInfo = await response.json()
          console.log('✅ Fixed folder confirmed:', folderInfo.name, folderInfo.id)
          return GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID
        } else {
          console.warn('⚠️ Fixed folder ID not accessible:', response.status)
          console.warn('⚠️ Falling back to dynamic folder search...')
        }
      } catch (error) {
        console.warn('⚠️ Failed to verify fixed folder:', error)
        console.warn('⚠️ Falling back to dynamic folder search...')
      }
    }
    
    console.log('🔍 Searching for folder name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
    
    // 1. フォルダ名で全てのフォルダを検索（共有・個人問わず）
    console.log('🔍 Step 1: Searching all folders by name...')
    const allFolders = await this.findAllAppFolders()
    
    if (allFolders.length > 0) {
      // 複数のフォルダが見つかった場合の警告
      if (allFolders.length > 1) {
        console.warn(`⚠️ Multiple app folders found (${allFolders.length}). Using the most appropriate one.`)
        allFolders.forEach((folder, index) => {
          console.warn(`  ${index + 1}. ${folder.name} (ID: ${folder.id}, DriveId: ${folder.driveId || 'Personal'}, Modified: ${folder.modifiedTime})`)
        })
      }
      
      // 2. 共有ドライブ内のフォルダを最優先（最新のものを使用）
      const sharedDriveFolders = allFolders.filter(folder => folder.driveId)
      if (sharedDriveFolders.length > 0) {
        const latestSharedDrive = sharedDriveFolders.sort((a, b) => 
          new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
        )[0]
        console.log('✅ Using shared drive folder:', latestSharedDrive.id, latestSharedDrive.name, `(DriveId: ${latestSharedDrive.driveId})`)
        
        // 重複フォルダがある場合は統合を提案
        if (sharedDriveFolders.length > 1) {
          console.warn('⚠️ Multiple shared drive folders detected. Consider manually consolidating them.')
        }
        
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

    // 5. フォルダが存在しない場合の作成（競合状態を考慮）
    return await this.createAppFolderSafely()
  }

  // 競合状態を考慮した安全なフォルダ作成
  private async createAppFolderSafely(): Promise<string> {
    console.log('🔍 No folders found, creating new app folder safely...')
    
    // 「みそらグループ 業務用 共有ドライブ」共有ドライブを検索
    const sharedDriveId = await this.findTargetSharedDrive()
    
    if (sharedDriveId) {
      console.log('📁 Creating folder in shared drive:', sharedDriveId)
      
      try {
        const createResult = await this.apiCall('files?supportsAllDrives=true', {
          method: 'POST',
          body: JSON.stringify({
            name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [sharedDriveId]
          })
        })
        console.log('✅ New app folder created in shared drive:', createResult.id)
        
        // 作成後に少し待ってから再検索（他のユーザーが同時作成していないか確認）
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        const verifyFolders = await this.findAllAppFolders()
        if (verifyFolders.length > 1) {
          console.warn(`⚠️ Multiple folders detected after creation (${verifyFolders.length}). This might indicate concurrent creation.`)
          console.warn('📌 IMPORTANT: Please set VITE_SHARED_FOLDER_ID environment variable to prevent duplicate folders!')
          console.warn(`📌 Add this to your .env file: VITE_SHARED_FOLDER_ID=${createResult.id}`)
          
          // 最新のものを使用（通常は今作成したもの）
          const latestFolder = verifyFolders
            .filter(folder => folder.driveId === sharedDriveId)
            .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())[0]
          
          if (latestFolder && latestFolder.id !== createResult.id) {
            console.warn('⚠️ Using different folder than the one we just created (concurrent creation detected)')
            console.warn(`📌 Recommended VITE_SHARED_FOLDER_ID: ${latestFolder.id}`)
            return latestFolder.id
          }
        } else {
          // 単一フォルダの場合もIDを推奨
          console.log(`📌 Recommendation: Set VITE_SHARED_FOLDER_ID=${createResult.id} in .env to prevent future duplicates`)
        }
        
        return createResult.id
      } catch (error) {
        console.error('❌ Failed to create folder in shared drive:', error)
        // 作成失敗の場合、もう一度検索してみる（他のユーザーが作成している可能性）
        console.log('🔍 Retrying folder search after creation failure...')
        const retryFolders = await this.findAllAppFolders()
        if (retryFolders.length > 0) {
          const sharedDriveFolders = retryFolders.filter(folder => folder.driveId === sharedDriveId)
          if (sharedDriveFolders.length > 0) {
            const latestSharedDrive = sharedDriveFolders.sort((a, b) => 
              new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
            )[0]
            console.log('✅ Found folder created by another user:', latestSharedDrive.id)
            return latestSharedDrive.id
          }
        }
        throw error
      }
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

  // 「みそらグループ 業務用 共有ドライブ」共有ドライブのIDを取得
  private async findTargetSharedDrive(): Promise<string | null> {
    try {
      console.log('🔍 Searching for target shared drive: みそらグループ 業務用 共有ドライブ')
      console.log(`👤 Current user: ${this.userInfo?.name} (${this.userInfo?.email})`)
      
      const result = await this.apiCall('drives?fields=drives(id,name,capabilities)')
      
      if (result.drives && result.drives.length > 0) {
        console.log('📁 Available shared drives:')
        result.drives.forEach((drive: any, index: number) => {
          console.log(`  ${index + 1}. ${drive.name} (ID: ${drive.id})`)
          if (drive.capabilities) {
            console.log(`    - Can add children: ${drive.capabilities.canAddChildren}`)
            console.log(`    - Can edit: ${drive.capabilities.canEdit}`)
            console.log(`    - Can manage members: ${drive.capabilities.canManageMembers}`)
          }
        })
        
        const targetDrive = result.drives.find((drive: any) => 
          drive.name === 'みそらグループ 業務用 共有ドライブ'
        )
        
        if (targetDrive) {
          console.log('✅ Found target shared drive:', targetDrive.id)
          
          // 共有ドライブのメンバーシップを確認
          await this.checkSharedDriveMembership(targetDrive.id)
          
          return targetDrive.id
        } else {
          console.log('❌ Target shared drive "みそらグループ 業務用 共有ドライブ" not found')
          console.log('🔍 This user may not have access to the target shared drive')
          return null
        }
      } else {
        console.log('❌ No shared drives found')
        console.log('🔍 This user may not be a member of any shared drives')
        return null
      }
    } catch (error) {
      console.warn('📁 Error searching for shared drives:', error)
      if (error instanceof Error && error.message.includes('403')) {
        console.warn('🔍 Diagnosis: User may not have permission to list shared drives')
      }
      return null
    }
  }

  // 共有ドライブのメンバーシップを確認
  private async checkSharedDriveMembership(driveId: string): Promise<void> {
    try {
      console.log('🔍 Checking shared drive membership...')
      
      // 共有ドライブの権限を取得
      const permissionsResult = await this.apiCall(`drives/${driveId}/permissions?supportsAllDrives=true&fields=permissions(id,type,role,emailAddress,displayName)`)
      
      if (permissionsResult.permissions && permissionsResult.permissions.length > 0) {
        console.log('👥 Shared drive members:')
        permissionsResult.permissions.forEach((perm: any, index: number) => {
          console.log(`  ${index + 1}. ${perm.displayName || perm.emailAddress || 'Unknown'} - ${perm.role} (${perm.type})`)
          
          // 現在のユーザーかどうかチェック
          if (perm.emailAddress === this.userInfo?.email) {
            console.log(`    ✅ This is the current user - Role: ${perm.role}`)
          }
        })
      } else {
        console.log('⚠️ No permissions found or insufficient access to view members')
      }
    } catch (error) {
      console.warn('⚠️ Could not check shared drive membership:', error)
      if (error instanceof Error && error.message.includes('403')) {
        console.warn('🔍 User may not have permission to view shared drive members')
      }
    }
  }

  // フォルダ名で全てのアプリフォルダを検索（マイドライブ + 共有ドライブ）
  private async findAllAppFolders(): Promise<any[]> {
    try {
      console.log('🔍 Searching all folders with name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
      
      // 1. マイドライブ内での検索
      const personalSearchQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      console.log('🔍 Personal drive search query:', personalSearchQuery)
      
      const personalResult = await this.apiCall(
        `files?q=${encodeURIComponent(personalSearchQuery)}&fields=files(id,name,shared,permissions(id,type,role,emailAddress),modifiedTime,ownedByMe,owners(displayName,emailAddress))`
      )

      // 2. 共有ドライブ内での検索
      const sharedDriveSearchQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      console.log('🔍 Shared drive search query:', sharedDriveSearchQuery)
      
      const sharedDriveResult = await this.apiCall(
        `files?q=${encodeURIComponent(sharedDriveSearchQuery)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,shared,permissions(id,type,role,emailAddress),modifiedTime,ownedByMe,owners(displayName,emailAddress),driveId)`
      )

      // 3. 特定の共有ドライブ内での直接検索も試行
      const targetSharedDriveId = await this.findTargetSharedDrive()
      let specificSharedDriveResult: any = { files: [] }
      
      if (targetSharedDriveId) {
        console.log('🔍 Searching specifically in target shared drive:', targetSharedDriveId)
        const specificQuery = `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${targetSharedDriveId}' in parents`
        console.log('🔍 Specific shared drive search query:', specificQuery)
        
        try {
          specificSharedDriveResult = await this.apiCall(
            `files?q=${encodeURIComponent(specificQuery)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,shared,permissions(id,type,role,emailAddress),modifiedTime,ownedByMe,owners(displayName,emailAddress),driveId)`
          )
          console.log('🔍 Specific shared drive search result:', specificSharedDriveResult.files?.length || 0, 'folders')
        } catch (specificError) {
          console.warn('⚠️ Specific shared drive search failed:', specificError)
        }
      }

      // 4. 結果を結合（重複を除去）
      const allFiles: any[] = []
      const seenIds = new Set<string>()
      
      // Personal drive results
      if (personalResult.files) {
        personalResult.files.forEach((file: any) => {
          if (!seenIds.has(file.id)) {
            allFiles.push(file)
            seenIds.add(file.id)
          }
        })
      }
      
      // Shared drive results (general search)
      if (sharedDriveResult.files) {
        sharedDriveResult.files.forEach((file: any) => {
          if (!seenIds.has(file.id)) {
            allFiles.push(file)
            seenIds.add(file.id)
          }
        })
      }
      
      // Specific shared drive results
      if (specificSharedDriveResult.files) {
        specificSharedDriveResult.files.forEach((file: any) => {
          if (!seenIds.has(file.id)) {
            allFiles.push(file)
            seenIds.add(file.id)
          }
        })
      }

      console.log('📁 Search results:')
      console.log(`  - Personal drive: ${personalResult.files?.length || 0} folders`)
      console.log(`  - Shared drives (general): ${sharedDriveResult.files?.length || 0} folders`)
      console.log(`  - Shared drives (specific): ${specificSharedDriveResult.files?.length || 0} folders`)
      console.log(`  - Total unique folders: ${allFiles.length}`)

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
          console.log(`    - Owner: ${folder.owners ? folder.owners.map((o: any) => o.displayName || o.emailAddress).join(', ') : 'N/A'}`)
          console.log(`    - Permissions count: ${folder.permissions ? folder.permissions.length : 'undefined'}`)
          console.log(`    - IsShared (calculated): ${isShared}`)
          console.log(`    - ModifiedTime: ${folder.modifiedTime}`)
        })
        
        // 重複フォルダの場合は環境変数設定を推奨
        if (allFiles.length > 1) {
          console.warn('📌 DUPLICATE FOLDERS DETECTED!')
          console.warn('📌 To fix this permanently, add one of these IDs to your .env file:')
          const sharedDriveFolders = allFiles.filter(folder => folder.driveId)
          if (sharedDriveFolders.length > 0) {
            const recommendedFolder = sharedDriveFolders.sort((a, b) => 
              new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
            )[0]
            console.warn(`📌 RECOMMENDED: VITE_SHARED_FOLDER_ID=${recommendedFolder.id}`)
            console.warn(`📌 (This is the latest shared drive folder created by: ${recommendedFolder.owners ? recommendedFolder.owners.map((o: any) => o.displayName || o.emailAddress).join(', ') : 'Unknown'})`)
          } else {
            const latestFolder = allFiles.sort((a, b) => 
              new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime()
            )[0]
            console.warn(`📌 FALLBACK: VITE_SHARED_FOLDER_ID=${latestFolder.id}`)
          }
          console.warn('📌 After setting the environment variable, restart the application.')
        }
        
        return allFiles
      } else {
        console.log('📁 No folders found with name:', GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME)
        
        // デバッグ用：共有ドライブの中身を一覧表示
        if (targetSharedDriveId) {
          console.log('🔍 Debug: Listing all folders in target shared drive for troubleshooting...')
          try {
            const debugQuery = `mimeType='application/vnd.google-apps.folder' and trashed=false and '${targetSharedDriveId}' in parents`
            const debugResult = await this.apiCall(
              `files?q=${encodeURIComponent(debugQuery)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,modifiedTime,owners(displayName,emailAddress))`
            )
            console.log('🔍 All folders in shared drive:')
            if (debugResult.files && debugResult.files.length > 0) {
              debugResult.files.forEach((folder: any, index: number) => {
                console.log(`  ${index + 1}. Name: "${folder.name}" (ID: ${folder.id})`)
                console.log(`    - Owner: ${folder.owners ? folder.owners.map((o: any) => o.displayName || o.emailAddress).join(', ') : 'N/A'}`)
                console.log(`    - Modified: ${folder.modifiedTime}`)
              })
            } else {
              console.log('  No folders found in shared drive')
            }
          } catch (debugError) {
            console.warn('⚠️ Debug listing failed:', debugError)
          }
        }
        
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

    // 既存の共有ファイルを検索（共有ドライブ対応）
    const searchQuery = `name='${fileName}' and '${folderId}' in parents and trashed=false`
    const existingFiles = await this.apiCall(`files?q=${encodeURIComponent(searchQuery)}&supportsAllDrives=true&includeItemsFromAllDrives=true`)
    
    if (existingFiles.files && existingFiles.files.length > 0) {
      // 既存ファイルを更新
      const fileId = existingFiles.files[0].id
      console.log('📝 Updating existing shared file:', fileId)
      
      const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&supportsAllDrives=true`, {
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

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
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
    
    // 両方のファイルを結合
    const allFiles = [
      ...(sharedResult.files || []),
      ...(backupResult.files || [])
    ]

    console.log('📋 Found backup files:', allFiles.length)
    console.log('  - Shared files:', sharedResult.files?.length || 0)
    console.log('  - Legacy backup files:', backupResult.files?.length || 0)
    
    // 実際にアクセス可能なファイルのみをフィルタリング
    const accessibleFiles = await this.filterAccessibleFiles(allFiles)
    
    // 更新日時でソート
    accessibleFiles.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
    
    console.log('📋 Accessible backup files:', accessibleFiles.length)
    return accessibleFiles
  }

  // 実際にアクセス可能なファイルのみをフィルタリング
  private async filterAccessibleFiles(files: Array<{ id: string, name: string, modifiedTime: string, size: string }>): Promise<Array<{ id: string, name: string, modifiedTime: string, size: string }>> {
    const accessibleFiles = []
    
    console.log('🔍 Checking file accessibility for current user...')
    console.log(`👤 Current user: ${this.userInfo?.name} (${this.userInfo?.email})`)
    
    for (const file of files) {
      try {
        // より詳細な情報でファイルアクセス可能性をチェック
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?supportsAllDrives=true&fields=id,name,owners,permissions,capabilities,shared,ownedByMe`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const fileDetails = await response.json()
          accessibleFiles.push(file)
          
          console.log(`✅ File accessible: ${file.name} (${file.id})`)
          console.log(`  - Owner: ${fileDetails.owners ? fileDetails.owners.map((o: any) => `${o.displayName} (${o.emailAddress})`).join(', ') : 'Unknown'}`)
          console.log(`  - OwnedByMe: ${fileDetails.ownedByMe}`)
          console.log(`  - Shared: ${fileDetails.shared}`)
          console.log(`  - Permissions count: ${fileDetails.permissions ? fileDetails.permissions.length : 'N/A'}`)
          
          // 権限の詳細を表示
          if (fileDetails.permissions && fileDetails.permissions.length > 0) {
            console.log(`  - Permissions details:`)
            fileDetails.permissions.forEach((perm: any, index: number) => {
              console.log(`    ${index + 1}. ${perm.type}: ${perm.role} ${perm.emailAddress ? `(${perm.emailAddress})` : ''}`)
            })
          }
          
          // capabilities の詳細
          if (fileDetails.capabilities) {
            console.log(`  - Capabilities: canEdit=${fileDetails.capabilities.canEdit}, canDelete=${fileDetails.capabilities.canDelete}, canShare=${fileDetails.capabilities.canShare}`)
          }
          
        } else {
          const errorText = await response.text()
          console.log(`❌ File not accessible: ${file.name} (${file.id})`)
          console.log(`  - Status: ${response.status}`)
          console.log(`  - Error: ${errorText}`)
          
          // 具体的なエラー原因を分析
          if (response.status === 403) {
            console.log(`  - 🔍 Diagnosis: Permission denied. This file may have been created by another account with restricted sharing settings.`)
          } else if (response.status === 404) {
            console.log(`  - 🔍 Diagnosis: File not found. This file may have been deleted or is not accessible from this shared drive context.`)
          }
        }
      } catch (error) {
        console.log(`❌ File access error: ${file.name} (${file.id})`)
        console.log(`  - Error:`, error)
        console.log(`  - 🔍 Diagnosis: Network or authentication error.`)
      }
    }
    
    console.log(`📊 Accessibility Summary: ${accessibleFiles.length}/${files.length} files accessible to current user`)
    
    return accessibleFiles
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
    
    try {
      await this.apiCall(`files/${fileId}?supportsAllDrives=true`, {
        method: 'DELETE'
      })
      
      console.log('✅ Backup file deleted')
    } catch (error: any) {
      console.error('❌ Delete backup error:', error)
      
      // 404エラーの場合は分かりやすいメッセージを表示
      if (error.message && error.message.includes('404')) {
        throw new Error('このファイルは削除できません。他のアカウントで作成されたファイルか、既に削除されている可能性があります。')
      } else if (error.message && error.message.includes('403')) {
        throw new Error('このファイルを削除する権限がありません。ファイルの所有者または共有ドライブの管理者に確認してください。')
      } else {
        throw new Error(`ファイルの削除に失敗しました: ${error.message || error}`)
      }
    }
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
      user: this.isSignedIn() && this.userInfo ? {
        name: this.userInfo.name,
        email: this.userInfo.email,
        imageUrl: this.userInfo.imageUrl
      } : undefined
    }
  }

  // アクセス権限の診断レポート生成
  async generateAccessDiagnosticReport(): Promise<string> {
    if (!this.isSignedIn()) {
      return 'Not signed in to Google Drive'
    }

    const report = []
    report.push('=== Google Drive Access Diagnostic Report ===')
    report.push(`Current User: ${this.userInfo?.name} (${this.userInfo?.email})`)
    report.push(`Timestamp: ${new Date().toISOString()}`)
    report.push('')

    try {
      // 1. 共有ドライブの確認
      report.push('1. Shared Drive Access:')
      const sharedDriveId = await this.findTargetSharedDrive()
      if (sharedDriveId) {
        report.push('   ✅ Can access target shared drive')
        report.push(`   Drive ID: ${sharedDriveId}`)
      } else {
        report.push('   ❌ Cannot access target shared drive')
        report.push('   → User may not be a member of "みそらグループ 業務用 共有ドライブ"')
      }
      report.push('')

      // 2. フォルダアクセスの確認
      report.push('2. App Folder Access:')
      if (GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID) {
        try {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID}?supportsAllDrives=true&fields=id,name,owners,permissions`, {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const folderInfo = await response.json()
            report.push('   ✅ Can access fixed folder')
            report.push(`   Folder: ${folderInfo.name}`)
            report.push(`   Owner: ${folderInfo.owners ? folderInfo.owners.map((o: any) => o.emailAddress).join(', ') : 'Unknown'}`)
          } else {
            report.push('   ❌ Cannot access fixed folder')
            report.push(`   Status: ${response.status}`)
            if (response.status === 403) {
              report.push('   → Permission denied. User needs to be added to folder/drive permissions')
            } else if (response.status === 404) {
              report.push('   → Folder not found. May be deleted or inaccessible')
            }
          }
        } catch (error) {
          report.push('   ❌ Error accessing fixed folder')
          report.push(`   Error: ${error}`)
        }
      } else {
        report.push('   ⚠️ No fixed folder ID configured')
      }
      report.push('')

      // 3. ファイル一覧の確認
      report.push('3. File Access Test:')
      try {
        const files = await this.listBackupFiles()
        report.push(`   Found ${files.length} accessible files`)
        if (files.length === 0) {
          report.push('   → No files are accessible to this user')
          report.push('   → User may need proper permissions or files may not exist')
        }
      } catch (error) {
        report.push('   ❌ Error listing files')
        report.push(`   Error: ${error}`)
      }
      report.push('')

      // 4. 推奨アクション
      report.push('4. Recommended Actions:')
      if (!sharedDriveId) {
        report.push('   → Add user to "みそらグループ 業務用 共有ドライブ" as Content Manager')
        report.push('   → URL: https://drive.google.com/drive/folders/1p57H4bwTXgXi3z7so0YOkp53JXmnSz_P')
      }
      report.push('   → Verify OAuth consent screen includes this user as test user')
      report.push('   → Contact admin to verify shared drive permissions')

    } catch (error) {
      report.push(`Error generating report: ${error}`)
    }

    const reportText = report.join('\n')
    console.log(reportText)
    return reportText
  }

  // 簡易アクセステスト
  async quickAccessTest(): Promise<{canAccessDrive: boolean, canAccessFolder: boolean, canListFiles: boolean}> {
    const result = {
      canAccessDrive: false,
      canAccessFolder: false,
      canListFiles: false
    }

    if (!this.isSignedIn()) {
      return result
    }

    try {
      // 共有ドライブアクセステスト
      const sharedDriveId = await this.findTargetSharedDrive()
      result.canAccessDrive = !!sharedDriveId

      // フォルダアクセステスト
      if (GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID) {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${GOOGLE_DRIVE_CONFIG.FIXED_FOLDER_ID}?supportsAllDrives=true&fields=id`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        result.canAccessFolder = response.ok
      }

      // ファイル一覧テスト
      try {
        const files = await this.listBackupFiles()
        result.canListFiles = files.length > 0
      } catch {
        result.canListFiles = false
      }

    } catch (error) {
      console.error('Quick access test failed:', error)
    }

    return result
  }
}

// シングルトンインスタンス
export const googleDriveService = new GoogleDriveService()
export default googleDriveService