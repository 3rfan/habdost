import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import type { Habit, HabitLog, Id, Todo } from "@/types"

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
}

const DB_NAME = "HabitTodoDB"
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<HabitTodoDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<HabitTodoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const habits = db.createObjectStore("habits", { keyPath: "id" })
        habits.createIndex("by-tag", "tag")

        const todos = db.createObjectStore("todos", { keyPath: "id" })
        todos.createIndex("by-date", "date")
        todos.createIndex("by-linked-habit", "linkedHabitId")

        const logs = db.createObjectStore("logs", { keyPath: "id" })
        logs.createIndex("by-date", "date")
        logs.createIndex("by-habit", "habitId")
      },
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

export async function clearDatabase() {
  try {
    const db = await getDb()
    const tx = db.transaction(["habits", "todos", "logs"], "readwrite")
    await Promise.all([
      tx.objectStore("habits").clear(),
      tx.objectStore("todos").clear(),
      tx.objectStore("logs").clear(),
      tx.done,
    ])
  } catch (error) {
    console.error("Failed to clear database", error)
  }
}
