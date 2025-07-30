import { format, isBefore, startOfMonth, endOfMonth } from 'date-fns'

/**
 * 指定された日付が過去の月かどうかを判定する
 * @param date 判定したい日付
 * @returns true: 過去の月, false: 現在または未来の月
 */
export const isPastMonth = (date: Date): boolean => {
  const today = new Date()
  const currentMonthStart = startOfMonth(today)
  const targetMonthEnd = endOfMonth(date)
  
  return isBefore(targetMonthEnd, currentMonthStart)
}

/**
 * 月表示用のフォーマット（例: "2024年07月"）
 * @param date フォーマットしたい日付
 * @returns フォーマットされた文字列
 */
export const formatMonthYear = (date: Date): string => {
  return format(date, 'yyyy年MM月')
}

/**
 * 過去月の編集を試行した際の警告メッセージ
 * @param date 対象の日付
 * @returns 警告メッセージ
 */
export const getPastMonthEditWarning = (date: Date): string => {
  return `${formatMonthYear(date)}の勤務予定は変更できません。過去の月の編集はロックされています。`
}