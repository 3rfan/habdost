import { useMemo, useState } from "react"
import {
  format,
  subDays,
  startOfWeek,
  eachDayOfInterval,
  getDay,
} from "date-fns"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Flame, Plus, Trash2, Pencil, GripVertical, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/store"
import type { Timeframe, GraphType, StatisticsWidget, Habit, WidgetSize } from "@/types"


const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"]

const TIMEFRAMES: { label: string; value: Timeframe; weeks: number }[] = [
  { label: "1 Week", value: "1w", weeks: 1 },
  { label: "1 Month", value: "1m", weeks: 4 },
  { label: "3 Months", value: "3m", weeks: 13 },
  { label: "1 Year", value: "1y", weeks: 52 },
]

function hexToRgba(hex?: string, alpha = 1): string {
  if (!hex) return `rgba(16, 185, 129, ${alpha})`
  let c = hex.replace("#", "")
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("")
  }
  if (c.length !== 6) return `rgba(16, 185, 129, ${alpha})`
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function getCustomIntensityStyle(count: number, maxCount: number, customColor?: string): React.CSSProperties {
  if (count === 0 || maxCount === 0) return {}
  const ratio = count / maxCount
  let alpha = 0.25
  if (ratio <= 0.25) alpha = 0.25
  else if (ratio <= 0.5) alpha = 0.5
  else if (ratio <= 0.75) alpha = 0.75
  else alpha = 1.0

  return { backgroundColor: hexToRgba(customColor, alpha) }
}

function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "bg-muted"
  const ratio = count / maxCount
  if (ratio <= 0.25) return "bg-emerald-200 dark:bg-emerald-900"
  if (ratio <= 0.5) return "bg-emerald-400 dark:bg-emerald-700"
  if (ratio <= 0.75) return "bg-emerald-500 dark:bg-emerald-500"
  return "bg-emerald-600 dark:bg-emerald-400"
}

