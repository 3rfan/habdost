import { create } from "zustand"

import type { Habit, HabitLog, Id, Todo } from "@/types"
import {
  addHabit,
  addHabitLog,
  addTodo,
  deleteHabit,
  deleteTodo,
  getAllHabitLogs,
  getAllHabits,
  getAllTodos,
  updateTodo,
} from "@/db"

interface AppState {
  habits: Habit[]
  todos: Todo[]
  logs: HabitLog[]
  isLoading: boolean
  loadAll: () => Promise<void>
  addHabit: (habit: Habit) => Promise<void>
  deleteHabit: (id: Id) => Promise<void>
  addTodo: (todo: Todo) => Promise<void>
  updateTodo: (todo: Todo) => Promise<void>
  deleteTodo: (id: Id) => Promise<void>
  addHabitLog: (log: HabitLog) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  habits: [],
  todos: [],
  logs: [],
  isLoading: false,
  loadAll: async () => {
    set({ isLoading: true })
    const [habits, todos, logs] = await Promise.all([
      getAllHabits(),
      getAllTodos(),
      getAllHabitLogs(),
    ])
    set({ habits, todos, logs, isLoading: false })
  },
  addHabit: async (habit) => {
    await addHabit(habit)
    set({ habits: [...get().habits, habit] })
  },
  deleteHabit: async (id) => {
    await deleteHabit(id)
    set({ habits: get().habits.filter((habit) => habit.id !== id) })
  },
  addTodo: async (todo) => {
    await addTodo(todo)
    set({ todos: [...get().todos, todo] })
  },
  updateTodo: async (todo) => {
    await updateTodo(todo)
    set({ todos: get().todos.map((item) => (item.id === todo.id ? todo : item)) })
  },
  deleteTodo: async (id) => {
    await deleteTodo(id)
    set({ todos: get().todos.filter((todo) => todo.id !== id) })
  },
  addHabitLog: async (log) => {
    await addHabitLog(log)
    set({ logs: [...get().logs, log] })
  },
}))
