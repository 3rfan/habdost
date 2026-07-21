import { useMemo, useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAppStore } from "@/store"
import { isHabitDueOnDate } from "@/scheduler"
import type { Todo } from "@/types"

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const getTodoStatus = (todo: Todo, dateStr: string) => {
  if (todo.completed) return "completed"
  const todayStr = format(new Date(), "yyyy-MM-dd")
  if (dateStr < todayStr) return "missed"
  return "scheduled"
}

export default function CalendarView() {
  const todos = useAppStore((state) => state.todos)
  const logs = useAppStore((state) => state.logs)
  const habits = useAppStore((state) => state.habits)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const selectedDateStr = selectedDate
    ? format(selectedDate, "yyyy-MM-dd")
    : null

  const selectedTodos = useMemo(
    () =>
      selectedDateStr
        ? todos.filter((todo) => todo.date === selectedDateStr)
        : [],
    [todos, selectedDateStr]
  )

  const selectedLogs = useMemo(
    () =>
      selectedDateStr
        ? logs.filter((log) => log.date === selectedDateStr && log.completed)
        : [],
    [logs, selectedDateStr]
  )

  // Build a set of dates that have any completed activity
  const activeDates = useMemo(() => {
    const dates = new Set<string>()
    for (const todo of todos) {
      if (todo.completed) dates.add(todo.date)
    }
    for (const log of logs) {
      if (log.completed) dates.add(log.date)
    }
    return dates
  }, [todos, logs])

  // Build a set of calendar dates that are scheduled/due but not completed
  const calendarScheduledState = useMemo(() => {
    const scheduled = new Set<string>()
    for (const day of calendarDays) {
      const dateStr = format(day, "yyyy-MM-dd")
      
      const hasTodo = todos.some((t) => t.date === dateStr)
      if (hasTodo) {
        scheduled.add(dateStr)
        continue
      }

      const hasHabit = habits.some((h) => isHabitDueOnDate(h, day))
      if (hasHabit) {
        scheduled.add(dateStr)
      }
    }
    return scheduled
  }, [calendarDays, todos, habits])

  const getHabitDisplay = (habitId: string) => {
    const h = habits.find((x) => x.id === habitId)
    if (!h) return "Unknown habit"
    return h.emoji ? `${h.emoji} ${h.name}` : h.name
  }

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Weekday headers */}
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {/* Day cells */}
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd")
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const isToday = isSameDay(day, new Date())
          const hasActivity = activeDates.has(dateStr)
          const isScheduled = calendarScheduledState.has(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(day)}
              className={`relative flex h-10 items-center justify-center rounded-md text-sm transition-colors ${
                !isCurrentMonth
                  ? "text-muted-foreground/30"
                  : isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "border border-primary text-foreground"
                      : "text-foreground hover:bg-accent"
              }`}
            >
              {format(day, "d")}
              {hasActivity && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
              )}
              {!hasActivity && isScheduled && !isSelected && (
                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full border border-primary bg-transparent" />
              )}
            </button>
          )
        })}
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>

          {selectedTodos.length === 0 && selectedLogs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                <CalendarDays className="mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No activity on this date.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {selectedTodos.map((todo) => {
                const status = getTodoStatus(todo, todo.date)
                const habit = todo.linkedHabitId ? habits.find((h) => h.id === todo.linkedHabitId) : undefined

                return (
                  <Card key={todo.id} className={status === "missed" ? "border-amber-500/50 bg-amber-500/5" : ""}>
                    <CardContent className="py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {status === "completed" && (
                            <span className="text-xs text-muted-foreground shrink-0">✓</span>
                          )}
                          {status === "scheduled" && (
                            <span className="text-xs text-blue-500 shrink-0">📅</span>
                          )}
                          {status === "missed" && (
                            <span className="text-xs text-amber-500 shrink-0 font-semibold">⚠️</span>
                          )}
                          <p className={`text-sm truncate ${status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                            {habit?.emoji && <span className="mr-1.5">{habit.emoji}</span>}
                            {todo.title}
                          </p>
                          {todo.linkedHabitId && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                              habit
                            </span>
                          )}
                        </div>
                        {status === "missed" && (
                          <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider shrink-0">
                            Missed
                          </span>
                        )}
                        {status === "scheduled" && (
                          <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider shrink-0">
                            Planned
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {selectedLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-500">●</span>
                      <p className="text-sm">{getHabitDisplay(log.habitId)}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        habit log
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
