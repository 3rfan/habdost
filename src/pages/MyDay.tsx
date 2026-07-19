import { useEffect, useMemo, useState } from "react"
import { format } from "date-fns"
import {
  DndContext,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Star, GripVertical } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import TodoInput from "@/components/TodoInput"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store"
import type { HabitLog, Todo } from "@/types"

function SortableTodoItem({
  todo,
  handleToggle,
  handleStarToggle,
}: {
  todo: Todo
  handleToggle: (todoId: string, checked: boolean) => Promise<void>
  handleStarToggle: (todoId: string) => Promise<void>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-md border bg-card p-3 shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Checkbox
        checked={todo.completed}
        onCheckedChange={async (checked) => {
          await handleToggle(todo.id, checked === true)
        }}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p
          className={
            todo.completed
              ? "text-sm text-muted-foreground line-through truncate"
              : "text-sm text-card-foreground truncate"
          }
        >
          {todo.title}
        </p>
        {todo.linkedHabitId ? (
          <p className="text-xs text-muted-foreground">Linked to habit</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => handleStarToggle(todo.id)}
        className={`p-1 transition-colors ${
          todo.starred
            ? "text-yellow-500 hover:text-yellow-600"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Star className="h-4 w-4" fill={todo.starred ? "currentColor" : "none"} />
      </button>
    </li>
  )
}

export default function MyDay() {
  const todos = useAppStore((s) => s.todos)
  const habits = useAppStore((s) => s.habits)
  const logs = useAppStore((s) => s.logs)
  const isLoading = useAppStore((s) => s.isLoading)
  const loadAll = useAppStore((s) => s.loadAll)
  const updateTodo = useAppStore((s) => s.updateTodo)
  const reorderTodos = useAppStore((s) => s.reorderTodos)
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

  const { starredTodos, unstarredTodos } = useMemo(() => {
    const starred = todaysTodos
      .filter((t) => t.starred)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const unstarred = todaysTodos
      .filter((t) => !t.starred)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    return { starredTodos: starred, unstarredTodos: unstarred }
  }, [todaysTodos])

  const formattedDate = useMemo(() => {
    const d = new Date()
    const dayName = format(d, "EEE")
    const dayNum = d.getDate()
    const monthName = format(d, "MMM")
    
    const getOrdinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"]
      const v = n % 100
      return n + (s[(v - 20) % 10] ?? s[v] ?? s[0])
    }

    return `${dayName}, ${getOrdinal(dayNum)} ${monthName}`
  }, [])

  const completedCount = useMemo(
    () => todaysTodos.filter((t) => t.completed).length,
    [todaysTodos]
  )
  const totalCount = todaysTodos.length

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTodo = todaysTodos.find((t) => t.id === active.id)
    const overTodo = todaysTodos.find((t) => t.id === over.id)
    if (!activeTodo || !overTodo) return

    // Starred and unstarred groups are sorted independently
    if (activeTodo.starred !== overTodo.starred) return

    const isStarred = activeTodo.starred
    const groupTodos = todaysTodos
      .filter((t) => !!t.starred === !!isStarred)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

    const oldIndex = groupTodos.findIndex((t) => t.id === active.id)
    const newIndex = groupTodos.findIndex((t) => t.id === over.id)

    const reorderedGroup = arrayMove(groupTodos, oldIndex, newIndex)
    await reorderTodos(reorderedGroup.map((t) => t.id))
  }

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

  const handleStarToggle = async (todoId: string) => {
    const todo = todaysTodos.find((t) => t.id === todoId)
    if (!todo) return
    await updateTodo({
      ...todo,
      starred: !todo.starred,
      updatedAt: today,
    })
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
          {formattedDate}
        </h2>
        <TodoInput />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Tasks</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount} / {totalCount} completed
          </span>
        </div>

        {todaysTodos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No todos yet. Add one above or create habits in the Habits tab!</p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="space-y-4">
              {starredTodos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Starred Tasks
                  </h4>
                  <SortableContext
                    items={starredTodos.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {starredTodos.map((todo) => (
                        <SortableTodoItem
                          key={todo.id}
                          todo={todo}
                          handleToggle={handleToggle}
                          handleStarToggle={handleStarToggle}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </div>
              )}

              {starredTodos.length > 0 && unstarredTodos.length > 0 && (
                <div className="border-t border-dashed my-4" />
              )}

              {unstarredTodos.length > 0 && (
                <div className="space-y-2">
                  {starredTodos.length > 0 && (
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Other Tasks
                    </h4>
                  )}
                  <SortableContext
                    items={unstarredTodos.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {unstarredTodos.map((todo) => (
                        <SortableTodoItem
                          key={todo.id}
                          todo={todo}
                          handleToggle={handleToggle}
                          handleStarToggle={handleStarToggle}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </div>
              )}
            </div>
          </DndContext>
        )}
      </section>
    </div>
  )
}
