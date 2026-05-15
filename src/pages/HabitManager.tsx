import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/store"
import type { Habit } from "@/types"
import { Trash2, Plus, Repeat } from "lucide-react"

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
]

export default function HabitManager() {
  const habits = useAppStore((state) => state.habits)
  const addHabit = useAppStore((state) => state.addHabit)
  const deleteHabit = useAppStore((state) => state.deleteHabit)

  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [type, setType] = useState<"boolean" | "numeric">("boolean")
  const [unit, setUnit] = useState("")
  const [scheduledDays, setScheduledDays] = useState<number[]>([])

  const toggleDay = (day: number) => {
    setScheduledDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedTag = tag.trim().toLowerCase().replace(/^#/, "")

    if (!trimmedName || !trimmedTag || scheduledDays.length === 0) {
      return
    }

    if (habits.some((h) => h.tag === trimmedTag)) {
      alert("A habit with this tag already exists!")
      return
    }

    const habit: Habit = {
      id: crypto.randomUUID(),
      name: trimmedName,
      tag: trimmedTag,
      type: type,
      unit: type === "numeric" ? unit.trim() : undefined,
      scheduledDays: [...scheduledDays].sort(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await addHabit(habit)
    setName("")
    setTag("")
    setType("boolean")
    setUnit("")
    setScheduledDays([])
  }

  const handleDelete = async (id: string) => {
    await deleteHabit(id)
  }

  return (
    <div className="space-y-6">
      {/* Create Habit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            New Habit
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              />
            </div>

            <div className="space-y-2">
              <Label>Tracking Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="habit-type"
                    value="boolean"
                    checked={type === "boolean"}
                    onChange={() => setType("boolean")}
                  />
                  Yes / No
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="habit-type"
                    value="numeric"
                    checked={type === "numeric"}
                    onChange={() => setType("numeric")}
                  />
                  Numeric
                </label>
              </div>
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
              <Label>Repeat on</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const isSelected = scheduledDays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`flex h-9 w-11 items-center justify-center rounded-md border text-xs font-medium transition-colors ${
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

            <Button
              type="submit"
              className="w-full"
              disabled={!name.trim() || !tag.trim() || scheduledDays.length === 0}
            >
              Create Habit
            </Button>
          </form>
        </CardContent>
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
                      <p className="text-sm font-medium">{habit.name}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        #{habit.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {habit.scheduledDays
                        .map((d) => DAYS.find((day) => day.value === d)?.label)
                        .join(", ")}
                    </p>
                    {habit.type === "numeric" && (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Tracks: {habit.unit || "amount"}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(habit.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
