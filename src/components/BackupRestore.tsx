import { useState, useRef } from 'react'
import { createBackup, exportBackup, importBackup, validateBackupVersion, mergeBackupData } from '../utils/backup'
import { getAutoBackups, getLastAutoBackupTime, clearAutoBackups } from '../utils/autoBackup'
import type { BackupData } from '../utils/backup'
import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'
import GoogleDriveSync from './GoogleDriveSync'

interface BackupRestoreProps {
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

const BackupRestore = ({
  schedules,
  persons,
  leaveRequests,
  oneTimeWork,
  onCalls,
  nurseOnCalls,
  onRestore
}: BackupRestoreProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace')
  const [showSaveInfo, setShowSaveInfo] = useState(false)
  const [showRestoreInfo, setShowRestoreInfo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportBackup = () => {
    try {
      const backup = createBackup(schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls)
      exportBackup(backup)
      setMessage({ type: 'success', text: 'バックアップファイルをダウンロードしました' })
    } catch (error) {
      setMessage({ type: 'error', text: 'バックアップの作成に失敗しました' })
    }
  }

  const handleImportBackup = async (file: File) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const backupData: BackupData = await importBackup(file)
      
      if (!validateBackupVersion(backupData)) {
        throw new Error('サポートされていないバージョンのバックアップファイルです')
      }

      const currentData = { schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls }
      const mergedData = mergeBackupData(currentData, backupData.data, restoreMode)
      
      onRestore(mergedData)
      
      const modeText = restoreMode === 'replace' ? '置き換え' : 'マージ'
      setMessage({ 
        type: 'success', 
        text: `データを${modeText}モードで復元しました（${backupData.timestamp}のバックアップ）` 
      })
      
      // ファイル入力をリセット
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
    const total = schedules.length + persons.length + leaveRequests.length + oneTimeWork.length + onCalls.length
    return {
      total,
      details: [
        `医師: ${persons.length}人`,
        `スケジュール: ${schedules.length}件`,
        `休み希望: ${leaveRequests.length}件`,
        `単発勤務: ${oneTimeWork.length}件`,
        `オンコール: ${onCalls.length}件`
      ]
    }
  }

  const summary = getDataSummary()

  // 自動バックアップの情報を取得
  const autoBackups = getAutoBackups()
  const lastAutoBackupTime = getLastAutoBackupTime()

  const handleClearAutoBackups = () => {
    if (confirm(`${autoBackups.length}件の自動バックアップを削除しますか？`)) {
      clearAutoBackups()
      setMessage({ type: 'success', text: '自動バックアップを削除しました' })
    }
  }

  return (
    <div className="backup-restore">
      <div className="auto-backup-section">
        <h3>自動バックアップ状況</h3>
        <div className="auto-backup-info">
          <p><strong>保存されている自動バックアップ数:</strong> {autoBackups.length}件 (最大10件)</p>
          {lastAutoBackupTime && (
            <p><strong>最後の自動バックアップ:</strong> {lastAutoBackupTime.toLocaleString('ja-JP')}</p>
          )}
          {autoBackups.length > 0 && (
            <div className="auto-backup-actions">
              <button 
                onClick={handleClearAutoBackups}
                className="clear-auto-backup-button"
                style={{ backgroundColor: '#ff4757', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🗑️ 自動バックアップをクリア
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="backup-section">
        <h3>データバックアップ</h3>
        <div className="data-summary">
          <p>現在のデータ: 合計 {summary.total} 件</p>
          <ul>
            {summary.details.map((detail, index) => (
              <li key={index}>{detail}</li>
            ))}
          </ul>
        </div>
        <div className="info-section">
          <button 
            onClick={() => setShowSaveInfo(!showSaveInfo)}
            className="info-toggle-button"
          >
            {showSaveInfo ? '📖 説明を隠す' : '❓ 保存先について'}
          </button>
          {showSaveInfo && (
            <div className="save-info">
              <p>💡 <strong>保存先について:</strong></p>
              <ul>
                <li><strong>Chrome/Edge:</strong> 保存先を選択できます</li>
                <li><strong>Firefox/Safari:</strong> デフォルトのダウンロードフォルダに保存</li>
              </ul>
            </div>
          )}
        </div>
        <button 
          onClick={handleExportBackup}
          className="backup-button export-button"
          disabled={summary.total === 0}
        >
          📥 バックアップをダウンロード
        </button>
        {summary.total === 0 && (
          <p className="no-data-message">バックアップするデータがありません</p>
        )}
      </div>

      <div className="restore-section">
        <h3>データ復元</h3>
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
        
        <div className="info-section">
          <button 
            onClick={() => setShowRestoreInfo(!showRestoreInfo)}
            className="info-toggle-button"
          >
            {showRestoreInfo ? '📖 説明を隠す' : '❓ 復元モードの詳細'}
          </button>
          {showRestoreInfo && (
            <div className="restore-info">
              <p>💡 <strong>復元モードについて:</strong></p>
              <ul>
                <li><strong>置き換え:</strong> 既存データを削除して復元</li>
                <li><strong>マージ:</strong> 既存データに追加（重複は除外）</li>
              </ul>
            </div>
          )}
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
            className="backup-button import-button"
            disabled={isLoading}
          >
            {isLoading ? '📤 復元中...' : '📤 バックアップファイルを選択'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
          <button onClick={clearMessage} className="close-message">×</button>
        </div>
      )}

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
    </div>
  )
}

export default BackupRestore