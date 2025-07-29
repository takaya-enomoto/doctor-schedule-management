import { useState, useEffect } from 'react'
import { isBefore, startOfDay, format, addMonths } from 'date-fns'
import './App.css'
import Calendar from './components/Calendar'
import ErrorBoundary from './components/ErrorBoundary'
import OnCallForm from './components/OnCallForm'
import PersonForm from './components/PersonForm'
import PersonList from './components/PersonList'
import LeaveRequestForm from './components/LeaveRequestForm'
import LeaveRequestList from './components/LeaveRequestList'
import OneTimeWorkForm from './components/OneTimeWorkForm'
import OneTimeWorkList from './components/OneTimeWorkList'
import NurseOnCallForm from './components/NurseOnCallForm'
import DataManagement from './components/DataManagement'
import PrintDialog from './components/PrintDialog'
import Modal from './components/Modal'
import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall, Location } from './types'
import { 
  saveSchedules, loadSchedules, savePersons, loadPersons,
  saveLeaveRequests, loadLeaveRequests, saveOneTimeWork, loadOneTimeWork,
  saveOnCalls, loadOnCalls, saveNurseOnCalls, loadNurseOnCalls
} from './utils/storage'
import { checkAndCreateAutoBackup } from './utils/autoBackup'
import { setupPrintColorSupport } from './utils/printHelpers'
import { useAutoSaveToGoogleDrive } from './hooks/useAutoSaveToGoogleDrive'

type ModalType = 'person' | 'leave' | 'onetime' | 'oncall' | 'nurse-oncall' | 'backup' | 'print' | null

interface PrintOptions {
  includeOnCall: boolean
  includeNurseOnCall: boolean
  includeFullTime: boolean
  includePartTime: boolean
  printRange: 'current' | 'next' | 'both'
}

