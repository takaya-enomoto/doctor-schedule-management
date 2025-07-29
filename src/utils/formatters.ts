// 表示用フォーマット関数

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { LABELS } from '../constants/labels'
import type { DoctorType, Location, ShiftType } from '../types'

/**
 * 日付を日本語形式でフォーマット
 */
export const formatDate = (date: Date, formatString: string = 'yyyy/MM/dd'): string => {
  return format(date, formatString, { locale: ja })
}

/**
 * 日付と時刻を日本語形式でフォーマット
 */
export const formatDateTime = (date: Date): string => {
  return format(date, 'yyyy/MM/dd HH:mm', { locale: ja })
}

/**
 * 医師タイプを日本語に変換
 */
export const formatDoctorType = (type: DoctorType): string => {
  switch (type) {
    case 'full-time':
      return LABELS.DOCTOR.FULL_TIME
    case 'part-time':
      return LABELS.DOCTOR.PART_TIME
    default:
      return type
  }
}

/**
 * 勤務地を日本語に変換
 */
export const formatLocation = (location: Location): string => {
  switch (location) {
    case 'minoo':
      return LABELS.DOCTOR.MAIN_HOSPITAL
    case 'branch':
      return LABELS.DOCTOR.BRANCH_HOSPITAL
    default:
      return location
  }
}

/**
 * シフトタイプを日本語に変換
 */
export const formatShiftType = (shiftType: ShiftType): string => {
  switch (shiftType) {
    case 'day':
      return LABELS.ONCALL.DAY_SHIFT
    case 'night':
      return LABELS.ONCALL.NIGHT_SHIFT
    case 'all-day':
      return LABELS.ONCALL.ALL_DAY
    default:
      return shiftType
  }
}

/**
 * 曜日番号を日本語に変換 (0=日曜日, 1=月曜日, ...)
 */
export const formatWeekday = (dayIndex: number): string => {
  const weekdays = [
    LABELS.WEEKDAYS.SUNDAY,
    LABELS.WEEKDAYS.MONDAY,
    LABELS.WEEKDAYS.TUESDAY,
    LABELS.WEEKDAYS.WEDNESDAY,
    LABELS.WEEKDAYS.THURSDAY,
    LABELS.WEEKDAYS.FRIDAY,
    LABELS.WEEKDAYS.SATURDAY,
  ]
  return weekdays[dayIndex] || ''
}

/**
 * 月番号を日本語に変換 (1=1月, 2=2月, ...)
 */
export const formatMonth = (month: number): string => {
  return LABELS.MONTHS[month as keyof typeof LABELS.MONTHS] || `${month}月`
}

/**
 * ファイルサイズを人間が読みやすい形式に変換
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 時間範囲を表示用にフォーマット
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  return `${startTime} - ${endTime}`
}

/**
 * 期間を表示用にフォーマット
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * 勤務曜日を表示用にフォーマット
 */
export const formatWorkDays = (workDays: number[]): string => {
  return workDays.map(day => formatWeekday(day)).join(', ')
}

/**
 * データ概要を表示用にフォーマット
 */
export const formatDataSummary = (counts: {
  doctors: number
  schedules: number
  leaveRequests: number
  oneTimeWork: number
  onCalls: number
  nurseOnCalls: number
}): { total: number; details: string[] } => {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
  
  return {
    total,
    details: [
      `${LABELS.DOCTOR.TITLE}: ${counts.doctors}人`,
      `${LABELS.SCHEDULE.TITLE}: ${counts.schedules}件`,
      `${LABELS.LEAVE_REQUEST.TITLE}: ${counts.leaveRequests}件`,
      `${LABELS.ONETIME_WORK.TITLE}: ${counts.oneTimeWork}件`,
      `${LABELS.ONCALL.DOCTOR_ONCALL}: ${counts.onCalls}件`,
      `${LABELS.ONCALL.NURSE_ONCALL}: ${counts.nurseOnCalls}件`
    ]
  }
}