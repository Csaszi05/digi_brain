# DigiBrain Design System

DigiBrain is a self-hosted, single-user "second brain" — a personal productivity OS that combines a hierarchical topic tree, customizable kanban boards, a pipeline / mind-map view, time tracking, multi-currency finance, a markdown editor, and an encrypted vault for sensitive credentials. It is built to run in Docker on the user's own server, and the UI is designed for **information density without clutter** — a tool the user lives inside daily.

The brand sits in the **Linear / Notion / Vercel** lineage: zinc neutrals, a single indigo-violet accent, a dark-first canvas, soft shadows, generous whitespace, and crisp typography. There is no marketing pastel palette and no playful illustration; the visual language is strictly "premium productivity tool".

## Sources

- **Codebase**: [github.com/Csaszi05/digi_brain](https://github.com/Csaszi05/digi_brain) — React + TypeScript + Vite frontend (currently scaffolded; routes are placeholders), FastAPI + PostgreSQL backend. Tech stack confirmed: Tailwind CSS, shadcn/ui, lucide-react icons, recharts, @xyflow/react, zustand, react-router-dom v6.
- **`uploads/DOCUMENTATION.md`** (mirrored from repo root): the canonical product spec — modules, tech stack, phases, security model.
- **`uploads/DATABASE.md`**: PostgreSQL schema. Confirms multi-currency, soft delete, customizable kanban columns, AES-256-GCM vault.
- **`uploads/DECISIONS.md`**: ADR log. Most relevant decision: **kanban columns are user-customizable**, not a fixed `todo / in_progress / done` enum.
- **`uploads/V0_DEV_PROMPT.md`**: the user's own design briefs to v0.dev for Dashboard, Topic Detail, Time Tracking, and Finance pages. This is the closest thing to a visual spec and is the primary source for the UI kit recreations in `ui_kits/app/`.

> **No production frontend code exists yet.** The repo's `App.tsx` currently routes to placeholder `<div>` elements. The UI kit in this design system is the **first hi-fi rendering of the product** — it is intentionally faithful to the v0 prompts and the user's stated references (Linear, Notion, Obsidian, Vercel), not invented.

The product is built by a Hungarian developer for personal use; copy in the live app will eventually be Hungarian, but **all surfaces in this design system are written in English first** so they can be translated by the user.

## Index

```
DigiBrain Design System/
├── README.md                  ← you are here
├── SKILL.md                   ← Agent-Skill manifest (cross-compatible with Claude Code)
├── colors_and_type.css        ← CSS custom properties: color tokens, type scale, semantic vars
├── fonts/                     ← Inter (4 weights) + JetBrains Mono
├── assets/                    ← logo, favicon, lucide CDN reference
├── preview/                   ← Design System tab cards (Type, Colors, Spacing, Components, Brand)
└── ui_kits/
    └── app/                   ← DigiBrain web app — the only product surface
        ├── README.md
        ├── index.html         ← interactive click-thru (Dashboard → Topic → Time → Finance → Vault)
        ├── components/        ← Sidebar, TopBar, StatCard, KanbanBoard, TaskCard, etc.
        └── screens/           ← Dashboard, TopicDetail, TimeTracking, Finance, Vault
```

There is **one product surface** (the web app); there is no marketing site, mobile app, or docs site in scope.

---

## CONTENT FUNDAMENTALS

DigiBrain copy is **utilitarian, calm, and second-person**. The user is talking to themselves through the tool, so the tool talks back the same way: short sentences, sentence case, no hype, no apologies, no exclamation points. The reference is Linear's empty states and Notion's microcopy, not a SaaS landing page.

**Voice**

- **Pronoun**: "you" — never "we", never "your team". This is a single-user tool. Greeting copy is `"Good evening, Marcell"`, not `"Welcome back!"`.
- **Tense**: present, active. "5 tasks due this week", not "You will have 5 tasks coming due".
- **Tone**: informational. The app reports state; it does not editorialize. ✗ "Great work on closing those tasks!" ✓ "12 tasks completed this week."

**Casing**

- **Sentence case everywhere** — buttons, headings, menu items, tabs. ✓ `Add task`, `Time tracking`, `Spending by category`. ✗ `Add Task`, `Time Tracking`.
- The product name is the only Title Case exception: **DigiBrain** (one word, capital D, capital B).
- View modes are sentence case in tabs but capitalized when used as proper nouns in body copy: `Kanban`, `Pipeline`, `Tree`.

**Microcopy patterns**

| Surface | Pattern | Example |
|---|---|---|
| Primary CTA | Verb + noun | `Add task`, `Add transaction`, `New entry` |
| Empty state | Stated fact + single action | `No tasks yet. Add task` |
| Confirmation | Past tense, terse | `Task moved to Done`, `Budget updated` |
| Greeting | Time-of-day + first name | `Good evening, Marcell` |
| Stat label | Noun phrase, no period | `Hours this week`, `Active topics`, `Largest expense` |
| Period selector | Noun, sentence case | `Today`, `This week`, `This month`, `This year`, `Custom range` |
| Tooltip | Sentence fragment, no period | `Customize columns`, `Stop tracking` |

**Numbers and units**

- Hours: `12.5h` (decimal, lowercase `h`, no space). Sub-hour: `42m`.
- Currency: amount + ISO code, e.g. `45 230 HUF`, `120 EUR`. HUF is the user's default; non-default currencies show the code chip inline.
- Counts in badges are bare integers: `12`, `99+`.
- Dates in lists: `Apr 12`, `Today`, `Tomorrow`, `Mon`. Full date in detail views: `April 12, 2026`.

**What we don't do**

- **No emoji in chrome**. Topics in the user's tree may have emoji icons (the user picks them per topic — that's their data), but emoji are never used in buttons, labels, status pills, or microcopy.
- **No exclamation points** anywhere in the UI.
- **No filler adjectives** — "great", "awesome", "powerful", "seamless" never appear.
- **No marketing voice** — there is no homepage and no signup flow that needs to sell. The user already chose this tool.
- **No "we"** — there is no team behind the product talking to the user.

**Examples of correct vs incorrect**

| ✗ Don't | ✓ Do |
|---|---|
| `Welcome Back! 👋` | `Good evening, Marcell` |
| `Awesome — task completed!` | `Task moved to Done` |
| `Click here to Add a New Task` | `Add task` |
| `Oops, something went wrong` | `Couldn't save. Try again` |
| `Your team's productivity` | `This week's time distribution` |
| `Track Time` | `Time tracking` |

---

## VISUAL FOUNDATIONS

### Mode

**Dark mode is the default**. Light mode is supported and uses the same token names with inverted values. The user opens DigiBrain in the evening more than in the morning — the dark canvas is the primary aesthetic and most screens are tuned to look right against it.

### Color

Two-axis system: **zinc neutrals** (a 50 → 950 scale) for surfaces and text, plus **a single indigo accent** (`#6366f1`, Tailwind `indigo-500`) for interactive affordances and the active state. There is no second brand color and no gradient brand mark. Status uses **muted** semantic colors — emerald, amber, rose — never saturated traffic-light hues.

- **Surfaces** (dark): `bg-app: zinc-950`, `bg-elev1: zinc-900`, `bg-elev2: zinc-800`. Three layers, no more.
- **Borders**: a single hairline, `zinc-800` on dark / `zinc-200` on light. Borders are 1px and never doubled.
- **Text**: `fg1: zinc-50` (primary), `fg2: zinc-400` (secondary), `fg3: zinc-500` (tertiary / metadata). Disabled = `zinc-600`.
- **Accent**: `indigo-500` for the interactive default; `indigo-400` for hover on dark; `indigo-600` for press. The accent appears **once per view, max twice** — on the primary CTA and on the active sidebar item.
- **Status (dark mode tints)**: `emerald-400` (success / under budget), `amber-400` (warn / due soon / near budget), `rose-400` (high priority / over budget / destructive). Status fills are always token + 12% alpha background, never solid saturated blocks.

### Type

- **UI**: **Inter**, weights 400 / 500 / 600 / 700, with `font-feature-settings: "cv11", "ss01", "ss03"` for the disambiguated digits and rounded `a`. Geist is an acceptable swap; the system ships Inter.
- **Mono**: **JetBrains Mono** for code blocks, vault labels, and numeric tabular displays.
- **Scale** (rem-based, 16px root): `12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36`. Body is `14px / 1.5`. Page titles `24px / 1.2 / 600`.
- **Tracking**: `-0.01em` on display sizes (≥20px), `0` elsewhere. All-caps mini-labels (e.g. stat-card labels) get `0.04em` and `font-medium`.
- **Numbers**: `font-variant-numeric: tabular-nums` on every numeric display (stats, time, money).

### Spacing

4px base grid: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`. Card internal padding is `20px` (mobile) → `24px` (≥sm). Section gaps are `24px`. Form fields stack at `12px`.

### Radii

`rounded-md` (6px) for inputs and small chips, `rounded-lg` (8px) for buttons, `rounded-xl` (12px) for cards. Nothing is fully circular except avatars and the priority dot. No pills outside avatars and currency-code chips.

### Backgrounds

**Flat surfaces, no imagery**. There are no full-bleed photographs, no hand-drawn illustrations, no repeating patterns, no gradient backdrops. The canvas is `zinc-950`, sidebars and panels step up to `zinc-900`, and selected/hover rows step up once more to `zinc-800/40`. The only "image" anywhere in the chrome is the DigiBrain wordmark + glyph in the sidebar header.

A single subtle visual treatment is permitted on **stat-card sparklines and chart backgrounds**: a vertical gradient from `indigo-500/10` to `transparent` underneath line charts. This is a chart-only motif, not a brand gradient.

### Shadows

Soft, low-spread, low-opacity. The system has **three** elevations:

```
shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.40)         ← inputs at rest
shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.45),
            0 1px 2px -1px rgb(0 0 0 / 0.35)      ← cards
shadow-md:  0 8px 24px -8px rgb(0 0 0 / 0.55),
            0 2px 6px -2px rgb(0 0 0 / 0.40)      ← popovers, dialogs, hovered task cards
```

In light mode the alphas drop to roughly half (`0.10 / 0.10 / 0.15`). There are no inner shadows, no glows, no neon. Focus rings use the accent color, not a shadow.

### Borders

Every elevated surface has a 1px border in addition to its shadow — this is a Linear/Vercel-style hairline that keeps cards legible against the dark canvas. Borders never use the accent color except on the **active** sidebar item and the **focused** input.

### Animation

**Restrained.** Easing is `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) for entrances and `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard) for state changes. Durations: **120ms** for hover/press, **180ms** for menus/popovers, **240ms** for sidebar collapse and panel slides. No bounces, no spring overshoots, no parallax. Page transitions are immediate (no fade).

### Hover & press states

- **Buttons**: hover lifts the background by one zinc step (`indigo-500 → indigo-400`); press drops one step (`indigo-500 → indigo-600`). No scale transforms on buttons.
- **Cards (task cards, note cards)**: hover raises shadow from `sm` to `md` and switches the border from `zinc-800` to `zinc-700`. No translation, no scale.
- **List rows / sidebar items**: hover swaps background to `zinc-800/40`. The active sidebar item uses `zinc-800` solid plus a 2px left accent stripe in `indigo-500`.
- **Icon buttons**: hover shows a `zinc-800/60` square underlay at the same radius as the icon's hit area.
- **Press**: opacity drops to `0.9` for 80ms then snaps back. No scale-down.

### Focus

`outline: 2px solid var(--accent); outline-offset: 2px;` — the accent ring, always. Never remove focus styles; for "mouse-only" cases use `:focus-visible`.

### Transparency & blur

Used sparingly and **only for floating chrome over content** — the kanban column header sticky bar and the global Cmd+K palette backdrop. Both use `backdrop-filter: blur(8px)` over a `bg-elev1 / 70%` fill. The sidebar is **opaque** (no blur), and cards never have transparency.

### Imagery

There are no photos in the product chrome. The only "imagery" surfaces are:

- The DigiBrain glyph in the sidebar (a stylized "DB" monogram).
- Topic icons — emoji or lucide icons chosen by the user as part of their own data.
- Charts (recharts) and the mind-map / pipeline flows (@xyflow/react), which are not images but generated visualizations using the brand palette.

If a marketing or empty-state illustration is ever needed, it should be a **monoline lucide-style line drawing in `zinc-700`** — no fills, no shadows, no color.

### Layout rules

- **Sidebar**: fixed left, 260px wide, collapsible to 64px icon-only. Always pinned.
- **Top bar**: fixed top, 56px tall, inside the main content column. Breadcrumbs left, Cmd+K search center (max-width 480px), avatar right.
- **Main content**: 24px outer padding, max-width 1440px, centered when the viewport is wider.
- **Time tracker widget**: floating bottom-right, 16px from edges, only visible when a timer is running. Card uses `shadow-md` and `bg-elev2`.

### Cards

A "card" in DigiBrain is: `bg-elev1` + `1px border zinc-800` + `rounded-xl` + `shadow-sm` + `padding: 20px`. The header inside a card is a 14px medium label in `fg2`, optionally with an icon button on the right. The body uses the standard type scale. Card titles are 16px semibold, never larger.

### Don'ts (codified)

- No bluish-purple → pink gradients on backgrounds or buttons.
- No emoji on system chrome (buttons, tabs, status).
- No cards built from "rounded-lg + colored left border only" — DigiBrain cards are bordered on all four sides.
- No saturated traffic-light status colors — always the muted `-400` tints with `/12` fills.
- No neon accents, no glow shadows, no aurora backdrops.

---

## ICONOGRAPHY

DigiBrain uses **lucide-react** as its single icon system, loaded via the `lucide-react` package in production and via the `lucide` UMD CDN bundle (`https://unpkg.com/lucide@latest`) in this design system's HTML previews. There is **no custom icon set**, no icon font, no SVG sprite — every chrome icon is lucide.

