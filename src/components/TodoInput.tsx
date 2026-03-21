import { useMemo, useState } from "react"
import { format } from "date-fns"

import { useAppStore } from "@/store"
import type { Habit, Todo } from "@/types"

const hashtagRegex = /#[a-zA-Z0-9_]+/g

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase()
}

function extractTags(text: string) {
  const matches = text.match(hashtagRegex) ?? []
  return matches.map((match) => normalizeTag(match.slice(1)))
}

function buildTodoTitle(text: string) {
  return text.replace(hashtagRegex, " ").replace(/\s+/g, " ").trim()
}

function findLinkedHabit(tags: string[], habits: Habit[]) {
  const tagSet = new Set(tags)
  return habits.find((habit) => tagSet.has(normalizeTag(habit.tag))) ?? null
}

export default function TodoInput() {
  const [value, setValue] = useState("")
  const habits = useAppStore((state) => state.habits)
  const addTodo = useAppStore((state) => state.addTodo)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return
    }

    const tags = extractTags(trimmedValue)
    const linkedHabit = findLinkedHabit(tags, habits)
    const title = buildTodoTitle(trimmedValue)

    if (!title) {
      return
    }

    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      date: today,
      completed: false,
      linkedHabitId: linkedHabit?.id ?? null,
      createdAt: today,
      updatedAt: today,
    }

    await addTodo(todo)
    setValue("")
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Add a todo or #habit tag"
        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="submit"
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Add
      </button>
    </form>
  )
}
