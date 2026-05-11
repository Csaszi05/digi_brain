# Handoff: DigiBrain Inbox — Email-as-Ticket Module

## Overview

Add an **email-as-ticket inbox** to the existing `Csaszi05/digi_brain` codebase. This is an additive module — it shares the same shell (Sidebar + TopBar), tokens, and patterns from the main UI kit. Three new screens:

1. **Inbox** (`/inbox`) — 3-pane layout: folder rail → message list → ticket detail
2. **Inbox rules** (`/inbox/rules`) — rule list + inline rule builder
3. **Mobile inbox** — list view + detail view, sticky action bar

## About the Design Files

The files in `designs/` are **design references in HTML/JSX**. The task is to recreate them in the existing **React + TS + Vite + Tailwind + shadcn/ui** environment in the digi_brain repo, using the same conventions as the rest of the app. Lift the exact layout/spacing/colors — don't redesign.

## Fidelity

**High-fidelity.** Colors, spacing, type, and interaction details are final. The dummy email data is realistic placeholder content — wire to the real backend.

## Data model (suggested additions)

Add to the existing PostgreSQL schema (see `docs/DATABASE.md` in the main handoff). All tables follow the existing conventions: `user_id` FK, `created_at`, `updated_at`, soft-delete via `deleted_at`.

