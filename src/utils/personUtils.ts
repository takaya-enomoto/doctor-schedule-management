import { addDays, isSameDay, isBefore, getWeek, startOfMonth } from 'date-fns'
import type { Person, PersonWorkDay, WorkPattern } from '../types'

const getWeekOfMonth = (date: Date): number => {
  const startOfTheMonth = startOfMonth(date)
  const weekOfYear = getWeek(date, { weekStartsOn: 1 })
  const weekOfYearForStartOfMonth = getWeek(startOfTheMonth, { weekStartsOn: 1 })
  
  return weekOfYear - weekOfYearForStartOfMonth + 1
}

// 第5週目かどうかを判定する関数
const isFifthWeek = (date: Date): boolean => {
  const weekOfMonth = getWeekOfMonth(date)
  return weekOfMonth >= 5
}


const shouldWorkOnWeek = (date: Date, workPattern: WorkPattern, employmentType: 'full-time' | 'part-time'): boolean => {
  if (workPattern === 'all-weeks') {
    // 非常勤の場合は第5週を除外
    if (employmentType === 'part-time' && isFifthWeek(date)) {
      return false
    }
    return true
  }
  
  const weekOfMonth = getWeekOfMonth(date)
  
  // 非常勤の場合は第5週を明示的に除外
  if (employmentType === 'part-time' && weekOfMonth >= 5) {
    return false
  }
  
  if (workPattern === 'week-1-3') {
    return weekOfMonth === 1 || weekOfMonth === 3
  } else if (workPattern === 'week-2-4') {
    return weekOfMonth === 2 || weekOfMonth === 4
  }
  
  return false
}

export const generatePersonWorkDays = (person: Person, startDate: Date, endDate: Date): PersonWorkDay[] => {
  const workDays: PersonWorkDay[] = []
  let currentDate = new Date(startDate)

  while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
    const dayOfWeek = currentDate.getDay()
    
    // 非常勤の場合は第5週を除外して判定
    if (person.workDays.includes(dayOfWeek) && shouldWorkOnWeek(currentDate, person.workPattern, person.employmentType)) {
      workDays.push({
        date: new Date(currentDate),
        person
      })
    }
    
    currentDate = addDays(currentDate, 1)
  }

  return workDays
}

export const getPersonColors = (): string[] => {
  return [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#C44569', '#F8B500', '#6C5CE7', '#A29BFE', '#FD79A8',
    '#E17055', '#00B894', '#E84393', '#0984E3', '#FDCB6E'
  ]
}

export const getNextAvailableColor = (existingPersons: Person[]): string => {
  const colors = getPersonColors()
  const usedColors = existingPersons.map(p => p.color)
  
  for (const color of colors) {
    if (!usedColors.includes(color)) {
      return color
    }
  }
  
  return colors[existingPersons.length % colors.length]
}