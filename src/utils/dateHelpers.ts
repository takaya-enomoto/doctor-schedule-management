import { format } from 'date-fns'

/**
 * 安全な日付作成 - タイムゾーン問題を防ぐ
 * 文字列形式 "YYYY-MM-DD" から確実にローカル日付を作成
 */
export const createSafeDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  
  // 入力値の検証
  if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date string: ${dateString}`)
  }
  
  return new Date(year, month - 1, day) // monthは0ベース
}

/**
 * 安全な日付フォーマット - 一貫したフォーマットを保証
 */
export const formatSafeDate = (date: Date): string => {
  // 無効な日付のチェック
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date object provided')
  }
  
  return format(date, 'yyyy-MM-dd')
}

/**
 * Reactキー用の安全な日付ID生成
 */
export const getDateKey = (date: Date): string => {
  return formatSafeDate(date)
}

/**
 * 今日の日付を一度だけ作成するキャッシュ
 */
let todayCache: Date | null = null
let todayCacheDate: string | null = null

export const getTodaySafe = (): Date => {
  const currentDateString = format(new Date(), 'yyyy-MM-dd')
  
  // 日付が変わった場合のみキャッシュを更新
  if (todayCacheDate !== currentDateString) {
    todayCache = new Date()
    todayCacheDate = currentDateString
  }
  
  return todayCache!
}

/**
 * 月境界での安全な比較
 */
export const isSafeSameDay = (date1: Date, date2: Date): boolean => {
  if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
    return false
  }
  
  return formatSafeDate(date1) === formatSafeDate(date2)
}