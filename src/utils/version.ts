// バージョン情報管理
// package.jsonから自動取得される情報
export const APP_VERSION = '2.1.0'

// 自動更新されるビルド時の情報
export const BUILD_INFO = {
  buildDate: new Date().toISOString(),
  buildNumber: generateBuildNumber(), // YYYY.MM.DD.NNN形式
  features: [
    'Google Driveバックアップ5世代管理',
    'バージョン自動更新',
    '複数ファイル作成防止',
    'デプロイメント確認'
  ]
}

// ビルド番号を自動生成
function generateBuildNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  return `${year}.${month}.${day}.${hours}${minutes}`
}

// Git情報（手動更新）
export const GIT_INFO = {
  branch: 'main',
  lastCommit: '2e4dda8', // 最新コミットハッシュの短縮版
  commitMessage: 'バージョン表示機能を追加'
}

// バージョン情報を文字列で取得
export const getVersionString = (): string => {
  return `v${APP_VERSION} (${BUILD_INFO.buildNumber})`
}

// 詳細なバージョン情報を取得
export const getDetailedVersionInfo = () => {
  return {
    version: APP_VERSION,
    build: BUILD_INFO,
    git: GIT_INFO,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  }
}

// デプロイメント確認用の固有ID
export const DEPLOYMENT_ID = `deploy-${BUILD_INFO.buildNumber}-${GIT_INFO.lastCommit}`

// バージョン比較用のヘルパー
export const isNewerVersion = (currentVersion: string, newVersion: string): boolean => {
  const current = currentVersion.split('.').map(Number)
  const newer = newVersion.split('.').map(Number)
  
  for (let i = 0; i < Math.max(current.length, newer.length); i++) {
    const currentPart = current[i] || 0
    const newerPart = newer[i] || 0
    
    if (newerPart > currentPart) return true
    if (newerPart < currentPart) return false
  }
  
  return false
}