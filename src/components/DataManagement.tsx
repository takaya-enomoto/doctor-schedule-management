import { useState, useRef } from 'react'
import { createBackup, exportBackup, importBackup, validateBackupVersion, mergeBackupData } from '../utils/backup'
import type { BackupData } from '../utils/backup'
import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'
// import GoogleDriveSync from './GoogleDriveSync' // 一時的に無効化
import { LABELS } from '../constants/labels'
import { formatDataSummary } from '../utils/formatters'

interface DataManagementProps {
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

const DataManagement = ({
  schedules,
  persons,
  leaveRequests,
  oneTimeWork,
  onCalls,
  nurseOnCalls,
  onRestore
}: DataManagementProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace')
  const [showLocalBackup, setShowLocalBackup] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportBackup = () => {
    try {
      const backup = createBackup(schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls)
      exportBackup(backup)
      setMessage({ type: 'success', text: 'ローカルファイルをダウンロードしました' })
    } catch (error) {
      setMessage({ type: 'error', text: 'ローカルファイルの作成に失敗しました' })
    }
  }

  const handleImportBackup = async (file: File) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const backupData: BackupData = await importBackup(file)
      
      if (!validateBackupVersion(backupData)) {
        throw new Error('サポートされていないバージョンのファイルです')
      }

      const currentData = { schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls }
      const mergedData = mergeBackupData(currentData, backupData.data, restoreMode)
      
      onRestore(mergedData)
      
      const modeText = restoreMode === 'replace' ? '置き換え' : 'マージ'
      setMessage({ 
        type: 'success', 
        text: `データを${modeText}モードで復元しました（${backupData.timestamp}のファイル）` 
      })
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.json')) {
        setMessage({ type: 'error', text: 'JSONファイルを選択してください' })
        return
      }
      handleImportBackup(file)
    }
  }

  const clearMessage = () => {
    setMessage(null)
  }

  const getDataSummary = () => {
    return formatDataSummary({
      doctors: persons.length,
      schedules: schedules.length,
      leaveRequests: leaveRequests.length,
      oneTimeWork: oneTimeWork.length,
      onCalls: onCalls.length,
      nurseOnCalls: nurseOnCalls.length
    })
  }

  const summary = getDataSummary()

  return (
    <div className="data-management">
      {/* データ概要 */}
      <div className="data-overview">
        <h3>📊 {LABELS.DATA_MANAGEMENT.OVERVIEW}</h3>
        <div className="data-summary">
          <p><strong>{LABELS.DATA_MANAGEMENT.TOTAL}: {summary.total} 件</strong></p>
          <div className="data-grid">
            {summary.details.map((detail, index) => (
              <span key={index} className="data-item">{detail}</span>
            ))}
          </div>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={clearMessage} className="close-message">×</button>
        </div>
      )}

      {/* Google Drive連携 - 一時的に無効化 */}
      {/*
      <div className="google-drive-section">
        <GoogleDriveSync
          schedules={schedules}
          persons={persons}
          leaveRequests={leaveRequests}
          oneTimeWork={oneTimeWork}
          onCalls={onCalls}
          nurseOnCalls={nurseOnCalls}
          onRestore={onRestore}
        />
      </div>
      */}

      {/* ローカルファイル管理 */}
      <div className="local-backup-section">
        <div className="section-header">
          <h3>💻 ローカルファイル管理</h3>
          <button 
            onClick={() => setShowLocalBackup(!showLocalBackup)}
            className="toggle-button"
          >
            {showLocalBackup ? '▼ 閉じる' : '▶ 開く'}
          </button>
        </div>
        
        {showLocalBackup && (
          <div className="local-backup-content">
            <div className="export-section">
              <h4>📥 ローカルファイルに保存</h4>
              <p>コンピューターにJSONファイルとして保存します。</p>
              <button 
                onClick={handleExportBackup}
                className="export-button"
                disabled={summary.total === 0}
              >
                📥 JSONファイルをダウンロード
              </button>
              {summary.total === 0 && (
                <p className="no-data-message">保存するデータがありません</p>
              )}
            </div>

            <div className="import-section">
              <h4>📤 ローカルファイルから復元</h4>
              <div className="restore-mode">
                <label>復元モード:</label>
                <div className="radio-group">
                  <label>
                    <input
                      type="radio"
                      name="restoreMode"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={(e) => setRestoreMode(e.target.value as 'replace' | 'merge')}
                    />
                    置き換え
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="restoreMode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={(e) => setRestoreMode(e.target.value as 'replace' | 'merge')}
                    />
                    マージ
                  </label>
                </div>
              </div>
              
              <div className="file-input-section">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="file-input"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="import-button"
                  disabled={isLoading}
                >
                  {isLoading ? '📤 復元中...' : '📤 JSONファイルを選択'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DataManagement