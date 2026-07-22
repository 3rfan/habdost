import { useEffect, useRef, useState } from "react"
import { NavLink, Route, Routes } from "react-router-dom"
import { CalendarDays, ListChecks, Repeat, Settings, BarChart, Moon, Sun } from "lucide-react"

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

  // Initialize from DOM — the FOCT script in index.html already applied the
  // correct class before React mounted, so we read from the DOM rather than
  // localStorage to stay perfectly in sync with what the user sees.
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  )

  const toggleDarkMode = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("habdost-theme", next ? "dark" : "light")
  }

  // Enable smooth color transitions after the first paint. We defer this so the
  // FOCT script's initial .dark class assignment doesn't trigger a visible fade.
  useEffect(() => {
    document.documentElement.classList.add("theme-ready")
  }, [])

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

  const [isNavVisible, setIsNavVisible] = useState(true)
  // Ref to the nav element so we can defer the transition style to after first
  // paint. This prevents the nav from animating in on initial load while still
  // enabling the slide-in/out animation on subsequent scroll interactions.
  const navRef = useRef<HTMLElement>(null)
  const lastScrollY = useRef(0)

  useEffect(() => {
    // Use requestAnimationFrame so the nav's initial translate-y-0 is painted
    // before we apply the transition, preventing an unwanted slide-in on load.
    const raf = requestAnimationFrame(() => {
      if (navRef.current) {
        navRef.current.style.transitionProperty = "transform"
        navRef.current.style.transitionDuration = "300ms"
        navRef.current.style.transitionTimingFunction = "ease-in-out"
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const diff = currentScrollY - lastScrollY.current

      // Keep navbar visible when at/near top of page
      if (currentScrollY <= 30) {
        setIsNavVisible(true)
      } else if (diff > 8) {
        // Scroll DOWN -> hide navbar
        setIsNavVisible(false)
      } else if (diff < -8) {
        // Scroll UP -> show navbar
        setIsNavVisible(true)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-10 border-b bg-background/80 backdrop-blur pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex h-14 max-w-screen-sm items-center justify-between px-4">
          <h1 className="text-lg font-semibold">HabDost</h1>
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <main className="mx-auto min-h-dvh max-w-screen-sm px-4 pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] pt-[calc(4rem+env(safe-area-inset-top,0px))]">
        <Routes>
          <Route path="/" element={<MyDay />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/habits" element={<HabitManager />} />
          <Route path="/statistics" element={<StatisticsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>

      <nav
        ref={navRef}
        className={`fixed inset-x-0 bottom-0 z-10 border-t bg-background/90 backdrop-blur pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-300 ease-in-out ${
          isNavVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto grid h-14 max-w-screen-sm grid-cols-5 px-2">
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
