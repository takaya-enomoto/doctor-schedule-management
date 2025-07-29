import { useState, useEffect } from 'react'
import { format, addDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { OnCall, Person, Location } from '../types'
import { createSafeDate, formatSafeDate } from '../utils/dateHelpers'

interface OnCallFormProps {
  onAddOnCall: (onCall: OnCall) => void
  persons: Person[]
  editingOnCall?: OnCall | null
}

const OnCallForm: React.FC<OnCallFormProps> = ({ onAddOnCall, persons, editingOnCall }) => {
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState<Location>('minoo')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isHomeDoctor, setIsHomeDoctor] = useState(false)
  const [from18Hours, setFrom18Hours] = useState(false)

  // 編集モードの初期化
  useEffect(() => {
    if (editingOnCall) {
      setSelectedPersonId(editingOnCall.personId === 'home-doctor' ? 'home-doctor' : editingOnCall.personId)
      setSelectedDates([formatSafeDate(editingOnCall.date)])
      setDescription(editingOnCall.description || '')
      setLocation(editingOnCall.location)
      setCurrentMonth(editingOnCall.date instanceof Date ? editingOnCall.date : new Date(editingOnCall.date))
      setIsHomeDoctor(editingOnCall.isHomeDoctor || false)
      setFrom18Hours(editingOnCall.from18Hours || false)
    } else {
      // 新規作成モードの場合はリセット
      setSelectedPersonId('')
      setSelectedDates([])
      setDescription('')
      setLocation('minoo')
      setCurrentMonth(new Date())
      setIsHomeDoctor(false)
      setFrom18Hours(false)
    }
  }, [editingOnCall])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPersonId || selectedDates.length === 0) {
      alert('医師と日付を選択してください')
      return
    }

    // ホームドクターの場合
    if (selectedPersonId === 'home-doctor') {
      if (editingOnCall && selectedDates.length === 1) {
        // 編集モード：単一のオンコールを更新
        try {
          const updatedOnCall: OnCall = {
            ...editingOnCall,
            personId: 'home-doctor',
            personName: 'ホームドクター',
            date: createSafeDate(selectedDates[0]),
            location,
            description: description.trim() || undefined,
            isHomeDoctor: true,
            from18Hours: from18Hours
          }
          onAddOnCall(updatedOnCall)
        } catch (error) {
          console.error('Invalid date in OnCall update:', selectedDates[0], error)
          alert(`無効な日付です: ${selectedDates[0]}`)
        }
      } else {
        // 新規作成モード：選択された各日付にオンコールを作成
        selectedDates.forEach(dateString => {
          try {
            const onCall: OnCall = {
              id: crypto.randomUUID(),
              personId: 'home-doctor',
              personName: 'ホームドクター',
              date: createSafeDate(dateString),
              location,
              description: description.trim() || undefined,
              isHomeDoctor: true,
              from18Hours: from18Hours
            }
            onAddOnCall(onCall)
          } catch (error) {
            console.error('Invalid date in OnCall creation:', dateString, error)
            alert(`無効な日付です: ${dateString}`)
          }
        })
      }
    } else {
      // 通常の医師の場合
      const selectedPerson = persons.find(p => p.id === selectedPersonId)
      if (!selectedPerson) {
        alert('選択された医師が見つかりません')
        return
      }

      if (editingOnCall && selectedDates.length === 1) {
        // 編集モード：単一のオンコールを更新
        try {
          const updatedOnCall: OnCall = {
            ...editingOnCall,
            personId: selectedPersonId,
            personName: selectedPerson.name,
            date: createSafeDate(selectedDates[0]),
            location,
            description: description.trim() || undefined,
            isHomeDoctor: false,
            from18Hours: false
          }
          onAddOnCall(updatedOnCall)
        } catch (error) {
          console.error('Invalid date in OnCall update:', selectedDates[0], error)
          alert(`無効な日付です: ${selectedDates[0]}`)
        }
      } else {
        // 新規作成モード：選択された各日付にオンコールを作成
        selectedDates.forEach(dateString => {
          try {
            const onCall: OnCall = {
              id: crypto.randomUUID(),
              personId: selectedPersonId,
              personName: selectedPerson.name,
              date: createSafeDate(dateString),
              location,
              description: description.trim() || undefined,
              isHomeDoctor: false,
              from18Hours: false
            }
            onAddOnCall(onCall)
          } catch (error) {
            console.error('Invalid date in OnCall creation:', dateString, error)
            alert(`無効な日付です: ${dateString}`)
          }
        })
      }
    }
    
    // フォームをリセット（編集モードではリセットしない）
    setSelectedPersonId('')
    setSelectedDates([])
    setDescription('')
  }

  const handleDateToggle = (dateString: string) => {
    setSelectedDates(prev => 
      prev.includes(dateString) 
        ? prev.filter(d => d !== dateString)
        : [...prev, dateString]
    )
  }

  const generateCalendarDates = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const dates = []
    
    let currentDate = new Date(monthStart)
    while (currentDate <= monthEnd) {
      dates.push(new Date(currentDate))
      currentDate = addDays(currentDate, 1)
    }
    
    return dates
  }

  return (
    <form onSubmit={handleSubmit} className="oncall-form">
      <h2>オンコール登録</h2>
      
      <div className="form-group">
        <label htmlFor="person">担当者:</label>
        <select
          id="person"
          value={selectedPersonId}
          onChange={(e) => {
            setSelectedPersonId(e.target.value)
            setIsHomeDoctor(e.target.value === 'home-doctor')
            if (e.target.value !== 'home-doctor') {
              setFrom18Hours(false)
            }
          }}
          required
        >
          <option value="">担当者を選択してください</option>
          <option value="home-doctor">ホームドクター</option>
          {persons
            .filter(person => person.employmentType === 'full-time')
            .map(person => (
            <option key={person.id} value={person.id}>
              {person.name} ({person.location === 'minoo' ? '本院箕面' : '分院茨木'})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>日付選択:</label>
        <div className="month-navigation">
          <button 
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="month-nav-button"
          >
            ← 前月
          </button>
          <span className="month-display">
            {format(currentMonth, 'yyyy年MM月', { locale: ja })}
          </span>
          <button 
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="month-nav-button"
          >
            次月 →
          </button>
        </div>
        <div className="date-grid">
          {generateCalendarDates().map(date => {
            const dateString = formatSafeDate(date) // 安全なフォーマット関数を使用
            const isSelected = selectedDates.includes(dateString)
            return (
              <label 
                key={dateString} 
                className={`date-checkbox ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleDateToggle(dateString)}
                />
                <span className="date-number">{format(date, 'd')}</span>
              </label>
            )
          })}
        </div>
        <div className="selected-dates-info">
          {selectedDates.length > 0 && (
            <small>
              選択中: {selectedDates.length}日 
              ({selectedDates.sort().map(d => format(new Date(d), 'M/d', { locale: ja })).join(', ')})
            </small>
          )}
        </div>
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

      {isHomeDoctor && (
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={from18Hours}
              onChange={(e) => setFrom18Hours(e.target.checked)}
            />
            18時から
          </label>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="description">備考:</label>
        <input
          type="text"
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="備考（任意）"
        />
      </div>

      <button type="submit" className="submit-button">
        {editingOnCall ? 'オンコール更新' : 'オンコール登録'}
      </button>
    </form>
  )
}

export default OnCallForm