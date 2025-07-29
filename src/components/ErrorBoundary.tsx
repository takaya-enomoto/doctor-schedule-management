import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    // エラーが発生した場合、フォールバックUIを表示
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Calendar Error Boundary caught an error:', error, errorInfo)
    
    // 開発環境でのみ詳細ログ
    if (import.meta.env?.DEV) {
      console.error('Error details:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      })
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined })
    // ページを強制リロードしてクリーンな状態に戻す
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <h1>カレンダーでエラーが発生しました</h1>
            <p>申し訳ございませんが、予期しないエラーが発生しました。</p>
            {import.meta.env?.DEV && this.state.error && (
              <details>
                <summary>エラー詳細（開発者向け）</summary>
                <pre>{this.state.error.stack}</pre>
              </details>
            )}
            <button onClick={this.handleReset} className="error-reset-button">
              アプリケーションをリセット
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary