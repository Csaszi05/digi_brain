# Calendar Integration — CalDAV Sync

## Áttekintés

A DigiBrain naptár integrációja CalDAV protokollon keresztül szinkronizál bármilyen
naptár szolgáltatóval (Google Calendar, Apple Calendar, Outlook). Az eseményeket
topic-okhoz és time tracking bejegyzésekhez lehet kötni.

---

## Architektúra

```
CalDAV szerver (Google / Apple / Outlook)
         │
         │  HTTPS / CalDAV protokoll
         ▼
  [DigiBrain poller]          ← 5 percenként fut
  - bejelentkezik CalDAV-val
  - leszedi az új/módosult eseményeket
  - naptáranként csoportosítja
  - topic hozzárendelés alapján kategorizál
         │
         ▼
   PostgreSQL DB
   ├── calendar_accounts   (pl. Google fiók)
   ├── calendars           (pl. "Tanulás", "Munka")
   └── calendar_events     (egyedi esemény, topic_id FK-val)
         │
         ▼
   Frontend
   ├── Dashboard widget    (mai napirend)
   ├── Topic detail tab    (adott topichoz rendelt események)
   └── Time tracking       ("Log as time entry" gomb)
```

---

## Adatbázis struktúra

### `calendar_accounts`
| Mező | Típus | Leírás |
|---|---|---|
| id | UUID | PK |
| user_id | FK → users | tulajdonos |
| provider | string | `google`, `apple`, `outlook`, `caldav` |
| display_name | string | pl. "Marcell Google" |
| caldav_url | string | CalDAV szerver URL |
| username | string | bejelentkezési email |
| password_encrypted | text | Fernet titkosított app jelszó |
| sync_state | JSONB | utolsó szinkron állapota |
| active | bool | polling aktív-e |

### `calendars`
| Mező | Típus | Leírás |
|---|---|---|
| id | UUID | PK |
| account_id | FK → calendar_accounts | melyik fiókból |
| external_id | string | CalDAV calendar URL |
| name | string | pl. "Tanulás" |
| color | string | hex szín (pl. `#a78bfa`) |
| topic_id | FK → topics, nullable | melyik topichoz tartozik |
| active | bool | szinkronizálódik-e |

### `calendar_events`
| Mező | Típus | Leírás |
|---|---|---|
| id | UUID | PK |
| calendar_id | FK → calendars | melyik naptárból |
| user_id | FK → users | tulajdonos |
| external_uid | string | iCal UID (dedup) |
| title | string | esemény neve |
| description | text, nullable | leírás |
| location | string, nullable | helyszín |
| starts_at | timestamptz | kezdés |
| ends_at | timestamptz | befejezés |
| all_day | bool | egésznapos-e |
| topic_id | FK → topics, nullable | felülírható a calendar szintű topic_id-t |
| time_entry_id | FK → time_entries, nullable | ha már naplózva van |
| recurrence | JSONB, nullable | ismétlési szabály |
| status | string | `confirmed`, `tentative`, `cancelled` |
| updated_at | timestamptz | utolsó módosítás |

---

## Hogyan kapcsolódik a naptár szolgáltatókhoz?

### Google Calendar — CalDAV URL

Google Calendar CalDAV-on keresztül is elérhető, OAuth nélkül, app jelszóval:

```
CalDAV URL:  https://calendar.google.com/calendar/dav/{email}/events
Username:    Google email cím
Password:    App jelszó (myaccount.google.com → Biztonság → App passwords)
```

**Lépések:**
1. Google fiók → Biztonság → 2-lépéses hitelesítés (ha nincs bekapcsolva)
2. App passwords → Alkalmazás: Mail, Eszköz: Other → DigiBrain
3. A 16 karakteres jelszót add meg a DigiBrainben

### Apple Calendar (iCloud)

```
CalDAV URL:  https://caldav.icloud.com
Username:    Apple ID email
Password:    App jelszó (appleid.apple.com → Biztonság → App-specifikus jelszavak)
```

### Outlook / Microsoft 365

```
CalDAV URL:  https://outlook.office365.com/owa/{email}/calendar
Username:    Microsoft fiók email
Password:    App jelszó (account.microsoft.com → Biztonság)
```

### Egyedi CalDAV (Nextcloud, Fastmail stb.)

A CalDAV URL-t a szolgáltató adja meg. Általában:
```
https://{server}/remote.php/dav/calendars/{username}/
```

---

## Szinkronizáció működése

### 1. Naptárak lekérése (PROPFIND)

Az első szinkronizáláskor a poller lekéri a fiókban lévő összes naptárat:
- Naptár neve, színe, leírása
- Ezeket menti a `calendars` táblába

### 2. Események lekérése (REPORT)

Minden aktív naptárból lekéri az eseményeket egy időablakban
(alapértelmezett: -30 nap ... +365 nap):

```python
client.date_search(
    calendar,
    start=today - timedelta(days=30),
    end=today + timedelta(days=365),
    expand=True  # ismétlődő eseményeket is kibontja
)
```

### 3. Deduplication

Az `external_uid` mező (iCal UID) alapján azonosítja az eseményeket.
Ha módosult egy esemény (`LAST-MODIFIED` timestamp alapján), frissíti.

