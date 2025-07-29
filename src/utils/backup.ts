import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'

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

export const exportBackup = (backupData: BackupData): void => {
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