import type { Person } from '../types'
import { LABELS } from '../constants/labels'
import { formatDoctorType, formatLocation, formatWorkDays } from '../utils/formatters'

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
      alert(`${LABELS.MESSAGES.ERROR}: 削除中にエラーが発生しました。ページをリロードしてお試しください。`)
    }
  }

  if (persons.length === 0) {
    return (
      <div className="person-list">
        <h2>{LABELS.DOCTOR.REGISTERED_DOCTORS}</h2>
        <p className="no-persons">{LABELS.DOCTOR.NO_DOCTORS}</p>
      </div>
    )
  }

  return (
    <div className="person-list">
      <h2>{LABELS.DOCTOR.REGISTERED_DOCTORS} ({persons.length}人)</h2>
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
                勤務日: {formatWorkDays(person.workDays)}
              </div>
              <div className="person-pattern">
                {person.workPattern === 'all-weeks' ? '毎週' :
                 person.workPattern === 'week-1-3' ? '第1・3週のみ' :
                 '第2・4週のみ'}
              </div>
              <div className={`person-employment ${person.employmentType}`}>
{formatDoctorType(person.employmentType)}
              </div>
              <div className="person-location">
{formatLocation(person.location)}
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