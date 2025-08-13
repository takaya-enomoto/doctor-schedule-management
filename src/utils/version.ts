// バージョン情報管理
// package.jsonから自動取得される情報
export const APP_VERSION = '2.1.0'

// ビルド時の情報（手動更新）
export const BUILD_INFO = {
  buildDate: '2025-08-13T12:00:00.000Z',
  buildNumber: '2025.08.13.002', // YYYY.MM.DD.NNN形式
  features: [
    'バージョン表示機能',
    '複数ファイル作成防止',
    'ローカルバックアップ制限',
    'デプロイメント確認'
  ]
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