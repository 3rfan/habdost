import { useEffect, useMemo } from "react"
import { format } from "date-fns"

import { Checkbox } from "@/components/ui/checkbox"
import TodoInput from "@/components/TodoInput"
import { useAppStore } from "@/store"

export default function MyDay() {
  const todos = useAppStore((state) => state.todos)
  const isLoading = useAppStore((state) => state.isLoading)
  const loadAll = useAppStore((state) => state.loadAll)
  const updateTodo = useAppStore((state) => state.updateTodo)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])
  const todaysTodos = useMemo(
    () => todos.filter((todo) => todo.date === today),
    [todos, today]
  )

  useEffect(() => {
    void loadAll()
  }, [loadAll])

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
          <p className="text-sm text-muted-foreground">No todos yet.</p>
        ) : (
          <ul className="space-y-2">
            {todaysTodos.map((todo) => (
              <li key={todo.id} className="flex items-start gap-3 rounded-md border p-3">
                <Checkbox
                  checked={todo.completed}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true
                    void updateTodo({
                      ...todo,
                      completed: isChecked,
                      updatedAt: today,
                    })
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
