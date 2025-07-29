import { createBackup, exportBackup } from './backup'
import type { BackupData } from './backup'
import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'

interface AutoBackupData {
  schedules: WorkSchedule[]
  persons: Person[]
  leaveRequests: LeaveRequest[]
  oneTimeWork: OneTimeWork[]
  onCalls: OnCall[]
  nurseOnCalls: NurseOnCall[]
}

// ローカルストレージキー
const AUTO_BACKUP_KEY = 'doctor-schedule-auto-backup'
const LAST_AUTO_BACKUP_KEY = 'doctor-schedule-last-auto-backup'

// 自動バックアップ設定
const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000 // 24時間（ミリ秒）
const MAX_AUTO_BACKUPS = 7 // 保持する自動バックアップの最大数

export const shouldCreateAutoBackup = (): boolean => {
  try {
    const lastBackupTime = localStorage.getItem(LAST_AUTO_BACKUP_KEY)
    
    if (!lastBackupTime) {
      return true // 初回バックアップ
    }
    
    const lastBackupDate = new Date(lastBackupTime).getTime()
    const now = new Date().getTime()
    
    return (now - lastBackupDate) >= AUTO_BACKUP_INTERVAL
  } catch (error) {
    console.error('Error checking auto backup status:', error)
    return false
  }
}

export const createAutoBackup = (data: AutoBackupData): void => {
  try {
    const backupData = createBackup(
      data.schedules,
      data.persons,
      data.leaveRequests,
      data.oneTimeWork,
      data.onCalls,
      data.nurseOnCalls
    )
    
    // 既存の自動バックアップを取得
    const existingBackups = getAutoBackups()
    
    // 新しいバックアップを追加
    existingBackups.push(backupData)
    
    // 最大数を超えた場合は古いものを削除
    if (existingBackups.length > MAX_AUTO_BACKUPS) {
      existingBackups.splice(0, existingBackups.length - MAX_AUTO_BACKUPS)
    }
    
    // ローカルストレージに保存
    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(existingBackups))
    localStorage.setItem(LAST_AUTO_BACKUP_KEY, new Date().toISOString())
    
    console.log('Auto backup created successfully')
  } catch (error) {
    console.error('Error creating auto backup:', error)
  }
}

export const getAutoBackups = (): BackupData[] => {
  try {
    const stored = localStorage.getItem(AUTO_BACKUP_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error retrieving auto backups:', error)
    return []
  }
}

export const exportAutoBackup = (backup: BackupData): void => {
  try {
    exportBackup(backup)
  } catch (error) {
    console.error('Error exporting auto backup:', error)
  }
}

export const getLastAutoBackupTime = (): Date | null => {
  try {
    const lastBackupTime = localStorage.getItem(LAST_AUTO_BACKUP_KEY)
    return lastBackupTime ? new Date(lastBackupTime) : null
  } catch (error) {
    console.error('Error getting last auto backup time:', error)
    return null
  }
}

export const clearAutoBackups = (): void => {
  try {
    localStorage.removeItem(AUTO_BACKUP_KEY)
    localStorage.removeItem(LAST_AUTO_BACKUP_KEY)
    console.log('Auto backups cleared')
  } catch (error) {
    console.error('Error clearing auto backups:', error)
  }
}

// データの変更を検知して自動バックアップを実行
export const checkAndCreateAutoBackup = (data: AutoBackupData): void => {
  if (shouldCreateAutoBackup()) {
    createAutoBackup(data)
  }
}