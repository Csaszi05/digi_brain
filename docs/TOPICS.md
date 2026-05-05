# Témák (Topics) — Koncepció és Viselkedés

A Topic a DigiBrain központi szervezőelve. Minden más tartalom (feladat, jegyzet, idő, költség, jelszó) közvetlenül vagy közvetve egy Topichoz tartozik.

---

## Két szerep egyszerre: mappa ÉS konténer

Egy Topic egyszerre lehet:

- **Mappa** — gyermek Topicokat tartalmaz (almappák, korlátlan mélységig)
- **Konténer** — saját közvetlen tartalma van (feladatok, jegyzetek, idő, stb.)

A kettő nem zárja ki egymást. Egy Topicnak lehetnek almappái **és** közvetlen feladatai is.

**Példa:**
```
📚 University — Business Informatics      ← mappa + lehet saját task is
  └─ 📁 Semester 1                        ← mappa
      ├─ 📄 Microeconomics                ← konténer (8 task, 12 jegyzet)
      ├─ 📄 Mathematics                   ← konténer
      └─ 📁 Exam prep                     ← mappa + konténer egyszerre
          ├─ 📄 Practice exams            ← konténer
          └─ Tasks: "Review chapter 3"…   ← saját task is
```

---

## Mit tartalmazhat egy Topic?

| Típus | Cél | Adatbázis tábla | FK |
|---|---|---|---|
| **Sub-topics** | Hierarchikus alstruktúra | `topics` | `parent_id → topics.id` |
| **Tasks** | Feladatok (kanban kártyák) | `tasks` | `topic_id` (kötelező) |
| **Kanban columns** | Egyedi workflow oszlopok | `kanban_columns` | `topic_id` (kötelező) |
| **Notes** | Markdown jegyzetek | `notes` | `topic_id` (opcionális) |
| **Time entries** | Idősávok rögzítve | `time_entries` | `topic_id` (kötelező) |
| **Transactions** | Költések / bevételek | `transactions` | `topic_id` (opcionális) |
| **Vault items** | Titkosított adatok | `vault_items` | `topic_id` (opcionális) |

**Kötelező vs opcionális:**
- `tasks`, `kanban_columns`, `time_entries` mindig egy Topichoz kötöttek (kötelező FK).
- `notes`, `transactions`, `vault_items` lehetnek függetlenek is (NULL FK megengedett).

---

## UI megjelenés

### 1. Sidebar fa nézet

```
TOPICS                                  [+]
  ▶ 📚 University                       47
  ▼ 📁 Work                             23
      ▶ 📁 Project Atlas                14
      ▶ 📁 Client onboarding             9
  ▼ 🏠 Personal                         15
      📁 Health                          4
      📁 Finance                         6
      📁 Travel                          5
```

**Sor felépítés:** caret (▶/▼ csak ha van gyermek) · 16px emoji · név · count badge.

**Aktív állapot:** `bg-active` + 2px bal accent stripe.

**Kinyitott állapot perzisztens** (`localStorage`-ban a `expandedTopicIds` Set).

### 2. Topic Detail oldal (`/topics/:id`)

Header:
```
📄 Microeconomics                                      [Kanban|Pipeline|Tree|List]
   8 tasks · 12.5h tracked · midterm in 9 days         [+ Add task] [⋯]
```

Tartalom (4 nézet, ugyanazokon az adatokon):
- **Kanban** (alapértelmezett) — testre szabható oszlopok, drag & drop kártyák
- **Pipeline** — lineáris folyamat, függőségekkel (`task_dependencies` tábla)
- **Tree / Mind-map** — hierarchikus task struktúra, react-flow-val
- **List** — egyszerű flat lista szűrőkkel

Alatta: `Notes for this topic` szekció — 3 oszlopos kártya grid a topichoz tartozó jegyzetekből.

---

## Adatbázis modell

### `topics` tábla

```sql
topics
  id            UUID PK
  user_id       UUID FK → users(id)        NOT NULL
  parent_id     UUID FK → topics(id)       NULL = gyökér
  name          VARCHAR(255)               NOT NULL
  icon          VARCHAR(50)                emoji vagy lucide ikon név
  color         VARCHAR(20)                hex (pl. #a78bfa)
  archived      BOOLEAN DEFAULT false      soft delete flag
  position      INTEGER DEFAULT 0          testvérek között sorrend
  created_at    TIMESTAMPTZ
```

### Indexek

```sql
CREATE INDEX ix_topics_user_parent ON topics(user_id, parent_id);
```

Ezzel gyors a "gyökér topicok egy felhasználónak" és a "közvetlen gyermekek egy parent alatt" lekérdezés.

---

## Lekérdezések

### Teljes fa egy felhasználónak (rekurzív CTE)

