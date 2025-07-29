import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { WorkSchedule } from '../types'
import { getWeekDayName } from '../utils/scheduleGenerator'

interface ScheduleListProps {
  schedules: WorkSchedule[]
  onRemoveSchedule: (id: string) => void
}

const ScheduleList: React.FC<ScheduleListProps> = ({ schedules, onRemoveSchedule }) => {
  if (schedules.length === 0) {
    return (
      <div className="schedule-list">
        <h2>登録済みスケジュール</h2>
        <p className="no-schedules">まだスケジュールが登録されていません。</p>
      </div>
    )
  }

  return (
    <div className="schedule-list">
      <h2>登録済みスケジュール</h2>
      <div className="schedule-items">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="schedule-item">
            <div className="schedule-info">
              <div className="schedule-time">
                {schedule.startTime} - {schedule.endTime}
              </div>
              <div className="schedule-days">
                {schedule.workDays.map(day => getWeekDayName(day)).join(', ')}
              </div>
              <div className="schedule-period">
                {format(schedule.startDate, 'yyyy/MM/dd', { locale: ja })} - 
                {format(schedule.endDate, 'yyyy/MM/dd', { locale: ja })}
              </div>
              {schedule.description && (
                <div className="schedule-description">
                  {schedule.description}
                </div>
              )}
            </div>
            <button
              onClick={() => onRemoveSchedule(schedule.id)}
              className="remove-button"
              title="スケジュールを削除"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScheduleList