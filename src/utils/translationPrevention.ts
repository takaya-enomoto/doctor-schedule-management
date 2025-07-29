// ブラウザの自動翻訳を防止するためのユーティリティ
import React from 'react'

/**
 * 特定の要素に翻訳防止属性を設定
 */
export const preventTranslation = (element: HTMLElement): void => {
  element.setAttribute('translate', 'no')
  element.classList.add('notranslate')
  
  // Google翻訳用の属性も追加
  element.setAttribute('data-translate', 'no')
  
  // 子要素にも適用
  const children = element.querySelectorAll('*')
  children.forEach(child => {
    if (child instanceof HTMLElement) {
      child.setAttribute('translate', 'no')
      child.classList.add('notranslate')
    }
  })
}

/**
 * 特定のテキストを含む要素に翻訳防止を適用
 */
export const preventTranslationForText = (text: string): void => {
  const elements = document.querySelectorAll('*')
  elements.forEach(element => {
    if (element.textContent?.includes(text)) {
      if (element instanceof HTMLElement) {
        preventTranslation(element)
      }
    }
  })
}

/**
 * アプリケーション全体の翻訳防止初期化
 */
export const initializeTranslationPrevention = (): void => {
  // ページ全体に翻訳防止メタ情報を設定
  const html = document.documentElement
  html.setAttribute('translate', 'no')
  html.classList.add('notranslate')
  
  // 重要なキーワードを含む要素を保護
  const protectedTexts = [
    'オンコール',
    '看護師オンコール',
    '医師オンコール',
    '常勤',
    '非常勤'
  ]
  
  protectedTexts.forEach(text => {
    preventTranslationForText(text)
  })
  
  // MutationObserverで動的に追加される要素も監視
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          protectedTexts.forEach(text => {
            if (node.textContent?.includes(text)) {
              preventTranslation(node)
            }
          })
        }
      })
    })
  })
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

/**
 * 特定のコンポーネントを翻訳から保護
 */
export const protectComponent = (componentRef: React.RefObject<HTMLElement>): void => {
  if (componentRef.current) {
    preventTranslation(componentRef.current)
  }
}

/**
 * React コンポーネント用のHOC（Higher Order Component）
 */

export const withTranslationProtection = <P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.ComponentType<P> => {
  return (props: P) => {
    const ref = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
      if (ref.current) {
        preventTranslation(ref.current)
      }
    }, [])
    
    return (
      <div ref={ref} className="notranslate" translate="no">
        <WrappedComponent {...props} />
      </div>
    )
  }
}