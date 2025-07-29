import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { OneTimeWork } from '../types'

interface OneTimeWorkListProps {
  oneTimeWork: OneTimeWork[]
  onRemoveOneTimeWork: (id: string) => void
}

const OneTimeWorkList: React.FC<OneTimeWorkListProps> = ({ oneTimeWork, onRemoveOneTimeWork }) => {
  const handleRemove = (id: string) => {
    try {
      onRemoveOneTimeWork(id)
    } catch (error) {
      console.error('Error removing one-time work:', error)
      alert('削除中にエラーが発生しました。ページをリロードしてお試しください。')
    }
  }

  if (oneTimeWork.length === 0) {
    return (
      <div className="onetime-work-list">
        <h2>単発勤務一覧</h2>
        <p className="no-onetime-work">まだ単発勤務が登録されていません。</p>
      </div>
    )
  }

  // 日付順でソート（安全な処理）
  const sortedWork = [...oneTimeWork].sort((a, b) => {
    try {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date)
      const dateB = b.date instanceof Date ? b.date : new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    } catch (error) {
      console.error('Error sorting dates:', error)
      return 0
    }
  })

  return (
    <div className="onetime-work-list">
      <h2>単発勤務一覧 ({oneTimeWork.length}件)</h2>
      <div className="onetime-work-items">
        {sortedWork.map((work) => (
          <div key={work.id} className={`onetime-work-item ${work.isRecruiting ? 'recruiting' : ''}`}>
            <div className="onetime-work-info">
              <div className="onetime-work-name">
                {work.isRecruiting ? '未定（募集中）' : work.name}
                {work.isRecruiting && <span className="recruiting-badge">募集中</span>}
              </div>
              <div className="onetime-work-date">
                {(() => {
                  try {
                    const date = work.date instanceof Date ? work.date : new Date(work.date)
                    return format(date, 'yyyy年MM月dd日 (E)', { locale: ja })
                  } catch (error) {
                    console.error('Error formatting date:', error)
                    return '日付エラー'
                  }
                })()}
              </div>
              <div className="onetime-work-time">
                {work.startTime} - {work.endTime}
              </div>
              <div className="onetime-work-location">
                {work.location === 'minoo' ? '本院箕面' : '分院茨木'}
              </div>
              {work.description && (
                <div className="onetime-work-description">
                  {work.description}
                </div>
              )}
            </div>
            <button
              onClick={() => handleRemove(work.id)}
              className="remove-button"
              title={`${work.name}の単発勤務を削除`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default OneTimeWorkList