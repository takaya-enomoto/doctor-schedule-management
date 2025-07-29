import { useState } from 'react'
import type { OneTimeWork, Location } from '../types'

interface OneTimeWorkFormProps {
  onAddOneTimeWork: (work: OneTimeWork) => void
}

const OneTimeWorkForm: React.FC<OneTimeWorkFormProps> = ({ onAddOneTimeWork }) => {
  const [name, setName] = useState('')
  const [date, setDate] = useState(() => {
    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('Error formatting initial date:', error)
      return '2025-07-22'
    }
  })
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [location, setLocation] = useState<Location>('minoo')
  const [description, setDescription] = useState('')
  const [isRecruiting, setIsRecruiting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    try {
      e.preventDefault()
      
      if (!isRecruiting && !name.trim()) {
        alert('名前を入力してください（募集中の場合は「未定（募集中）」にチェックしてください）')
        return
      }

      // 日付の検証
      if (!date) {
        alert('勤務日を選択してください')
        return
      }

      const parsedDate = new Date(date + 'T00:00:00')
      if (isNaN(parsedDate.getTime())) {
        alert('有効な日付を選択してください')
        return
      }

      const oneTimeWork: OneTimeWork = {
        id: Date.now().toString(),
        name: isRecruiting ? '未定（募集中）' : name.trim(),
        date: parsedDate,
        startTime,
        endTime,
        location,
        description: description.trim() || undefined,
        isRecruiting
      }

      onAddOneTimeWork(oneTimeWork)
      
      // フォームをリセット
      setName('')
      setDescription('')
      setStartTime('09:00')
      setEndTime('18:00')
      setIsRecruiting(false)
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert('フォーム送信でエラーが発生しました。ページをリロードしてお試しください。')
    }
  }

  return (
    <div className="onetime-work-form">
      <h2>単発勤務登録</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isRecruiting}
              onChange={(e) => {
                try {
                  setIsRecruiting(e.target.checked)
                } catch (error) {
                  console.error('Error in recruiting checkbox:', error)
                }
              }}
            />
            未定（募集中）
          </label>
        </div>

        <div className="form-group">
          <label htmlFor="worker-name">名前 {!isRecruiting && '*'}:</label>
          <input
            id="worker-name"
            type="text"
            value={name}
            onChange={(e) => {
              try {
                setName(e.target.value)
              } catch (error) {
                console.error('Error in name input:', error)
              }
            }}
            placeholder={isRecruiting ? "募集中のため未定" : "田中 花子"}
            required={!isRecruiting}
            disabled={isRecruiting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="work-date">勤務日 *:</label>
          <input
            id="work-date"
            type="date"
            value={date}
            onChange={(e) => {
              try {
                setDate(e.target.value)
              } catch (error) {
                console.error('Error setting date:', error)
              }
            }}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="onetime-start-time">開始時間:</label>
          <input
            id="onetime-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="onetime-end-time">終了時間:</label>
          <input
            id="onetime-end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="onetime-location">勤務場所:</label>
          <select
            id="onetime-location"
            value={location}
            onChange={(e) => setLocation(e.target.value as Location)}
          >
            <option value="minoo">本院箕面</option>
            <option value="ibaraki">分院茨木</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="onetime-description">備考:</label>
          <input
            id="onetime-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="派遣、臨時など"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            単発勤務を追加
          </button>
        </div>

        <div className="preview">
          <h3>プレビュー:</h3>
          <p>名前: {(() => {
            try {
              return isRecruiting ? '未定（募集中）' : (name || '未入力')
            } catch (error) {
              console.error('Error in preview name:', error)
              return '表示エラー'
            }
          })()}</p>
          <p>勤務日: {date || '未設定'}</p>
          <p>勤務時間: {startTime || '未設定'} - {endTime || '未設定'}</p>
          <p>勤務場所: {(() => {
            try {
              return location === 'minoo' ? '本院箕面' : '分院茨木'
            } catch (error) {
              console.error('Error in preview location:', error)
              return '表示エラー'
            }
          })()}</p>
          {description && <p>備考: {description}</p>}
          {isRecruiting && <p>⚠️ 募集中のため担当者未定です</p>}
        </div>
      </form>
    </div>
  )
}

export default OneTimeWorkForm