**Style invariants**

- **Stroke width**: `1.5` everywhere. (Lucide's default is 2; we override to 1.5 to feel quieter and more Linear-like.)
- **Size**: 16px in dense lists and inline buttons, 20px in the sidebar and primary buttons, 24px only in empty states. Icons are sized via `width` / `height` attrs, not `font-size`.
- **Color**: icons inherit `currentColor`. Default rendering is `fg2` (zinc-400); active rendering is `fg1`; the active sidebar item's icon is `indigo-400`.
- **Stroke linecap/linejoin**: `round` (lucide default).

**Usage map** (the canonical icon for each surface)

| Surface | Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Time tracking | `Clock` |
| Finance | `Wallet` |
| Notes | `FileText` |
| Vault | `Lock` |
| Settings | `Settings` |
| Search / Cmd+K | `Search` |
| Sidebar collapse | `PanelLeftClose` / `PanelLeftOpen` |
| Add (CTA) | `Plus` |
| More menu | `MoreHorizontal` |
| Topic (folder) | `Folder` (collapsed) / `FolderOpen` (expanded) |
| Topic (leaf) | `FileText` |
| Kanban view | `Columns3` |
| Pipeline view | `GitBranch` |
| Tree view | `Network` |
| List view | `List` |
| Drag handle | `GripVertical` |
| Timer running | `Play` / `Square` (stop) |
| Priority high | `ArrowUp` (rose-400) |
| Priority medium | `Minus` (amber-400) |
| Priority low | `ArrowDown` (zinc-500) |
| Vault item: password | `Key` |
| Vault item: IP | `Globe` |
| Vault item: VPN | `Shield` |
| Vault item: other | `FileLock2` |

**Topic icons (user-chosen, not chrome)**

The user can attach an icon to a topic in their tree. The picker offers two parallel options: a curated lucide subset (Folder, Briefcase, GraduationCap, Heart, Code, Plane, Home, Book, Zap, Users) and a native emoji picker. Whichever the user picks is rendered at 16px next to the topic name. The V0 prompt and DOCUMENTATION.md both show topic examples with emoji (📚 University, 💼 Work, 🏠 Personal) — emoji on **user data** is allowed and idiomatic; emoji on **chrome** is forbidden.

**Unicode characters**

The only unicode glyph used in chrome is `⌘` in the Cmd+K hint pill (`⌘K` on Mac, `Ctrl K` on other platforms). No bullets (`•`), em-dashes (`—`), or arrows (`→`) are used to substitute icons — always use the lucide equivalent.

**Logo**

The DigiBrain glyph is a monogram **"DB"** in Inter Bold inside a rounded-square (8px radius) tile filled `indigo-500`, with the wordmark **DigiBrain** in Inter Semibold to its right. There is no animated logo, no isometric mark, no 3D treatment. See `assets/logo.svg` and `preview/brand-logo.html`.