```sql
WITH RECURSIVE tree AS (
  SELECT id, parent_id, name, icon, color, position, 0 AS depth
  FROM topics
  WHERE user_id = :user_id AND parent_id IS NULL AND NOT archived

  UNION ALL

  SELECT t.id, t.parent_id, t.name, t.icon, t.color, t.position, tree.depth + 1
  FROM topics t
  JOIN tree ON t.parent_id = tree.id
  WHERE NOT t.archived
)
SELECT * FROM tree ORDER BY depth, position;
```

A backend visszaadja flat listaként; a kliens fát épít belőle (a `parent_id` alapján).

### Egy Topic + összes utódjának ID-i (subtree)

```sql
WITH RECURSIVE subtree AS (
  SELECT id FROM topics WHERE id = :topic_id
  UNION ALL
  SELECT t.id FROM topics t JOIN subtree ON t.parent_id = subtree.id
)
SELECT id FROM subtree;
```

Hasznos pl. "minden task ami az 'Egyetem' Topic-on belül van bárhol" típusú összesítésekhez.

### Útvonal (breadcrumb) egy Topictól a gyökérig

```sql
WITH RECURSIVE path AS (
  SELECT id, parent_id, name FROM topics WHERE id = :topic_id
  UNION ALL
  SELECT t.id, t.parent_id, t.name FROM topics t JOIN path ON path.parent_id = t.id
)
SELECT name FROM path;  -- fordítva, gyermektől gyökérig
```

---

## Műveletek

### Új Topic létrehozása

`POST /topics` — `{ name, parent_id?, icon?, color? }`

A backend automatikusan:
1. Beszúrja a `topics` rekordot (UUID generálva, `position` = max sibling position + 1)
2. Létrehozza a 3 alapértelmezett kanban oszlopot:
   - `name="To Do", position=0, is_done_column=false`
   - `name="In Progress", position=1, is_done_column=false`
   - `name="Done", position=2, is_done_column=true`
3. Visszaadja a Topicot a kanban oszlopokkal együtt

### Átnevezés / ikon csere

`PATCH /topics/:id` — bármelyik mező frissíthető. A `name`, `icon`, `color`, `archived` változtatható. A `parent_id` is — ezzel **áthelyezhető** a Topic egy másik szülő alá.

### Törlés (két lépcsős)

1. **Soft delete** (alapértelmezett): `PATCH /topics/:id { archived: true }`
   - A Topic és minden utódja eltűnik a fa nézetből
   - Az adat megmarad, később visszaállítható

2. **Hard delete**: `DELETE /topics/:id`
   - Cascade törli: gyermek topicok, kanban oszlopok, tasks, notes, time entries
   - **Nem érinti** a `transactions` és `vault_items` táblát — azok `topic_id`-je `NULL`-ra állítódik (megőrződik az adat, csak elszakad a Topictól)

### Sorrendezés (drag & drop a sidebarban)

`PATCH /topics/reorder` — `[{ id, parent_id, position }, ...]`

A teljes új sorrendet egyszerre küldjük, hogy testvér-pozíciók atomicusan frissüljenek.

---

## Megosztás (jövő — Phase 5+)

Amikor implementáljuk a sharing-et (lásd [DECISIONS.md](DECISIONS.md)):

- `topic_shares` tábla: `topic_id`, `shared_with_user_id`, `permission` (read/write/admin)
- **Csak Topic szintjén osztható meg** — a megosztott Topic minden tartalma (tasks, notes, stb.) automatikusan elérhetővé válik
- Minden API lekérdezés figyeli: a felhasználó látja a saját Topic-jait + a vele megosztottakat

---

## Példa: konkrét adat egy felhasználónál

**Marcell Topic struktúrája:**

```
📚 University - Business Informatics    user_id=marcell, parent_id=NULL
  ├─ 📁 Semester 1                      parent_id=univ
  │   ├─ 📄 Microeconomics              parent_id=sem1
  │   │     Tasks (8): "Problem set 4", "ZH felkészülés"…
  │   │     Notes (12): "Marshall vs Hicks demand"…
  │   │     TimeEntries: 12.5h összesen
  │   ├─ 📄 Mathematics                 parent_id=sem1
  │   └─ 📄 Programming I               parent_id=sem1
  │
  └─ 📁 Semester 2                      parent_id=univ
      ├─ 📄 Macroeconomics
      └─ 📄 Statistics

💼 Work                                  parent_id=NULL
  └─ 📁 Project Atlas                   parent_id=work
        Tasks: "Q2 roadmap draft"…
        Vault: SSH credentials, server IPs

🏠 Personal                              parent_id=NULL
  ├─ 📁 Health
  └─ 📁 Finance
        Transactions szűrhetők ide tagged-ként
```

Az "Egyetem" mint top-level Topic mappa szerepben van; a "Mikroökonómia" mint leaf Topic konténer szerepben (saját feladatokkal és jegyzetekkel). A "Project Atlas" mindkettő — almappa lehetne, de itt konténerként funkcionál Vault elemekkel.
