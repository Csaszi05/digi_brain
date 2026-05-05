# DigiBrain — Adatbázis Séma

## Tervezési Elvek

1. **Multi-user kompatibilis** — minden entitás `user_id`-vel rendelkezik, hogy a megosztás (sharing) könnyen hozzáadható legyen később.
2. **Soft delete** — fontos entitásoknál (Topic, Task, Note) `archived` flag-et használunk, nem fizikai törlést.
3. **Kiterjeszthetőség** — rugalmas séma, ahol lehetséges (pl. testreszabható kanban oszlopok, kategóriák).
4. **UUID kulcsok** — minden tábla UUID PK-t használ (string formában), nem auto-increment integer. Megosztás és sync szempontjából biztonságosabb.
5. **Multi-currency támogatás** — minden pénzügyi mező mellett `currency` oszlop (3-betűs ISO kód).
6. **Időbélyegek** — `created_at` (és néhol `updated_at`) minden táblán, `TIMESTAMPTZ` típussal.

---

## Táblák Áttekintése

| Tábla | Cél | Fázis |
|---|---|---|
| `users` | Felhasználói fiókok | 1 |
| `topics` | Hierarchikus témák / blokkok | 1 |
| `kanban_columns` | Testreszabható kanban oszlopok témánként | 1 |
| `tasks` | Feladatok | 1 |
| `task_dependencies` | Feladatok közötti függőségek (pipeline view) | 3 |
| `notes` | Markdown jegyzetek | 1 |
| `time_entries` | Időkövetési bejegyzések | 2 |
| `categories` | Pénzügyi kategóriák (testreszabható) | 2 |
| `transactions` | Pénzügyi tranzakciók | 2 |
| `budgets` | Büdzsék kategóriánként | 2 |
| `vault_items` | Titkosított Vault elemek | 4 |
| `topic_shares` | Megosztások (jövőbeli) | későbbi |

---

## Részletes Séma

### `users`

A rendszer felhasználóit tárolja. Egyetlen tábla az auth-hoz.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Bejelentkezés azonosító |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash |
| `master_key_salt` | VARCHAR(255) | NULLABLE | Vault titkosítási kulcshoz (Argon2 salt) |
| `default_currency` | VARCHAR(3) | DEFAULT 'HUF' | Alapértelmezett pénznem |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Megjegyzés:** A `master_key_salt` csak a Vault funkcióhoz szükséges (Fázis 4). Ha a felhasználó még nem aktiválta a Vault-ot, ez NULL.

---

### `topics`