```sql
CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,          -- 'imap' | 'gmail' | 'outlook'
  email TEXT NOT NULL,
  display_name TEXT,
  imap_host TEXT, imap_port INT,
  oauth_token_encrypted TEXT,
  sync_state JSONB,                 -- last UID, last history ID, etc.
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  account_id UUID NOT NULL REFERENCES email_accounts(id),
  topic_id UUID REFERENCES topics(id),
  linked_task_id UUID REFERENCES tasks(id),
  thread_id TEXT NOT NULL,                  -- email Message-ID / Gmail thread ID
  subject TEXT NOT NULL,
  from_name TEXT, from_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',      -- 'open' | 'waiting' | 'done' | 'snoozed'
  priority TEXT NOT NULL DEFAULT 'med',     -- 'high' | 'med' | 'low'
  ai_summary TEXT,                          -- generated on ingest
  ai_intent TEXT,                           -- 'request' | 'fyi' | 'reply_needed' | 'invoice' | ...
  due_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  unread BOOLEAN NOT NULL DEFAULT true,
  last_message_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,                  -- 'in' | 'out'
  from_name TEXT, from_email TEXT,
  to_emails TEXT[],
  body_text TEXT, body_html TEXT,
  sent_at TIMESTAMPTZ NOT NULL,
  external_id TEXT                          -- provider message ID
);

CREATE TABLE inbox_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  conditions JSONB NOT NULL,                -- [{ field, op, value }, ...] with AND/OR
  actions JSONB NOT NULL,                   -- [{ type, value }, ...]
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  run_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ticket_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                       -- 'created' | 'status_change' | 'reply_sent' | 'rule_applied' | 'ai_summary' | 'note'
  actor TEXT,                               -- 'user' | 'rule:<id>' | 'ai'
  payload JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Rule conditions are stored as JSON like:
```json
{
  "match": "all",
  "conditions": [
    { "field": "from", "op": "contains", "value": "anna@atlas.io" },
    { "field": "subject", "op": "contains", "value": "Atlas" }
  ]
}
```

Actions:
```json
[
  { "type": "set_topic", "value": "<topic-id>" },
  { "type": "set_priority", "value": "high" },
  { "type": "ai_summary" },
  { "type": "auto_archive" }
]
```

## Screens

### 1. Inbox (`/inbox`)

**Layout:** 3 columns — `grid-cols-[240px_400px_1fr]`. The Sidebar from the main shell is already to the left of this; the 240px folder rail is the first column *inside* the page.

**Column 1 — Folder rail (240px, `bg-elev1`)**
- Sections:
  - **Mailboxes**: All inbox · Unread · Triage · Waiting · Snoozed · Archive · Sent
  - **Saved rules** (links to filtered views from `inbox_rules`)
  - **Accounts** (one row per connected `email_accounts` row, with provider icon + email + small connected dot)
- Active row: `bg zinc-800` + 2px left accent stripe. Unread counts right-aligned, `tabular-nums`.
- Footer: `+ Connect account` ghost button.

**Column 2 — Message list (400px, `bg-app`, scrollable)**
- Top bar (56px): filter chips (`All`, `Unread`, `Replied`, `AI: needs reply`) + sort dropdown (Newest / Oldest / Priority).
- **AI triage banner** (only when there are un-triaged): `bg accent-soft / border-strong / radius lg / padding 10 14`, sparkle icon + "8 emails ready to triage" + `Run AI triage` primary sm button.
- Two list density variants (Tweak control):
  - **Card list:** 14px from-name (semibold) · 12px timestamp · 13px subject · 12px fg3 snippet (2 lines, line-clamp) · footer row with priority pill + topic chip + AI intent tag
  - **Dense list:** single 32px row — priority dot · from-name (truncate) · subject (truncate) · timestamp right. No snippet.
- Selected row: `bg zinc-800` + 2px left accent stripe. Unread rows have a 6px indigo dot before the from-name.

**Column 3 — Ticket detail (flex 1, scrollable)**
- Header strip (sticky top, 56px, `bg-elev1`, `border-bottom`): back arrow (mobile) · subject (16px semibold) · status pill (Open / Waiting / Done) · priority pill · action icons (Reply, Snooze, More).
- **AI summary card** (`bg-elev1`, `border-strong`, `radius xl`, padding 16): sparkle icon + "AI summary" label + 3-bullet summary + small `Regenerate` ghost.
- Original email body (typography reset, max-width 640).
- **Composer**: Reply / Forward / AI draft tabs. Textarea with 12px padding, `bg-elev1`, `radius lg`. Footer row: attachment icon + Send primary button + small "drafts saved" hint.
- **Right-side metadata column** (collapsible, 280px): Status, Priority, Topic (links to topic tree), Due date, Linked task (with quick-create), Activity log (vertical timeline of `ticket_activity` rows).

### 2. Inbox rules (`/inbox/rules`)

**Layout:** 2 columns — `grid-cols-[1fr_480px]`.

**Left — Rule list**
- Card per rule: name (15px semibold) · `if → then` summary chips · `Runs: 124` · toggle switch · drag handle.
- Empty state: lightbulb icon + "No rules yet. Rules apply when new email arrives" + `Create rule` primary.

**Right — Rule builder (drawer-style)**
- Rule name input.
- **When** section: `match` select (All / Any) + rows of `[field] [op] [value]` selectors. Fields: From, To, Subject, Body, Has attachment, Account, Older than. Ops: contains / equals / matches regex / is.
- **Then** section: rows of action selectors. Actions: Assign topic (topic-tree picker) · Set priority · Set status · Generate AI summary · Auto-archive · Snooze for X · Notify · Apply label.
- Live preview: "Would have matched 47 emails in the last 30 days" hint with `Preview` button → opens a filtered list.
- Footer: Cancel · Save rule primary.

### 3. Mobile (iPhone, dark)

**Inbox list:**
- Top filter chips (horizontal scroll): All · Unread · Triage · Waiting · Done
- AI triage banner (full-width card with sparkle + count + arrow)
- Card list — same content as desktop card variant, sized for 390px. Tap → ticket detail.

**Ticket detail:**
- Status header strip (status pill + priority pill + topic chip)
- AI summary card
- Email body
- Due / Linked task strip
- **Sticky action bar** (above tab bar): Reply (full-width primary) · Done · Snooze icon buttons.

## Design tokens (delta from main system)

No new colors. All status pills follow the existing rule: `<color> + 12% alpha` background, `-400` foreground. New mappings:
- Status `Open` → `accent` (indigo)
- Status `Waiting` → `warn` (amber)
- Status `Done` → `success` (emerald)
- Status `Snoozed` → `fg3` (zinc, muted)
- AI intent `reply_needed` → `accent`
- AI intent `request` → `warn`
- AI intent `fyi` → `fg3`
- AI intent `invoice` → `info` (sky)

## Behavior

- **AI triage**: backend job runs on email ingest (or on demand via the banner button). Calls LLM with email body → returns `{ summary, intent, suggested_priority, suggested_topic_id? }`. Stored on the `tickets` row.
- **Rules engine**: evaluated server-side on every incoming email. Runs before AI triage. Updates `ticket_activity` with `kind='rule_applied'`.
- **Reply from app**: POST to `/tickets/:id/reply` → server sends via the connected account's SMTP / Gmail API, appends a `ticket_messages` row with `direction='out'`.
- **Snooze**: sets `status='snoozed'` + `snoozed_until`. A cron job at the snooze time flips back to `open`.
- **Link to task**: creates a `tasks` row with `tasks.source_ticket_id` (add this FK to `tasks`). The task appears in the topic's kanban.

## Integration with the existing UI

- Add two `NAV_ITEMS` to `Sidebar.jsx`:
  ```js
  { id: "inbox", label: "Inbox", icon: "inbox", badge: 8 },
  { id: "inbox-rules", label: "Inbox rules", icon: "filter" },
  ```
- Add routes in `App.tsx`:
  ```tsx
  <Route path="/inbox" element={<Inbox />} />
  <Route path="/inbox/rules" element={<InboxRules />} />
  ```
- **Per-topic inbox view**: in `TopicDetail.jsx`, add an `Inbox` tab next to Kanban / Pipeline / Tree / List. Reuses the message-list + detail layout, scoped to `tickets WHERE topic_id = :topicId`.

## API endpoints (FastAPI)

```
GET    /tickets?status=&topic_id=&q=&account_id=&limit=&cursor=
GET    /tickets/:id
POST   /tickets/:id/reply             { body, attachments? }
PATCH  /tickets/:id                   { status?, priority?, topic_id?, due_at?, snoozed_until? }
POST   /tickets/:id/link-task         { task_id? | new_task: {...} }
POST   /tickets/:id/ai/summary        (regenerate)
GET    /inbox/rules
POST   /inbox/rules                   { name, conditions, actions }
PATCH  /inbox/rules/:id
DELETE /inbox/rules/:id
POST   /inbox/rules/:id/preview       → { matched_count, sample: [...] }
GET    /email-accounts
POST   /email-accounts                { provider, email, ... }
DELETE /email-accounts/:id
```

## Files in this bundle

```
designs/
├── Inbox.jsx          desktop Inbox + Inbox rules (uses card/dense variants)
├── Inbox-mobile.jsx   mobile Inbox list + Ticket detail
├── styles-inbox.css   inbox-specific CSS additions
└── tokens.css         (copy of the main system tokens, for reference)

docs/
└── README.md          this file
```

## Recommended implementation order

1. **Backend first.** Add the 5 new tables. Wire IMAP/Gmail sync as a background job. Test ingest into `tickets` + `ticket_messages` without any frontend.
2. **Rules engine.** Server-side evaluator with the JSON schema above. Test against the `preview` endpoint.
3. **AI triage worker.** Background task that runs after ingest + rule evaluation. Single LLM call per ticket.
4. **Frontend — Inbox list + detail.** Static UI with mocked data first. Wire to TanStack Query.
5. **Composer (Reply).** Plain textarea first. Markdown / rich text later.
6. **Inbox rules screen.** Builder is the most complex form — use shadcn/ui Form + Combobox.
7. **Mobile.** Reuse list + detail components with responsive Tailwind classes.
8. **Per-topic inbox view.** Add the tab in TopicDetail, share the same components with a `topicId` prop.
