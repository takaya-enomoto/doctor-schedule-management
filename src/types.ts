export interface WorkSchedule {
  id: string
  startTime: string
  endTime: string
  workDays: number[]
  startDate: Date
  endDate: Date
  description?: string
}

export interface WorkDay {
  date: Date
  startTime: string
  endTime: string
  description?: string
  personId?: string
  personName?: string
}

export type WorkPattern = 'all-weeks' | 'week-1-3' | 'week-2-4'
export type EmploymentType = 'full-time' | 'part-time'
export type Location = 'minoo' | 'ibaraki'

export interface Person {
  id: string
  name: string
  workDays: number[]
  startTime: string
  endTime: string
  color: string
  description?: string
  workPattern: WorkPattern
  employmentType: EmploymentType
  location: Location
}

export interface PersonWorkDay {
  date: Date
  person: Person
}

export interface LeaveRequest {
  id: string
  personId: string
  personName: string
  date: Date
  reason?: string
}

export interface OneTimeWork {
  id: string
  name: string
  date: Date
  startTime: string
  endTime: string
  location: Location
  description?: string
  isRecruiting?: boolean // 未定（募集中）フラグ
}

export interface OnCall {
  id: string
  personId: string | 'home-doctor' // ホームドクターの場合は特別な値
  personName: string
  date: Date
  location: Location
  description?: string
  isHomeDoctor?: boolean // ホームドクターフラグ
  from18Hours?: boolean // 18時からフラグ
}

export interface NurseOnCall {
  id: string
  nurseName: string
  date: Date
  description?: string
}

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6