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

    // 1秒ごとに認証状態をチェック（GoogleDriveSyncと同様）
    const interval = setInterval(checkAuthStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  return {
    isAuthenticated,
    isLoading
  }
}