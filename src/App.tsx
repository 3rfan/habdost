import { useEffect, useRef } from "react"
import { NavLink, Route, Routes } from "react-router-dom"
import { CalendarDays, ListChecks, Repeat, Settings, BarChart } from "lucide-react"

import MyDay from "@/pages/MyDay"
import CalendarView from "@/pages/CalendarView"
import HabitManager from "@/pages/HabitManager"
import StatisticsView from "@/pages/StatisticsView"
import SettingsView from "@/pages/SettingsView"
import { useAppStore } from "@/store"
import { generateRecurringTodos } from "@/scheduler"

function App() {
  const loadAll = useAppStore((s) => s.loadAll)
  const addTodo = useAppStore((s) => s.addTodo)
  const schedulerRan = useRef(false)

  useEffect(() => {
    const init = async () => {
      await loadAll()

      // Run scheduler once after hydration
      if (!schedulerRan.current) {
        schedulerRan.current = true
        const { habits, todos } = useAppStore.getState()
        const newTodos = generateRecurringTodos(habits, todos)
        for (const todo of newTodos) {
          await addTodo(todo)
        }
      }
    }
    void init()
  }, [loadAll, addTodo])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-sm items-center px-4">
          <h1 className="text-lg font-semibold">HabDost</h1>
        </div>
      </header>

      <main className="mx-auto min-h-dvh max-w-screen-sm px-4 pb-20 pt-16">
        <Routes>
          <Route path="/" element={<MyDay />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/habits" element={<HabitManager />} />
          <Route path="/statistics" element={<StatisticsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-screen-sm grid-cols-5 px-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`
            }
          >
            <ListChecks className="h-5 w-5" />
            My Day
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`
            }
          >
            <CalendarDays className="h-5 w-5" />
            Calendar
          </NavLink>
          <NavLink
            to="/statistics"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`
            }
          >
            <BarChart className="h-5 w-5" />
            Statistics
          </NavLink>
          <NavLink
            to="/habits"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`
            }
          >
            <Repeat className="h-5 w-5" />
            Habits
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`
            }
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        </div>
      </nav>
    </div>
  )
}

export default App

