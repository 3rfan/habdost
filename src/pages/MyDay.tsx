import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"

import { Checkbox } from "@/components/ui/checkbox"
import TodoInput from "@/components/TodoInput"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store"
import type { HabitLog, Todo } from "@/types"

export default function MyDay() {
  const todos = useAppStore((s) => s.todos)
  const habits = useAppStore((s) => s.habits)
  const logs = useAppStore((s) => s.logs)
  const isLoading = useAppStore((s) => s.isLoading)
  const loadAll = useAppStore((s) => s.loadAll)
  const updateTodo = useAppStore((s) => s.updateTodo)
  const addHabitLog = useAppStore((s) => s.addHabitLog)
  const deleteHabitLog = useAppStore((s) => s.deleteHabitLog)

  const [numericPrompt, setNumericPrompt] = useState<{
    todoId: string
    habitName: string
    unit: string
  } | null>(null)
  const [numericInput, setNumericInput] = useState("")

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const todaysTodos = useMemo(
    () => todos.filter((todo) => todo.date === today),
    [todos, today]
  )

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const performToggle = async (todo: Todo, checked: boolean, numericValue?: number) => {
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
          value: numericValue,
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

  const handleToggle = async (todoId: string, checked: boolean) => {
    const todo = todaysTodos.find((t) => t.id === todoId)
    if (!todo) return

    const habit = todo.linkedHabitId ? habits.find((h) => h.id === todo.linkedHabitId) : undefined

    if (checked && habit?.type === "numeric") {
      setNumericPrompt({
        todoId: todo.id,
        habitName: habit.name,
        unit: habit.unit || "amount",
      })
      setNumericInput("")
      return // Wait for user to submit the modal
    }

    await performToggle(todo, checked)
  }

  const handleNumericSubmit = async () => {
    if (!numericPrompt) return
    const parsed = parseFloat(numericInput)
    if (isNaN(parsed)) {
      alert("Invalid number entered.")
      return
    }

    const todo = todaysTodos.find((t) => t.id === numericPrompt.todoId)
    if (todo) {
      await performToggle(todo, true, parsed)
    }
    setNumericPrompt(null)
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {numericPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Log {numericPrompt.habitName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Amount ({numericPrompt.unit})
                </label>
                <Input
                  type="number"
                  autoFocus
                  value={numericInput}
                  onChange={(e) => setNumericInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNumericSubmit()
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setNumericPrompt(null)}>
                  Cancel
                </Button>
                <Button onClick={handleNumericSubmit} disabled={!numericInput}>
                  Save Log
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                  onCheckedChange={async (checked) => {
                    await handleToggle(todo.id, checked === true)
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
