import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import googleDriveService, { type GoogleAPIState } from '../utils/googleDriveService'
import { createBackup } from '../utils/backup'
import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'
import { LABELS } from '../constants/labels'
import { formatDateTime, formatFileSize } from '../utils/formatters'

interface GoogleDriveSyncProps {
  schedules: WorkSchedule[]
  persons: Person[]
  leaveRequests: LeaveRequest[]
  oneTimeWork: OneTimeWork[]
  onCalls: OnCall[]
  nurseOnCalls: NurseOnCall[]
  onRestore: (data: {
    schedules: WorkSchedule[]
    persons: Person[]
    leaveRequests: LeaveRequest[]
    oneTimeWork: OneTimeWork[]
    onCalls: OnCall[]
    nurseOnCalls: NurseOnCall[]
  }) => void
}

interface DriveFile {
  id: string
  name: string
  modifiedTime: string
  size: string
}

const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({
  schedules,
  persons,
  leaveRequests,
  oneTimeWork,
  onCalls,
  nurseOnCalls,
  onRestore
}) => {
  const [apiState, setApiState] = useState<GoogleAPIState>({
    isLoaded: false,
    isSignedIn: false,
    isInitialized: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [backupFiles, setBackupFiles] = useState<DriveFile[]>([])
  const [showFileList, setShowFileList] = useState(false)

  // Google API状態の監視
  useEffect(() => {
    const updateState = () => {
      setApiState(googleDriveService.getState())
    }

    updateState()
    const interval = setInterval(updateState, 1000) // 1秒ごとにチェック

    return () => clearInterval(interval)
  }, [])

  // Google Drive初期化
  const handleInitialize = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      await googleDriveService.initialize()
      setMessage({ type: 'success', text: 'Google Drive APIが初期化されました' })
      setApiState(googleDriveService.getState())
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Google Drive API初期化に失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // サインイン
  const handleSignIn = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      await googleDriveService.signIn()
      setMessage({ type: 'success', text: 'Google Driveにサインインしました' })
      setApiState(googleDriveService.getState())
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'サインインに失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // サインアウト
  const handleSignOut = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      await googleDriveService.signOut()
      setMessage({ type: 'success', text: 'Google Driveからサインアウトしました' })
      setApiState(googleDriveService.getState())
      setBackupFiles([])
      setShowFileList(false)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'サインアウトに失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Google Driveにバックアップを保存
  const handleSaveToGoogleDrive = async () => {
    setIsLoading(true)
    setMessage(null)

    try {
      const backupData = createBackup(schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls)
      await googleDriveService.saveBackup(backupData)
      setMessage({ type: 'success', text: 'Google Driveにバックアップを保存しました' })
      
      // ファイル一覧を更新
      if (showFileList) {
        await loadFileList()
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Google Driveへの保存に失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ファイル一覧の読み込み
  const loadFileList = async () => {
    setIsLoading(true)
    try {
      const files = await googleDriveService.listBackupFiles()
      setBackupFiles(files)
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'ファイル一覧の取得に失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Google Driveからバックアップを読み込み
  const handleLoadFromGoogleDrive = async (fileId: string) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const backupData = await googleDriveService.loadBackup(fileId)
      onRestore({
        schedules: backupData.data.schedules,
        persons: backupData.data.persons,
        leaveRequests: backupData.data.leaveRequests,
        oneTimeWork: backupData.data.oneTimeWork,
        onCalls: backupData.data.onCalls,
        nurseOnCalls: backupData.data.nurseOnCalls || []
      })
      setMessage({ type: 'success', text: 'Google Driveからデータを復元しました' })
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Google Driveからの読み込みに失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ファイル削除
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('このバックアップファイルを削除しますか？')) return

    setIsLoading(true)
    try {
      await googleDriveService.deleteBackup(fileId)
      setMessage({ type: 'success', text: 'バックアップファイルを削除しました' })
      await loadFileList()
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'ファイル削除に失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ファイル一覧の表示切り替え
  const toggleFileList = async () => {
    if (!showFileList && apiState.isSignedIn) {
      await loadFileList()
    }
    setShowFileList(!showFileList)
  }

  const clearMessage = () => {
    setMessage(null)
  }

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size)
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="google-drive-sync">
      <h3>🌐 Google Drive 連携</h3>
      
      {message && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={clearMessage} className="message-close">×</button>
        </div>
      )}

      <div className="api-status">
        <p><strong>状態:</strong></p>
        <ul>
          <li>API読み込み: {apiState.isLoaded ? '✅' : '❌'}</li>
          <li>初期化: {apiState.isInitialized ? '✅' : '❌'}</li>
          <li>サインイン: {apiState.isSignedIn ? '✅' : '❌'}</li>
        </ul>
        
        {apiState.user && (
          <div className="user-info">
            <img src={apiState.user.imageUrl} alt="アバター" className="user-avatar" />
            <div>
              <div><strong>{apiState.user.name}</strong></div>
              <div className="user-email">{apiState.user.email}</div>
            </div>
          </div>
        )}
      </div>

      <div className="actions">
        {!apiState.isInitialized && (
          <button 
            onClick={handleInitialize} 
            disabled={isLoading}
            className="action-button init-button"
          >
            {isLoading ? '初期化中...' : 'Google Drive API 初期化'}
          </button>
        )}

        {apiState.isInitialized && !apiState.isSignedIn && (
          <button 
            onClick={handleSignIn} 
            disabled={isLoading}
            className="action-button signin-button"
          >
            {isLoading ? 'サインイン中...' : 'Google Driveにサインイン'}
          </button>
        )}

        {apiState.isSignedIn && (
          <>
            <div className="signed-in-actions">
              <button 
                onClick={handleSaveToGoogleDrive} 
                disabled={isLoading}
                className="action-button save-button"
              >
                {isLoading ? '保存中...' : '📤 Google Driveに保存'}
              </button>

              <button 
                onClick={toggleFileList} 
                disabled={isLoading}
                className="action-button list-button"
              >
                {showFileList ? '📁 ファイル一覧を隠す' : '📁 ファイル一覧を表示'}
              </button>

              <button 
                onClick={handleSignOut} 
                disabled={isLoading}
                className="action-button signout-button"
              >
                サインアウト
              </button>
            </div>

            {showFileList && (
              <div className="file-list">
                <h4>📋 Google Drive バックアップファイル</h4>
                {backupFiles.length === 0 ? (
                  <p className="no-files">バックアップファイルがありません</p>
                ) : (
                  <div className="file-items">
                    {backupFiles.map(file => (
                      <div key={file.id} className="file-item">
                        <div className="file-info">
                          <div className="file-name">{file.name}</div>
                          <div className="file-details">
                            <span>{format(new Date(file.modifiedTime), 'yyyy/MM/dd HH:mm', { locale: ja })}</span>
                            <span>{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <div className="file-actions">
                          <button 
                            onClick={() => handleLoadFromGoogleDrive(file.id)}
                            disabled={isLoading}
                            className="file-action-button load-button"
                          >
                            📥 復元
                          </button>
                          <button 
                            onClick={() => handleDeleteFile(file.id)}
                            disabled={isLoading}
                            className="file-action-button delete-button"
                          >
                            🗑️ 削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="setup-info">
        <h4>📘 セットアップガイド</h4>
        <p>Google Drive連携を使用するには、以下の設定が必要です：</p>
        <ol>
          <li>Google Cloud Consoleでプロジェクトを作成</li>
          <li>Google Drive APIを有効化</li>
          <li>OAuth 2.0クライアントIDを作成</li>
          <li>環境変数 VITE_GOOGLE_CLIENT_ID を設定</li>
          <li>環境変数 VITE_GOOGLE_API_KEY を設定</li>
        </ol>
      </div>
    </div>
  )
}

export default GoogleDriveSync