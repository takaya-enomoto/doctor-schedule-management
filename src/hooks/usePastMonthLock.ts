import { useCallback, useState } from 'react'
import { isPastMonth, getPastMonthEditWarning } from '../utils/dateUtils'

interface UsePastMonthLockResult {
  /**
   * 指定された日付が過去月でないかチェックし、過去月の場合は警告を表示して操作をブロック
   * @param date チェックする日付
   * @returns true: 操作続行可能, false: 操作ブロック
   */
  checkPastMonthEdit: (date: Date) => boolean
  
  /**
   * 複数の日付をまとめてチェック（期間指定の場合）
   * @param dates チェックする日付の配列
   * @returns true: 操作続行可能, false: 操作ブロック
   */
  checkPastMonthEditForDates: (dates: Date[]) => boolean
  
  /**
   * 指定された日付が過去月かどうかを返す（警告なし）
   * @param date チェックする日付
   * @returns true: 過去月, false: 現在または未来月
   */
  isPastMonthDate: (date: Date) => boolean
  
  /**
   * 過去月ロック機能が有効かどうか
   */
  isLockEnabled: boolean
  
  /**
   * 過去月ロック機能のON/OFF切り替え
   * @param enabled true: ロック有効, false: ロック無効
   */
  setLockEnabled: (enabled: boolean) => void
}

export const usePastMonthLock = (): UsePastMonthLockResult => {
  // デフォルトでON
  const [isLockEnabled, setIsLockEnabled] = useState(true)
  const checkPastMonthEdit = useCallback((date: Date): boolean => {
    if (isLockEnabled && isPastMonth(date)) {
      alert(getPastMonthEditWarning(date))
      return false
    }
    return true
  }, [isLockEnabled])

  const checkPastMonthEditForDates = useCallback((dates: Date[]): boolean => {
    if (!isLockEnabled) return true
    
    for (const date of dates) {
      if (isPastMonth(date)) {
        alert(getPastMonthEditWarning(date))
        return false
      }
    }
    return true
  }, [isLockEnabled])

  const isPastMonthDate = useCallback((date: Date): boolean => {
    return isPastMonth(date)
  }, [])

  return {
    checkPastMonthEdit,
    checkPastMonthEditForDates,
    isPastMonthDate,
    isLockEnabled,
    setLockEnabled: setIsLockEnabled
  }
}