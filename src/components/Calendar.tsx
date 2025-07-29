import { useMemo, useEffect, useState } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths 
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { getDateKey, getTodaySafe } from '../utils/dateHelpers'
import type { WorkSchedule, Person, PersonWorkDay, LeaveRequest, OneTimeWork, OnCall, NurseOnCall, Location } from '../types'
import { generateWorkDays } from '../utils/scheduleGenerator'
import { generatePersonWorkDays } from '../utils/personUtils'

interface CalendarProps {
  schedules: WorkSchedule[]
  persons: Person[]
  leaveRequests: LeaveRequest[]
  oneTimeWork: OneTimeWork[]
  onCalls: OnCall[]
  nurseOnCalls: NurseOnCall[]
  selectedLocation: Location
  showOnCall: boolean
  showNurseOnCall: boolean
  showFullTime: boolean
  showPartTime: boolean
  currentDate: Date
  setCurrentDate: (date: Date) => void
  onRemoveOnCall: (id: string) => void
  onRemoveNurseOnCall: (id: string) => void
}

const Calendar: React.FC<CalendarProps> = ({ schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls, selectedLocation, showOnCall, showNurseOnCall, showFullTime, showPartTime, currentDate, setCurrentDate, onRemoveOnCall, onRemoveNurseOnCall }) => {
  // 強制再レンダリング用のstate
  const [renderKey, setRenderKey] = useState(0)
  
  // selectedLocation、currentDate、表示設定が変更されたときに強制再レンダリング
  useEffect(() => {
    setRenderKey(prev => prev + 1)
  }, [selectedLocation, currentDate, showFullTime, showPartTime, showOnCall, showNurseOnCall])
  
  // 表示用の場所名をuseMemoで確実に更新
  const locationDisplayText = useMemo(() => {
    return selectedLocation === 'minoo' ? '本院箕面' : '分院茨木'
  }, [selectedLocation, renderKey]) // renderKeyも依存関係に追加

  const workDays = schedules.flatMap(schedule => generateWorkDays(schedule))
  
  const personWorkDaysForMonth = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    
    // 人員データが存在しない場合は空配列を返す
    if (!persons || persons.length === 0) {
      return []
    }
    
    // 選択された場所の人員のみフィルター + 雇用形態でフィルター
    const filteredPersons = persons.filter(person => {
      if (person.location !== selectedLocation) return false
      if (person.employmentType === 'full-time' && !showFullTime) return false
      if (person.employmentType === 'part-time' && !showPartTime) return false
      return true
    })
    
    if (filteredPersons.length === 0) {
      return []
    }
    
    return filteredPersons.flatMap(person => 
      generatePersonWorkDays(person, monthStart, monthEnd)
    )
  }, [currentDate, persons, selectedLocation, showFullTime, showPartTime, renderKey]) // 表示設定も依存関係に追加

  const getWorkDayInfo = (date: Date) => {
    return workDays.find(workDay => isSameDay(workDay.date, date))
  }

  const getPersonWorkDaysForDate = (date: Date): PersonWorkDay[] => {
    // その日に勤務する人員を取得
    const dayWorkDays = personWorkDaysForMonth.filter(pwd => isSameDay(pwd.date, date))
    
    // 休み希望を除外
    const filteredWorkDays = dayWorkDays.filter(pwd => {
      if (!leaveRequests || leaveRequests.length === 0) return true
      
      const hasLeaveRequest = leaveRequests.some(request => 
        request.personId === pwd.person.id && isSameDay(request.date, date)
      )
      return !hasLeaveRequest
    })
    
    return filteredWorkDays
  }

  const getOneTimeWorkForDate = (date: Date): OneTimeWork[] => {
    if (!oneTimeWork || oneTimeWork.length === 0) return []
    
    return oneTimeWork.filter(work => 
      work.location === selectedLocation && isSameDay(work.date, date)
    )
  }

  const getOnCallsForDate = (date: Date): OnCall[] => {
    if (!onCalls || onCalls.length === 0 || !showOnCall) return []
    
    return onCalls.filter(onCall => 
      isSameDay(onCall.date, date)
    )
  }

  const getNurseOnCallsForDate = (date: Date): NurseOnCall[] => {
    if (!nurseOnCalls || nurseOnCalls.length === 0 || !showNurseOnCall) return []
    
    return nurseOnCalls.filter(nurseOnCall => 
      isSameDay(nurseOnCall.date, date)
    )
  }

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1, locale: ja })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1, locale: ja })
    const today = getTodaySafe() // キャッシュされた今日の日付を使用

    // デバッグ情報
    console.log('Calendar Debug Info:')
    console.log('monthStart:', format(monthStart, 'yyyy-MM-dd EEEE', { locale: ja }))
    console.log('startDate (week start):', format(startDate, 'yyyy-MM-dd EEEE', { locale: ja }))
    console.log('startDate.getDay():', startDate.getDay()) // 0=日曜, 1=月曜

    const days = []
    let day = startDate
    let dayCount = 0 // 無限ループ防止
    const MAX_DAYS = 50 // 安全な上限

    while (day <= endDate && dayCount < MAX_DAYS) {
      const workDayInfo = getWorkDayInfo(day)
      const personWorkDays = getPersonWorkDaysForDate(day)
      const oneTimeWorkDays = getOneTimeWorkForDate(day)
      const onCallsForDay = getOnCallsForDate(day)
      const nurseOnCallsForDay = getNurseOnCallsForDate(day)
      const isCurrentMonth = isSameMonth(day, currentDate)
      const isToday = isSameDay(day, today)
      const hasPersons = personWorkDays.length > 0
      const hasOneTimeWork = oneTimeWorkDays.length > 0
      const hasOnCall = onCallsForDay.length > 0
      const hasNurseOnCall = nurseOnCallsForDay.length > 0

      days.push(
        <div
          key={getDateKey(day)} // 安全なキー生成関数を使用
          className={`calendar-day ${
            !isCurrentMonth ? 'other-month' : ''
          } ${isToday ? 'today' : ''} ${workDayInfo ? 'work-day' : ''} ${hasPersons || hasOneTimeWork ? 'has-persons' : ''} ${hasOnCall ? 'has-oncall' : ''} ${hasNurseOnCall ? 'has-nurse-oncall' : ''}`}
        >
          <div className="day-number">{format(day, 'd')}</div>
          
          {/* 旧スケジュール表示 */}
          {workDayInfo && (
            <div className="work-info">
              <div className="work-time">
                {workDayInfo.startTime} - {workDayInfo.endTime}
              </div>
              {workDayInfo.description && (
                <div className="work-desc">{workDayInfo.description}</div>
              )}
            </div>
          )}
          
          {/* 人員別勤務表示 */}
          {personWorkDays.length > 0 && (
            <div className="person-work-info">
              {personWorkDays.map((pwd, index) => (
                <div 
                  key={`${pwd.person.id}-${index}`} 
                  className={`person-work-item ${pwd.person.employmentType}`}
                  style={{ borderLeftColor: pwd.person.color }}
                >
                  <div className="person-name">{pwd.person.name}</div>
                  <div className="person-time">
                    {pwd.person.startTime} - {pwd.person.endTime}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* 単発勤務表示 */}
          {oneTimeWorkDays.length > 0 && (
            <div className="onetime-work-info">
              {oneTimeWorkDays.map((work, index) => (
                <div 
                  key={`onetime-${work.id}-${index}`} 
                  className={`onetime-work-item ${work.isRecruiting ? 'recruiting' : ''}`}
                >
                  <div className="onetime-name">
                    {work.isRecruiting ? '募集中' : work.name}
                  </div>
                  <div className="onetime-time">
                    {work.startTime} - {work.endTime}
                  </div>
                  {work.description && (
                    <div className="onetime-desc">{work.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* オンコール表示 */}
          {showOnCall && onCallsForDay.length > 0 && (
            <div className="oncall-info">
              {onCallsForDay.map((onCall, index) => (
                <div 
                  key={`oncall-${onCall.id}-${index}`} 
                  className={`oncall-item-day ${onCall.isHomeDoctor ? 'home-doctor' : ''}`}
                >
                  <button
                    className="delete-oncall-btn"
                    onClick={() => onRemoveOnCall(onCall.id)}
                    title="オンコールを削除"
                  >
                    ×
                  </button>
                  <div className="oncall-label">{onCall.isHomeDoctor ? 'HD' : 'OC'}</div>
                  <div className="oncall-name">
                    {onCall.personName}
                    {onCall.isHomeDoctor && onCall.from18Hours && (
                      <span className="time-info">18時〜</span>
                    )}
                  </div>
                  {onCall.description && (
                    <div className="oncall-desc">{onCall.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* 看護師オンコール表示 */}
          {showNurseOnCall && nurseOnCallsForDay.length > 0 && (
            <div className="nurse-oncall-info">
              {nurseOnCallsForDay.map((nurseOnCall, index) => (
                <div 
                  key={`nurse-oncall-${nurseOnCall.id}-${index}`} 
                  className="nurse-oncall-item-day"
                >
                  <button
                    className="delete-nurse-oncall-btn"
                    onClick={() => onRemoveNurseOnCall(nurseOnCall.id)}
                    title="看護師オンコールを削除"
                  >
                    ×
                  </button>
                  <div className="nurse-oncall-label">
                    看護師
                  </div>
                  <div className="nurse-oncall-name">
                    {nurseOnCall.nurseName}
                  </div>
                  {nurseOnCall.description && (
                    <div className="nurse-oncall-desc">{nurseOnCall.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )
      day = addDays(day, 1)
      dayCount++ // カウンターを増加
    }

    // デバッグ情報（開発環境でのみ）
    if (import.meta.env?.DEV && dayCount >= MAX_DAYS) {
      console.warn('Calendar rendering hit maximum day limit - potential infinite loop prevented')
    }

    return days
  }


  const weekDays = ['月', '火', '水', '木', '金', '土', '日']

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button 
          onClick={() => {
            const newDate = subMonths(currentDate, 1)
            setCurrentDate(newDate)
          }}
          className="nav-button"
          type="button"
        >
          ←
        </button>
        <h2>
          {format(currentDate, 'yyyy年MM月', { locale: ja })} - {locationDisplayText}
        </h2>
        <button 
          onClick={() => {
            const newDate = addMonths(currentDate, 1)
            setCurrentDate(newDate)
          }}
          className="nav-button"
          type="button"
        >
          →
        </button>
      </div>
      
      <div className="calendar-grid">
        <div className="weekday-header">
          {weekDays.map(day => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {renderCalendarDays()}
        </div>
      </div>
    </div>
  )
}

export default Calendar