function App() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [oneTimeWork, setOneTimeWork] = useState<OneTimeWork[]>([])
  const [onCalls, setOnCalls] = useState<OnCall[]>([])
  const [nurseOnCalls, setNurseOnCalls] = useState<NurseOnCall[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location>('minoo')
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [showOnCall, setShowOnCall] = useState<boolean>(true)
  const [showNurseOnCall, setShowNurseOnCall] = useState<boolean>(true)
  const [showFullTime, setShowFullTime] = useState<boolean>(true)
  const [showPartTime, setShowPartTime] = useState<boolean>(true)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [editingOnCall, setEditingOnCall] = useState<OnCall | null>(null)
  const [editingNurseOnCall, setEditingNurseOnCall] = useState<NurseOnCall | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(false)

  // Google Drive自動保存フック
  const { lastSaveTime, isSaving, saveStatus, manualSave } = useAutoSaveToGoogleDrive({
    schedules,
    persons,
    leaveRequests,
    oneTimeWork,
    onCalls,
    nurseOnCalls,
    autoSaveEnabled
  })

  // サイドバーリスト表示用：過去の単発勤務を削除する関数
  const removeExpiredOneTimeWorkForSidebar = (oneTimeWorkList: OneTimeWork[]): OneTimeWork[] => {
    const today = startOfDay(new Date())
    return oneTimeWorkList.filter(work => {
      const workDate = startOfDay(work.date)
      // 今日より前の日付は削除（サイドバーのリストから除外）
      return !isBefore(workDate, today)
    })
  }

  // サイドバーリスト表示用：過去の休み希望を削除する関数
  const removeExpiredLeaveRequestsForSidebar = (leaveRequestList: LeaveRequest[]): LeaveRequest[] => {
    const today = startOfDay(new Date())
    return leaveRequestList.filter(request => {
      const requestDate = startOfDay(request.date)
      // 今日より前の日付は削除（サイドバーのリストから除外）
      return !isBefore(requestDate, today)
    })
  }

  useEffect(() => {
    const savedSchedules = loadSchedules()
    const savedPersons = loadPersons()
    const savedLeaveRequests = loadLeaveRequests()
    const savedOneTimeWork = loadOneTimeWork()
    const savedOnCalls = loadOnCalls()
    const savedNurseOnCalls = loadNurseOnCalls()
    
    // データをそのまま設定（カレンダー表示には全データを使用）
    setSchedules(savedSchedules)
    setPersons(savedPersons)
    setLeaveRequests(savedLeaveRequests)
    setOneTimeWork(savedOneTimeWork)
    setOnCalls(savedOnCalls)
    setNurseOnCalls(savedNurseOnCalls)
    
    // カラー印刷サポートを設定
    setupPrintColorSupport()
    
    console.log('データを読み込みました（過去データもカレンダーには表示されます）')
  }, [])

  useEffect(() => {
    saveSchedules(schedules)
  }, [schedules])

  useEffect(() => {
    savePersons(persons)
  }, [persons])

  useEffect(() => {
    saveLeaveRequests(leaveRequests)
  }, [leaveRequests])

  useEffect(() => {
    saveOneTimeWork(oneTimeWork)
  }, [oneTimeWork])

  useEffect(() => {
    saveOnCalls(onCalls)
  }, [onCalls])

  useEffect(() => {
    saveNurseOnCalls(nurseOnCalls)
  }, [nurseOnCalls])

  // 自動バックアップ実行（データ変更時）
  useEffect(() => {
    // 初期ロード時は実行しない（データが空の場合は除外）
    if (schedules.length > 0 || persons.length > 0 || leaveRequests.length > 0 || 
        oneTimeWork.length > 0 || onCalls.length > 0 || nurseOnCalls.length > 0) {
      const timer = setTimeout(performAutoBackup, 5000) // 5秒後に実行
      return () => clearTimeout(timer)
    }
  }, [schedules, persons, leaveRequests, oneTimeWork, onCalls, nurseOnCalls])

  const addPerson = (person: Person) => {
    setPersons(prev => [...prev, person])
    setActiveModal(null) // モーダルを閉じる
  }

  const removePerson = (id: string) => {
    try {
      setPersons(prev => prev.filter(person => person.id !== id))
    } catch (error) {
      console.error('Error removing person:', error)
    }
  }

  const addLeaveRequest = (request: LeaveRequest) => {
    setLeaveRequests(prev => [...prev, request])
    setActiveModal(null) // モーダルを閉じる
  }

  const removeLeaveRequest = (id: string) => {
    try {
      setLeaveRequests(prev => prev.filter(request => request.id !== id))
    } catch (error) {
      console.error('Error removing leave request:', error)
    }
  }

  const addOneTimeWork = (work: OneTimeWork) => {
    setOneTimeWork(prev => [...prev, work])
    setActiveModal(null) // モーダルを閉じる
  }

  const removeOneTimeWork = (id: string) => {
    try {
      setOneTimeWork(prev => prev.filter(work => work.id !== id))
    } catch (error) {
      console.error('Error removing one-time work:', error)
    }
  }

  const addOnCall = (onCall: OnCall) => {
    if (editingOnCall) {
      // 編集モード
      setOnCalls(prev => prev.map(existing => 
        existing.id === editingOnCall.id ? onCall : existing
      ))
      setEditingOnCall(null)
    } else {
      // 新規追加モード
      setOnCalls(prev => [...prev, onCall])
    }
    setActiveModal(null) // モーダルを閉じる
  }

  const removeOnCall = (id: string) => {
    try {
      setOnCalls(prev => prev.filter(onCall => onCall.id !== id))
    } catch (error) {
      console.error('Error removing on-call:', error)
    }
  }

  const addNurseOnCall = (nurseOnCall: NurseOnCall) => {
    if (editingNurseOnCall) {
      // 編集モード
      setNurseOnCalls(prev => prev.map(existing => 
        existing.id === editingNurseOnCall.id ? nurseOnCall : existing
      ))
      setEditingNurseOnCall(null)
    } else {
      // 新規追加モード
      setNurseOnCalls(prev => [...prev, nurseOnCall])
    }
    setActiveModal(null) // モーダルを閉じる
  }

  const removeNurseOnCall = (id: string) => {
    try {
      setNurseOnCalls(prev => prev.filter(nurseOnCall => nurseOnCall.id !== id))
    } catch (error) {
      console.error('Error removing nurse on-call:', error)
    }
  }


  const handleRestore = (data: {
    schedules: WorkSchedule[]
    persons: Person[]
    leaveRequests: LeaveRequest[]
    oneTimeWork: OneTimeWork[]
    onCalls: OnCall[]
    nurseOnCalls: NurseOnCall[]
  }) => {
    setSchedules(data.schedules)
    setPersons(data.persons)
    setLeaveRequests(data.leaveRequests)
    setOneTimeWork(data.oneTimeWork)
    setOnCalls(data.onCalls)
    setNurseOnCalls(data.nurseOnCalls)
    setActiveModal(null) // モーダルを閉じる
  }

  const performAutoBackup = () => {
    try {
      checkAndCreateAutoBackup({
        schedules,
        persons,
        leaveRequests,
        oneTimeWork,
        onCalls,
        nurseOnCalls
      })
    } catch (error) {
      console.error('Auto backup failed:', error)
    }
  }

  const closeModal = () => {
    setActiveModal(null)
    setEditingOnCall(null) // 編集状態をクリア
    setEditingNurseOnCall(null) // 編集状態をクリア
  }

  const handlePrint = (options: PrintOptions) => {
    // 印刷用の設定を適用
    const originalShowOnCall = showOnCall
    const originalShowNurseOnCall = showNurseOnCall
    const originalShowFullTime = showFullTime
    const originalShowPartTime = showPartTime
    const originalDate = calendarDate

    // 印刷設定を適用
    setShowOnCall(options.includeOnCall)
    setShowNurseOnCall(options.includeNurseOnCall)
    setShowFullTime(options.includeFullTime)
    setShowPartTime(options.includePartTime)

    // 印刷ダイアログを閉じる
    setActiveModal(null)

    // 少し待ってから印刷実行（状態更新を待つため）
    setTimeout(() => {
      if (options.printRange === 'next') {
        // 翌月のみ印刷
        setCalendarDate(addMonths(calendarDate, 1))
        setTimeout(() => {
          window.print()
          // 印刷後に元の設定に戻す
          setTimeout(() => {
            setCalendarDate(originalDate)
            setShowOnCall(originalShowOnCall)
            setShowNurseOnCall(originalShowNurseOnCall)
            setShowFullTime(originalShowFullTime)
            setShowPartTime(originalShowPartTime)
          }, 500)
        }, 100)
      } else if (options.printRange === 'both') {
        // 現在の月と翌月を印刷（2ページ）
        // まず現在の月を印刷
        window.print()
        
        // 翌月に移動して再度印刷
        setTimeout(() => {
          setCalendarDate(addMonths(calendarDate, 1))
          setTimeout(() => {
            window.print()
            // 印刷後に元の設定に戻す
            setTimeout(() => {
              setCalendarDate(originalDate)
              setShowOnCall(originalShowOnCall)
              setShowNurseOnCall(originalShowNurseOnCall)
              setShowFullTime(originalShowFullTime)
              setShowPartTime(originalShowPartTime)
            }, 500)
          }, 100)
        }, 1000)
      } else {
        // 現在の月のみ印刷
        window.print()
        // 印刷後に元の設定に戻す
        setTimeout(() => {
          setShowOnCall(originalShowOnCall)
          setShowNurseOnCall(originalShowNurseOnCall)
          setShowFullTime(originalShowFullTime)
          setShowPartTime(originalShowPartTime)
        }, 500)
      }
    }, 100)
  }

  return (
    <div className="app">
      <header>
        <div className="header-content">
          <h1>医師出勤管理</h1>
          <div className="header-buttons">
            <button 
              className="add-button person-add"
              onClick={() => setActiveModal('person')}
            >
              + 医師追加
            </button>
            <button 
              className="add-button leave-add"
              onClick={() => setActiveModal('leave')}
            >
              + 休み希望
            </button>
            <button 
              className="add-button onetime-add"
              onClick={() => setActiveModal('onetime')}
            >
              + 単発勤務
            </button>
            <button 
              className="add-button oncall-add"
              onClick={() => setActiveModal('oncall')}
            >
              + オンコール
            </button>
            <button 
              className="add-button nurse-oncall-add"
              onClick={() => setActiveModal('nurse-oncall')}
            >
              + 看護師オンコール
            </button>
            <button 
              className="add-button backup-add"
              onClick={() => setActiveModal('backup')}
            >
              📁 データ管理
            </button>
            <button 
              className="add-button print-add"
              onClick={() => setActiveModal('print')}
            >
              🖨️ 印刷
            </button>
          </div>
          
          {/* Google Drive自動保存コントロール */}
          <div className="auto-save-controls">
            <div className="auto-save-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                />
                🌐 Google Drive自動保存
              </label>
            </div>
            
            {autoSaveEnabled && (
              <div className="auto-save-status">
                {isSaving && <span className="saving">💾 保存中...</span>}
                {saveStatus === 'success' && <span className="success">✅ 保存完了</span>}
                {saveStatus === 'error' && <span className="error">❌ 保存失敗</span>}
                {lastSaveTime && !isSaving && saveStatus === 'idle' && (
                  <span className="last-save">
                    最終保存: {format(lastSaveTime, 'MM/dd HH:mm')}
                  </span>
                )}
                <button 
                  onClick={manualSave}
                  disabled={isSaving}
                  className="manual-save-button"
                  title="手動でGoogle Driveに保存"
                >
                  💾 今すぐ保存
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>
        <div className="control-section">
          <div className="location-buttons">
            <button 
              className={`location-button ${selectedLocation === 'minoo' ? 'active' : ''}`}
              onClick={() => setSelectedLocation('minoo')}
              type="button"
            >
              本院箕面
            </button>
            <button 
              className={`location-button ${selectedLocation === 'ibaraki' ? 'active' : ''}`}
              onClick={() => setSelectedLocation('ibaraki')}
              type="button"
            >
              分院茨木
            </button>
          </div>
          
          <div className="display-toggles">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showFullTime}
                onChange={(e) => setShowFullTime(e.target.checked)}
              />
              常勤
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showPartTime}
                onChange={(e) => setShowPartTime(e.target.checked)}
              />
              非常勤
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showOnCall}
                onChange={(e) => setShowOnCall(e.target.checked)}
              />
              オンコール
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showNurseOnCall}
                onChange={(e) => setShowNurseOnCall(e.target.checked)}
              />
              看護師オンコール
            </label>
          </div>
        </div>
        
        <div className="content-grid">
          <div className="calendar-section">
            <ErrorBoundary key={`calendar-${selectedLocation}-${calendarDate.getTime()}`}>
              <Calendar 
                key={`calendar-component-${selectedLocation}-${format(calendarDate, 'yyyy-MM')}`}
                schedules={schedules} 
                persons={persons} 
                leaveRequests={leaveRequests}
                oneTimeWork={oneTimeWork}
                onCalls={onCalls}
                nurseOnCalls={nurseOnCalls}
                selectedLocation={selectedLocation}
                showOnCall={showOnCall}
                showNurseOnCall={showNurseOnCall}
                showFullTime={showFullTime}
                showPartTime={showPartTime}
                currentDate={calendarDate}
                setCurrentDate={setCalendarDate}
                onRemoveOnCall={removeOnCall}
                onRemoveNurseOnCall={removeNurseOnCall}
              />
            </ErrorBoundary>
          </div>
          <div className="sidebar">
            <PersonList persons={persons} onRemovePerson={removePerson} />
            <LeaveRequestList leaveRequests={removeExpiredLeaveRequestsForSidebar(leaveRequests)} onRemoveLeaveRequest={removeLeaveRequest} />
            <OneTimeWorkList oneTimeWork={removeExpiredOneTimeWorkForSidebar(oneTimeWork)} onRemoveOneTimeWork={removeOneTimeWork} />
          </div>
        </div>
        
        {/* モーダル */}
        <Modal 
          isOpen={activeModal === 'person'} 
          onClose={closeModal}
          title="医師追加"
        >
          <PersonForm onAddPerson={addPerson} existingPersons={persons} />
        </Modal>
        
        <Modal 
          isOpen={activeModal === 'leave'} 
          onClose={closeModal}
          title="休み希望登録"
        >
          <LeaveRequestForm onAddLeaveRequest={addLeaveRequest} persons={persons} />
        </Modal>
        
        <Modal 
          isOpen={activeModal === 'onetime'} 
          onClose={closeModal}
          title="単発勤務登録"
        >
          <ErrorBoundary key={`onetime-form-${Date.now()}`}>
            <OneTimeWorkForm onAddOneTimeWork={addOneTimeWork} />
          </ErrorBoundary>
        </Modal>
        
        <Modal 
          isOpen={activeModal === 'oncall'} 
          onClose={closeModal}
          title={editingOnCall ? "オンコール編集" : "オンコール登録"}
        >
          <OnCallForm 
            onAddOnCall={addOnCall} 
            persons={persons} 
            editingOnCall={editingOnCall}
          />
        </Modal>
        
        <Modal 
          isOpen={activeModal === 'nurse-oncall'} 
          onClose={closeModal}
          title={editingNurseOnCall ? "看護師オンコール編集" : "看護師オンコール登録"}
        >
          <NurseOnCallForm 
            onAddNurseOnCall={addNurseOnCall} 
            editingNurseOnCall={editingNurseOnCall}
          />
        </Modal>
        
        <Modal 
          isOpen={activeModal === 'backup'} 
          onClose={closeModal}
          title="📁 データ管理"
        >
          <DataManagement
            schedules={schedules}
            persons={persons}
            leaveRequests={leaveRequests}
            oneTimeWork={oneTimeWork}
            onCalls={onCalls}
            nurseOnCalls={nurseOnCalls}
            onRestore={handleRestore}
          />
        </Modal>
        
        <Modal 
          isOpen={activeModal === 'print'} 
          onClose={closeModal}
          title="カレンダー印刷"
        >
          <PrintDialog
            currentDate={calendarDate}
            selectedLocation={selectedLocation}
            showOnCall={showOnCall}
            showNurseOnCall={showNurseOnCall}
            showFullTime={showFullTime}
            showPartTime={showPartTime}
            onPrint={handlePrint}
            onClose={closeModal}
          />
        </Modal>
      </main>
    </div>
  )
}

export default App
