# DigiBrain — Személyes Tudásbázis és Életmenedzsment Platform

## Projekt Összefoglaló

A DigiBrain egy **open-source, self-hosted** webalkalmazás, amely egyetlen helyen egyesíti a feladatkezelést, időkövetést, projektmenedzsmentet, pénzügyi nyilvántartást és a személyes tudásbázist. Docker konténerben futtatható, így bármely gépen vagy szerveren telepíthető — a felhasználó saját maga üzemelteti, az adatai nálla maradnak.

**Hosszú távú vízió:** plugin-alapú bővíthetőség — bárki írhat egy modult (pl. konditermi edzés tracker), megoszthatja, mások telepíthetik. A részleteket lásd a [docs/EXTENSIBILITY.md](docs/EXTENSIBILITY.md)-ben.

## További Dokumentumok

- **[docs/DATABASE.md](docs/DATABASE.md)** — Részletes adatbázis séma, táblák, kapcsolatok
- **[docs/TOPICS.md](docs/TOPICS.md)** — Topicok koncepciója: mappa + konténer szerep, mit tartalmazhatnak, hogyan néznek ki, lekérdezések
- **[docs/EXTENSIBILITY.md](docs/EXTENSIBILITY.md)** — Bővíthetőség roadmap: Custom Content Types → Plugin csomagok → Full plugin system
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — Tervezési döntések naplója (mit, miért választottunk)

---

## Főbb Modulok

### 1. Téma / Blokk Rendszer (Topic & Block Hierarchy)

A rendszer alapegysége a **Téma** (Topic), amely rekurzívan egymásba ágyazható — mint egy fájlrendszer mappái.

**Struktúra példa:**
```
📁 Egyetem – Gazdinfó
  📁 1. félév
    📄 Mikroökonómia
    📄 Matematika
  📁 2. félév
    📄 Makroökonómia
📁 Munka
  📁 Projekt A
    📄 Tervezés
    📄 Fejlesztés
📁 Személyes
  📁 Egészség
  📁 Pénzügyek
```

**Tulajdonságok:**
- Korlátlan mélységű fa struktúra
- Minden Téma lehet konténer (almappák) vagy tartalom (jegyzetek, feladatok, fájlok)
- Ikon és szín rendelhetők hozzá
- Archiválható, de nem törlődik az adatból (soft delete)
- Kereshető globálisan

---

### 2. Feladatkezelés — Háromféle Nézetben

Minden témán belül a feladatok háromféleképpen jeleníthetők meg:

#### 2a. Kanban Tábla
- **Teljesen testreszabható oszlopok** — bármennyi oszlop hozható létre, átnevezhető, sorrendezhető
- Új téma létrehozásakor 3 alapértelmezett oszlop: `Teendő → Folyamatban → Kész`
- Drag & drop kártyák oszlopok között és oszlopon belül
- Határidő, prioritás, leírás (markdown)

#### 2b. Folyamat / Pipeline Nézet
- Lineáris lépések: `A lépés → B lépés → C lépés`
- Minden lépéshez feltételek adhatók (pl. csak akkor nyílik meg B, ha A kész)
- Használat: vizsgák ütemezése, tanulási útvonalak, projekt fázisok

#### 2c. Fa / Mind-map Nézet
- Szabad ágazódás: egy feladatból több alfeladat nőhet ki
- Vizuálisan szétágazó struktúra
- Jó tervezéshez, ötleteléshez, architekturális vázlatokhoz

Mindhárom nézet **ugyanazokat az adatokat** mutatja, csak más vizualizációban — bármikor átváltható.

---

### 3. Időkövetés (Activity Tracker)

**Hogyan működik:**
1. A felhasználó kiválaszt egy már meglévő Témát vagy feladatot
2. Megnyomja a „Start" gombot → elindul az időmérő
3. „Stop"-ra rögzítődik az eltelt idő és a dátum/idő