export default function StatisticsView() {
  const logs = useAppStore((s) => s.logs)
  const habits = useAppStore((s) => s.habits)
  const widgets = useAppStore((s) => s.widgets)
  const addWidget = useAppStore((s) => s.addWidget)
  const updateWidget = useAppStore((s) => s.updateWidget)
  const deleteWidget = useAppStore((s) => s.deleteWidget)
  const reorderWidgets = useAppStore((s) => s.reorderWidgets)

  const [mainTimeframe, setMainTimeframe] = useState<Timeframe>("1y")
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)
  const [isRearrangeMode, setIsRearrangeMode] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = widgets.findIndex((w) => w.id === active.id)
    const newIndex = widgets.findIndex((w) => w.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(widgets, oldIndex, newIndex)
      await reorderWidgets(reordered.map((w) => w.id))
    }
  }

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWidget, setEditingWidget] = useState<StatisticsWidget | null>(null)
  const [newWidgetHabit, setNewWidgetHabit] = useState<string>("")
  const [newWidgetType, setNewWidgetType] = useState<GraphType>("mini-heatmap")
  const [newWidgetTimeframe, setNewWidgetTimeframe] = useState<Timeframe>("1m")
  const [newWidgetSize, setNewWidgetSize] = useState<WidgetSize>("medium")

  const [widgetToDelete, setWidgetToDelete] = useState<StatisticsWidget | null>(null)


  // MAIN HEATMAP DATA
  const { dateCountMap, maxCount } = useMemo(() => {
    const map = new Map<string, number>()
    const filtered = selectedHabitId
      ? logs.filter((l) => l.habitId === selectedHabitId)
      : logs
    for (const log of filtered) {
      if (log.completed) {
        const val = log.value ?? 1
        map.set(log.date, (map.get(log.date) ?? 0) + val)
      }
    }
    let max = 0
    for (const c of map.values()) { if (c > max) max = c }
    return { dateCountMap: map, maxCount: max }
  }, [logs, selectedHabitId])

  const { weeks, monthLabels } = useMemo(() => {
    const weeksCount = TIMEFRAMES.find((t) => t.value === mainTimeframe)?.weeks || 52
    const today = new Date()
    const start = startOfWeek(subDays(today, weeksCount * 7 - 1), { weekStartsOn: 1 })
    const allDays = eachDayOfInterval({ start, end: today })
    const cols: string[][] = []
    let cur: string[] = []
    for (const day of allDays) {
      if (getDay(day) === 1 && cur.length > 0) { cols.push(cur); cur = [] }
      cur.push(format(day, "yyyy-MM-dd"))
    }
    if (cur.length > 0) {
      while (cur.length < 7) cur.push("")
      cols.push(cur)
    }
    const labels: { label: string; col: number }[] = []
    let last = ""
    for (let i = 0; i < cols.length; i++) {
      const d = cols[i].find((x) => x !== "")
      if (d) {
        const m = format(new Date(d + "T00:00:00"), "MMM")
        if (m !== last) { labels.push({ label: m, col: i }); last = m }
      }
    }
    return { weeks: cols, monthLabels: labels }
  }, [mainTimeframe])

  const totalCompletions = useMemo(() => {
    let t = 0; for (const c of dateCountMap.values()) t += c; return t
  }, [dateCountMap])

  const handleAddWidget = async () => {
    if (!newWidgetHabit) return
    if (editingWidget) {
      await updateWidget({
        ...editingWidget,
        habitId: newWidgetHabit,
        graphType: newWidgetType,
        timeframe: newWidgetTimeframe,
        size: newWidgetSize,
      })
    } else {
      await addWidget({
        id: crypto.randomUUID(),
        habitId: newWidgetHabit,
        graphType: newWidgetType,
        timeframe: newWidgetTimeframe,
        size: newWidgetSize,
        createdAt: new Date().toISOString()
      })
    }
    setShowAddModal(false)
    setEditingWidget(null)
  }

  return (
    <div className="space-y-6">
      {/* MAIN HEATMAP FILTER */}
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedHabitId(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedHabitId === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            All Habits
          </button>
          {habits.map((h) => (
            <button key={h.id} onClick={() => setSelectedHabitId(h.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedHabitId === h.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              <span
                className="inline-block h-2 w-2 rounded-full shrink-0 border border-black/10 dark:border-white/10"
                style={{ backgroundColor: h.color || "#10b981" }}
              />
              #{h.tag}
            </button>
          ))}
        </div>
      )}

      {/* MAIN HEATMAP TIMEFRAME */}
      <div className="flex justify-end gap-2">
        {TIMEFRAMES.map((tf) => (
          <button key={tf.value} onClick={() => setMainTimeframe(tf.value)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${mainTimeframe === tf.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
            {tf.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4" />
            Main Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Flame className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No activity yet. Complete some habits to see your heatmap!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="mb-1 flex">
                    <div className="w-8 shrink-0" />
                    <div className="relative flex gap-[3px]">
                      {monthLabels.map((m) => (
                        <span key={m.label + m.col} className="absolute text-xs text-muted-foreground" style={{ left: `${m.col * 15}px` }}>{m.label}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex">
                    <div className="flex w-8 shrink-0 flex-col gap-[3px]">
                      {WEEKDAY_LABELS.map((l, i) => (
                        <div key={i} className="flex h-3 items-center text-xs text-muted-foreground">{l}</div>
                      ))}
                    </div>
                    <div className="flex gap-[3px]">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-[3px]">
                          {week.map((d, di) => {
                            const count = dateCountMap.get(d) ?? 0
                            const selHabit = selectedHabitId ? habits.find(h => h.id === selectedHabitId) : undefined
                            const customStyle = count > 0 ? getCustomIntensityStyle(count, maxCount, selHabit?.color) : {}
                            return d ? (
                              <div
                                key={d}
                                title={`${d}: ${count}`}
                                style={customStyle}
                                className={`h-3 w-3 rounded-sm transition-colors ${count === 0 ? "bg-muted" : selHabit?.color ? "" : getIntensityClass(count, maxCount)}`}
                              />
                            ) : (
                              <div key={di} className="h-3 w-3" />
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{totalCompletions} total</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  <div className="h-3 w-3 rounded-sm bg-muted" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                  <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
                  <span>More</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DASHBOARD WIDGETS HEADER */}
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-lg font-semibold">Custom Dashboard</h2>
        <div className="flex items-center gap-2">
          {widgets.length > 0 && (
            <Button
              size="sm"
              variant={isRearrangeMode ? "secondary" : "outline"}
              onClick={() => setIsRearrangeMode((prev) => !prev)}
              className={isRearrangeMode ? "bg-primary/20 text-primary border border-primary font-medium" : ""}
            >
              {isRearrangeMode ? (
                <>
                  <Check className="mr-1 h-4 w-4" /> Done
                </>
              ) : (
                <>
                  <GripVertical className="mr-1 h-4 w-4" /> Rearrange
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditingWidget(null)
              setNewWidgetHabit("")
              setNewWidgetType("mini-heatmap")
              setNewWidgetTimeframe("1m")
              setNewWidgetSize("medium")
              setShowAddModal(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Graph
          </Button>
        </div>
      </div>

      {/* ADD GRAPH MODAL (SIMPLE INLINE) */}
      {showAddModal && (
        <Card className="border-primary">
          <CardContent className="space-y-4 pt-6">
            <h3 className="text-sm font-semibold">
              {editingWidget ? "Update Graph Widget" : "Add New Widget"}
            </h3>
            <div className="grid gap-2">
              <label className="text-xs">Habit</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={newWidgetHabit} onChange={(e) => setNewWidgetHabit(e.target.value)}>
                <option value="">Select a habit...</option>
                {habits.map((h) => <option key={h.id} value={h.id}>{h.emoji ? `${h.emoji} ` : ""}#{h.tag}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs">Graph Type</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={newWidgetType} onChange={(e) => setNewWidgetType(e.target.value as GraphType)}>
                <option value="mini-heatmap">Mini Heatmap</option>
                <option value="bar-chart">Bar Chart</option>
                <option value="counter">Counter</option>
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs">Timeframe</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={newWidgetTimeframe} onChange={(e) => setNewWidgetTimeframe(e.target.value as Timeframe)}>
                {TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs">Widget Size</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={newWidgetSize} onChange={(e) => setNewWidgetSize(e.target.value as WidgetSize)}>
                <option value="medium">Medium (Full Row)</option>
                <option value="small">Small (Half Row)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="ghost" onClick={() => { setShowAddModal(false); setEditingWidget(null); }}>Cancel</Button>
              <Button size="sm" onClick={handleAddWidget} disabled={!newWidgetHabit}>
                {editingWidget ? "Update Widget" : "Save Widget"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DELETE WIDGET CONFIRMATION MODAL */}
      {widgetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Delete Graph Widget?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this statistics widget? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setWidgetToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteWidget(widgetToDelete.id)
                    setWidgetToDelete(null)
                  }}
                >
                  Delete Widget
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* WIDGETS GRID WITH DND-KIT REORDERING */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4">
            {widgets.map((widget) => (
              <SortableWidgetCard
                key={widget.id}
                widget={widget}
                habit={habits.find((h) => h.id === widget.habitId)}
                isRearrangeMode={isRearrangeMode}
                onEdit={() => {
                  setEditingWidget(widget)
                  setNewWidgetHabit(widget.habitId)
                  setNewWidgetType(widget.graphType)
                  setNewWidgetTimeframe(widget.timeframe)
                  setNewWidgetSize(widget.size ?? "medium")
                  setShowAddModal(true)
                }}
                onDelete={() => setWidgetToDelete(widget)}
              />
            ))}
            {widgets.length === 0 && !showAddModal && (
              <p className="text-sm text-muted-foreground col-span-2">No custom graphs added yet.</p>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function SortableWidgetCard({
  widget,
  habit,
  isRearrangeMode,
  onEdit,
  onDelete,
}: {
  widget: StatisticsWidget
  habit?: Habit
  isRearrangeMode: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
    disabled: !isRearrangeMode,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  }

  const logs = useAppStore((s) => s.logs)

  const { dateCountMap, maxCount } = useMemo(() => {
    const map = new Map<string, number>()
    const filtered = logs.filter((l) => l.habitId === widget.habitId)
    for (const log of filtered) {
      if (log.completed) {
        const val = log.value ?? 1
        map.set(log.date, (map.get(log.date) ?? 0) + val)
      }
    }
    let max = 0
    for (const c of map.values()) {
      if (c > max) max = c
    }
    return { dateCountMap: map, maxCount: max }
  }, [logs, widget.habitId])

  const weeksCount = TIMEFRAMES.find((t) => t.value === widget.timeframe)?.weeks || 4
  const today = new Date()

  if (!habit) return null

  const isSmall = widget.size === "small"

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative overflow-hidden transition-shadow ${
        isSmall ? "col-span-1" : "col-span-2"
      } ${isDragging ? "shadow-lg opacity-80 ring-2 ring-primary" : ""} ${
        isRearrangeMode ? "border-dashed border-primary/50" : ""
      }`}
    >
      <div className="absolute right-1.5 top-1.5 flex gap-1 z-10 sm:right-2 sm:top-2">
        {isRearrangeMode ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground touch-none"
              {...attributes}
              {...listeners}
              title="Drag to reorder widget"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              title="Delete widget"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Edit widget"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
      <CardHeader className={isSmall ? "p-2.5 pb-1 sm:p-4 sm:pb-2" : "pb-2 pt-4"}>
        <CardTitle className="text-xs sm:text-sm flex items-center justify-between pr-14 sm:pr-16">
          <span className="flex items-center gap-1.5 truncate">
            <span
              className="inline-block h-3 w-3 rounded-full shrink-0 border border-black/10 dark:border-white/10 shadow-xs"
              style={{ backgroundColor: habit.color || "#10b981" }}
            />
            {habit.emoji && <span className="mr-0.5">{habit.emoji}</span>}
            #{habit.tag}
          </span>
        </CardTitle>
        <p className="text-[10px] sm:text-xs text-muted-foreground capitalize truncate">
          {widget.graphType.replace("-", " ")} • {TIMEFRAMES.find((t) => t.value === widget.timeframe)?.label}
        </p>
      </CardHeader>
      <CardContent className={isSmall ? "p-2.5 pt-0 sm:p-4 sm:pt-0" : ""}>
        {widget.graphType === "mini-heatmap" && (
          <MiniHeatmapRenderer
            dateCountMap={dateCountMap}
            maxCount={maxCount}
            weeksCount={weeksCount}
            today={today}
            size={widget.size ?? "medium"}
            color={habit.color}
          />
        )}
        {widget.graphType === "bar-chart" && (
          <BarChartRenderer
            dateCountMap={dateCountMap}
            maxCount={maxCount}
            weeksCount={weeksCount}
            today={today}
            unit={habit.unit}
            size={widget.size ?? "medium"}
            color={habit.color}
          />
        )}
        {widget.graphType === "counter" && (
          <CounterRenderer
            dateCountMap={dateCountMap}
            maxCount={maxCount}
            weeksCount={weeksCount}
            today={today}
            unit={habit.unit}
            size={widget.size ?? "medium"}
            color={habit.color}
          />
        )}
      </CardContent>
    </Card>
  )
}

interface ChartProps {
  dateCountMap: Map<string, number>
  maxCount: number
  weeksCount: number
  today: Date
  unit?: string
  size?: WidgetSize
  color?: string
}

function MiniHeatmapRenderer({ dateCountMap, maxCount, weeksCount, today, size = "medium", color }: ChartProps) {
  // If small size and 1y (52 weeks), cap to 13 weeks (3 months) for readability
  const effectiveWeeksCount = (size === "small" && weeksCount === 52) ? 13 : weeksCount
  const { weeks } = useMemo(() => {
    const start = startOfWeek(subDays(today, effectiveWeeksCount * 7 - 1), { weekStartsOn: 1 })
    const allDays = eachDayOfInterval({ start, end: today })
    const cols: string[][] = []
    let cur: string[] = []
    for (const day of allDays) {
      if (getDay(day) === 1 && cur.length > 0) { cols.push(cur); cur = [] }
      cur.push(format(day, "yyyy-MM-dd"))
    }
    if (cur.length > 0) {
      while (cur.length < 7) cur.push("")
      cols.push(cur)
    }
    return { weeks: cols }
  }, [effectiveWeeksCount, today])

  // 1 Year Layout (Original compact scrollable heatmap for medium size)
  if (effectiveWeeksCount === 52) {
    return (
      <div className="flex gap-[2px] overflow-x-auto pb-2 pt-4">
        {weeks.map((week: string[], wi: number) => (
          <div key={wi} className="flex flex-col gap-[2px]">
            {week.map((d, di) => d ? (
              <div key={d} title={`${d}: ${dateCountMap.get(d) ?? 0}`} className={`h-2.5 w-2.5 rounded-sm transition-colors ${getIntensityClass(dateCountMap.get(d) ?? 0, maxCount)}`} />
            ) : (
              <div key={di} className="h-2.5 w-2.5" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // 1 Week Layout (2 rows for small size, 1 single row for medium size; exact 7 days)
  if (effectiveWeeksCount === 1) {
    const days = eachDayOfInterval({ start: subDays(today, 6), end: today }).map((d) => format(d, "yyyy-MM-dd"))

    if (size === "small") {
      const topRow = days.slice(0, 4)
      const bottomRow = days.slice(4, 7)
      const circleSize = "h-6 w-6 sm:h-7 sm:w-7"
      const containerHeight = "h-28 sm:h-32"

      const renderDayDot = (d: string, di: number) => {
        const count = dateCountMap.get(d) ?? 0
        const customStyle = count > 0 ? getCustomIntensityStyle(count, maxCount, color) : {}
        return (
          <div key={di} className="flex flex-col items-center gap-1">
            <div
              title={`${d}: ${count}`}
              style={customStyle}
              className={`${circleSize} rounded-full transition-colors ${count === 0 ? "bg-muted" : color ? "" : getIntensityClass(count, maxCount)}`}
            />
            <span className="text-[10px] text-muted-foreground">{format(new Date(d + "T00:00:00"), "EEE")}</span>
          </div>
        )
      }

      return (
        <div className={`flex ${containerHeight} w-full flex-col justify-center gap-3 pb-2 pt-2`}>
          <div className="flex w-full items-center justify-around px-2">
            {topRow.map((d, di) => renderDayDot(d, di))}
          </div>
          <div className="flex w-full items-center justify-center gap-6 sm:gap-10">
            {bottomRow.map((d, di) => renderDayDot(d, di + 4))}
          </div>
        </div>
      )
    }

    // Medium size: single horizontal row of 7 dots
    return (
      <div className="flex h-32 sm:h-40 w-full items-center justify-around pb-2 pt-4">
        {days.map((d, di) => {
          const count = dateCountMap.get(d) ?? 0
          const customStyle = count > 0 ? getCustomIntensityStyle(count, maxCount, color) : {}
          return (
            <div key={di} className="flex flex-col items-center gap-1.5">
              <div
                title={`${d}: ${count}`}
                style={customStyle}
                className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full transition-colors ${count === 0 ? "bg-muted" : color ? "" : getIntensityClass(count, maxCount)}`}
              />
              <span className="text-[10px] sm:text-xs text-muted-foreground">{format(new Date(d + "T00:00:00"), "EEE")}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // 1 Month & 3 Months Layout (Dynamic CSS Grid of Circles)
  const containerHeight = size === "small" ? "h-28 sm:h-32" : "h-36 sm:h-40"
  return (
    <div className={`${containerHeight} w-full pb-1 pt-2 sm:pb-2 sm:pt-4 flex flex-col justify-between`}>
      <div
        className="grid h-full w-full gap-[1px] sm:gap-1"
        style={{
          gridTemplateRows: `repeat(7, minmax(0, 1fr))`,
          gridAutoColumns: `minmax(0, 1fr)`,
          gridAutoFlow: "column"
        }}
      >
        {weeks.flatMap((week: string[], wi: number) =>
          week.map((d, di) => {
            const count = dateCountMap.get(d) ?? 0
            const customStyle = count > 0 ? getCustomIntensityStyle(count, maxCount, color) : {}
            return (
              <div key={`${wi}-${di}`} className="flex items-center justify-center">
                {d ? (
                  <div
                    title={`${d}: ${count}`}
                    style={customStyle}
                    className={`aspect-square h-full max-w-full rounded-full transition-colors ${count === 0 ? "bg-muted" : color ? "" : getIntensityClass(count, maxCount)}`}
                  />
                ) : (
                  <div className="aspect-square h-full max-w-full rounded-full" />
                )}
              </div>
            )
          })
        )}
      </div>
      {size === "small" && weeksCount === 52 && (
        <p className="text-[8px] sm:text-[9px] text-muted-foreground text-center mt-0.5 truncate">Last 3 months</p>
      )}
    </div>
  )
}

function BarChartRenderer({ dateCountMap, maxCount, weeksCount, today, unit, size = "medium", color }: ChartProps) {
  const bars = useMemo(() => {
    const days = weeksCount * 7
    const start = subDays(today, days - 1)
    const allDays = eachDayOfInterval({ start, end: today })

    return allDays.map(d => {
      const dateStr = format(d, "yyyy-MM-dd")
      const val = dateCountMap.get(dateStr) ?? 0
      const height = maxCount > 0 ? (val / maxCount) * 100 : 0
      return {
        dateStr,
        label: weeksCount === 1 ? format(d, "EEE") : format(d, "d MMM"),
        val,
        height: Math.max(height, val > 0 ? 5 : 0)
      }
    })
  }, [dateCountMap, maxCount, weeksCount, today])

  const containerHeight = size === "small" ? "h-32 sm:h-36" : "h-36 sm:h-40"
  const barMinWidth = size === "small" ? "min-w-[14px] sm:min-w-[20px]" : "min-w-[28px]"

  return (
    <div className={`flex ${containerHeight} items-end gap-1 overflow-x-auto pb-2 pt-6`}>
      {bars.map((b, i) => (
        <div key={i} className={`group relative flex h-full flex-1 ${barMinWidth} flex-col items-center justify-end`}>
          <div className="absolute -top-8 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-sm group-hover:block z-10">
            {b.val} {unit}
          </div>
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-[24px] rounded-t-sm transition-all hover:opacity-80"
              style={{
                height: `${b.height}%`,
                backgroundColor: color || "var(--color-primary)"
              }}
            />
          </div>
          <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  )
}

function CounterRenderer({ dateCountMap, weeksCount, today, unit, size = "medium", color }: ChartProps) {
  const total = useMemo(() => {
    const daysCount = weeksCount * 7
    const start = subDays(today, daysCount - 1)
    const allDays = eachDayOfInterval({ start, end: today })
    let sum = 0
    for (const d of allDays) {
      const dateStr = format(d, "yyyy-MM-dd")
      sum += dateCountMap.get(dateStr) ?? 0
    }
    return sum
  }, [dateCountMap, weeksCount, today])

  const containerHeight = size === "small" ? "h-28 sm:h-32" : "h-36 sm:h-40"
  const numberSize = size === "small" ? "text-2xl sm:text-3xl" : "text-3xl sm:text-5xl"
  const unitSize = size === "small" ? "text-xs sm:text-sm" : "text-sm sm:text-base"

  return (
    <div className={`flex ${containerHeight} w-full flex-col items-center justify-center p-2 text-center`}>
      <div className="flex items-baseline justify-center gap-1.5 flex-wrap">
        <span
          className={`${numberSize} font-bold font-mono tracking-tight`}
          style={{ color: color || "var(--color-primary)" }}
        >
          {total.toLocaleString()}
        </span>
        {unit && (
          <span className={`${unitSize} font-medium text-muted-foreground`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}


