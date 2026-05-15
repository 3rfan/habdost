import { useEffect, useMemo } from "react"
import { format } from "date-fns"

import { Checkbox } from "@/components/ui/checkbox"
import TodoInput from "@/components/TodoInput"
import { useAppStore } from "@/store"
import type { HabitLog } from "@/types"

export default function MyDay() {
  const todos = useAppStore((s) => s.todos)
  const logs = useAppStore((s) => s.logs)
  const isLoading = useAppStore((s) => s.isLoading)
  const loadAll = useAppStore((s) => s.loadAll)
  const updateTodo = useAppStore((s) => s.updateTodo)
  const addHabitLog = useAppStore((s) => s.addHabitLog)
  const deleteHabitLog = useAppStore((s) => s.deleteHabitLog)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const todaysTodos = useMemo(
    () => todos.filter((todo) => todo.date === today),
    [todos, today]
  )

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleToggle = async (todoId: string, checked: boolean) => {
    const todo = todaysTodos.find((t) => t.id === todoId)
    if (!todo) return

    await updateTodo({
      ...todo,
      completed: checked,
      updatedAt: today,
    })

    if (todo.linkedHabitId) {
      if (checked) {
        const log: HabitLog = {
          id: crypto.randomUUID(),
          habitId: todo.linkedHabitId,
          date: today,
          completed: true,
          createdAt: new Date().toISOString(),
        }
        await addHabitLog(log)
      } else {
        // Remove the habit log for today for this habit
        const existingLog = logs.find(
          (l) => l.habitId === todo.linkedHabitId && l.date === today
        )
        if (existingLog) {
          await deleteHabitLog(existingLog.id)
        }
      }
    }
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Today
        </h2>
        <TodoInput />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Tasks</h3>
        {todaysTodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No todos yet. Add one above or create habits in the Habits tab!</p>
        ) : (
          <ul className="space-y-2">
            {todaysTodos.map((todo) => (
              <li key={todo.id} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={(checked) => {
                    void handleToggle(todo.id, checked === true)
                  }}
                />
                <div className="space-y-1">
                  <p
                    className={
                      todo.completed
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm"
                    }
                  >
                    {todo.title}
                  </p>
                  {todo.linkedHabitId ? (
                    <p className="text-xs text-muted-foreground">Linked to habit</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

