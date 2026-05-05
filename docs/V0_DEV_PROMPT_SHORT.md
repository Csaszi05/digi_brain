# Rövid Prompt — DigiBrain UI

Ezt másold be a v0.dev / Claude design-be:

```
Build "DigiBrain" — a personal second-brain web app combining tasks, time tracking, finances, notes, and an encrypted vault.

Stack: React + TypeScript + Tailwind + shadcn/ui + lucide-react.

Design: Anthropic/Claude inspired — warm, editorial, minimal. NOT cool zinc.
- Font: Geist Sans (UI) + Geist Mono (numbers/code)
- Light mode palette: bg #FAF9F5, text #1C1917, accent terracotta #C96442
- Dark mode: bg #1C1917, text #FAF9F5
- Generous whitespace, soft borders, rounded-lg
- Reference vibe: claude.ai + linear.app + ycombinator.com

Layout:
- Left sidebar (260px, collapsible): logo "DigiBrain", search, hierarchical topic tree (emoji + name + count badge), quick links (Dashboard, Time, Finances, Notes, Vault), settings + theme toggle at bottom
- Main area: top bar with breadcrumbs + Cmd+K search + avatar; below that the page content
- Dashboard page: active timer widget, 4 stat cards (week hours, tasks done, spent this month, active topics), recent tasks list, time-by-topic chart, recent notes

Premium productivity feel. Dark mode default.
```

---

Ha már van layout, így kérj részleteket:

**Kanban:**
```
Add a kanban board page for a topic. Fully customizable columns (rename, recolor, reorder, add/delete). Cards: title, priority dot, due date pill. Same warm Claude/Geist aesthetic.
```

**Idő analitika:**
```
Add a time tracking analytics page. Period tabs (today/week/month/year). Charts: gantt timeline (today), stacked bars (week), GitHub-style heatmap (month). Top topics ranked list. Recent sessions feed. Geist font + warm palette.
```

**Pénzügyek:**
```
Add a finance page. Multi-currency support (HUF/EUR/USD chips). Donut chart by category. Transactions table. Budget progress bars. "+ Add transaction" sheet with amount, currency, category, topic link, date. Geist + warm palette.
```
