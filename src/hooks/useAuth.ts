import { useState, useEffect } from 'react'
import googleDriveService from '../utils/googleDriveService'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 認証状態を定期的にチェック
  useEffect(() => {
    const checkAuthStatus = () => {
      const authenticated = googleDriveService.isSignedIn()
      setIsAuthenticated(authenticated)
      setIsLoading(false)
    }

    // 初回チェック
    checkAuthStatus()

    // 10秒ごとに認証状態をチェック（頻度を下げて無限ループを防止）
    const interval = setInterval(checkAuthStatus, 10000)

    return () => clearInterval(interval)
  }, [])

  return {
    isAuthenticated,
    isLoading
  }
}