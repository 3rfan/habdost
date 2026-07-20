import { format, getDay, parseISO, differenceInCalendarDays } from "date-fns"

import type { Habit, Todo } from "@/types"

function isHabitDueToday(habit: Habit, todayDate: Date): boolean {
  if (habit.recurrenceType === "interval") {
    if (!habit.recurrenceStartDate || !habit.recurrenceInterval) return false
    const start = parseISO(habit.recurrenceStartDate)
    const diff = differenceInCalendarDays(todayDate, start)
    return diff >= 0 && diff % habit.recurrenceInterval === 0
  }
  // Default: weekdays
  const dayOfWeek = getDay(todayDate)
  return habit.scheduledDays.includes(dayOfWeek)
}

/**
 * Pure function that determines which recurring todos should be created today.
 * Returns an array of new Todo objects ready to be saved.
 *
 * A todo is generated for a habit when:
 *   1. Today's day-of-week or interval matches
 *   2. No existing todo with that habit's linkedHabitId already exists for today
 */
export function generateRecurringTodos(
  habits: Habit[],
  existingTodos: Todo[]
): Todo[] {
  const todayDate = new Date()
  const today = format(todayDate, "yyyy-MM-dd")

  const todaysTodos = existingTodos.filter((todo) => todo.date === today)
  const todaySortOrders = todaysTodos.map((t) => t.sortOrder ?? 0)
  let nextSortOrder = Math.max(0, ...todaySortOrders) + 10

  const linkedHabitIdsToday = new Set(
    todaysTodos
      .map((todo) => todo.linkedHabitId)
      .filter((id): id is string => id != null)
  )

  const newTodos: Todo[] = []

  for (const habit of habits) {
    if (!isHabitDueToday(habit, todayDate)) {
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
      sortOrder: nextSortOrder,
      createdAt: today,
      updatedAt: today,
    }

    newTodos.push(todo)
    nextSortOrder += 10
  }

  return newTodos
}
