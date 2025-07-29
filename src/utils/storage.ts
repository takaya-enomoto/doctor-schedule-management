import type { WorkSchedule, Person, LeaveRequest, OneTimeWork, OnCall, NurseOnCall } from '../types'

const STORAGE_KEY = 'work-schedules'
const PERSONS_STORAGE_KEY = 'work-persons'
const LEAVE_REQUESTS_STORAGE_KEY = 'leave-requests'
const ONETIME_WORK_STORAGE_KEY = 'onetime-work'
const ONCALLS_STORAGE_KEY = 'oncalls'
const NURSE_ONCALLS_STORAGE_KEY = 'nurse-oncalls'

export const saveSchedules = (schedules: WorkSchedule[]): void => {
  try {
    const serializedSchedules = schedules.map(schedule => ({
      ...schedule,
      startDate: schedule.startDate.toISOString(),
      endDate: schedule.endDate.toISOString()
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializedSchedules))
  } catch (error) {
    console.error('スケジュールの保存に失敗しました:', error)
  }
}

export const loadSchedules = (): WorkSchedule[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (!storedData) return []
    
    const parsedData = JSON.parse(storedData)
    return parsedData.map((schedule: any) => ({
      ...schedule,
      startDate: new Date(schedule.startDate),
      endDate: new Date(schedule.endDate)
    }))
  } catch (error) {
    console.error('スケジュールの読み込みに失敗しました:', error)
    return []
  }
}

export const clearSchedules = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('スケジュールのクリアに失敗しました:', error)
  }
}

export const savePersons = (persons: Person[]): void => {
  try {
    localStorage.setItem(PERSONS_STORAGE_KEY, JSON.stringify(persons))
  } catch (error) {
    console.error('人員データの保存に失敗しました:', error)
  }
}

export const loadPersons = (): Person[] => {
  try {
    const storedData = localStorage.getItem(PERSONS_STORAGE_KEY)
    if (!storedData) return []
    
    return JSON.parse(storedData)
  } catch (error) {
    console.error('人員データの読み込みに失敗しました:', error)
    return []
  }
}

export const clearPersons = (): void => {
  try {
    localStorage.removeItem(PERSONS_STORAGE_KEY)
  } catch (error) {
    console.error('人員データのクリアに失敗しました:', error)
  }
}

export const saveLeaveRequests = (leaveRequests: LeaveRequest[]): void => {
  try {
    const serializedRequests = leaveRequests.map(request => ({
      ...request,
      date: request.date.toISOString()
    }))
    localStorage.setItem(LEAVE_REQUESTS_STORAGE_KEY, JSON.stringify(serializedRequests))
  } catch (error) {
    console.error('休み希望データの保存に失敗しました:', error)
  }
}

export const loadLeaveRequests = (): LeaveRequest[] => {
  try {
    const storedData = localStorage.getItem(LEAVE_REQUESTS_STORAGE_KEY)
    if (!storedData) return []
    
    const parsedData = JSON.parse(storedData)
    return parsedData.map((request: any) => ({
      ...request,
      date: new Date(request.date)
    }))
  } catch (error) {
    console.error('休み希望データの読み込みに失敗しました:', error)
    return []
  }
}

export const saveOneTimeWork = (oneTimeWork: OneTimeWork[]): void => {
  try {
    const serializedWork = oneTimeWork.map(work => ({
      ...work,
      date: work.date.toISOString()
    }))
    localStorage.setItem(ONETIME_WORK_STORAGE_KEY, JSON.stringify(serializedWork))
  } catch (error) {
    console.error('単発勤務データの保存に失敗しました:', error)
  }
}

export const loadOneTimeWork = (): OneTimeWork[] => {
  try {
    const storedData = localStorage.getItem(ONETIME_WORK_STORAGE_KEY)
    if (!storedData) return []
    
    const parsedData = JSON.parse(storedData)
    return parsedData.map((work: any) => ({
      ...work,
      date: new Date(work.date)
    }))
  } catch (error) {
    console.error('単発勤務データの読み込みに失敗しました:', error)
    return []
  }
}

export const saveOnCalls = (onCalls: OnCall[]): void => {
  try {
    const serializedOnCalls = onCalls.map(onCall => ({
      ...onCall,
      date: onCall.date.toISOString()
    }))
    localStorage.setItem(ONCALLS_STORAGE_KEY, JSON.stringify(serializedOnCalls))
  } catch (error) {
    console.error('オンコールデータの保存に失敗しました:', error)
  }
}

export const loadOnCalls = (): OnCall[] => {
  try {
    const storedData = localStorage.getItem(ONCALLS_STORAGE_KEY)
    if (!storedData) return []
    
    const parsedData = JSON.parse(storedData)
    return parsedData.map((onCall: any) => ({
      ...onCall,
      date: new Date(onCall.date)
    }))
  } catch (error) {
    console.error('オンコールデータの読み込みに失敗しました:', error)
    return []
  }
}

export const saveNurseOnCalls = (nurseOnCalls: NurseOnCall[]): void => {
  try {
    const serializedNurseOnCalls = nurseOnCalls.map(nurseOnCall => ({
      ...nurseOnCall,
      date: nurseOnCall.date.toISOString()
    }))
    localStorage.setItem(NURSE_ONCALLS_STORAGE_KEY, JSON.stringify(serializedNurseOnCalls))
  } catch (error) {
    console.error('看護師オンコールデータの保存に失敗しました:', error)
  }
}

export const loadNurseOnCalls = (): NurseOnCall[] => {
  try {
    const storedData = localStorage.getItem(NURSE_ONCALLS_STORAGE_KEY)
    if (!storedData) return []
    
    const parsedData = JSON.parse(storedData)
    return parsedData.map((nurseOnCall: any) => ({
      ...nurseOnCall,
      date: new Date(nurseOnCall.date)
    }))
  } catch (error) {
    console.error('看護師オンコールデータの読み込みに失敗しました:', error)
    return []
  }
}