**Adatok:**
- Melyik Témához tartozik
- Mikor kezdődött, mikor ért véget, mennyi ideig tartott
- Opcionális megjegyzés (pl. „Mikroökonómia zh-ra készültem")

**Visszanézés — Diagram nézetek:**
- **Napi nézet:** Gantt-szerű sáv, mikor mivel foglalkoztál
- **Heti nézet:** Oszlopdiagram témánként, összes óra
- **Havi nézet:** Hőtérkép (heatmap) + kördiagram arányok
- **Szűrők:** Téma szerint, időszak szerint, minimális időtartam szerint

---

### 4. Pénzügyi Modul (Finance Tracker)

**Bevitel:**
- Tranzakció rögzítése: összeg, **pénznem (multi-currency)**, kategória, megjegyzés, dátum
- Kategóriák testre szabhatók (pl. Étel, Közlekedés, Tandíj, Szoftverek)
- Témához rendelhető (pl. egy kiadás az Egyetem téma alá kerül)
- A felhasználónak van alapértelmezett pénzneme, de tranzakciónként eltérhet

**Nézetek és riportok:**
- Heti összesítő: mit költöttél és mikor
- Havi összesítő: kategóriánkénti bontás, kördiagram
- Éves nézet: havi összehasonlítás, trend
- Büdzsé beállítás kategóriánként → túllépési értesítés

**Import/Export:**
- CSV import (bankszámlakivonatok)
- CSV / PDF export

---

### 5. Markdown Integráció

**Kapcsolat a helyi `.md` fájlokkal:**
- A DigiBrain képes egy megadott mappát (pl. `~/Notes/`) szinkronizálni
- A fájlok Témákhoz rendelhetők
- Módosítás esetén kétirányú szinkron: ha szerkeszted a fájlt kívülről, a DigiBrain látja; ha bent szerkeszted, visszaírja

**Szerkesztő:**
- Beépített Markdown szerkesztő (live preview)
- Codeblock highlight
- Backlink rendszer: ha egy `.md` fájlban megemlítesz egy másik Témát `[[NévSzerinti]]` szintaxissal, a rendszer linkeli őket

**Keresés:**
- Teljes szöveges keresés az összes Markdown fájl tartalmában

---

### 6. Projekt Vault (Biztonságos Adattároló)

Projekteken belül elmenthetők érzékeny adatok, **titkosítva**:

| Típus | Példa |
|---|---|
| Jelszavak | Szerver SSH jelszó, API kulcs |
| IP Címek | Fejlesztői szerver, VPN gateway |
| VPN Konfigurációk | `.ovpn` fájlok, WireGuard konfigok |
| Architektúra leírás | Szabad szöveges vagy diagram |
| Egyéb titkok | Szezonális tokenek, license key-ek |

**Biztonság:**
- A Vault tartalma **AES-256-GCM** titkosítással tárolódik az adatbázisban
- Megnyitáshoz külön **Master jelszó** szükséges
- A master jelszó soha nem kerül tárolásra — csak a titkosítási kulcs deriválásához használják (Argon2)
- Timeout: X perc inaktivitás után a Vault automatikusan zárul

---

## Technikai Architektúra

### Tech Stack

| Réteg | Technológia | Indok |
|---|---|---|
| **Backend** | FastAPI + Python | Gyors fejlesztés, automatikus docs, AI-ready |
| **ORM** | SQLAlchemy 2.0 (async) | Type-safe, async support |
| **Migráció** | Alembic | Standard FastAPI stack |
| **Validáció** | Pydantic v2 | FastAPI natív integráció |
| **Adatbázis** | PostgreSQL 16 | Rekurzív CTE, full-text search, JSONB |
| **Frontend** | React + TypeScript + Vite | Modern, gyors HMR |
| **UI komponensek** | shadcn/ui + Tailwind CSS | Testre szabható, tiszta design |
| **State management** | Zustand | Egyszerű, lightweight |
| **Diagramok** | Recharts | React-native, testreszabható |
| **Gráf / Fa nézet** | React Flow | Interaktív node-alapú diagramok |
| **Auth** | JWT (python-jose) + bcrypt | Stateless, self-hosted kompatibilis |
| **Titkosítás** | `cryptography` lib (AES-256-GCM) + Argon2 | Iparági standard |
| **Containerizálás** | Docker + Docker Compose | Portábilis deployment |

---

### Adatbázis Séma (Logikai Vázlat)

```
users
  id, email, password_hash, master_key_salt, created_at

topics
  id, user_id, parent_id (nullable), name, icon, color, archived, created_at

tasks
  id, topic_id, user_id, title, description, status, priority, due_date, created_at

task_dependencies
  id, task_id, depends_on_task_id

time_entries
  id, user_id, topic_id, task_id (nullable), started_at, ended_at, note

transactions
  id, user_id, topic_id (nullable), amount, currency, category, note, date

budgets
  id, user_id, category, amount, period (weekly/monthly/yearly)

notes
  id, user_id, topic_id, file_path (nullable), title, content, updated_at

vault_items
  id, user_id, topic_id, type (password/ip/vpn/other), label, encrypted_value, iv, created_at
```

---

### Mappa Struktúra

```
digi-brain/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── topics.py
│   │   │       ├── tasks.py
│   │   │       ├── time_entries.py
│   │   │       ├── finance.py
│   │   │       ├── notes.py
│   │   │       └── vault.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/          ← SQLAlchemy modellek
│   │   ├── schemas/         ← Pydantic sémák
│   │   ├── services/        ← Üzleti logika
│   │   └── main.py
│   ├── alembic/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          ← shadcn komponensek
│   │   │   ├── kanban/
│   │   │   ├── flow/
│   │   │   ├── mindmap/
│   │   │   ├── finance/
│   │   │   ├── vault/
│   │   │   └── editor/
│   │   ├── pages/
│   │   ├── stores/          ← Zustand
│   │   ├── api/             ← API hívások
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

---

## Docker Telepítés

```bash
cp .env.example .env
# .env kitöltése (DB jelszó, JWT secret)
docker compose up -d
# Megnyitás: http://localhost:3000
# API docs: http://localhost:8000/docs
```

---

## Fejlesztési Fázisok

### Fázis 1 — Alap (MVP)
- [ ] Auth (regisztráció, bejelentkezés, JWT)
- [ ] Téma fa struktúra (CRUD + rekurzív lekérdezés)
- [ ] Testreszabható Kanban (oszlopok átnevezhetők, hozzáadhatók)
- [ ] Markdown szerkesztő és megjelenítő (csak DB-ben tárolva)
- [ ] Docker Compose setup

### Fázis 2 — Időkövetés és Pénzügyek
- [ ] Időmérő widget
- [ ] Diagram nézetek (napi, heti, havi)
- [ ] Tranzakció rögzítés
- [ ] Pénzügyi riportok, büdzsék

### Fázis 3 — Haladó Nézetek
- [ ] Pipeline / Folyamat nézet (React Flow)
- [ ] Fa / Mind-map nézet (React Flow)
- [ ] Backlink rendszer Markdown fájlokban
- [ ] Fájlrendszer szinkronizálás

### Fázis 4 — Vault és Biztonság
- [ ] Titkosított Vault modul (AES-256-GCM)
- [ ] Master jelszó + Argon2 kulcsderivál
- [ ] VPN / IP / jelszó kezelő

### Fázis 5 — Polírozás
- [ ] CSV import/export (pénzügyek)
- [ ] Értesítések (büdzsé túllépés, határidők)
- [ ] Mobil-barát reszponzív design
- [ ] Teljesítmény optimalizálás

### Fázis 6 — Custom Content Types (bővíthetőség alapja)
- [ ] User-definiált tartalom típusok (mező lista, generikus CRUD)
- [ ] Generikus form + tabla nézet a custom types-hoz
- [ ] Topic integráció (`topic_link` mező)
- [ ] Auto-generált stat-ok számmezőkre
- [ ] Lásd: [docs/EXTENSIBILITY.md](docs/EXTENSIBILITY.md) — Szint 1

### Jövőbeli — Plugin csomagok és Megosztás
- [ ] Plugin csomagok deklaratív manifest-tel (lásd: [docs/EXTENSIBILITY.md](docs/EXTENSIBILITY.md) — Szint 2)
- [ ] Téma megosztása más felhasználóval (`topic_shares` tábla)
- [ ] Jogosultsági szintek: olvasás, szerkesztés, admin
- [ ] Full plugin system kódfuttatással (Szint 3) — csak ha közösségi igény van

---

## Biztonsági Megfontolások

- Minden API végpont JWT-vel védett
- A Vault soha nem küldi vissza a nyers titkosítási kulcsot a kliensnek
- HTTPS kötelező éles környezetben (pl. Traefik + Let's Encrypt Docker-ben)
- Rate limiting a login végponton brute-force ellen
- Input sanitizálás XSS és SQL injection ellen
- A `.env` fájl soha nem kerül verziókövetésbe
