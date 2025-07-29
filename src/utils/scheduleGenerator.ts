import { addDays, isSameDay, isBefore } from 'date-fns'
import type { WorkSchedule, WorkDay } from '../types'

export const generateWorkDays = (schedule: WorkSchedule): WorkDay[] => {
  const workDays: WorkDay[] = []
  let currentDate = new Date(schedule.startDate)

  while (isBefore(currentDate, schedule.endDate) || isSameDay(currentDate, schedule.endDate)) {
    const dayOfWeek = currentDate.getDay()
    
    if (schedule.workDays.includes(dayOfWeek)) {
      workDays.push({
        date: new Date(currentDate),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        description: schedule.description
      })
    }
    
    currentDate = addDays(currentDate, 1)
  }

  return workDays
}

export const getWeekDayName = (dayNumber: number): string => {
  const weekDays = ['日', '月', '火', '水', '木', '金', '土']
  return weekDays[dayNumber]
}