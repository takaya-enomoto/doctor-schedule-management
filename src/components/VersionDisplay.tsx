import React, { useState } from 'react'
import { getVersionString, getDetailedVersionInfo, DEPLOYMENT_ID, BUILD_INFO } from '../utils/version'

const VersionDisplay: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false)

  const handleVersionClick = () => {
    setShowDetails(!showDetails)
  }

  const copyVersionInfo = () => {
    const info = getDetailedVersionInfo()
    const text = `医師スケジュール管理システム
バージョン: ${info.version}
ビルド: ${info.build.buildNumber}
コミット: ${info.git.lastCommit}
デプロイID: ${DEPLOYMENT_ID}
ビルド日時: ${info.build.buildDate}
ブラウザ: ${info.userAgent}`

    navigator.clipboard.writeText(text).then(() => {
      alert('バージョン情報をクリップボードにコピーしました')
    }).catch(() => {
      alert('クリップボードへのコピーに失敗しました')
    })
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      fontSize: '12px',
      color: '#666',
      background: '#f8f9fa',
      padding: '4px 8px',
      borderRadius: '4px',
      border: '1px solid #dee2e6',
      cursor: 'pointer',
      zIndex: 1000,
      fontFamily: 'monospace'
    }}>
      <div onClick={handleVersionClick} title="クリックして詳細を表示">
        {getVersionString()}
      </div>
      
      {showDetails && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '12px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          minWidth: '300px',
          marginBottom: '5px',
          fontSize: '11px'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
            📋 バージョン情報
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <strong>バージョン:</strong> {BUILD_INFO.buildNumber}
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <strong>デプロイID:</strong> {DEPLOYMENT_ID}
          </div>
          
          <div style={{ marginBottom: '4px' }}>
            <strong>ビルド日時:</strong> {new Date(BUILD_INFO.buildDate).toLocaleString('ja-JP')}
          </div>
          
          <div style={{ marginBottom: '8px' }}>
            <strong>最新機能:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
              {BUILD_INFO.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            borderTop: '1px solid #eee', 
            paddingTop: '8px' 
          }}>
            <button 
              onClick={copyVersionInfo}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              📋 コピー
            </button>
            
            <button 
              onClick={() => setShowDetails(false)}
              style={{
                background: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              ✕ 閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VersionDisplay