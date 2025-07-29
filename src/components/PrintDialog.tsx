import { useState } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { Location } from '../types'

interface PrintOptions {
  includeOnCall: boolean
  includeNurseOnCall: boolean
  includeFullTime: boolean
  includePartTime: boolean
  printRange: 'current' | 'next' | 'both'
}

interface PrintDialogProps {
  currentDate: Date
  selectedLocation: Location
  showOnCall: boolean
  showNurseOnCall: boolean
  showFullTime: boolean
  showPartTime: boolean
  onPrint: (options: PrintOptions) => void
  onClose: () => void
}

const PrintDialog: React.FC<PrintDialogProps> = ({
  currentDate,
  selectedLocation,
  showOnCall,
  showNurseOnCall,
  showFullTime,
  showPartTime,
  onPrint,
  onClose
}) => {
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    includeOnCall: showOnCall,
    includeNurseOnCall: showNurseOnCall,
    includeFullTime: showFullTime,
    includePartTime: showPartTime,
    printRange: 'current'
  })
  const [showPrintInfo, setShowPrintInfo] = useState(false)

  const locationName = selectedLocation === 'minoo' ? '本院箕面' : '分院茨木'
  const currentMonth = format(currentDate, 'yyyy年MM月', { locale: ja })
  const nextMonth = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1), 'yyyy年MM月', { locale: ja })

  const handlePrint = () => {
    onPrint(printOptions)
  }

  const handlePreview = () => {
    // プレビュー機能は印刷と同じ処理を行い、ブラウザのプレビューを利用
    handlePrint()
  }

  return (
    <div className="print-dialog">
      <h3>📄 カレンダー印刷設定</h3>
      
      <div className="print-info">
        <p><strong>現在の表示:</strong> {currentMonth} - {locationName}</p>
      </div>

      <div className="print-options">
        <div className="option-group">
          <h4>📅 印刷範囲</h4>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="printRange"
                value="current"
                checked={printOptions.printRange === 'current'}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, printRange: e.target.value as 'current' }))}
              />
              現在の月のみ ({currentMonth})
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="printRange"
                value="next"
                checked={printOptions.printRange === 'next'}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, printRange: e.target.value as 'next' }))}
              />
              翌月のみ ({nextMonth})
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="printRange"
                value="both"
                checked={printOptions.printRange === 'both'}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, printRange: e.target.value as 'both' }))}
              />
              現在の月と翌月 (2ページ)
            </label>
          </div>
        </div>

        <div className="option-group">
          <h4>👥 表示する人員</h4>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={printOptions.includeFullTime}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, includeFullTime: e.target.checked }))}
              />
              常勤スタッフ
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={printOptions.includePartTime}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, includePartTime: e.target.checked }))}
              />
              非常勤スタッフ
            </label>
          </div>
        </div>

        <div className="option-group">
          <h4>📞 その他の情報</h4>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={printOptions.includeOnCall}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, includeOnCall: e.target.checked }))}
              />
              オンコール情報
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={printOptions.includeNurseOnCall}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, includeNurseOnCall: e.target.checked }))}
              />
              看護師オンコール情報
            </label>
          </div>
        </div>
      </div>

      <div className="info-section">
        <button 
          onClick={() => setShowPrintInfo(!showPrintInfo)}
          className="info-toggle-button"
        >
          {showPrintInfo ? '📖 説明を隠す' : '❓ カラー印刷ガイド'}
        </button>
        {showPrintInfo && (
          <div className="print-info-content">
            <div className="browser-guide">
              <h5>📋 カラー印刷の確実な手順：</h5>
              <div className="browser-steps">
                <div className="browser-step important-step">
                  <strong>🔥 最重要：印刷プレビューでカラー確認</strong>
                  <ol>
                    <li>「👀 プレビュー」ボタンをクリック</li>
                    <li>ブラウザの印刷プレビューでカラーが表示されることを確認</li>
                    <li>白黒の場合は以下の設定を確認してください</li>
                  </ol>
                </div>
                <div className="browser-step">
                  <strong>Chrome・Edge:</strong>
                  <ol>
                    <li>印刷画面で「詳細設定」をクリック</li>
                    <li>「背景のグラフィック」を必ずONにする</li>
                    <li>プリンター設定で「カラー」を選択</li>
                    <li>「印刷品質」を「高品質」に設定</li>
                  </ol>
                </div>
                <div className="browser-step">
                  <strong>Firefox:</strong>
                  <ol>
                    <li>印刷画面で「ページ設定」をクリック</li>
                    <li>「背景色と背景画像も印刷する」をチェック</li>
                    <li>プリンター設定で「カラー印刷」を選択</li>
                  </ol>
                </div>
                <div className="browser-step">
                  <strong>Safari:</strong>
                  <ol>
                    <li>印刷画面で「詳細」を展開</li>
                    <li>「背景を印刷」をチェック</li>
                    <li>「カラーマッチング」をONにする</li>
                  </ol>
                </div>
              </div>
              <div className="troubleshooting">
                <h6>⚠️ プレビューが白黒の場合の対処：</h6>
                <ul>
                  <li>ブラウザを再読み込み（F5）してから再度印刷</li>
                  <li>プリンタードライバーでカラー印刷が有効か確認</li>
                  <li>プリンターのカラーインクが十分か確認</li>
                  <li>PDF保存してから印刷（より確実）</li>
                </ul>
              </div>
            </div>
            <div className="color-benefits">
              <h5>🌈 カラー印刷の効果：</h5>
              <ul>
                <li><span style={{color: '#27ae60'}}>■</span> 緑色：通常の人員スケジュール</li>
                <li><span style={{color: '#17a2b8'}}>■</span> 青色：常勤スタッフ</li>
                <li><span style={{color: '#ffc107'}}>■</span> 黄色：非常勤スタッフ</li>
                <li><span style={{color: '#fd7e14'}}>■</span> オレンジ：単発勤務</li>
                <li><span style={{color: '#dc3545'}}>■</span> 赤色：募集中（要注意）</li>
                <li><span style={{color: '#8e44ad'}}>■</span> 紫色：オンコール担当</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="print-actions">
        <button type="button" className="print-button preview" onClick={handlePreview}>
          👀 プレビュー
        </button>
        <button type="button" className="print-button print" onClick={handlePrint}>
          🖨️ 印刷実行
        </button>
        <button type="button" className="print-button cancel" onClick={onClose}>
          キャンセル
        </button>
      </div>
    </div>
  )
}

export default PrintDialog