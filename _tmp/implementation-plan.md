# Implementation Plan: HabDost

## Phase 1: Setup & Architecture
- [ ] 1.1 Scaffold Vite React TypeScript project (pnpm), write gitIgnore file for my given project based on the fact that I will be working in VScode on a windows laptop.
- [ ] 1.2 Install dependencies: Tailwind CSS, shadcn/ui, `zustand`, `idb`, `date-fns`, `react-router-dom`, `lucide-react`.
- [ ] 1.3 Setup typescript lint check through a github actions file to automate formatting and other issues related to code-style (Continuous Integration principles).
- [ ] 1.4 Configure PWA (vite-plugin-pwa) for offline mobile use.
- [ ] 1.5 Build the App Shell: Fixed top header, scrollable main content, fixed bottom navigation (My Day, Calendar, Habits, Settings).

## Phase 2: Data Models & Storage
- [ ] 2.1 Create `types.ts` with interfaces: `Habit`, `Todo`, `HabitLog`.
- [ ] 2.2 Create `db.ts`: Initialize IndexedDB (HabitTodoDB) with stores for habits, todos, and logs. Add basic CRUD helpers.
- [ ] 2.3 Create `store.ts`: Setup Zustand to load/sync data from IndexedDB into global state.

## Phase 3: "My Day" View & Todo System
- [ ] 3.1 Create `MyDay.tsx`: Filter and display Todos matching today's date (YYYY-MM-DD). Add shadcn/ui Checkboxes.
- [ ] 3.2 Create `TodoInput.tsx`: Input field that parses hashtags on submit (e.g., `#gym`). If hashtag matches a Habit tag, attach `linkedHabitId` to the new Todo. Save to DB.
- [ ] 3.3 Add Completion Logic: On Todo check-off, update status. If `linkedHabitId` exists, generate a `HabitLog` for today and save to DB.

## Phase 4: Habit Management & Recurring Logic
- [ ] 4.1 Create `HabitManager.tsx`: Form to create a Habit (name, tag, scheduledDays array 0-6). Display existing habits with delete buttons.
- [ ] 4.2 Create `scheduler.ts` (or update store): Write `generateRecurringTodos` to check today's day (0-6). If a habit is scheduled for today, and no Todo exists for it today, generate the Todo automatically.
- [ ] 4.3 Trigger scheduler once on app mount.

## Phase 5: Visualizations
- [ ] 5.1 Create `CalendarView.tsx`: Render shadcn/ui Calendar. Display a list of habits/todos completed on the selected date.
- [ ] 5.2 Create `HeatmapView.tsx`: Integrate `react-calendar-heatmap`. Group `HabitLogs` by date and map counts to CSS classes (GitHub style).
- [ ] 5.3 Wire up routing for visual views.

## Phase 6: Data Portability
- [ ] 6.1 Create `SettingsView.tsx` with UI for Export and Import.
- [ ] 6.2 Add Export logic: Fetch all DB stores, combine into JSON, download as `backup_YYYYMMDD.json`.
- [ ] 6.3 Add Import logic: Parse JSON, prompt user with confirmation warning, clear DB, insert new records, and refresh Zustand state.