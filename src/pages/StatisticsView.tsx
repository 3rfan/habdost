import { useMemo, useState } from "react"
import {
  format,
  subDays,
  startOfWeek,
  eachDayOfInterval,
  getDay,
} from "date-fns"
import { Flame, Plus, Trash2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/store"
import type { Timeframe, GraphType, StatisticsWidget, Habit } from "@/types"

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

const TIMEFRAMES: { label: string; value: Timeframe; weeks: number }[] = [
  { label: "1 Week", value: "1w", weeks: 1 },
  { label: "1 Month", value: "1m", weeks: 4 },
  { label: "3 Months", value: "3m", weeks: 13 },
  { label: "1 Year", value: "1y", weeks: 52 },
]

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

  const [mainTimeframe, setMainTimeframe] = useState<Timeframe>("1y")
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingWidget, setEditingWidget] = useState<StatisticsWidget | null>(null)
  const [newWidgetHabit, setNewWidgetHabit] = useState<string>("")
  const [newWidgetType, setNewWidgetType] = useState<GraphType>("mini-heatmap")
  const [newWidgetTimeframe, setNewWidgetTimeframe] = useState<Timeframe>("1m")

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
    const start = startOfWeek(subDays(today, weeksCount * 7 - 1))
    const allDays = eachDayOfInterval({ start, end: today })
    const cols: string[][] = []
    let cur: string[] = []
    for (const day of allDays) {
      if (getDay(day) === 0 && cur.length > 0) { cols.push(cur); cur = [] }
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
      })
    } else {
      await addWidget({
        id: crypto.randomUUID(),
        habitId: newWidgetHabit,
        graphType: newWidgetType,
        timeframe: newWidgetTimeframe,
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
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedHabitId === h.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
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
                          {week.map((d, di) => d ? (
                            <div key={d} title={`${d}: ${dateCountMap.get(d) ?? 0}`} className={`h-3 w-3 rounded-sm transition-colors ${getIntensityClass(dateCountMap.get(d) ?? 0, maxCount)}`} />
                          ) : (
                            <div key={di} className="h-3 w-3" />
                          ))}
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
        <Button size="sm" variant="outline" onClick={() => { setEditingWidget(null); setNewWidgetHabit(""); setNewWidgetType("mini-heatmap"); setNewWidgetTimeframe("1m"); setShowAddModal(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Graph
        </Button>
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
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-xs">Timeframe</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={newWidgetTimeframe} onChange={(e) => setNewWidgetTimeframe(e.target.value as Timeframe)}>
                {TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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

      {/* WIDGETS GRID */}
      <div className="grid gap-4 md:grid-cols-2">
        {widgets.map((widget) => (
          <WidgetRenderer
            key={widget.id}
            widget={widget}
            habit={habits.find(h => h.id === widget.habitId)}
            onEdit={() => {
              setEditingWidget(widget)
              setNewWidgetHabit(widget.habitId)
              setNewWidgetType(widget.graphType)
              setNewWidgetTimeframe(widget.timeframe)
              setShowAddModal(true)
            }}
            onDelete={() => setWidgetToDelete(widget)}
          />
        ))}
        {widgets.length === 0 && !showAddModal && (
          <p className="text-sm text-muted-foreground">No custom graphs added yet.</p>
        )}
      </div>
    </div>
  )
}

function WidgetRenderer({
  widget,
  habit,
  onEdit,
  onDelete,
}: {
  widget: StatisticsWidget
  habit?: Habit
  onEdit: () => void
  onDelete: () => void
}) {
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
    for (const c of map.values()) { if (c > max) max = c }
    return { dateCountMap: map, maxCount: max }
  }, [logs, widget.habitId])

  const weeksCount = TIMEFRAMES.find((t) => t.value === widget.timeframe)?.weeks || 4
  const today = new Date()

  if (!habit) return null

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute right-2 top-2 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm">
          {habit.emoji && <span className="mr-1.5">{habit.emoji}</span>}
          #{habit.tag}
        </CardTitle>
        <p className="text-xs text-muted-foreground capitalize">
          {widget.graphType.replace("-", " ")} • {TIMEFRAMES.find((t) => t.value === widget.timeframe)?.label}
        </p>
      </CardHeader>
      <CardContent>
        {widget.graphType === "mini-heatmap" && (
          <MiniHeatmapRenderer dateCountMap={dateCountMap} maxCount={maxCount} weeksCount={weeksCount} today={today} />
        )}
        {widget.graphType === "bar-chart" && (
          <BarChartRenderer dateCountMap={dateCountMap} maxCount={maxCount} weeksCount={weeksCount} today={today} unit={habit.unit} />
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
}

function MiniHeatmapRenderer({ dateCountMap, maxCount, weeksCount, today }: ChartProps) {
  const { weeks } = useMemo(() => {
    const start = startOfWeek(subDays(today, weeksCount * 7 - 1))
    const allDays = eachDayOfInterval({ start, end: today })
    const cols: string[][] = []
    let cur: string[] = []
    for (const day of allDays) {
      if (getDay(day) === 0 && cur.length > 0) { cols.push(cur); cur = [] }
      cur.push(format(day, "yyyy-MM-dd"))
    }
    if (cur.length > 0) {
      while (cur.length < 7) cur.push("")
      cols.push(cur)
    }
    return { weeks: cols }
  }, [weeksCount, today])

  // 1 Year Layout (Original compact scrollable heatmap)
  if (weeksCount === 52) {
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

  // 1 Week Layout (7 circles on a single line)
  if (weeksCount === 1) {
    const days = weeks.flat().filter(d => d !== "")
    return (
      <div className="flex h-32 w-full items-center justify-around pb-2 pt-4">
        {days.map((d, di) => (
          <div key={di} className="flex flex-col items-center gap-2">
            <div
              title={`${d}: ${dateCountMap.get(d) ?? 0}`}
              className={`h-10 w-10 rounded-full transition-colors ${getIntensityClass(dateCountMap.get(d) ?? 0, maxCount)}`}
            />
            <span className="text-[10px] text-muted-foreground">{format(new Date(d + "T00:00:00"), "EEE")}</span>
          </div>
        ))}
      </div>
    )
  }

  // 1 Month & 3 Months Layout (Dynamic CSS Grid of Circles)
  return (
    <div className="h-40 w-full pb-2 pt-4">
      <div
        className="grid h-full w-full gap-1"
        style={{
          gridTemplateRows: `repeat(7, minmax(0, 1fr))`,
          gridAutoColumns: `minmax(0, 1fr)`,
          gridAutoFlow: "column"
        }}
      >
        {weeks.flatMap((week: string[], wi: number) =>
          week.map((d, di) => (
            <div key={`${wi}-${di}`} className="flex items-center justify-center">
              {d ? (
                <div
                  title={`${d}: ${dateCountMap.get(d) ?? 0}`}
                  className={`aspect-square h-full max-w-full rounded-full transition-colors ${getIntensityClass(dateCountMap.get(d) ?? 0, maxCount)}`}
                />
              ) : (
                <div className="aspect-square h-full max-w-full rounded-full" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function BarChartRenderer({ dateCountMap, maxCount, weeksCount, today, unit }: ChartProps) {
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

  return (
    <div className="flex h-40 items-end gap-1 overflow-x-auto pb-2 pt-8">
      {bars.map((b, i) => (
        <div key={i} className="group relative flex h-full flex-1 min-w-[28px] flex-col items-center justify-end">
          <div className="absolute -top-8 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] font-medium text-popover-foreground shadow-sm group-hover:block z-10">
            {b.val} {unit}
          </div>
          <div className="flex w-full flex-1 items-end justify-center">
            <div className="w-full max-w-[24px] rounded-t-sm bg-primary transition-all hover:bg-primary/80" style={{ height: `${b.height}%` }} />
          </div>
          <span className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  )
}
