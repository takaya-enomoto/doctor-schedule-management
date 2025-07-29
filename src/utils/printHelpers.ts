// 印刷時にカラー表示を強制するためのヘルパー関数

export const enableColorPrinting = (): void => {
  // CSSカスタムプロパティでカラー印刷を強制
  const style = document.createElement('style')
  style.textContent = `
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
        -moz-print-color-adjust: exact !important;
        -ms-print-color-adjust: exact !important;
        -o-print-color-adjust: exact !important;
      }
    }
  `
  document.head.appendChild(style)
}

export const forceColorElements = (): void => {
  // 印刷時に特定の要素の色を強制的に保持
  const colorElements = [
    'header',
    '.weekday-header',
    '.weekday',
    '.person-work-item',
    '.onetime-work-item',
    '.oncall-item-day',
    '.calendar-day'
  ]

  colorElements.forEach(selector => {
    const elements = document.querySelectorAll(selector)
    elements.forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.setProperty('-webkit-print-color-adjust', 'exact', 'important')
        element.style.setProperty('color-adjust', 'exact', 'important')
        element.style.setProperty('print-color-adjust', 'exact', 'important')
      }
    })
  })
}

export const setupPrintColorSupport = (): void => {
  // 印刷前の処理
  window.addEventListener('beforeprint', () => {
    enableColorPrinting()
    forceColorElements()
  })

  // ページ読み込み時にもカラー設定を適用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enableColorPrinting()
    })
  } else {
    enableColorPrinting()
  }
}