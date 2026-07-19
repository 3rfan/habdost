import { create } from "zustand"

import type { Habit, HabitLog, Id, StatisticsWidget, Todo } from "@/types"
import {
  addHabit,
  addHabitLog,
  addTodo,
  addWidget,
  clearDatabase,
  deleteHabit,
  deleteHabitLog,
  deleteTodo,
  deleteWidget,
  getAllHabitLogs,
  getAllHabits,
  getAllTodos,
  getAllWidgets,
  updateTodo,
  reorderTodos as reorderTodosDb,
} from "@/db"

interface AppState {
  habits: Habit[]
  todos: Todo[]
  logs: HabitLog[]
  widgets: StatisticsWidget[]
  isLoading: boolean
  loadAll: () => Promise<void>
  addHabit: (habit: Habit) => Promise<void>
  deleteHabit: (id: Id) => Promise<void>
  addTodo: (todo: Todo) => Promise<void>
  updateTodo: (todo: Todo) => Promise<void>
  deleteTodo: (id: Id) => Promise<void>
  reorderTodos: (orderedIds: string[]) => Promise<void>
  addHabitLog: (log: HabitLog) => Promise<void>
  deleteHabitLog: (id: Id) => Promise<void>
  addWidget: (widget: StatisticsWidget) => Promise<void>
  updateWidget: (widget: StatisticsWidget) => Promise<void>
  deleteWidget: (id: Id) => Promise<void>
  clearAll: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  habits: [],
  todos: [],
  logs: [],
  widgets: [],
  isLoading: false,
  loadAll: async () => {
    set({ isLoading: true })
    const [habits, todos, logs, widgets] = await Promise.all([
      getAllHabits(),
      getAllTodos(),
      getAllHabitLogs(),
      getAllWidgets(),
    ])
    set({ habits, todos, logs, widgets, isLoading: false })
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
  reorderTodos: async (orderedIds) => {
    const currentTodos = get().todos
    const idMap = new Map(orderedIds.map((id, index) => [id, index * 10]))
    
    const updatedTodos: Todo[] = []
    const newStoreTodos = currentTodos.map((todo) => {
      if (idMap.has(todo.id)) {
        const newTodo = { ...todo, sortOrder: idMap.get(todo.id) }
        updatedTodos.push(newTodo)
        return newTodo
      }
      return todo
    })

    if (updatedTodos.length > 0) {
      await reorderTodosDb(updatedTodos)
    }
    set({ todos: newStoreTodos })
  },
  addHabitLog: async (log) => {
    await addHabitLog(log)
    set({ logs: [...get().logs, log] })
  },
  deleteHabitLog: async (id) => {
    await deleteHabitLog(id)
    set({ logs: get().logs.filter((log) => log.id !== id) })
  },
  addWidget: async (widget) => {
    await addWidget(widget)
    set({ widgets: [...get().widgets, widget] })
  },
  updateWidget: async (widget) => {
    await addWidget(widget)
    set({ widgets: get().widgets.map((w) => (w.id === widget.id ? widget : w)) })
  },
  deleteWidget: async (id) => {
    await deleteWidget(id)
    set({ widgets: get().widgets.filter((w) => w.id !== id) })
  },
  clearAll: async () => {
    await clearDatabase()
    set({ habits: [], todos: [], logs: [], widgets: [] })
  },
}))
