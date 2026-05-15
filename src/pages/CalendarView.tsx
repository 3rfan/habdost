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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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
        ? todos.filter(
            (todo) => todo.date === selectedDateStr && todo.completed
          )
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

  const getHabitName = (habitId: string) => {
    return habits.find((h) => h.id === habitId)?.name ?? "Unknown habit"
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
                  No completed activity on this date.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {selectedTodos.map((todo) => (
                <Card key={todo.id}>
                  <CardContent className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">✓</span>
                      <p className="text-sm">{todo.title}</p>
                      {todo.linkedHabitId && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          habit
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {selectedLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-500">●</span>
                      <p className="text-sm">{getHabitName(log.habitId)}</p>
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
