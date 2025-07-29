import { useState } from 'react'
import { format } from 'date-fns'
import type { LeaveRequest, Person } from '../types'

interface LeaveRequestFormProps {
  onAddLeaveRequest: (request: LeaveRequest) => void
  persons: Person[]
}

const LeaveRequestForm: React.FC<LeaveRequestFormProps> = ({ onAddLeaveRequest, persons }) => {
  const [selectedPersonId, setSelectedPersonId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reason, setReason] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPersonId) {
      alert('人員を選択してください')
      return
    }

    const selectedPerson = persons.find(p => p.id === selectedPersonId)
    if (!selectedPerson) {
      alert('選択された人員が見つかりません')
      return
    }

    const leaveRequest: LeaveRequest = {
      id: Date.now().toString(),
      personId: selectedPersonId,
      personName: selectedPerson.name,
      date: new Date(date),
      reason: reason.trim() || undefined
    }

    onAddLeaveRequest(leaveRequest)
    
    // フォームをリセット
    setReason('')
  }

  return (
    <div className="leave-request-form">
      <h2>休み希望登録</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="person-select">人員 *:</label>
          <select
            id="person-select"
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            required
          >
            <option value="">選択してください</option>
            {persons.map(person => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.location === 'minoo' ? '本院箕面' : '分院茨木'})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="leave-date">休み希望日 *:</label>
          <input
            id="leave-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="leave-reason">理由:</label>
          <input
            id="leave-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="有給、私用、体調不良など"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">
            休み希望を追加
          </button>
        </div>
      </form>
    </div>
  )
}

export default LeaveRequestForm