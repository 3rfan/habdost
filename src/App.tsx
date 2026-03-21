import { NavLink, Route, Routes } from "react-router-dom"
import { CalendarDays, ListChecks, Repeat, Settings } from "lucide-react"

import MyDay from "@/pages/MyDay"

function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-sm items-center px-4">
          <h1 className="text-lg font-semibold">HabDost</h1>
        </div>
      </header>

      <main className="mx-auto min-h-dvh max-w-screen-sm px-4 pb-20 pt-16">
        <Routes>
          <Route
            path="/"
            element={<MyDay />}
          />
          <Route
            path="/calendar"
            element={<div className="text-sm text-muted-foreground">Calendar view placeholder</div>}
          />
          <Route
            path="/habits"
            element={<div className="text-sm text-muted-foreground">Habits view placeholder</div>}
          />
          <Route
            path="/settings"
            element={<div className="text-sm text-muted-foreground">Settings view placeholder</div>}
          />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-screen-sm grid-cols-4 px-2">
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
