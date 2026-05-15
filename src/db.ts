import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import type { Habit, HabitLog, Id, StatisticsWidget, Todo } from "@/types"

interface HabitTodoDB extends DBSchema {
  habits: {
    key: Id
    value: Habit
    indexes: { "by-tag": string }
  }
  todos: {
    key: Id
    value: Todo
    indexes: { "by-date": string; "by-linked-habit": Id }
  }
  logs: {
    key: Id
    value: HabitLog
    indexes: { "by-date": string; "by-habit": Id }
  }
  statistics_widgets: {
    key: Id
    value: StatisticsWidget
    indexes: { "by-habit": Id }
  }
}

const DB_NAME = "HabitTodoDB"
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase<HabitTodoDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HabitTodoDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const habits = db.createObjectStore("habits", { keyPath: "id" })
          habits.createIndex("by-tag", "tag")

          const todos = db.createObjectStore("todos", { keyPath: "id" })
          todos.createIndex("by-date", "date")
          todos.createIndex("by-linked-habit", "linkedHabitId")

          const logs = db.createObjectStore("logs", { keyPath: "id" })
          logs.createIndex("by-date", "date")
          logs.createIndex("by-habit", "habitId")
        }
        if (oldVersion < 2) {
          const widgets = db.createObjectStore("statistics_widgets", { keyPath: "id" })
          widgets.createIndex("by-habit", "habitId")
        }
      },
      blocked() {
        console.warn("IndexedDB upgrade blocked! Please close other tabs of this app.")
        alert("HabDost is updating. Please close all other tabs of this app and reload this page to complete the update.")
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then(db => db.close())
          dbPromise = null
        }
      }
    })
  }

  return dbPromise
}

export async function getAllHabits() {
  try {
    const db = await getDb()
    return await db.getAll("habits")
  } catch (error) {
    console.error("Failed to load habits", error)
    return [] as Habit[]
  }
}

export async function addHabit(habit: Habit) {
  try {
    const db = await getDb()
    await db.put("habits", habit)
  } catch (error) {
    console.error("Failed to save habit", error)
  }
}

export async function deleteHabit(id: Id) {
  try {
    const db = await getDb()
    await db.delete("habits", id)
  } catch (error) {
    console.error("Failed to delete habit", error)
  }
}

export async function getAllTodos() {
  try {
    const db = await getDb()
    return await db.getAll("todos")
  } catch (error) {
    console.error("Failed to load todos", error)
    return [] as Todo[]
  }
}

export async function getTodosByDate(date: string) {
  try {
    const db = await getDb()
    return await db.getAllFromIndex("todos", "by-date", date)
  } catch (error) {
    console.error("Failed to load todos by date", error)
    return [] as Todo[]
  }
}

export async function addTodo(todo: Todo) {
  try {
    const db = await getDb()
    await db.put("todos", todo)
  } catch (error) {
    console.error("Failed to save todo", error)
  }
}

export async function updateTodo(todo: Todo) {
  try {
    const db = await getDb()
    await db.put("todos", todo)
  } catch (error) {
    console.error("Failed to update todo", error)
  }
}

export async function deleteTodo(id: Id) {
  try {
    const db = await getDb()
    await db.delete("todos", id)
  } catch (error) {
    console.error("Failed to delete todo", error)
  }
}

export async function getAllHabitLogs() {
  try {
    const db = await getDb()
    return await db.getAll("logs")
  } catch (error) {
    console.error("Failed to load habit logs", error)
    return [] as HabitLog[]
  }
}

export async function getHabitLogsByDate(date: string) {
  try {
    const db = await getDb()
    return await db.getAllFromIndex("logs", "by-date", date)
  } catch (error) {
    console.error("Failed to load habit logs by date", error)
    return [] as HabitLog[]
  }
}

export async function addHabitLog(log: HabitLog) {
  try {
    const db = await getDb()
    await db.put("logs", log)
  } catch (error) {
    console.error("Failed to save habit log", error)
  }
}

export async function deleteHabitLog(id: Id) {
  try {
    const db = await getDb()
    await db.delete("logs", id)
  } catch (error) {
    console.error("Failed to delete habit log", error)
  }
}

export async function getHabitLogsByHabitAndDate(
  habitId: Id,
  date: string
): Promise<HabitLog[]> {
  try {
    const db = await getDb()
    const allByDate = await db.getAllFromIndex("logs", "by-date", date)
    return allByDate.filter((log) => log.habitId === habitId)
  } catch (error) {
    console.error("Failed to load habit logs by habit and date", error)
    return []
  }
}

export async function clearDatabase() {
  try {
    const db = await getDb()
    const tx = db.transaction(["habits", "todos", "logs", "statistics_widgets"], "readwrite")
    await Promise.all([
      tx.objectStore("habits").clear(),
      tx.objectStore("todos").clear(),
      tx.objectStore("logs").clear(),
      tx.objectStore("statistics_widgets").clear(),
      tx.done,
    ])
  } catch (error) {
    console.error("Failed to clear database", error)
  }
}

export async function getAllWidgets() {
  try {
    const db = await getDb()
    return await db.getAll("statistics_widgets")
  } catch (error) {
    console.error("Failed to load statistics widgets", error)
    return [] as StatisticsWidget[]
  }
}

export async function addWidget(widget: StatisticsWidget) {
  try {
    const db = await getDb()
    await db.put("statistics_widgets", widget)
  } catch (error) {
    console.error("Failed to save widget", error)
  }
}

export async function deleteWidget(id: Id) {
  try {
    const db = await getDb()
    await db.delete("statistics_widgets", id)
  } catch (error) {
    console.error("Failed to delete widget", error)
  }
}
