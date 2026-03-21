export type Id = string

export interface Habit {
  id: Id
  name: string
  tag: string
  scheduledDays: number[]
  createdAt: string
  updatedAt: string
}

export interface Todo {
  id: Id
  title: string
  date: string
  completed: boolean
  linkedHabitId?: Id | null
  createdAt: string
  updatedAt: string
}

export interface HabitLog {
  id: Id
  habitId: Id
  date: string
  completed: boolean
  createdAt: string
}