A hierarchikus témafa. Korlátlanul mélyen egymásba ágyazható (parent_id self-referencing).

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | Tulajdonos |
| `parent_id` | UUID (string) | FK topics(id), NULLABLE | NULL = gyökér téma |
| `name` | VARCHAR(255) | NOT NULL | Pl. „Egyetem", „Mikroökonómia" |
| `icon` | VARCHAR(50) | NULLABLE | Lucide ikon név vagy emoji |
| `color` | VARCHAR(20) | NULLABLE | Hex szín (pl. #4CAF50) |
| `archived` | BOOLEAN | DEFAULT false | Soft delete |
| `position` | INTEGER | DEFAULT 0 | Testvérek sorrendezéséhez |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Lekérdezés példák:**
- Teljes fa: rekurzív CTE-vel (PostgreSQL `WITH RECURSIVE`)
- Egy téma összes utódja: rekurzív CTE
- Egy téma „útvonala" a gyökértől: rekurzív CTE (breadcrumb)

**Index:** `(user_id, parent_id)` — gyors fa lekérdezéshez.

---

### `kanban_columns`

Testreszabható kanban oszlopok **témánként**. Bármennyi oszlop hozható létre, átnevezhető, sorrendezhető.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `topic_id` | UUID (string) | FK topics(id), NOT NULL | Melyik témához tartozik |
| `name` | VARCHAR(100) | NOT NULL | Pl. „Teendő", „Folyamatban", „Kész" |
| `color` | VARCHAR(20) | NULLABLE | Oszlop háttérszín |
| `position` | INTEGER | NOT NULL | Sorrend (0, 1, 2, …) |
| `is_done_column` | BOOLEAN | DEFAULT false | Jelöli, hogy ez a „Kész" oszlop (statisztikákhoz) |

**Logika:**
- Új téma létrehozásakor automatikusan létrejön 3 alapértelmezett oszlop: „Teendő", „Folyamatban", „Kész".
- A felhasználó ezeket átnevezheti, törölheti, újakat adhat hozzá.
- `is_done_column = true` segít a „mit fejeztél be" típusú riportoknál — pl. heti teljesítmény.

**Index:** `(topic_id, position)`.

---

### `tasks`

Feladatok. Egy téma alá tartoznak, és pontosan egy kanban oszlopban vannak.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `topic_id` | UUID (string) | FK topics(id), NOT NULL | Melyik témához |
| `user_id` | UUID (string) | FK users(id), NOT NULL | Létrehozó / felelős |
| `column_id` | UUID (string) | FK kanban_columns(id), NOT NULL | Melyik oszlopban van |
| `title` | VARCHAR(500) | NOT NULL | |
| `description` | TEXT | NULLABLE | Hosszabb leírás, markdown |
| `priority` | ENUM('low','medium','high') | DEFAULT 'medium' | |
| `due_date` | TIMESTAMPTZ | NULLABLE | Határidő |
| `position` | INTEGER | DEFAULT 0 | Sorrend az oszlopon belül |
| `completed_at` | TIMESTAMPTZ | NULLABLE | Mikor került „Kész" oszlopba |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Megjegyzés a `column_id`-ról:**
- Helyettesíti a régi „status" enum-ot (todo/in_progress/done).
- Mivel az oszlopok testreszabhatók, a státusz dinamikus.

**Index:** `(topic_id, column_id, position)` — a kanban tábla rendezéséhez.

---

### `task_dependencies` *(Fázis 3)*

Feladatok közötti függőségek. A pipeline / folyamat nézet ezt használja.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `task_id` | UUID (string) | FK tasks(id), NOT NULL | A feladat |
| `depends_on_task_id` | UUID (string) | FK tasks(id), NOT NULL | Amitől függ |

**Constraint:** `UNIQUE(task_id, depends_on_task_id)` — egy függőséget nem rögzítünk kétszer.

**Index:** Mindkét FK-on.

---

### `notes`

Markdown jegyzetek. Egyelőre csak DB-ben tárolódnak, fájlrendszer szinkron későbbi.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | |
| `topic_id` | UUID (string) | FK topics(id), NULLABLE | Témához rendelhető |
| `title` | VARCHAR(500) | NOT NULL | |
| `content` | TEXT | DEFAULT '' | Markdown szöveg |
| `file_path` | VARCHAR(1024) | NULLABLE | Jövőbeli fájlrendszer szinkronhoz |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Full-text search:** PostgreSQL `tsvector` oszlop hozzáadható később a `content` mezőre keresés gyorsításához.

---

### `time_entries` *(Fázis 2)*

Időkövetési bejegyzések. Egy bejegyzés azt jelöli, hogy a felhasználó X témán/feladaton dolgozott Y időtartamig.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | |
| `topic_id` | UUID (string) | FK topics(id), NOT NULL | Kötelező — minden időt témához kapcsolunk |
| `task_id` | UUID (string) | FK tasks(id), NULLABLE | Opcionálisan konkrét feladathoz is |
| `started_at` | TIMESTAMPTZ | NOT NULL | |
| `ended_at` | TIMESTAMPTZ | NULLABLE | NULL = még fut a timer |
| `note` | TEXT | NULLABLE | Pl. „Mikroökonómia zh-ra készültem" |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Logika:**
- Egyszerre csak egy „futó" bejegyzés lehet egy felhasználónál (alkalmazás szinten kényszerített).
- A `duration` nem tárolódik — származtatott érték (`ended_at - started_at`).

**Index:** `(user_id, started_at)` — diagram lekérdezésekhez (pl. „heti összes idő").

---

### `categories` *(Fázis 2)*

Pénzügyi kategóriák. Felhasználónként testreszabható.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | |
| `name` | VARCHAR(100) | NOT NULL | Pl. „Étel", „Tandíj" |
| `color` | VARCHAR(20) | NULLABLE | Diagram színhez |
| `icon` | VARCHAR(50) | NULLABLE | |

**Constraint:** `UNIQUE(user_id, name)` — egy felhasználónál egyedi név.

---

### `transactions` *(Fázis 2)*

Pénzügyi tranzakciók (kiadások és bevételek).

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | |
| `topic_id` | UUID (string) | FK topics(id), NULLABLE | Opcionálisan témához |
| `category_id` | UUID (string) | FK categories(id), NOT NULL | |
| `amount` | NUMERIC(14, 2) | NOT NULL | Negatív = kiadás, pozitív = bevétel |
| `currency` | VARCHAR(3) | NOT NULL | Pl. „HUF", „EUR", „USD" |
| `note` | TEXT | NULLABLE | |
| `date` | DATE | NOT NULL | A tranzakció dátuma |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Megjegyzés a `currency`-ről:**
- Tranzakciónként eltárolódik, így multi-currency riportok készíthetők.
- Átváltási árfolyamot nem tárolunk — riportok készítésekor opcionálisan külső API-ból (vagy felhasználói beállításból).

**Index:** `(user_id, date)`, `(user_id, category_id, date)`.

---

### `budgets` *(Fázis 2)*

Büdzsé limitek kategóriánként.

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | |
| `category_id` | UUID (string) | FK categories(id), NOT NULL | |
| `amount` | NUMERIC(14, 2) | NOT NULL | Limit |
| `currency` | VARCHAR(3) | NOT NULL | |
| `period` | ENUM('weekly','monthly','yearly') | NOT NULL | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Constraint:** `UNIQUE(user_id, category_id, period)` — egy kategóriához egy büdzsé per időszak.

---

### `vault_items` *(Fázis 4)*

Titkosított érzékeny adatok (jelszavak, IP-k, VPN konfigok).

| Mező | Típus | Constraints | Megjegyzés |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `user_id` | UUID (string) | FK users(id), NOT NULL | |
| `topic_id` | UUID (string) | FK topics(id), NULLABLE | Projekthez rendelhető |
| `type` | ENUM('password','ip','vpn','other') | NOT NULL | |
| `label` | VARCHAR(255) | NOT NULL | Pl. „SSH dev szerver" — ez nem titkosított |
| `encrypted_value` | TEXT | NOT NULL | Base64 AES-256-GCM ciphertext |
| `iv` | VARCHAR(255) | NOT NULL | Initialization Vector (Base64) |
| `metadata` | JSONB | NULLABLE | Extra mezők (pl. VPN-nél: server, port) — szintén titkosítható |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Biztonsági megjegyzés:**
- A `encrypted_value` AES-256-GCM-mel van titkosítva.
- A titkosítási kulcs a felhasználó **master jelszavából** származtatott (Argon2id, salt = `users.master_key_salt`).
- A master jelszó **soha** nem kerül a szerverre — a kulcsderiválás kliens oldalon történik (jövőbeli megfontolás), vagy szerver oldalon, de azonnal eldobódik a memóriából a használat után.

---

## Jövőbeli Bővítések

### Megosztás (Sharing)

Amikor megvalósítjuk a téma megosztást:

```
topic_shares
  id (UUID, PK)
  topic_id (FK topics)
  shared_with_user_id (FK users)
  permission ENUM('read', 'write', 'admin')
  created_at
```

**Logika:**
- Csak `topics` osztható meg — a megosztott téma minden tartalma (tasks, notes, stb.) automatikusan elérhetővé válik a megfelelő jogosultsággal.
- `read` = csak olvasás, `write` = szerkesztés, `admin` = további megosztás.
- Az API minden lekérdezésnél figyelembe veszi: a felhasználó látja a saját topic-jait + a vele megosztottakat.

### Tags / Címkék

Egy `tags` és `task_tags` tábla hozzáadható, ha keresztreferenciára van szükség (egy feladat több témához vagy projekthez kötése).

### Audit log

Az adatváltozások naplózásához egy `audit_log` tábla hozzáadható (ki, mit, mikor változtatott).

---

## ERD (Egyszerűsített Vázlat)

```
                    ┌─────────┐
                    │  users  │
                    └────┬────┘
         ┌───────────────┼───────────────┬──────────────┐
         │               │               │              │
    ┌────▼────┐    ┌────▼─────┐   ┌─────▼─────┐  ┌─────▼──────┐
    │ topics  │◀──┐│ time_    │   │ trans-    │  │ vault_items│
    │ (tree)  │   ││ entries  │   │ actions   │  │            │
    └────┬────┘   │└──────────┘   └─────┬─────┘  └────────────┘
         │        │                     │
    ┌────▼────────▼─┐            ┌──────▼──────┐
    │ kanban_       │            │ categories  │
    │ columns       │            └──────┬──────┘
    └────┬──────────┘                   │
         │                              │
    ┌────▼────┐                    ┌────▼────┐
    │  tasks  │                    │ budgets │
    └────┬────┘                    └─────────┘
         │
    ┌────▼─────────────┐
    │ task_            │
    │ dependencies     │
    └──────────────────┘

    + notes (topic_id FK)
```

---

## Implementációs Sorrend (Alembic Migrációk)

A migrációkat fázisonként készítjük, hogy ne kelljen felesleges táblákat létrehozni:

1. **`001_initial.py`** — `users`, `topics`, `kanban_columns`, `tasks`, `notes` (Fázis 1)
2. **`002_time_and_finance.py`** — `time_entries`, `categories`, `transactions`, `budgets` (Fázis 2)
3. **`003_task_dependencies.py`** — `task_dependencies` (Fázis 3)
4. **`004_vault.py`** — `vault_items` + `users.master_key_salt` (Fázis 4)
5. **`005_sharing.py`** — `topic_shares` (későbbi)