### 4. Topic hozzárendelés

Prioritási sorrend:
1. Az eseménynek van explicit `topic_id`-je → azt használja
2. A naptárnak van `topic_id`-je → azt örökli
3. Nincs topic → topic nélkül tárolódik

---

## Topic ↔ Naptár összekötés

A `/calendar/settings` oldalon minden naptárhoz hozzárendelhető egy topic:

```
📅 Naptárak                          Topic
─────────────────────────────────────────────────────
🔵 Tanulás          ──────────────→  Microeconomics
🟣 Projekt Atlas    ──────────────→  Project Atlas
🟡 Személyes        ──────────────→  Personal
🔴 Határidők        ──────────────→  (nincs)
⚪ Születésnapok    ──────────────→  (nincs)
```

Az összerendelés után:
- A **Topic detail** oldalon megjelenik az "Upcoming events" fül
- Az esemény badge-ként látható a naptár színével

---

## Time Tracking integráció

### Eseményből time entry

Minden befejezett eseményen megjelenik egy **"Log as time"** gomb:

```
Projekt Atlas standup · 9:00–9:30
[✓ Befejezett]  [⏱ Log as time]
```

Kattintás után automatikusan létrejön egy `time_entries` bejegyzés:
- `topic_id` = esemény topic_id-je
- `started_at` = esemény kezdete
- `ended_at` = esemény vége
- `note` = esemény neve

Az eseményen a `time_entry_id` FK-val jelölve lesz, hogy már naplózva van.

### Time entry → Naptár (jövőbeli)

Fordítva is működhet: manuálisan rögzített time entry megjelenhet a naptárban
mint egy blokk. Ez egy későbbi fázisban kerül implementálásra.

---

## Frontend — Képernyők

### Dashboard widget
```
┌─────────────────────────────────┐
│  📅  Ma — máj. 12.              │
│                                 │
│  09:00  Atlas standup      30m  │
│  11:00  Mikroökonómia ea.  90m  │
│  14:00  Design review      60m  │
│                                 │
│  3 esemény · 4h összesen        │
└─────────────────────────────────┘
```

### Topic detail — Upcoming events fül
```
Projekt Atlas
[Kanban] [Lista] [Roadmap] [Naptár] [...]

Közelgő események
─────────────────────────────────────
🟣  Máj. 13 (holnap)   Atlas standup · 9:00
🟣  Máj. 15            Design review · 14:00
🟣  Máj. 20            Sprint planning · 10:00
```

### `/calendar/settings` — Fiók és naptár kezelés
```
Naptár fiókok                           [+ Fiók hozzáadása]
─────────────────────────────────────────────────────────────
● Google (marcell@gmail.com)     [Sync] [Törlés]
  ├── 🔵 Tanulás           → Microeconomics    [✎]
  ├── 🟣 Atlas             → Project Atlas     [✎]
  ├── 🟡 Személyes         → Personal          [✎]
  └── 🔴 Határidők         → (nincs)           [✎]
```

---

## Megvalósítás fázisai

### 1. fázis — Alapszinkron (most)
- [ ] Migration: `calendar_accounts`, `calendars`, `calendar_events` táblák
- [ ] Python `caldav` csomag integrálása
- [ ] CalDAV sync service (`app/services/caldav_sync.py`)
- [ ] APScheduler poller (5 perces intervallum)
- [ ] API: `/calendar-accounts`, `/calendars`, `/calendar-events`
- [ ] Frontend: `/calendar/settings` (fiók + naptár kezelés, topic hozzárendelés)

### 2. fázis — Topic integráció
- [ ] Topic detail oldalon "Upcoming events" fül
- [ ] Dashboard calendar widget
- [ ] Esemény → topic automatikus hozzárendelés

### 3. fázis — Time tracking integráció
- [ ] "Log as time entry" gomb eseményeken
- [ ] Time page-en naptár esemény javaslatok
- [ ] Naplózott vs. nem naplózott szűrő

### 4. fázis — Naptár nézet (opcionális)
- [ ] Heti/havi naptár nézet a `/calendar` oldalon
- [ ] Drag-and-drop időpontok
- [ ] Esemény létrehozás DigiBrainből

---

## Biztonság

| Szempont | Megoldás |
|---|---|
| Jelszó tárolás | Fernet titkosítás (azonos az email sync-kel) |
| Kapcsolat | HTTPS + CalDAV (mindig titkosított) |
| Adatminimalizálás | Csak a szinkron ablakban lévő eseményeket tárolja |
| Törlés | Fiók törlésekor az összes naptár és esemény törlődik (CASCADE) |

---

## Összefoglalás

| Kérdés | Válasz |
|---|---|
| Melyik szolgáltatókkal működik? | Google, Apple, Outlook, Nextcloud, Fastmail, bármilyen CalDAV |
| Kell OAuth? | Nem — app jelszó elegendő |
| Valós idejű? | 5 perces késéssel |
| Módosíthat eseményt? | 1. fázisban nem (csak olvasás) |
| Ismétlődő események? | Igen, kibontva tárolja |
| Offline működik? | Igen — az adatok a local DB-ben vannak |
