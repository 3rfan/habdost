import { useState } from "react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAppStore } from "@/store"
import { generateRecurringTodos } from "@/scheduler"
import type { Habit } from "@/types"
import { Trash2, Plus, Repeat, ChevronDown, ChevronUp, Pencil, Palette } from "lucide-react"

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
]

const PRESET_COLORS = [
  { label: "Emerald", hex: "#10b981" },
  { label: "Purple", hex: "#8b5cf6" },
  { label: "Indigo", hex: "#6366f1" },
  { label: "Cyan", hex: "#06b6d4" },
  { label: "Rose", hex: "#f43f5e" },
  { label: "Amber", hex: "#f59e0b" },
  { label: "Red", hex: "#ef4444" },
  { label: "Teal", hex: "#14b8a6" },
]


export default function HabitManager() {
  const habits = useAppStore((state) => state.habits)
  const addHabit = useAppStore((state) => state.addHabit)
  const updateHabit = useAppStore((state) => state.updateHabit)
  const addTodo = useAppStore((state) => state.addTodo)
  const deleteHabit = useAppStore((state) => state.deleteHabit)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null)

  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [emoji, setEmoji] = useState("")
  const [color, setColor] = useState("#10b981")
  const [type, setType] = useState<"boolean" | "numeric">("boolean")
  const [unit, setUnit] = useState("")
  const [scheduledDays, setScheduledDays] = useState<number[]>([])

  const [recurrenceType, setRecurrenceType] = useState<"weekdays" | "interval" | "none">("weekdays")
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"))

  const resetForm = () => {
    setEditingHabitId(null)
    setName("")
    setTag("")
    setEmoji("")
    setColor("#10b981")
    setType("boolean")
    setUnit("")
    setScheduledDays([])
    setRecurrenceType("weekdays")
    setRecurrenceInterval(1)
    setRecurrenceStartDate(format(new Date(), "yyyy-MM-dd"))
  }

  const handleStartEdit = (habit: Habit) => {
    setEditingHabitId(habit.id)
    setName(habit.name)
    setTag(habit.tag)
    setEmoji(habit.emoji || "")
    setColor(habit.color || "#10b981")
    setType(habit.type || "boolean")
    setUnit(habit.unit || "")
    setScheduledDays(habit.scheduledDays || [])
    setRecurrenceType(habit.recurrenceType || "weekdays")
    setRecurrenceInterval(habit.recurrenceInterval || 1)
    setRecurrenceStartDate(habit.recurrenceStartDate || format(new Date(), "yyyy-MM-dd"))
    setIsFormOpen(true)
  }

  const toggleDay = (day: number) => {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleCancelClick = () => {
    if (name.trim() || tag.trim() || emoji.trim() || scheduledDays.length > 0) {
      setShowCancelModal(true)
    } else {
      resetForm()
      setIsFormOpen(false)
    }
  }

  const confirmCancel = () => {
    resetForm()
    setShowCancelModal(false)
    setIsFormOpen(false)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedTag = tag.trim().toLowerCase().replace(/^#/, "")
    const emojiSpanned = [...emoji.trim()]

    if (!trimmedName || !trimmedTag) {
      return
    }

    if (recurrenceType === "weekdays" && scheduledDays.length === 0) {
      return
    }
    if (recurrenceType === "interval" && (!recurrenceInterval || recurrenceInterval < 1)) {
      return
    }

    if (emojiSpanned.length > 2) {
      alert("Emoji should be maximum 2 characters/emojis!")
      return
    }

    if (!editingHabitId && habits.some((h) => h.tag === trimmedTag)) {
      alert("A habit with this tag already exists!")
      return
    }

    if (editingHabitId) {
      const existing = habits.find((h) => h.id === editingHabitId)
      if (existing) {
        const updatedHabit: Habit = {
          ...existing,
          name: trimmedName,
          type,
          unit: type === "numeric" ? unit.trim() : undefined,
          emoji: emojiSpanned.join("") || undefined,
          color: color.trim() || "#10b981",
          recurrenceType,
          recurrenceInterval: recurrenceType === "interval" ? recurrenceInterval : undefined,
          recurrenceStartDate: recurrenceType === "interval" ? recurrenceStartDate : undefined,
          scheduledDays: recurrenceType === "weekdays" ? [...scheduledDays].sort() : [],
          updatedAt: new Date().toISOString(),
        }

        await updateHabit(updatedHabit)

        const currentTodos = useAppStore.getState().todos
        const newTodos = generateRecurringTodos([updatedHabit], currentTodos)
        for (const todo of newTodos) {
          await addTodo(todo)
        }
      }
    } else {
      const habit: Habit = {
        id: crypto.randomUUID(),
        name: trimmedName,
        tag: trimmedTag,
        type: type,
        unit: type === "numeric" ? unit.trim() : undefined,
        emoji: emojiSpanned.join("") || undefined,
        color: color.trim() || "#10b981",
        recurrenceType,
        recurrenceInterval: recurrenceType === "interval" ? recurrenceInterval : undefined,
        recurrenceStartDate: recurrenceType === "interval" ? recurrenceStartDate : undefined,
        scheduledDays: recurrenceType === "weekdays" ? [...scheduledDays].sort() : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await addHabit(habit)

      const currentTodos = useAppStore.getState().todos
      const newTodos = generateRecurringTodos([habit], currentTodos)
      for (const todo of newTodos) {
        await addTodo(todo)
      }
    }

    resetForm()
    setIsFormOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Discard New Habit?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to cancel? Any unsaved habit details will be discarded.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowCancelModal(false)}>
                  Keep Editing
                </Button>
                <Button variant="destructive" onClick={confirmCancel}>
                  Discard Habit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Habit Confirmation Modal */}
      {habitToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Delete Habit?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete &quot;<span className="font-semibold text-foreground">{habitToDelete.name}</span>&quot;? This will stop future automatic scheduling for this habit.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setHabitToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteHabit(habitToDelete.id)
                    setHabitToDelete(null)
                  }}
                >
                  Delete Habit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Collapsible Create Habit Card */}
      <Card>
        <CardHeader
          onClick={() => setIsFormOpen((prev) => !prev)}
          className="cursor-pointer select-none transition-colors hover:bg-accent/50 rounded-t-xl py-1.5 px-4"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {editingHabitId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingHabitId ? "Edit Habit" : "New Habit"}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-normal">
                {isFormOpen ? "Tap to collapse" : "Tap to expand"}
              </span>
              {isFormOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
            isFormOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <CardContent className="pt-3">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="habit-name">Habit Name</Label>
                  <Input
                    id="habit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning workout"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habit-tag">Tag (used with #hashtag in todos)</Label>
                  <Input
                    id="habit-tag"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="e.g. gym"
                    disabled={!!editingHabitId}
                  />
                  {editingHabitId && (
                    <p className="text-[10px] text-muted-foreground">Tag cannot be changed to maintain database consistency.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habit-emoji">Emoji (optional)</Label>
                  <Input
                    id="habit-emoji"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="e.g. 🙂"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habit-color">Habit Color</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          color.toLowerCase() === c.hex.toLowerCase()
                            ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "hover:scale-105 opacity-80 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                    <div
                      className={`relative flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-105 shadow-sm ${
                        !PRESET_COLORS.some(c => c.hex.toLowerCase() === color.toLowerCase())
                          ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : ""
                      }`}
                      style={{
                        background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                      }}
                      title="Custom Color Picker"
                    >
                      <input
                        id="habit-color"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 opacity-0"
                      />
                      <div 
                        className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: color }}
                      >
                        <Palette className="h-3 w-3 text-white mix-blend-difference" strokeWidth={2.5} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tracking-type-select">Tracking Type</Label>
                  <Select
                    id="tracking-type-select"
                    value={type}
                    onChange={(e) => setType(e.target.value as "boolean" | "numeric")}
                  >
                    <option value="boolean">Yes / No (Boolean)</option>
                    <option value="numeric">Numeric (Amount)</option>
                  </Select>
                </div>

                {type === "numeric" && (
                  <div className="space-y-2">
                    <Label htmlFor="habit-unit">Unit (e.g., glasses, hours)</Label>
                    <Input
                      id="habit-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. pages"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="schedule-select">Schedule</Label>
                  <Select
                    id="schedule-select"
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as "weekdays" | "interval" | "none")}
                  >
                    <option value="weekdays">Specific Weekdays</option>
                    <option value="interval">Every N Days</option>
                    <option value="none">No Fixed Schedule (#tag in My Day)</option>
                  </Select>
                </div>

                {recurrenceType === "weekdays" && (
                  <div className="space-y-2">
                    <Label>Repeat on</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {DAYS.map((day) => {
                        const isSelected = scheduledDays.includes(day.value)
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            }`}
                          >
                            {day.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {recurrenceType === "interval" && (
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="recurrence-interval">Every (days)</Label>
                      <Input
                        id="recurrence-interval"
                        type="number"
                        min={1}
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="recurrence-start-date">Start Date</Label>
                      <Input
                        id="recurrence-start-date"
                        type="date"
                        value={recurrenceStartDate}
                        onChange={(e) => setRecurrenceStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {recurrenceType === "none" && (
                  <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      This habit won't appear automatically in My Day. Add it manually by typing{" "}
                      <span className="font-mono font-semibold text-foreground">#{tag || "tag"}</span>{" "}
                      in the todo input to log it on any day you like.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelClick}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      !name.trim() ||
                      !tag.trim() ||
                      (recurrenceType === "weekdays" && scheduledDays.length === 0) ||
                      (recurrenceType === "interval" && (!recurrenceInterval || recurrenceInterval < 1))
                    }
                  >
                    {editingHabitId ? "Update Habit" : "Create Habit"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </div>
        </div>
      </Card>

      {/* Habit List */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Habits
        </h2>
        {habits.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Repeat className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No habits yet. Create one above to get started!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {habits.map((habit) => (
              <Card key={habit.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <span
                          className="inline-block h-3 w-3 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-xs"
                          style={{ backgroundColor: habit.color || "#10b981" }}
                        />
                        {habit.emoji && <span className="mr-0.5">{habit.emoji}</span>}
                        {habit.name}
                      </p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        #{habit.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {habit.recurrenceType === "interval"
                        ? `Every ${habit.recurrenceInterval} days (starts ${habit.recurrenceStartDate})`
                        : habit.recurrenceType === "none"
                          ? "No fixed schedule"
                          : habit.scheduledDays
                              .map((d) => DAYS.find((day) => day.value === d)?.label)
                              .join(", ")}
                    </p>
                    {habit.type === "numeric" && (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Tracks: {habit.unit || "amount"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(habit)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Edit habit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setHabitToDelete(habit)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete habit"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
