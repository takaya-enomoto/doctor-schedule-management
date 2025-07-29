import type { Person } from '../types'
import { getWeekDayName } from '../utils/scheduleGenerator'

interface PersonListProps {
  persons: Person[]
  onRemovePerson: (id: string) => void
}

const PersonList: React.FC<PersonListProps> = ({ persons, onRemovePerson }) => {
  const handleRemove = (id: string) => {
    try {
      onRemovePerson(id)
    } catch (error) {
      console.error('Error removing person:', error)
      alert('削除中にエラーが発生しました。ページをリロードしてお試しください。')
    }
  }

  if (persons.length === 0) {
    return (
      <div className="person-list">
        <h2>登録済み医師</h2>
        <p className="no-persons">まだ医師が登録されていません。</p>
      </div>
    )
  }

  return (
    <div className="person-list">
      <h2>登録済み医師 ({persons.length}人)</h2>
      <div className="person-items">
        {persons.map((person) => (
          <div key={person.id} className="person-item">
            <div className="person-info">
              <div className="person-header">
                <div 
                  className="person-color-indicator"
                  style={{ backgroundColor: person.color }}
                ></div>
                <div className="person-name">{person.name}</div>
              </div>
              <div className="person-time">
                {person.startTime} - {person.endTime}
              </div>
              <div className="person-days">
                勤務日: {person.workDays.map(day => getWeekDayName(day)).join(', ')}
              </div>
              <div className="person-pattern">
                {person.workPattern === 'all-weeks' ? '毎週' :
                 person.workPattern === 'week-1-3' ? '第1・3週のみ' :
                 '第2・4週のみ'}
              </div>
              <div className={`person-employment ${person.employmentType}`}>
                {person.employmentType === 'full-time' ? '常勤' : '非常勤'}
              </div>
              <div className="person-location">
                {person.location === 'minoo' ? '本院箕面' : '分院茨木'}
              </div>
              {person.description && (
                <div className="person-description">
                  {person.description}
                </div>
              )}
            </div>
            <button
              onClick={() => handleRemove(person.id)}
              className="remove-button"
              title={`${person.name}を削除`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PersonList