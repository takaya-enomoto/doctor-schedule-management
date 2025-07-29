import { useState, useEffect } from 'react'
import { format, addDays, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { NurseOnCall } from '../types'
import { createSafeDate, formatSafeDate } from '../utils/dateHelpers'

interface NurseOnCallFormProps {
  onAddNurseOnCall: (nurseOnCall: NurseOnCall) => void
  editingNurseOnCall?: NurseOnCall | null
}

const NurseOnCallForm: React.FC<NurseOnCallFormProps> = ({ onAddNurseOnCall, editingNurseOnCall }) => {
  const [nurseName, setNurseName] = useState('')
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // 編集モードの初期化
  useEffect(() => {
    if (editingNurseOnCall) {
      setNurseName(editingNurseOnCall.nurseName)
      setSelectedDates([formatSafeDate(editingNurseOnCall.date)])
      setDescription(editingNurseOnCall.description || '')
      setCurrentMonth(editingNurseOnCall.date instanceof Date ? editingNurseOnCall.date : new Date(editingNurseOnCall.date))
    } else {
      // 新規作成モードの場合はリセット
      setNurseName('')
      setSelectedDates([])
      setDescription('')
      setCurrentMonth(new Date())
    }
  }, [editingNurseOnCall])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nurseName.trim() || selectedDates.length === 0) {
      alert('看護師名と日付を入力してください')
      return
    }

    if (editingNurseOnCall && selectedDates.length === 1) {
      // 編集モード：単一の看護師オンコールを更新
      try {
        const updatedNurseOnCall: NurseOnCall = {
          ...editingNurseOnCall,
          nurseName: nurseName.trim(),
          date: createSafeDate(selectedDates[0]),
          description: description.trim() || undefined
        }
        onAddNurseOnCall(updatedNurseOnCall)
      } catch (error) {
        console.error('Invalid date in NurseOnCall update:', selectedDates[0], error)
        alert(`無効な日付です: ${selectedDates[0]}`)
      }
    } else {
      // 新規作成モード：選択された各日付に看護師オンコールを作成
      selectedDates.forEach(dateString => {
        try {
          const nurseOnCall: NurseOnCall = {
            id: crypto.randomUUID(),
            nurseName: nurseName.trim(),
            date: createSafeDate(dateString),
            description: description.trim() || undefined
          }
          onAddNurseOnCall(nurseOnCall)
        } catch (error) {
          console.error('Invalid date in NurseOnCall creation:', dateString, error)
          alert(`無効な日付です: ${dateString}`)
        }
      })
    }
    
    // フォームをリセット（編集モードではリセットしない）
    if (!editingNurseOnCall) {
      setNurseName('')
      setSelectedDates([])
      setDescription('')
    }
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
    <form onSubmit={handleSubmit} className="nurse-oncall-form">
      <h2>看護師オンコール登録</h2>
      
      <div className="form-group">
        <label htmlFor="nurseName">看護師名:</label>
        <input
          type="text"
          id="nurseName"
          value={nurseName}
          onChange={(e) => setNurseName(e.target.value)}
          placeholder="看護師名を入力してください"
          required
        />
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
            const dateString = formatSafeDate(date)
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
        {editingNurseOnCall ? '看護師オンコール更新' : '看護師オンコール登録'}
      </button>
    </form>
  )
}

export default NurseOnCallForm