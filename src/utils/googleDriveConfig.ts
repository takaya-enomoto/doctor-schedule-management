// Google Drive API 設定
export const GOOGLE_DRIVE_CONFIG = {
  // Google API Console で取得するクライアントID
  // 実際の使用時は環境変数から読み込むことを推奨
  CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
  
  // OAuth 2.0 スコープ
  SCOPES: [
    'https://www.googleapis.com/auth/drive', // Google Driveの完全アクセス（共有ドライブ含む）
  ],
  
  // Discovery documents
  DISCOVERY_DOCS: [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
  ],
  
  // アプリケーション用フォルダ名
  APP_FOLDER_NAME: '医師勤務管理データ',
  
  // 固定フォルダID（設定されている場合は自動検出をスキップ）
  FIXED_FOLDER_ID: import.meta.env.VITE_SHARED_FOLDER_ID || '',
  
  // 複数ファイル作成防止設定
  DISABLE_AUTO_FOLDER_CREATION: true, // 自動フォルダ作成を無効化
  SINGLE_FILE_MODE: true, // 単一ファイルモード強制
  MAX_LOCAL_BACKUPS: 3, // ローカルバックアップ最大数
  
  // バックアップファイル名のプレフィックス
  BACKUP_FILE_PREFIX: '医師出勤管理_バックアップ_'
}

// Google API が読み込まれているかチェック
export const isGoogleAPILoaded = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof (window as any).gapi !== 'undefined' &&
         typeof (window as any).google !== 'undefined'
}

// Google API の初期化状態
export interface GoogleAPIState {
  isLoaded: boolean
  isSignedIn: boolean
  isInitialized: boolean
  user?: {
    name: string
    email: string
    imageUrl: string
  }
}