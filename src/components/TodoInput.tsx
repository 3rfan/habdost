import { useMemo, useState, useRef } from "react"
import { format, parseISO } from "date-fns"
import { CalendarDays, X } from "lucide-react"

import { useAppStore } from "@/store"
import type { Habit, Todo } from "@/types"

const hashtagRegex = /#[a-zA-Z0-9_]+/g

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase()
}

function extractTags(text: string) {
  const matches = text.match(hashtagRegex) ?? []
  return matches.map((match) => normalizeTag(match.slice(1)))
}

function buildTodoTitle(text: string) {
  return text.replace(hashtagRegex, " ").replace(/\s+/g, " ").trim()
}

function findLinkedHabit(tags: string[], habits: Habit[]) {
  const tagSet = new Set(tags)
  return habits.find((habit) => tagSet.has(normalizeTag(habit.tag))) ?? null
}

export default function TodoInput() {
  const [value, setValue] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const habits = useAppStore((state) => state.habits)
  const addTodo = useAppStore((state) => state.addTodo)

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0)
  const [suggestions, setSuggestions] = useState<Habit[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [cursorPos, setCursorPos] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return
    }

    const tags = extractTags(trimmedValue)
    const linkedHabit = findLinkedHabit(tags, habits)
    const title = buildTodoTitle(trimmedValue)

    if (!title) {
      return
    }

    const targetDate = selectedDate || today

    const todo: Todo = {
      id: crypto.randomUUID(),
      title,
      date: targetDate,
      completed: false,
      linkedHabitId: linkedHabit?.id ?? null,
      createdAt: today,
      updatedAt: today,
    }

    await addTodo(todo)
    setValue("")
    setSelectedDate("")
    setShowDropdown(false)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const val = event.target.value
    setValue(val)

    const selectionStart = event.target.selectionStart ?? 0
    setCursorPos(selectionStart)

    const textBeforeCursor = val.slice(0, selectionStart)
    const match = /#(\w*)$/.exec(textBeforeCursor)

    if (match) {
      const partialTag = match[1].toLowerCase()
      const filtered = habits.filter(
        (h) =>
          h.tag.toLowerCase().startsWith(partialTag) ||
          h.name.toLowerCase().includes(partialTag)
      )
      setSuggestions(filtered)
      setActiveSuggestionIndex(0)
      setShowDropdown(filtered.length > 0)
    } else {
      setShowDropdown(false)
      setSuggestions([])
    }
  }

  const selectSuggestion = (habit: Habit) => {
    const textBeforeCursor = value.slice(0, cursorPos)
    const textAfterCursor = value.slice(cursorPos)

    const newValue = textBeforeCursor.replace(/#(\w*)$/, `#${habit.tag} `) + textAfterCursor
    setValue(newValue)

    setShowDropdown(false)
    setSuggestions([])

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const newCursorPos = textBeforeCursor.replace(/#(\w*)$/, `#${habit.tag} `).length
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length)
        break
      case "ArrowUp":
        event.preventDefault()
        setActiveSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
        break
      case "Enter":
        event.preventDefault()
        selectSuggestion(suggestions[activeSuggestionIndex])
        break
      case "Escape":
        event.preventDefault()
        setShowDropdown(false)
        break
      default:
        break
    }
  }

  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker()
    } catch {
      dateInputRef.current?.click()
    }
  }

  const formattedSelectedDate = selectedDate
    ? format(parseISO(selectedDate), "MMM d")
    : null

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder="Add a todo or #habit tag"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.id}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setActiveSuggestionIndex(index)}
                className={`flex flex-col rounded-sm px-3 py-1.5 text-sm cursor-pointer ${
                  index === activeSuggestionIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <span className="font-mono font-medium">#{suggestion.tag}</span>
                <span className="text-xs text-muted-foreground">{suggestion.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Calendar icon date picker */}
      <div className="relative flex shrink-0 items-center">
        <input
          ref={dateInputRef}
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute opacity-0 w-px h-px overflow-hidden pointer-events-none"
          style={{ position: "absolute", pointerEvents: "none" }}
        />
        <button
          type="button"
          onClick={openDatePicker}
          title={selectedDate ? `Date: ${formattedSelectedDate}` : "Pick a date"}
          className={`flex h-10 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors ${
            selectedDate
              ? "border-primary bg-primary/10 text-primary"
              : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          {formattedSelectedDate && (
            <span className="text-xs font-medium">{formattedSelectedDate}</span>
          )}
        </button>
        {selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate("")}
            title="Clear date"
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      <button
        type="submit"
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shrink-0"
      >
        Add
      </button>
    </form>
  )
}
