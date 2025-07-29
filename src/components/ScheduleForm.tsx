import { useState } from 'react'
import { format } from 'date-fns'
import type { WorkSchedule } from '../types'
import { getWeekDayName } from '../utils/scheduleGenerator'

interface ScheduleFormProps {
  onAddSchedule: (schedule: WorkSchedule) => void
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ onAddSchedule }) => {
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('18:00')
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')

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
    
    const schedule: WorkSchedule = {
      id: Date.now().toString(),
      startTime,
      endTime,
      workDays,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description || undefined
    }

    onAddSchedule(schedule)
    
    setDescription('')
  }

  return (
    <div className="schedule-form">
      <h2>勤務スケジュール設定</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="start-time">開始時間:</label>
          <input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-time">終了時間:</label>
          <input
            id="end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>勤務曜日:</label>
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
          <label htmlFor="start-date">開始日:</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="end-date">終了日:</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">備考:</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="オプション"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            スケジュール追加
          </button>
        </div>

        {workDays.length > 0 && (
          <div className="preview">
            <h3>プレビュー:</h3>
            <p>勤務時間: {startTime} - {endTime}</p>
            <p>勤務曜日: {workDays.map(day => getWeekDayName(day)).join(', ')}</p>
            <p>期間: {startDate} ～ {endDate}</p>
            {description && <p>備考: {description}</p>}
          </div>
        )}
      </form>
    </div>
  )
}

export default ScheduleForm