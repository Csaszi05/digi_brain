# Bővíthetőség Roadmap — Custom Content Types → Pluginok

A DigiBrain hosszú távú víziója: **bárki bővíthesse**, és a közösség megoszthassa az új modulokat. Tipikus példa: egy felhasználó konditermi edzéseket akar követni — definiál egy "Workout" tartalom típust mezőkkel, és más felhasználók is használhatják.

Mivel a DigiBrain **open-source és self-hosted**, a biztonsági modell egyszerűbb mint multi-tenant SaaS-okban: a felhasználó saját maga telepíti az appot és az általa kiválasztott bővítményeket — implicit bizalom.

---

## A bővíthetőség 3 szintje

| Szint | Mit ad | Mikor építjük | Munka |
|---|---|---|---|
| **1. Custom Content Types** | User saját mezőkkel definiál tartalom típust (mint Notion DB). Generikus UI. | Phase 6 (core után) | ~3-5 nap |
| **2. Plugin csomagok (deklaratív)** | Mások által írt csomagok telepíthetők. Adatséma + frontend komponens. | Phase 7+ | ~3-4 hét |
| **3. Full plugin system (kódfuttatás)** | Pluginok backend Python kódot futtatnak (custom logic, integrations). | Csak ha kommunis igény van | 2-3 hónap |

---

## Szint 1 — Custom Content Types (közeli prioritás)

### Koncepció

A felhasználó a UI-ról definiál egy új **tartalom típust** (Content Type) — nincs kódolás, csak mező lista.

**Példa: Workout type:**
```
Type: Workout
Icon: 💪
Color: #ef4444
Fields:
  - date     (date,    required)
  - exercise (select,  options: ["Squat", "Bench", "Deadlift", "Pull-up"])
  - sets     (number)
  - reps     (number)
  - weight   (number, unit: kg)
  - notes    (text,   multiline)
```

A felhasználó utána tabla-nézetben rögzít rekordokat, formon kitölti a mezőket.

### Adatbázis modell

```sql
content_types
  id            UUID PK
  user_id       UUID FK users
  name          VARCHAR(100)        -- pl. "Workout"
  icon          VARCHAR(50)         -- emoji vagy lucide ikon
  color         VARCHAR(20)
  fields        JSONB               -- mező definíció array
  archived      BOOLEAN
  created_at    TIMESTAMPTZ

content_records
  id              UUID PK
  content_type_id UUID FK content_types
  user_id         UUID FK users
  topic_id        UUID FK topics    NULLABLE  -- opcionálisan Topichoz kötött
  data            JSONB             -- { "exercise": "Squat", "weight": 80, ... }
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
```

### Mező típusok (MVP set)

| Type | Példa | UI |
|---|---|---|
| `text` | Cím, jegyzet | Egysoros input |
| `text_long` | Hosszabb leírás | Textarea |
| `number` | Súly, ár, óraszám | Numeric input + opc. unit |
| `date` | Mikor történt | Date picker |
| `datetime` | Pontos idő | Date + time picker |
| `select` | Gyakorlat típusa | Dropdown (single) |
| `multiselect` | Címkék | Dropdown (multi) |
| `boolean` | Done? | Checkbox |
| `topic_link` | Hozzákötés Topichoz | Topic picker |
| `currency` | Költés | Number + currency code |

A `fields` JSONB séma minden mezőhöz:
```json
{
  "key": "weight",
  "label": "Weight",
  "type": "number",
  "unit": "kg",
  "required": false,
  "default": null,
  "validation": { "min": 0, "max": 500 }
}
```

### UI

- **Sidebar:** "Custom" szekció, minden content type ott jelenik meg (icon + név + count)
- **Type oldal:** generikus tabla nézet (`/custom/:typeId`) — oszlopok a mezőkből, sortable, filterable, paginated
- **Record form:** auto-generált mezőkből, a típus alapján
- **Stats:** bárhol számmező van, recharts diagram automatikusan (pl. "Súly időben")
- **Topic integráció:** ha van `topic_link` mező, az adott Topic detail oldalán is megjelennek a hozzá tartozó rekordok

### API

```
GET    /api/v1/content-types
POST   /api/v1/content-types
PATCH  /api/v1/content-types/:id
DELETE /api/v1/content-types/:id

GET    /api/v1/content-types/:id/records?page=1&filter=...
POST   /api/v1/content-types/:id/records
PATCH  /api/v1/records/:id
DELETE /api/v1/records/:id
```

### Mit NEM ad meg Szint 1

- Egyedi UI komponensek (csak a generikus form/table)
- Backend logic / üzleti szabályok
- Más felhasználókkal megosztás (séma exportálása JSON-ben lehet, de nincs marketplace)
- Reaktív vagy számolt mezők (most stat csak)

---

## Szint 2 — Plugin csomagok (deklaratív)

A Szint 1-re épül: egy plugin = **packaged content type + opcionális UI override**.

