import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'
import { GOOGLE_DRIVE_CONFIG } from './googleDriveConfig'

export interface BackupData {
  version: string
  timestamp: string
  data: {
    schedules: WorkSchedule[]
    persons: Person[]
    leaveRequests: LeaveRequest[]
    oneTimeWork: OneTimeWork[]
    onCalls: OnCall[]
    nurseOnCalls: NurseOnCall[]
  }
}

export const createBackup = (
  schedules: WorkSchedule[],
  persons: Person[],
  leaveRequests: LeaveRequest[],
  oneTimeWork: OneTimeWork[],
  onCalls: OnCall[],
  nurseOnCalls: NurseOnCall[]
): BackupData => {
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: {
      schedules,
      persons,
      leaveRequests,
      oneTimeWork,
      onCalls,
      nurseOnCalls
    }
  }
}

// ローカルバックアップ数の制限機能
const LOCAL_BACKUP_KEY = 'local-backup-count'

const getLocalBackupCountInternal = (): number => {
  try {
    return parseInt(localStorage.getItem(LOCAL_BACKUP_KEY) || '0', 10)
  } catch {
    return 0
  }
}

const incrementBackupCount = (): void => {
  try {
    const current = getLocalBackupCountInternal()
    localStorage.setItem(LOCAL_BACKUP_KEY, (current + 1).toString())
  } catch (error) {
    console.warn('バックアップカウントの更新に失敗:', error)
  }
}

const resetBackupCount = (): void => {
  try {
    localStorage.setItem(LOCAL_BACKUP_KEY, '0')
  } catch (error) {
    console.warn('バックアップカウントのリセットに失敗:', error)
  }
}

export const exportBackup = (backupData: BackupData): void => {
  // ローカルバックアップ数のチェック
  const currentCount = getLocalBackupCountInternal()
  if (currentCount >= GOOGLE_DRIVE_CONFIG.MAX_LOCAL_BACKUPS) {
    const shouldContinue = confirm(
      `ローカルバックアップが上限（${GOOGLE_DRIVE_CONFIG.MAX_LOCAL_BACKUPS}個）に達しています。\n` +
      'これ以上のバックアップ作成は推奨されません。\n' +
      'Google Driveでの共有を使用することを推奨します。\n\n' +
      'それでもバックアップを作成しますか？'
    )
    if (!shouldContinue) {
      return
    }
  }
  
  const dataStr = JSON.stringify(backupData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  // より詳細なファイル名を生成
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
  const fileName = `医師出勤管理_バックアップ_${dateStr}_${timeStr}.json`
  
  // File System Access API が利用可能な場合（Chrome系）
  if ('showSaveFilePicker' in window) {
    saveWithFilePicker(dataBlob, fileName)
  } else {
    // 従来の方法（Firefox、Safari等）
    saveWithDownloadLink(dataBlob, fileName)
  }
}

// File System Access API を使用した保存（保存先選択可能）
const saveWithFilePicker = async (dataBlob: Blob, fileName: string): Promise<void> => {
  try {
    // @ts-ignore - File System Access API
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: fileName,
      types: [{
        description: 'JSON files',
        accept: { 'application/json': ['.json'] }
      }]
    })
    
    const writable = await fileHandle.createWritable()
    await writable.write(dataBlob)
    await writable.close()
    
    // バックアップ成功時にカウントを増やす
    incrementBackupCount()
  } catch (error) {
    // ユーザーがキャンセルした場合は従来の方法にフォールバック
    if (error instanceof Error && error.name !== 'AbortError') {
      console.error('File save error:', error)
    }
    saveWithDownloadLink(dataBlob, fileName)
  }
}

// 従来のダウンロードリンク方式
const saveWithDownloadLink = (dataBlob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  // バックアップ成功時にカウントを増やす
  incrementBackupCount()
}

// バックアップカウントのリセット機能を公開
export const resetLocalBackupCount = (): void => {
  resetBackupCount()
}

// 現在のバックアップ数を取得する機能を公開
export const getLocalBackupCount = (): number => {
  return getLocalBackupCountInternal()
}

export const importBackup = (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const backupData: BackupData = JSON.parse(content)
        
        // バックアップデータの検証
        if (!validateBackupData(backupData)) {
          reject(new Error('無効なバックアップファイルです'))
          return
        }
        
        resolve(backupData)
      } catch (error) {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込みに失敗しました'))
    }
    
    reader.readAsText(file)
  })
}

const validateBackupData = (data: any): data is BackupData => {
  if (!data || typeof data !== 'object') return false
  if (!data.version || !data.timestamp || !data.data) return false
  
  const { schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls } = data.data
  
  return (
    Array.isArray(schedules) &&
    Array.isArray(persons) &&
    Array.isArray(leaveRequests) &&
    Array.isArray(oneTimeWork) &&
    Array.isArray(onCalls) &&
    Array.isArray(nurseOnCalls || []) // 下位互換性のため
  )
}

export const validateBackupVersion = (backupData: BackupData): boolean => {
  const supportedVersions = ['1.0.0']
  return supportedVersions.includes(backupData.version)
}

export const mergeBackupData = (
  current: {
    schedules: WorkSchedule[]
    persons: Person[]
    leaveRequests: LeaveRequest[]
    oneTimeWork: OneTimeWork[]
    onCalls: OnCall[]
    nurseOnCalls: NurseOnCall[]
  },
  backup: BackupData['data'],
  mode: 'replace' | 'merge' = 'replace'
): {
  schedules: WorkSchedule[]
  persons: Person[]
  leaveRequests: LeaveRequest[]
  oneTimeWork: OneTimeWork[]
  onCalls: OnCall[]
  nurseOnCalls: NurseOnCall[]
} => {
  if (mode === 'replace') {
    return {
      ...backup,
      nurseOnCalls: backup.nurseOnCalls || [] // 下位互換性のため
    }
  }
  
  // マージモード：既存データに追加（重複は除外）
  const mergeArrays = <T extends { id: string }>(currentArray: T[], backupArray: T[]): T[] => {
    const existingIds = new Set(currentArray.map(item => item.id))
    const newItems = backupArray.filter(item => !existingIds.has(item.id))
    return [...currentArray, ...newItems]
  }
  
  return {
    schedules: mergeArrays(current.schedules, backup.schedules),
    persons: mergeArrays(current.persons, backup.persons),
    leaveRequests: mergeArrays(current.leaveRequests, backup.leaveRequests),
    oneTimeWork: mergeArrays(current.oneTimeWork, backup.oneTimeWork),
    onCalls: mergeArrays(current.onCalls, backup.onCalls),
    nurseOnCalls: mergeArrays(current.nurseOnCalls, backup.nurseOnCalls || [])
  }
}