import { useRef, useState } from "react"
import { format } from "date-fns"
import { Download, Upload, AlertTriangle, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/store"
import { addHabit, addTodo, addHabitLog, addWidget } from "@/db"
import type { Habit, Todo, HabitLog, StatisticsWidget } from "@/types"

export default function SettingsView() {
  const habits = useAppStore((s) => s.habits)
  const todos = useAppStore((s) => s.todos)
  const logs = useAppStore((s) => s.logs)
  const widgets = useAppStore((s) => s.widgets)
  const clearAll = useAppStore((s) => s.clearAll)
  const loadAll = useAppStore((s) => s.loadAll)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importConfirm, setImportConfirm] = useState(false)
  const [pendingData, setPendingData] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleExport = () => {
    const data = JSON.stringify({ habits, todos, logs, widgets }, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `habdost_backup_${format(new Date(), "yyyyMMdd")}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMessage("Data exported successfully!")
    setTimeout(() => setStatusMessage(null), 3000)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const parsed = JSON.parse(text)
        if (!parsed.habits || !parsed.todos || !parsed.logs) {
          setStatusMessage("Error: Invalid backup file format.")
          setTimeout(() => setStatusMessage(null), 4000)
          return
        }
        setPendingData(text)
        setImportConfirm(true)
      } catch {
        setStatusMessage("Error: Could not parse JSON file.")
        setTimeout(() => setStatusMessage(null), 4000)
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-selected
    e.target.value = ""
  }

  const handleImportConfirm = async () => {
    if (!pendingData) return

    try {
      const parsed = JSON.parse(pendingData) as {
        habits: Habit[]
        todos: Todo[]
        logs: HabitLog[]
        widgets?: StatisticsWidget[]
      }

      await clearAll()

      for (const habit of parsed.habits) await addHabit(habit)
      for (const todo of parsed.todos) await addTodo(todo)
      for (const log of parsed.logs) await addHabitLog(log)
      for (const widget of parsed.widgets ?? []) await addWidget(widget)

      await loadAll()

      setStatusMessage("Data imported successfully!")
      setImportConfirm(false)
      setPendingData(null)
    } catch {
      setStatusMessage("Error: Import failed.")
    }
    setTimeout(() => setStatusMessage(null), 4000)
  }

  const handleImportCancel = () => {
    setImportConfirm(false)
    setPendingData(null)
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Data Management
        </h2>

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Export Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Download all your habits, todos, and logs as a JSON backup file.
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Backup
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4" />
              Import Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Restore data from a previous backup. This will replace all current data.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!importConfirm ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Select Backup File
              </Button>
            ) : (
              <div className="space-y-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Replace all data?</p>
                    <p className="text-xs text-muted-foreground">
                      This will permanently delete your current habits, todos, and logs,
                      then replace them with the imported data.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={handleImportConfirm}
                  >
                    Yes, Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleImportCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Status */}
      {statusMessage && (
        <div className="rounded-md border bg-muted px-4 py-3 text-sm">
          {statusMessage}
        </div>
      )}

      {/* App info */}
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">HabDost v2.21</p>
            <p className="text-xs text-muted-foreground">
              Local-first habit tracker. All data stored on your device.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
