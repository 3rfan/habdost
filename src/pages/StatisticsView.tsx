import { useMemo, useState } from "react"
import {
  format,
  subDays,
  startOfWeek,
  eachDayOfInterval,
  getDay,
} from "date-fns"
import { Flame } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/store"

const TOTAL_WEEKS = 52
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]

function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return "bg-muted"
  const ratio = count / maxCount
  if (ratio <= 0.25) return "bg-emerald-200 dark:bg-emerald-900"
  if (ratio <= 0.5) return "bg-emerald-400 dark:bg-emerald-700"
  if (ratio <= 0.75) return "bg-emerald-500 dark:bg-emerald-500"
  return "bg-emerald-600 dark:bg-emerald-400"
}

export default function HeatmapView() {
  const logs = useAppStore((s) => s.logs)
  const habits = useAppStore((s) => s.habits)
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null)

  const { dateCountMap, maxCount } = useMemo(() => {
    const map = new Map<string, number>()
    const filtered = selectedHabitId
      ? logs.filter((l) => l.habitId === selectedHabitId)
      : logs
    for (const log of filtered) {
      if (log.completed) map.set(log.date, (map.get(log.date) ?? 0) + 1)
    }
    let max = 0
    for (const c of map.values()) { if (c > max) max = c }
    return { dateCountMap: map, maxCount: max }
  }, [logs, selectedHabitId])

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date()
    const start = startOfWeek(subDays(today, TOTAL_WEEKS * 7 - 1))
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
  }, [])

  const totalCompletions = useMemo(() => {
    let t = 0; for (const c of dateCountMap.values()) t += c; return t
  }, [dateCountMap])

  return (
    <div className="space-y-6">
      {habits.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSelectedHabitId(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedHabitId === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            All
          </button>
          {habits.map((h) => (
            <button key={h.id} onClick={() => setSelectedHabitId(h.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedHabitId === h.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
              {h.name}
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4" />
            Activity — last {TOTAL_WEEKS} weeks
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
                <div className="inline-block">
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
                <span>{totalCompletions} completions across {dateCountMap.size} days</span>
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
    </div>
  )
}
