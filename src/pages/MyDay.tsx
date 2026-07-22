import { useEffect, useMemo, useState, useRef } from "react"
import { format } from "date-fns"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
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
import { Star, GripVertical, Undo2, Check, X, Pencil } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import TodoInput from "@/components/TodoInput"
import { extractTags, buildTodoTitle, findLinkedHabit } from "@/lib/todoUtils"
import SwipeableTodoItem from "@/components/SwipeableTodoItem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAppStore } from "@/store"
import type { Habit, HabitLog, Todo } from "@/types"

function SortableTodoItem({
  todo,
  handleToggle,
  handleStarToggle,
  handleUpdateTodoText,
  habits,
  onDelete,
  disabledSwipe,
}: {
  todo: Todo
  handleToggle: (todoId: string, checked: boolean) => Promise<void>
  handleStarToggle: (todoId: string) => Promise<void>
  handleUpdateTodoText: (todoId: string, newText: string) => Promise<void>
  habits: Habit[]
  onDelete: () => void
  disabledSwipe?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState("")

  const habit = todo.linkedHabitId ? habits.find((h) => h.id === todo.linkedHabitId) : undefined

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  }

  const handleStartEdit = () => {
    const initialText = habit ? `${todo.title} #${habit.tag}` : todo.title
    setEditText(initialText)
    setIsEditing(true)
  }

  const handleSaveEdit = async () => {
    if (editText.trim()) {
      await handleUpdateTodoText(todo.id, editText)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      void handleSaveEdit()
    } else if (e.key === "Escape") {
      setIsEditing(false)
    }
  }

  return (
    <li ref={setNodeRef} style={style}>
      <SwipeableTodoItem onDelete={onDelete} disabled={disabledSwipe || isEditing}>
        <div className="flex flex-col rounded-md border bg-card p-3 shadow-sm select-none touch-pan-y transition-all">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing touch-none select-none shrink-0"
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
            <div
              className="flex-1 min-w-0 space-y-1 cursor-pointer group"
              onClick={() => {
                if (!isEditing) handleStartEdit()
              }}
            >
              <p
                className={
                  todo.completed
                    ? "text-sm text-muted-foreground line-through truncate flex items-center gap-1.5"
                    : "text-sm text-card-foreground truncate flex items-center gap-1.5"
                }
              >
                {habit && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-xs"
                    style={{ backgroundColor: habit.color || "#10b981" }}
                    title={`Linked to habit: ${habit.name}`}
                  />
                )}
                {habit?.emoji && <span className="mr-0.5">{habit.emoji}</span>}
                <span className="group-hover:underline">{todo.title}</span>
                {habit && (
                  <span className="font-mono text-xs text-primary/80 font-medium shrink-0">
                    #{habit.tag}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartEdit}
              title="Edit task"
              className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleStarToggle(todo.id)}
              className={`p-1 transition-colors shrink-0 ${
                todo.starred
                  ? "text-yellow-500 hover:text-yellow-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="h-4 w-4" fill={todo.starred ? "currentColor" : "none"} />
            </button>
          </div>

          {/* EXPANDABLE EDIT BOX */}
          {isEditing && (
            <div
              className="mt-3 pt-3 border-t flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <Input
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Task title or #habit tag"
                className="text-sm h-9"
              />
              <div className="flex justify-end gap-1.5 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs px-2.5"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="mr-1 h-3 w-3" /> Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5"
                  onClick={() => void handleSaveEdit()}
                >
                  <Check className="mr-1 h-3 w-3" /> Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </SwipeableTodoItem>
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
  const deleteTodo = useAppStore((s) => s.deleteTodo)
  const reorderTodos = useAppStore((s) => s.reorderTodos)
  const addHabitLog = useAppStore((s) => s.addHabitLog)
  const deleteHabitLog = useAppStore((s) => s.deleteHabitLog)

  const [numericPrompt, setNumericPrompt] = useState<{
    todoId: string
    habitName: string
    unit: string
  } | null>(null)
  const [numericInput, setNumericInput] = useState("")

  // Deferred deletion state for undo functionality
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const undoTimeoutRef = useRef<{ todo: Todo; timeoutId: number } | null>(null)
  const [undoToastInfo, setUndoToastInfo] = useState<{ id: string; title: string } | null>(null)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const todaysTodos = useMemo(
    () => todos.filter((todo) => todo.date === today && !pendingDeleteIds.includes(todo.id)),
    [todos, today, pendingDeleteIds]
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
        delay: 200,
        tolerance: 6,
      },
    })
  )

  const [todoToDeleteConfirm, setTodoToDeleteConfirm] = useState<Todo | null>(null)
  // Track the actively-dragged item ID so we can render a DragOverlay clone.
  const [activeId, setActiveId] = useState<string | null>(null)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleInitiateDelete = (todoId: string) => {
    const todoToDelete = todos.find((t) => t.id === todoId)
    if (!todoToDelete) return

    // Clear any previous undo toast timeout if one is pending
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current.timeoutId)
      const prevTodo = undoTimeoutRef.current.todo
      executeFinalDelete(prevTodo)
    }

    // Hide item visually by adding to pending list
    setPendingDeleteIds((prev) => [...prev, todoId])
    setUndoToastInfo({ id: todoToDelete.id, title: todoToDelete.title })

    // Set 3-second timeout for permanent deletion
    const timeoutId = window.setTimeout(() => {
      executeFinalDelete(todoToDelete)
      setUndoToastInfo(null)
      undoTimeoutRef.current = null
    }, 3000)

    undoTimeoutRef.current = { todo: todoToDelete, timeoutId }
  }

  const executeFinalDelete = async (todo: Todo) => {
    await deleteTodo(todo.id)
    setPendingDeleteIds((prev) => prev.filter((id) => id !== todo.id))

    // If deleting a habit-linked task, mark today's log as 'skipped'
    if (todo.linkedHabitId) {
      const log: HabitLog = {
        id: crypto.randomUUID(),
        habitId: todo.linkedHabitId,
        date: today,
        completed: false,
        status: "skipped",
        createdAt: new Date().toISOString(),
      }
      await addHabitLog(log)
    }
  }

  const handleUndoDelete = () => {
    if (!undoTimeoutRef.current) return

    clearTimeout(undoTimeoutRef.current.timeoutId)
    const restoredTodo = undoTimeoutRef.current.todo

    setPendingDeleteIds((prev) => prev.filter((id) => id !== restoredTodo.id))
    setUndoToastInfo(null)
    undoTimeoutRef.current = null
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeTodo = todaysTodos.find((t) => t.id === active.id)
    const overTodo = todaysTodos.find((t) => t.id === over.id)
    if (!activeTodo || !overTodo) return

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
          status: "completed",
          value: numericValue,
          createdAt: new Date().toISOString(),
        }
        await addHabitLog(log)
      } else {
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
      return
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

  const handleUpdateTodoText = async (todoId: string, newText: string) => {
    const todo = todaysTodos.find((t) => t.id === todoId) || todos.find((t) => t.id === todoId)
    if (!todo) return

    const trimmed = newText.trim()
    if (!trimmed) return

    const tags = extractTags(trimmed)
    const newLinkedHabit = findLinkedHabit(tags, habits)
    const cleanTitle = buildTodoTitle(trimmed) || trimmed

    await updateTodo({
      ...todo,
      title: cleanTitle,
      linkedHabitId: newLinkedHabit?.id ?? null,
      updatedAt: today,
    })
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6 pb-4">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                          handleUpdateTodoText={handleUpdateTodoText}
                          habits={habits}
                          onDelete={() => setTodoToDeleteConfirm(todo)}
                          disabledSwipe={activeId !== null}
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
                          handleUpdateTodoText={handleUpdateTodoText}
                          habits={habits}
                          onDelete={() => setTodoToDeleteConfirm(todo)}
                          disabledSwipe={activeId !== null}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </div>
              )}
            </div>

            {/* Floating drag overlay — renders a non-interactive clone of the
                dragged item. Not wrapped in SwipeableTodoItem to prevent touch
                events on the overlay from triggering swipe-delete. */}
            <DragOverlay>
              {activeId ? (() => {
                const activeTodo = todaysTodos.find((t) => t.id === activeId)
                const activeHabit = activeTodo?.linkedHabitId
                  ? habits.find((h) => h.id === activeTodo.linkedHabitId)
                  : undefined
                if (!activeTodo) return null
                return (
                  <li className="flex items-center gap-3 rounded-md border bg-card p-3 shadow-lg ring-1 ring-border select-none">
                    <span className="p-1 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className={activeTodo.completed ? "text-sm text-muted-foreground line-through truncate flex items-center gap-1.5" : "text-sm text-card-foreground truncate flex items-center gap-1.5"}>
                        {activeHabit && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-xs"
                            style={{ backgroundColor: activeHabit.color || "#10b981" }}
                          />
                        )}
                        {activeHabit?.emoji && <span className="mr-0.5">{activeHabit.emoji}</span>}
                        {activeTodo.title}
                      </p>
                    </div>
                    <Star
                      className="h-4 w-4 p-0"
                      fill={activeTodo.starred ? "currentColor" : "none"}
                      style={{ color: activeTodo.starred ? "rgb(234 179 8)" : undefined }}
                    />
                  </li>
                )
              })() : null}
            </DragOverlay>
          </DndContext>
        )}
      </section>

      {/* Delete Task Confirmation Modal */}
      {todoToDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Delete Task?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete &quot;<span className="font-semibold text-foreground">{todoToDeleteConfirm.title}</span>&quot;?
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setTodoToDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleInitiateDelete(todoToDeleteConfirm.id)
                    setTodoToDeleteConfirm(null)
                  }}
                >
                  Delete Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating Undo Toast notification */}
      {undoToastInfo && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-slate-900 px-4 py-2.5 text-slate-100 shadow-xl border border-slate-700/60 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-300/60 transition-all animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-medium truncate max-w-[200px] text-slate-200 dark:text-slate-800">
            Deleted &quot;{undoToastInfo.title}&quot;
          </span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 dark:text-amber-600 dark:hover:text-amber-700 underline underline-offset-2 transition-colors shrink-0"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
