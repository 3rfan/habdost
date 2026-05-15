import { format, getDay } from "date-fns"

import type { Habit, Todo } from "@/types"

/**
 * Pure function that determines which recurring todos should be created today.
 * Returns an array of new Todo objects ready to be saved.
 *
 * A todo is generated for a habit when:
 *   1. Today's day-of-week (0=Sun..6=Sat) is in the habit's scheduledDays
 *   2. No existing todo with that habit's linkedHabitId already exists for today
 */
export function generateRecurringTodos(
  habits: Habit[],
  existingTodos: Todo[]
): Todo[] {
  const today = format(new Date(), "yyyy-MM-dd")
  const dayOfWeek = getDay(new Date()) // 0=Sun, 1=Mon, ..., 6=Sat

  const todaysTodos = existingTodos.filter((todo) => todo.date === today)
  const linkedHabitIdsToday = new Set(
    todaysTodos
      .map((todo) => todo.linkedHabitId)
      .filter((id): id is string => id != null)
  )

  const newTodos: Todo[] = []

  for (const habit of habits) {
    if (!habit.scheduledDays.includes(dayOfWeek)) {
      continue
    }

    if (linkedHabitIdsToday.has(habit.id)) {
      continue
    }

    const todo: Todo = {
      id: crypto.randomUUID(),
      title: habit.name,
      date: today,
      completed: false,
      linkedHabitId: habit.id,
      createdAt: today,
      updatedAt: today,
    }

    newTodos.push(todo)
  }

  return newTodos
}