### Plugin struktúra

```
plugins/
  workout-tracker/
    manifest.json          ← metaadat + content type schema
    icon.svg
    components/            ← opcionális egyedi React komponensek
      RecordForm.tsx       ← felülírja a generikus formot
      Dashboard.tsx        ← egyedi dashboard widget
      Charts.tsx           ← egyedi grafikon
    README.md
    LICENSE
```

### Manifest formátum

```json
{
  "name": "workout-tracker",
  "displayName": "Workout Tracker",
  "version": "1.0.0",
  "author": "Marcell",
  "description": "Track gym sessions, exercises, sets, reps, and progressive overload.",
  "minDigiBrainVersion": "0.5.0",

  "contentTypes": [
    {
      "name": "Workout",
      "icon": "💪",
      "color": "#ef4444",
      "fields": [
        {"key": "date", "type": "date", "required": true},
        {"key": "exercise", "type": "select", "options": [...]},
        ...
      ]
    },
    {
      "name": "Exercise Set",
      "fields": [...]
    }
  ],

  "ui": {
    "recordForm": "components/RecordForm.tsx",
    "dashboardWidget": "components/Dashboard.tsx",
    "charts": "components/Charts.tsx"
  },

  "sidebar": {
    "section": "Fitness",
    "icon": "dumbbell",
    "order": 100
  }
}
```

### Telepítés (self-hosted)

1. User letölti vagy klónozza a plugin repót → `plugins/workout-tracker/`
2. Backend újraindul, beolvassa a `manifest.json`-okat
3. A plugin által definiált content type-ok auto-létrejönnek a userhez (idempotens)
4. Frontend dynamic import-tal betölti a custom komponenseket
5. UI-ban megjelenik a plugin "Sidebar" szekciója

### Frontend dynamic loading

A Vite build NEM bundle-ölheti a plugin kódot előre (mert nem ismeri a plugin létezését). Két opció:

- **Build-time scan:** Vite plugin végigmegy a `plugins/` mappán build-időben, lazy-loaded route-okat generál
- **Runtime ESM:** plugin pre-buildelt JS-t (UMD vagy ES module) szállít, frontend `import()`-tal tölti be

Build-time-ot javaslom self-hosted use-case-re — egyszerűbb, nincs sandbox-szal probléma.

### Plugin discovery / megosztás

- Plugin = git repo (GitHub-on)
- DigiBrain UI-ban: "Browse plugins" link → curated lista (community markdown indexű repó)
- "Install": user másolja a repo URL-t, az app `git clone`-olja a `plugins/` alá

Nem kell saját marketplace infrastruktúra a kezdetekben.

### Mit NEM ad meg Szint 2

- Backend kód kiterjesztés (a plugin csak deklaratív content type-okat hoz + frontend komponenseket)
- Custom API endpoints
- Plugin-specifikus DB migrációk (csak a generikus `content_records` táblát használja)

---

## Szint 3 — Full plugin system (csak ha közösségi igény van)

WordPress-szerű, **backend kód is**:

- Plugin írhat saját Python modulokat
- Custom API endpoint-okat regisztrál (FastAPI router auto-mount)
- Saját DB táblákat hozhat létre (Alembic-style per-plugin migrációkkal)
- Hook system: core eseményekre feliratkozhat (pl. "task_created", "topic_archived")
- Permission model: user explicit jóváhagyja melyik pluginnak mihez van hozzáférése

### Biztonsági implikációk

- Self-hosted, single-user modellben: implicit bizalom — a user maga telepítette
- Multi-user esetén már sandbox kell (RestrictedPython, container per plugin, vagy WASM)
- Marketplace esetén: code review, signed packages, reputation system

### Mikor érdemes ide eljutni

Csak ha:
1. Van élő community body kétszámjegyű külső plugin szerzővel
2. A Szint 2 deklaratív modell **tényleg** korlátozónak bizonyul (nem hipotetikusan)
3. Van kapacitás a biztonsági kihívásokra (1-2 ember teljes munkaidőben hónapokig)

Az esetek 95%-ában a Szint 2 elég, és sokkal egyszerűbb karbantartani.

---

## Időzítés a roadmapben

| Phase | Feladatok |
|---|---|
| 1-5 (most) | Core funkciók: auth, topics, tasks (6 view), time, finance, vault, notes |
| **6** | **Custom Content Types (Szint 1)** |
| 7+ | Plugin packages (Szint 2), ha van rá kereslet |
| Hosszú távú | Szint 3 csak ha kommunizmus emerges |

A core előbb. Plugin-system üres core-ra értelmetlen — nincs mihez kapcsolódni.

---

## Kapcsolódó döntések

Lásd [DECISIONS.md](DECISIONS.md):
- Open-source self-hosted pozicionálás (egyszerűsíti a plugin biztonsági modellt)
- Plugin architektúra Phase 6+-ra halasztva (core előbb)
