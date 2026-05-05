# v0.dev Design Prompt

Ezt a promptot másold be a [v0.dev](https://v0.dev)-be a UI tervezéshez. A prompt angolul van, mert a v0.dev jobban értelmezi.

---

## Fő Prompt — Layout + Sidebar + Dashboard

```
Build a personal productivity dashboard called "DigiBrain" — a self-hosted second-brain app that combines task management, time tracking, finances, notes, and a secure vault.

Tech stack: React + TypeScript + Tailwind CSS + shadcn/ui + lucide-react icons.

LAYOUT:
- Full-height app with a fixed left sidebar (260px wide, collapsible to icon-only) and a main content area
- Top bar inside the main area: breadcrumb navigation on the left, global search in the center, user avatar dropdown on the right
- Support both light and dark mode (default to dark)
- Modern, clean, minimal aesthetic — think Notion meets Linear meets Obsidian
- Use subtle borders, soft shadows, rounded corners (rounded-lg)
- Color palette: zinc/slate neutrals as base, with a single accent color (indigo or violet)

SIDEBAR sections (top to bottom):
1. App logo + name "DigiBrain" at the top
2. Search input (cmd+k style)
3. "Topics" — a hierarchical tree of folders/topics with expand/collapse arrows. Each topic has an emoji icon, a name, and a count badge on the right. Show 3-4 levels deep examples like:
   - 📚 University - Business Informatics
     - 📁 Semester 1
       - 📄 Microeconomics
       - 📄 Mathematics
     - 📁 Semester 2
   - 💼 Work
     - 📁 Project A
   - 🏠 Personal
     - 📁 Health
     - 📁 Finance
4. A small "+" button at the end of the topics list to create a new topic
5. Below topics, a divider, then quick-access links with lucide icons:
   - Dashboard (home)
   - Time Tracking (clock)
   - Finances (wallet)
   - Notes (file-text)
   - Vault (lock)
6. Bottom: Settings gear icon + dark/light mode toggle

MAIN CONTENT — Dashboard view:
- Welcome header: "Good evening, Marcell" with current date
- Active timer widget at the top: shows what topic/task is currently being tracked, elapsed time, and a stop button. If nothing is running, show a "Start tracking" CTA.
- 4-column grid of stat cards:
  1. "Hours this week" — number + small line chart
  2. "Tasks completed" — number + percentage change vs last week
  3. "Spent this month" — currency amount + budget progress bar
  4. "Active topics" — count
- Below the stats: 2-column layout
  - Left (larger): "Recent Tasks" — list of 5-6 task cards with title, topic badge, priority dot, due date
  - Right: "This week's time distribution" — a horizontal bar chart by topic
- At the bottom: "Recent notes" — 3 note preview cards with title, snippet, and topic

Make it polished, responsive, and feel like a premium productivity tool.
```

---

## Második Prompt — Téma Részletes Nézet (Topic Detail) + Kanban

```
Build the topic detail page for the DigiBrain app (React + TypeScript + Tailwind + shadcn/ui).

Layout: same sidebar as before (collapsed for context), main content takes the rest.

TOP BAR of the topic detail page:
- Breadcrumbs: "University > Semester 1 > Microeconomics"
- Topic title (large, editable inline) with an emoji picker next to it
- Right side: tab switcher with 4 view modes — "Kanban", "Pipeline", "Tree", "List" (icons + labels). "Kanban" is active.
- A "+ Add task" button (primary)
- A more-options menu (3 dots): rename topic, change color, archive, delete

KANBAN BOARD (the main content):
- Horizontal scrollable board with custom-named columns
- Default columns shown: "To Do", "In Progress", "Review", "Done" — but emphasize that columns are fully customizable (user can rename, add, reorder, change color)
- Each column has:
  - Column header: name (editable on click), task count, color accent stripe at the top
  - Hover-to-show: column menu (rename, change color, delete) and a small "+" to add task
  - 3-5 task cards per column
- Task card design:
  - Title (1-2 lines, truncated)
  - Optional: description preview (first 50 chars, muted)
  - Bottom row: priority dot (red/yellow/green for high/med/low), due date pill (only if set), small avatar (creator)
  - Tag chips if any
  - Hover state: subtle lift + border highlight
- At the right end of the board: a dashed-border "+ Add column" placeholder
- Drag-and-drop hint visible (subtle "drag handle" icons on cards)

Below the board (or accessible via a side panel):
- A small section called "Notes for this topic" — shows a few markdown note cards

Make the columns visually distinct using subtle background tints (each column slightly different color, very muted).
Clean, modern, premium feel. Dark mode default.
```

---

## Harmadik Prompt — Időkövetés (Time Tracking) Diagramok

```
Build the Time Tracking analytics page for DigiBrain (React + TypeScript + Tailwind + shadcn/ui + recharts).

Top of the page:
- Page title "Time Tracking"
- Period selector tabs: "Today", "This Week", "This Month", "This Year", "Custom range"
- Topic filter multi-select dropdown
- "+ New entry" button (manual time log)

Top stat cards (4 columns):
1. Total hours in period (with trend vs previous period)
2. Most active topic (name + hours)
3. Daily average
4. Longest single session

Main chart area (large card):
- For "Today": a horizontal Gantt-style timeline showing time blocks colored by topic
- For "Week": a stacked vertical bar chart, one bar per day, segments colored by topic
- For "Month": a heatmap calendar (GitHub contribution style), with intensity = hours
- Use recharts where applicable

Right sidebar (or below on mobile):
- "Top Topics" — ranked list with bar visualization, hours and percentages
- "Recent Sessions" — list of recent time entries (topic, duration, time of day, optional note)

Visual style: clean, data-dense but readable. Dark mode default. Use the same indigo/violet accent.
```

---

## Negyedik Prompt — Pénzügyek (Finance)

```
Build the Finance page for DigiBrain (React + TypeScript + Tailwind + shadcn/ui + recharts).

Top:
- "Finances" title
- Period tabs: "This week", "This month", "This year", "Custom"
- Currency selector (HUF default, but support multi-currency — show small flag/code chips of currencies used)
- "+ Add transaction" primary button

Stats (4 cards):
1. Total spent this period (large amount + currency)
2. Total income (if any)
3. Net (balance)
4. Largest expense (with category)

Main area, 2 columns:
- LEFT (larger):
  - "Spending by category" — donut/pie chart with legend
  - Below: "Transactions" table — date, category (with color dot), description, amount (colored red/green), currency
  - Inline filtering by category
- RIGHT:
  - "Budget progress" — list of budgets per category with progress bars (green if under, yellow if close, red if over)
  - "Spending trend" — small line chart over time

Add transaction modal/sheet:
- Amount + currency selector
- Category dropdown (with color dots) + create new
- Optional: link to a topic
- Date picker
- Note field

Modern fintech aesthetic. Clean numbers, large amounts. Dark mode default.
```

---

## Tipp a v0.dev használathoz

1. **Egyenként generáld**, ne egyben — a v0.dev jobban dolgozik fókuszált promptokkal
2. **Iterálj** — ha valami nem tetszik, írd be: „make the sidebar narrower" vagy „use a different accent color"
3. **Másold a generált kódot** és tedd a `frontend/src/components/` megfelelő almappájába
4. Az shadcn/ui komponenseket előtte telepíteni kell:
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button card input dialog dropdown-menu
   ```
5. A v0.dev gyakran használ olyan komponenseket amik nincsenek alapból az shadcn-ben — telepítsd őket egyenként ahogy felmerülnek

## Minőségi finomítások (második körben)

Ha a kezdő layout megvan, kérheted ezt is a v0.dev-től:
- "Add keyboard shortcuts overlay (Cmd+K command palette)"
- "Make the sidebar collapsible with smooth animation"
- "Add empty states with helpful illustrations"
- "Add loading skeleton states"
