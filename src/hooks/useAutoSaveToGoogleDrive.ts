import { useEffect, useRef, useState } from 'react'
import googleDriveService from '../utils/googleDriveService'
import { createBackup } from '../utils/backup'
import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'

interface AutoSaveHookProps {
  schedules: WorkSchedule[]
  persons: Person[]
  leaveRequests: LeaveRequest[]
  oneTimeWork: OneTimeWork[]
  onCalls: OnCall[]
  nurseOnCalls: NurseOnCall[]
  autoSaveEnabled: boolean
}

export const useAutoSaveToGoogleDrive = ({
  schedules,
  persons,
  leaveRequests,
  oneTimeWork,
  onCalls,
  nurseOnCalls,
  autoSaveEnabled
}: AutoSaveHookProps) => {
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const saveTimeoutRef = useRef<number | undefined>(undefined)
  const lastDataRef = useRef<string>('')

  // データが変更されたかチェック
  const getCurrentDataHash = () => {
    const data = { schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls }
    return JSON.stringify(data)
  }

  // 自動保存の実行
  const performAutoSave = async () => {
    if (!autoSaveEnabled || !googleDriveService.isSignedIn() || isSaving) {
      return
    }

    const currentDataHash = getCurrentDataHash()
    if (currentDataHash === lastDataRef.current) {
      return // データに変更がない場合はスキップ
    }

    setIsSaving(true)
    setSaveStatus('saving')

    try {
      const backupData = createBackup(schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls)
      await googleDriveService.saveBackup(backupData)
      
      setLastSaveTime(new Date())
      setSaveStatus('success')
      lastDataRef.current = currentDataHash
      
      // 成功メッセージは3秒後に消す
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } catch (error) {
      console.error('自動保存エラー:', error)
      setSaveStatus('error')
      
      // エラーメッセージは5秒後に消す
      setTimeout(() => {
        setSaveStatus('idle')
      }, 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // データ変更の監視と遅延保存
  useEffect(() => {
    if (!autoSaveEnabled) return

    // 既存のタイマーをクリア
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // 30秒後に自動保存実行（連続変更を避けるため）
    saveTimeoutRef.current = window.setTimeout(() => {
      performAutoSave()
    }, 30000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls, autoSaveEnabled])

  // 手動保存
  const manualSave = async () => {
    await performAutoSave()
  }

  return {
    lastSaveTime,
    isSaving,
    saveStatus,
    manualSave
  }
}