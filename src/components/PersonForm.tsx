import { useState } from 'react'
import type { Person, WorkPattern, EmploymentType, Location } from '../types'
import { getWeekDayName } from '../utils/scheduleGenerator'
import { getNextAvailableColor } from '../utils/personUtils'

interface PersonFormProps {
  onAddPerson: (person: Person) => void
  existingPersons: Person[]
}

const PersonForm: React.FC<PersonFormProps> = ({ onAddPerson, existingPersons }) => {
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [description, setDescription] = useState('')
  const [workPattern, setWorkPattern] = useState<WorkPattern>('all-weeks')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('full-time')
  const [location, setLocation] = useState<Location>('minoo')

  const weekDayOptions = [
    { value: 0, label: '日曜日' },
    { value: 1, label: '月曜日' },
    { value: 2, label: '火曜日' },
    { value: 3, label: '水曜日' },
    { value: 4, label: '木曜日' },
    { value: 5, label: '金曜日' },
    { value: 6, label: '土曜日' }
  ]

  const handleWorkDayChange = (dayValue: number) => {
    if (workDays.includes(dayValue)) {
      setWorkDays(workDays.filter(day => day !== dayValue))
    } else {
      setWorkDays([...workDays, dayValue].sort())
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      alert('名前を入力してください')
      return
    }

    if (workDays.length === 0) {
      alert('勤務曜日を選択してください')
      return
    }

    const person: Person = {
      id: Date.now().toString(),
      name: name.trim(),
      workDays,
      startTime,
      endTime,
      color: getNextAvailableColor(existingPersons),
      description: description.trim() || undefined,
      workPattern,
      employmentType,
      location
    }

    onAddPerson(person)
    
    // フォームをリセット
    setName('')
    setDescription('')
    setWorkDays([1, 2, 3, 4, 5])
    setStartTime('09:00')
    setEndTime('18:00')
    setWorkPattern('all-weeks')
    setEmploymentType('full-time')
    setLocation('minoo')
  }

  return (
    <div className="person-form">
      <h2>医師登録</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="person-name">名前 *:</label>
          <input
            id="person-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="person-start-time">開始時間:</label>
          <input
            id="person-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="person-end-time">終了時間:</label>
          <input
            id="person-end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>勤務曜日 *:</label>
          <div className="checkbox-group">
            {weekDayOptions.map(option => (
              <label key={option.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={workDays.includes(option.value)}
                  onChange={() => handleWorkDayChange(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="work-pattern">勤務パターン:</label>
          <select
            id="work-pattern"
            value={workPattern}
            onChange={(e) => setWorkPattern(e.target.value as WorkPattern)}
          >
            <option value="all-weeks">毎週</option>
            <option value="week-1-3">第1・3週のみ</option>
            <option value="week-2-4">第2・4週のみ</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="employment-type">雇用形態:</label>
          <select
            id="employment-type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
          >
            <option value="full-time">常勤</option>
            <option value="part-time">非常勤</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="location">勤務場所:</label>
          <select
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value as Location)}
          >
            <option value="minoo">本院箕面</option>
            <option value="ibaraki">分院茨木</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="person-description">備考:</label>
          <input
            id="person-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="役職、部署など"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            人員を追加
          </button>
        </div>

        {workDays.length > 0 && (
          <div className="preview">
            <h3>プレビュー:</h3>
            <p>名前: {name || '未入力'}</p>
            <p>勤務時間: {startTime} - {endTime}</p>
            <p>勤務曜日: {workDays.map(day => getWeekDayName(day)).join(', ')}</p>
            <p>勤務パターン: {
              workPattern === 'all-weeks' ? '毎週' :
              workPattern === 'week-1-3' ? '第1・3週のみ' :
              '第2・4週のみ'
            }</p>
            <p>雇用形態: {employmentType === 'full-time' ? '常勤' : '非常勤'}</p>
            <p>勤務場所: {location === 'minoo' ? '本院箕面' : '分院茨木'}</p>
            {description && <p>備考: {description}</p>}
          </div>
        )}
      </form>
    </div>
  )
}

export default PersonForm