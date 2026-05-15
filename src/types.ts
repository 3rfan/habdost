export type Id = string

export interface Habit {
  id: Id
  name: string
  tag: string
  scheduledDays: number[]
  type?: "boolean" | "numeric"
  unit?: string
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
  value?: number
  createdAt: string
}

export type GraphType = "mini-heatmap" | "bar-chart"
export type Timeframe = "1w" | "1m" | "3m" | "1y"

export interface StatisticsWidget {
  id: Id
  habitId: Id
  graphType: GraphType
  timeframe: Timeframe
  createdAt: string
}
