import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import type { LeaveRequest } from '../types'

interface LeaveRequestListProps {
  leaveRequests: LeaveRequest[]
  onRemoveLeaveRequest: (id: string) => void
}

const LeaveRequestList: React.FC<LeaveRequestListProps> = ({ leaveRequests, onRemoveLeaveRequest }) => {
  const handleRemove = (id: string) => {
    try {
      onRemoveLeaveRequest(id)
    } catch (error) {
      console.error('Error removing leave request:', error)
      alert('削除中にエラーが発生しました。ページをリロードしてお試しください。')
    }
  }

  if (leaveRequests.length === 0) {
    return (
      <div className="leave-request-list">
        <h2>休み希望一覧</h2>
        <p className="no-requests">まだ休み希望が登録されていません。</p>
      </div>
    )
  }

  // 日付順でソート（安全な処理）
  const sortedRequests = [...leaveRequests].sort((a, b) => {
    try {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date)
      const dateB = b.date instanceof Date ? b.date : new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    } catch (error) {
      console.error('Error sorting dates:', error)
      return 0
    }
  })

  return (
    <div className="leave-request-list">
      <h2>休み希望一覧 ({leaveRequests.length}件)</h2>
      <div className="request-items">
        {sortedRequests.map((request) => (
          <div key={request.id} className="request-item">
            <div className="request-info">
              <div className="request-person">{request.personName}</div>
              <div className="request-date">
                {(() => {
                  try {
                    const date = request.date instanceof Date ? request.date : new Date(request.date)
                    return format(date, 'yyyy年MM月dd日 (E)', { locale: ja })
                  } catch (error) {
                    console.error('Error formatting date:', error)
                    return '日付エラー'
                  }
                })()}
              </div>
              {request.reason && (
                <div className="request-reason">理由: {request.reason}</div>
              )}
            </div>
            <button
              onClick={() => handleRemove(request.id)}
              className="remove-button"
              title={`${request.personName}の休み希望を削除`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeaveRequestList