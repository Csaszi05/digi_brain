# Handoff: DigiBrain Web App — Hi-fi UI Kit (Phase 1–2)

## Overview

This bundle is the **first hi-fi design pass** of the DigiBrain web application: a self-hosted, single-user "second brain" combining a hierarchical topic tree, customizable kanban boards, time tracking, and multi-currency finance. Four primary screens are designed and one design system is fully specified:

1. **Dashboard** — daily landing page with greeting, active timer, weekly stats, recent tasks, time distribution, recent notes
2. **Topic detail** — kanban board (custom columns) for a single topic, with notes panel below
3. **Time tracking** — week chart, top topics, recent sessions
4. **Finances** — multi-currency (HUF / EUR / USD), donut by category, transaction list, budget progress, 12-month trend

The target codebase is the existing repo `github.com/Csaszi05/digi_brain` — React + TypeScript + Vite, Tailwind CSS, shadcn/ui, lucide-react, recharts, @xyflow/react, zustand, react-router-dom v6. The repo's `App.tsx` currently routes to placeholder `<div>` elements; this handoff is the first concrete UI to wire into those routes.

## About the Design Files

The files in `designs/` are **design references created in HTML** — interactive prototypes showing intended look and behavior. They are **not production code to copy directly**.

- The HTML prototype mounts a React tree via inline Babel for fast iteration. In the real app, port each `screens/*.jsx` into a real route component using shadcn/ui primitives, recharts for the charts, and lucide-react for icons.
- The `colors_and_type.css` token file is the source of truth for design values. Port the tokens into `tailwind.config.ts` (extend the `zinc` and `indigo` palettes, copy the radii / shadow / spacing scales) and into the project's `index.css` for the semantic CSS custom properties (`--bg-app`, `--fg1`, etc.).
- The `Sidebar.jsx` topic tree is implemented with `useState`-controlled expand/collapse — in the real app, use `zustand` for the open-set so it persists across route changes.

The task is to **recreate these designs in the existing React + TS + Tailwind + shadcn/ui environment** using the codebase's established patterns.

## Fidelity

**High-fidelity.** Pixel-perfect mockups with final colors, typography, spacing, radii, shadows, hover states, and interaction details. The developer should recreate the UI pixel-perfectly using the codebase's existing libraries (Tailwind, shadcn/ui, lucide-react). Where exact pixel values are given below, treat them as authoritative.

The dummy data (Marcell, Microeconomics, Project Atlas, etc.) is realistic placeholder content matching the user persona; replace with live data fetched via TanStack Query (or whatever the team picks) against the FastAPI backend defined in `DATABASE.md`.

## Design System

A complete design system is in this handoff under `design_system/`:

- `design_system/colors_and_type.css` — every token used by the prototypes (raw scales + semantic variables + light-mode override)
- `design_system/README.md` — the system spec: voice, casing, microcopy, color, type, spacing, radii, shadows, animation, hover/press states, focus, transparency, layout rules, cards, "don'ts", and the iconography map
- `design_system/preview/*.html` — visual cards for each token group (Type, Colors, Spacing, Components, Brand)
- `design_system/fonts/` — Inter (Regular, Medium, SemiBold, Bold) + JetBrains Mono (Regular, Medium) as woff2
- `design_system/assets/` — `logo.svg`, `glyph.svg`, `favicon.svg`

**Do not invent new colors, type sizes, or spacing values.** If something feels missing, surface it back to design rather than ad-hoc adding it.

### Design tokens — quick reference

| Token | Value |
|---|---|
| `--bg-app` (dark) | `#09090b` (zinc-950) |
| `--bg-elev1` | `#18181b` (zinc-900) |
| `--bg-elev2` | `#27272a` (zinc-800) |
| `--fg1` | `#fafafa` (zinc-50) |
| `--fg2` | `#a1a1aa` (zinc-400) |
| `--fg3` | `#71717a` (zinc-500) |
| `--border` | `#27272a` (zinc-800) |
| `--border-strong` | `#3f3f46` (zinc-700) |
| `--accent` | `#6366f1` (indigo-500) |
| `--accent-hover` | `#818cf8` (indigo-400) |
| `--accent-press` | `#4f46e5` (indigo-600) |
| `--accent-soft` | `rgb(99 102 241 / 0.12)` |
| `--success` | `#34d399` (emerald-400) |
| `--warn` | `#fbbf24` (amber-400) |
| `--danger` | `#fb7185` (rose-400) |
| `--sidebar-w` | `260px` |
| `--sidebar-w-collapsed` | `64px` |
| `--topbar-h` | `56px` |
| Type scale (px) | 12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36 |
| Body | `14px / 1.5 / 400 Inter` |
| H1 (page) | `24px / 1.2 / 600 Inter, tracking -0.015em` |
| Stat numeric | `30px / 1.1 / 600 Inter, tabular-nums` |
| Spacing (px) | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 |
| Radii | sm 4 · md 6 · lg 8 · xl 12 · 2xl 16 · full |
| Shadow xs | `0 1px 2px 0 rgb(0 0 0 / 0.40)` |
| Shadow sm | `0 1px 3px 0 rgb(0 0 0 / 0.45), 0 1px 2px -1px rgb(0 0 0 / 0.35)` |
| Shadow md | `0 8px 24px -8px rgb(0 0 0 / 0.55), 0 2px 6px -2px rgb(0 0 0 / 0.40)` |
| Easing entrance | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Easing state | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Durations (ms) | 120 (hover/press) · 180 (popovers) · 240 (sidebar / panel slides) |

### Type families

- **Inter** (sans, UI). Load with `font-feature-settings: "cv11", "ss01", "ss03"` for disambiguated digits and the rounded `a`. Geist is an acceptable swap.
- **JetBrains Mono** (mono). Used for code blocks, vault labels, and **all timer / numeric tabular displays** — every stat card, transaction amount, and clock readout.

### Status colors — usage rule

Status fills are always `<color> + 12% alpha` on the background, `-400` tint on the foreground. Never solid saturated blocks. Examples:
- "Today" pill: `bg: var(--accent-soft)`, `fg: var(--indigo-300)`, no border
- "Over budget" progress bar: `bg: var(--danger)` (`#fb7185`)

## Screens / Views

### 1. Dashboard

**Route:** `/` (root after auth)
**Purpose:** The user's daily landing page. Tells them what's running, what's due, where their time and money went.

**Page layout (top → bottom, all gap 24px):**
1. **Page head row** — `flex justify-between items-end`
   - Left: H1 `Good evening, Marcell` + sub `Sunday, May 5 — 8 tasks scheduled this week`
   - Right: `Quick capture` (secondary `.btn`) + `Add task` (primary `.btn-primary`)
   - Greeting derives from `new Date().getHours()`: <12 morning, <18 afternoon, else evening.
2. **Active timer card** — full width, `padding: 16px 20px`, `flex items-center gap-16`
   - Left: 36×36 rounded-lg accent-soft tile with `play` lucide icon (indigo-300)
   - Middle: `mini-label` "Currently tracking" + 16px semibold `<topic> · <task>` (task in fg3)
   - Right: 24px JetBrains Mono `01:24:08` (live, ticks every second when running)
   - Far right: `Stop` button with `square` icon
   - **Visibility rule:** only render when `time_entries` table has a row with `ended_at IS NULL` for this user. When idle, hide entire card.
3. **Stat grid** — 4 columns, gap 16px
   - Card 1: `Hours this week` / `30.2` + small `h` superscript / sparkline (last 7 days) + `+12% vs last week` delta-up emerald
   - Card 2: `Tasks completed` / `12` / sparkline + `+3 vs last week` emerald
   - Card 3: `Spent this month` / `184 230` + `HUF` superscript / progress bar `62% of 300k` (ok class)
   - Card 4: `Active topics` / `14` / `3 archived this month`
4. **Two-column row** — `grid-cols-[1.6fr_1fr] gap-16`
   - Left: `Recent tasks` card (header + 6 task rows, divided)
   - Right: `This week's time` card (stacked horizontal bar + per-topic legend with 8px dot, name, %, hours)
5. **Recent notes** — 3-column grid of note cards (topic chip · date · 14px semibold title · 13px snippet, line-clamp 3)

**Stat card spec:**
- Container: `bg-elev1`, `border zinc-800`, `radius xl`, `shadow-sm`, `padding 20px`, `flex flex-col gap-12`
- Label: `12px / 500 / uppercase / 0.04em tracking / fg3`
- Value: `30px / 600 / -0.015em tracking / fg1 / tabular-nums`, sup at 14px / 500 / fg3, vertical-align 2px
- Foot row: `flex items-center gap-8 / 12px / fg3`. Spark or progress floats right via `margin-left: auto`.

**Recent task row spec:**
- `flex items-center gap-12 / padding 12px 20px / border-bottom zinc-800` (last row no border)
- Priority dot 8×8 (rose-400 high / amber-400 med / emerald-400 low)
- Title: `13px / 500 / fg1`
- Topic chip below title — `tag` style (22px height, 12px font, 6×6 dot prefixed)
- Due date right: `12px / fg3 / tabular-nums`. "Today" gets the accent-soft pill treatment.

### 2. Topic detail (Kanban view)

**Route:** `/topics/:topicId`
**Purpose:** Manage tasks within one topic. Default view is the kanban board with user-customizable columns (per `kanban_columns` table — 3 default columns "To do / In progress / Done" auto-created).

**Page layout:**
1. **Page head** — `flex items-center justify-between`
   - Left: 36×36 emoji button (icon picker on click) + H1 topic name + sub `8 tasks · 12.5 hours tracked · midterm in 9 days`
   - Right: view-mode tabs (`Kanban` / `Pipeline` / `Tree` / `List`, segmented control) + `Add task` primary + more menu
2. **Board** — horizontally scrollable region OUTSIDE the page-inner wrapper (uses full content width). `display: inline-flex / gap 12px / padding 16px 24px / overflow-x: auto`.
3. **Notes panel** — back inside `page-inner`, 24px above the board: `Notes for this topic` section title + 3-col grid of note cards.

**Kanban column spec:**
- Width 280px, height auto up to `max-height: 560px`
- Container: `bg-elev1`, `border zinc-800`, `radius xl`, `flex flex-col`, `overflow hidden`
- 2px top stripe in the column color
- Header: `padding 10px 12px / border-bottom zinc-800` — left: 8px square dot in column color + 13px semibold name + 12px count — right: `+` and `…` icon buttons (28×28, hover bg-elev2)
- Body: `padding 8px / flex flex-col gap 8px / overflow-y auto / flex 1`
- "Add task" footer button — full width, dashed border, 12px fg3, hovers to fg1 + border-strong

**Task card spec:**
- `bg-elev2`, `border zinc-800`, `radius lg`, `shadow-sm`, `padding 10px 12px`
- Hover: border → `border-strong`, shadow → `md`
- Drag handle (grip-vertical lucide, 12px) absolute top-right, `opacity 0` until parent hover
- Title: `13px / 500 / fg1 / line-height 1.4`
- Description: `12px / fg3 / 1.4 / line-clamp 2 / margin-top 6px`
- Tags row: `flex flex-wrap gap-4 / margin-top 10px` — each tag is 18×auto, 11px, padding `0 6px`, default tag style
- Footer row: `flex items-center gap-8 / margin-top 12px` — priority dot · due-date pill (accent-soft if "Today") · 18px avatar at far right

**"Add column" tile** — same width as column (280px), full column height, `border 1px dashed`, `bg transparent`, centered `+ Add column`.

**Drag-and-drop (later phase):** use `@dnd-kit/core` + `@dnd-kit/sortable`. Order persists via `tasks.position INTEGER` and `kanban_columns.position INTEGER`.

### 3. Time tracking

**Route:** `/time`
**Purpose:** Review where time went and start/edit time entries.

**Page layout:**
1. **Page head** — H1 `Time tracking` + sub `Apr 28 – May 4 · 30.2 hours` + right: filter button + `New entry` primary
2. **Period tabs** — `Today / This week / This month / This year / Custom range`. Standard segmented control style.
3. **Stat grid** — 4 cards: `Total hours` (30.2h, +12%), `Most active topic` (Microecon., 9.5h · 31% of week), `Daily average` (4.3h, Goal: 4.0h), `Longest session` (2.0h, Macroeconomics · Tue)
4. **Two-column row** — `grid-cols-[1.6fr_1fr] gap-16`
   - Left card: `Hours by day` stacked bar chart (Mon–Sun, by topic). Each day is a vertical bar; bar height = total hours / 8 max; bar is internally divided into colored segments per topic. Total hours label floats above each bar. Legend below the chart.
   - Right card: `Top topics` ranked list — topic dot + name + `9.5h · 31%` + thin progress bar in topic color
5. **Recent sessions** card — 0 padding container with header row + 6+ session rows. Each row: topic tag · note (italic fg3 if missing) · timestamp · monospace duration `1h 24m`.

**Replace WeekChart with recharts:** use `<BarChart>` with `<Bar stackId="a">` per topic. Or build the simple custom SVG version in the prototype if recharts feels heavy — the chart is intentionally simple.

### 4. Finances

**Route:** `/finance`
**Purpose:** Track multi-currency expenses and income against per-category budgets.

**Page layout:**
1. **Page head** — H1 `Finances` + sub `May 2026 · 24 transactions` + right: currency switcher (3 chips: HUF active / EUR / USD) + `Add transaction` primary
2. **Period tabs** — `This week / This month / This year / Custom`
3. **Stat grid** — 4 cards: `Total spent` (184 230 HUF, −6% vs last month), `Total income` (320 EUR, ≈ 124 800 HUF), `Net balance` (−59 430 HUF, after income & FX), `Largest expense` (95 000 HUF, Rent · May 1)
4. **Two-column row** — `grid-cols-[1.6fr_1fr] gap-16`
   - **Left column** stacks two cards:
     - `Spending by category` — donut chart (200×200, stroke 22px, 14px gap from edge) + legend list (dot + name + `42 500 HUF`). Donut center: `184k` (22px semibold) + `HUF this month` (11px fg3).
     - `Transactions` — 0-padding container with 8 rows. Each row is a 4-column grid: date (60px, 12px fg3) · description with topic chip (flex 1) · 3-letter currency tag (mono) · monospace amount right-aligned (negative in fg1, positive in emerald-400).
   - **Right column** stacks two cards:
     - `Budget progress` — 6 categories × `<dot> <name>` + `spent / budget` right-aligned + 5px progress bar. Bar color: emerald (under 85%), amber (85–100%), rose (over 100%). The "Going out" example deliberately overflows at 124% to show the over-budget state.
     - `Spending trend` — 12-month line + area chart in accent color, linear gradient fill (`accent / 0.25` → `0`).

**Multi-currency rule:** transactions are stored with their original currency (`transactions.currency` column). Aggregations like "Total spent" can use a base-currency conversion (computed at display time via FX from a config / API), but **the transaction list always shows the original currency** with the 3-letter ISO chip.

**Number formatting (Hungarian locale):**
- HUF: `Intl.NumberFormat('hu-HU')` then replace `,` with non-breaking space → `45 230 HUF` (always trailing currency)
- EUR: `€120.00` (leading symbol, 2 decimals)
- USD: `$28.00` (leading symbol, 2 decimals)

## Shared chrome

### Sidebar

- 260px (expanded) / 64px (collapsed). Toggle animates `grid-template-columns` over 240ms `ease-standard`. Persist collapsed state in `localStorage` and rehydrate on mount.
- Sections (top → bottom): brand row (28×28 indigo-500 rounded-lg "DB" tile + wordmark) → `Search` button (32px height, opens Cmd+K) → `Topics` section header with `+` add button → topic tree → divider → main nav → footer (avatar + Marcell + email + settings/theme icons).
- **Topic tree:** recursive list (per `topics.parent_id` self-FK). Each row: 14px caret (rotates 90° when expanded) · 16px emoji/icon · name · count. Active row: `bg zinc-800` solid + 2px left accent stripe.
- **Nav active state:** `bg zinc-800` + 2px left accent stripe + active icon in `indigo-400`.
- Collapsed state hides all text labels, the tree, and the section labels — only the brand glyph + nav icons remain. The collapse button moves into the footer (using `panel-left-open` instead of `panel-left-close`).

### Top bar

- 56px tall, inside the main content column (right of sidebar). 24px horizontal padding.
- Left: breadcrumbs (`13px / fg3` with `last` segment in `fg1` semibold). Slash separators in `zinc-700`.
- Center: Cmd+K search button — max-width 480px, `bg-elev1`, `border`, `radius md`. Hovers to `border-strong`.
- Right: bell + help icon buttons (32×32 ghost) + 28×28 avatar.

### Cmd+K (later phase)

Listed in `extras` but not built in this kit. Palette overlay: backdrop `bg-overlay` (rgba(9,9,11,0.7)) + `backdrop-filter: blur(8px)`. Panel: 640px wide, `bg-elev1 / 70%`, `border-strong`, `radius xl`, `shadow-md`. Categories: Topics → Tasks → Notes → Commands.

## Interactions & Behavior

- **Sidebar collapse**: 240ms `ease-standard` on `grid-template-columns`. Labels fade via opacity 180ms.
- **Tree expand/collapse**: caret rotates 120ms `ease-standard`. No height animation (snap open).
- **Buttons**: hover lifts background one zinc step (`indigo-500 → indigo-400`). Press drops one step. No scale transforms. 120ms.
- **Cards (task / note)**: hover raises shadow `sm → md`, border `zinc-800 → zinc-700`. 120ms.
- **Sidebar / list rows**: hover swaps background to `zinc-800 / 60%`. Active uses solid `zinc-800` plus 2px left accent stripe.
- **Press**: opacity drops to `0.9` for 80ms then snaps back.
- **Focus**: `outline: 2px solid var(--accent); outline-offset: 2px;` — never remove. Use `:focus-visible` for mouse-only suppression.
- **Page transitions**: immediate, no fade.

## State Management

Suggested Zustand stores (the codebase already includes Zustand):

```ts
// useUIStore — chrome state
{
  sidebarCollapsed: boolean;
  expandedTopicIds: Set<string>;     // tree open-set, persisted
  cmdkOpen: boolean;
  toggleSidebar(): void;
  toggleTopic(id: string): void;
  openCmdk(): void;
}

// useTimerStore — running timer
{
  current: { topicId: string; taskId?: string; startedAt: Date; note?: string } | null;
  start(input): void;
  stop(): Promise<void>;     // POST /time_entries with ended_at
  elapsed(): number;          // recompute every second via interval
}
```

Data fetching: TanStack Query against the FastAPI endpoints implied by `DATABASE.md`:
- `GET /topics` (full tree, recursive CTE on the server)
- `GET /topics/:id` + `GET /topics/:id/tasks?columnId=...`
- `GET /time_entries?week=...`
- `GET /transactions?month=...`, `GET /budgets?period=monthly`, `GET /categories`

## Iconography

- Library: **lucide-react**. Stroke width 1.5 globally (override the default 2). Sizes: 16 in dense lists / 20 in sidebar / 24 in empty states.
- Color: inherits `currentColor` — typically `fg2`, `fg1` on active, `indigo-400` on the active sidebar item.
- Canonical icon for each chrome surface is mapped in `design_system/README.md` under `## ICONOGRAPHY`. Don't substitute — use the exact icon listed there.
- **No emoji in chrome.** Topic icons are user data (the user picks emoji or a curated lucide subset per topic) and render at 16px next to the topic name in the tree. Emoji never appear on buttons, tabs, status pills, or microcopy.

## Copy / microcopy

Voice rules are in `design_system/README.md` under `## CONTENT FUNDAMENTALS`. Highlights:
- **Sentence case everywhere** (`Add task`, not `Add Task`). Only `DigiBrain` is title-cased.
- **No exclamation points anywhere.** No "great", "awesome", "powerful".
- **Second-person, "you"**, never "we" / "your team". Single-user product.
- Greetings: `Good morning, Marcell` / `Good afternoon, Marcell` / `Good evening, Marcell`.
- Hours: `12.5h` decimal, lowercase `h`, no space. Sub-hour: `42m`.
- Currency: amount + ISO code: `45 230 HUF`, `120 EUR`. HUF default; non-default shows code chip inline.
- Empty states: stated fact + single action — `No tasks yet. Add task`

## Files in this bundle

```
designs/
├── index.html                    Top-level mount: design canvas wrapping all 4 screens
├── styles.css                    App layout + component CSS (uses tokens from colors_and_type.css)
├── App.jsx                       <DigiBrainApp> — sidebar + topbar + screen switch
├── components/
│   ├── Sidebar.jsx               Brand, search, topic tree (recursive), nav, footer
│   └── TopBar.jsx                Breadcrumbs + Cmd+K search + bell/help/avatar
└── screens/
    ├── Dashboard.jsx             Active timer, stat grid, recent tasks, time distribution, recent notes
    ├── TopicDetail.jsx           Tabs, kanban board (4 sample columns), notes grid below
    ├── TimeTracking.jsx          Period tabs, stat grid, weekly stacked bar, top topics, recent sessions
    └── Finance.jsx               Currency switcher, period tabs, stat grid, donut + transactions, budgets + trend

design_system/
├── README.md                     Full system spec (voice, color, type, spacing, components, iconography, don'ts)
├── colors_and_type.css           Token source of truth — port these into Tailwind config + index.css
├── fonts/                        Inter (4 weights) + JetBrains Mono (Regular, Medium) as woff2
├── assets/                       logo.svg, glyph.svg, favicon.svg
└── preview/                      Visual cards for Type / Colors / Spacing / Components / Brand

docs/
├── DATABASE.md                   PostgreSQL schema (Hungarian) — multi-currency, soft delete, custom kanban columns
└── DECISIONS.md                  ADR log — most relevant: kanban columns are user-customizable
```

## Recommended implementation order

1. **Tokens first.** Copy `colors_and_type.css` content into the project. Extend `tailwind.config.ts` so utility classes like `bg-bg-elev1`, `text-fg2`, `border-border` map to the CSS vars. This gives you the entire palette at once.
2. **Fonts.** Drop the woff2 files into `/public/fonts/` and add the `@font-face` rules to `index.css` (already written in `colors_and_type.css`).
3. **Shell.** Build the sidebar + topbar layout as a `<RootLayout>` component wrapping all routes. Wire the collapse toggle to the Zustand store. Persist to `localStorage`.
4. **Topic tree.** Implement the recursive `<TopicNode>` against the real `/topics` endpoint (server returns the full tree as a flat list with `parent_id`; build the tree client-side or expose a recursive endpoint).
5. **Dashboard route.** Static UI first with mocked data. Wire stats to TanStack Query.
6. **Topic detail / kanban route.** Start without drag-and-drop. Add `@dnd-kit` once the static layout is solid.
7. **Time tracking route.** The week chart is a `<BarChart>` from recharts with stacked bars — one `<Bar>` per topic.
8. **Finance route.** Donut is recharts `<PieChart>` with `innerRadius={70} outerRadius={90}`. The trend is `<AreaChart>` with the indigo gradient fill.
9. **Cmd+K palette** (later phase). Use `cmdk` package + the same backdrop blur recipe.

## Asset attribution

- **Inter** — SIL Open Font License. Included as woff2 in `design_system/fonts/`.
- **JetBrains Mono** — SIL Open Font License. Included as woff2.
- **Lucide icons** — ISC License. Use `lucide-react` from npm in production.
- **Logo / glyph / favicon** — bespoke SVGs created for DigiBrain, included in `design_system/assets/`.

No third-party imagery is used in chrome.
