# Tervezési Döntések — Decision Log

Ez a fájl azokat a fontos tervezési döntéseket gyűjti össze, amiket menet közben hoztunk. Minden bejegyzés tartalmazza: a döntést, az indoklást, és az alternatívákat amiket elvetettünk.

---

## 2026-05-04 — Stack választás: FastAPI + React + PostgreSQL

**Döntés:** Backend FastAPI (Python), frontend React + TypeScript + Vite, adatbázis PostgreSQL 16.

**Indoklás:**
- A felhasználó már jártas Pythonban → gyorsabb fejlesztés.
- FastAPI automatikus OpenAPI docs-ot generál (`/docs`) — fejlesztés közben hasznos.
- Python ökoszisztéma jó AI/ML integrációhoz (jövőbeli Claude API funkciók).
- PostgreSQL: rekurzív CTE (téma fa), full-text search (markdown keresés), JSONB (rugalmas metaadatok).

**Alternatívák elvetve:**
- Node.js + Fastify: full-stack TS előny, de a Python ismeret nagyobb súllyal esett a latba.
- SQLite: egyszerűbb lenne, de a téma fa rekurzív lekérdezéseit és full-text search-öt nehezebb megvalósítani.

---

## 2026-05-05 — Multi-user, sharing későbbre halasztva

**Döntés:** A séma multi-user kompatibilis (`user_id` minden entitáson), de a megosztás (sharing) funkciót egyelőre nem implementáljuk. Ehhez egy külön `topic_shares` tábla kerül majd be, amikor szükséges.

**Indoklás:**
- MVP-hez nem szükséges, csak bonyolítaná az API-t és UI-t.
- A séma így már fel van készítve a bővítésre — nem lesz breaking change.

**Hatás:** Minden táblán `user_id` mező, minden API végpont szűr a bejelentkezett felhasználóra.

---

## 2026-05-05 — Multi-currency támogatás

**Döntés:** Tranzakciónként eltároljuk a pénznemet (`currency` mező, 3-betűs ISO kód). A felhasználónak van alapértelmezett pénzneme (`users.default_currency`).

**Indoklás:**
- A felhasználó valószínűleg több pénznemmel találkozik (pl. utazás, online vásárlások).
- Az árfolyam-átváltást **nem tároljuk** — riportok készítésénél lekérhetjük külső API-ból, vagy a felhasználó manuálisan beállíthatja.

**Alternatívák elvetve:**
- Csak HUF: korlátozó.
- Tárolt árfolyamtörténelem: jelenleg overkill, későbbi bővítés.

---

## 2026-05-05 — Testreszabható Kanban oszlopok

**Döntés:** A kanban oszlopok nem hardcoded enum-ként (`todo/in_progress/done`) tárolódnak, hanem külön `kanban_columns` táblában. Témánként (vagy globálisan) tetszőleges számú oszlop hozható létre, átnevezhető, sorrendezhető.

**Indoklás:**
- A felhasználó kifejezetten kérte: „bármennyi módot tehetünk be és nevezhetjük át".
- Rugalmasabb rendszer — különböző projektek különböző workflow-kat igényelhetnek (pl. „Tervezés → Kódolás → Code review → Deploy").
- A `tasks` tábla `column_id`-vel hivatkozik az oszlopra.

**Implementációs részlet:**
- Új téma létrehozásakor automatikusan jön létre 3 alapértelmezett oszlop (Teendő, Folyamatban, Kész).
- Az „is_done_column" flag jelöli, melyik a „kész" típusú — statisztikákhoz (mennyi feladatot fejezett be a héten).

**Alternatívák elvetve:**
- Hardcoded enum: egyszerűbb lenne, de nem teljesíti a követelményt.
- Globális (user-szintű) oszlopok: kevésbé rugalmas, projektenként más workflow-k miatt.

---

## 2026-05-05 — Hat task nézet (6 view modes), blocking már az MVP-ben

**Döntés:** A Topic Detail oldal **6 nézetet** kínál ugyanazon `tasks` adatokon: `Kanban`, `List`, `Pipeline`, `Tree`, `Roadmap`, `Diagram`. A task-ok közötti kapcsolatok (blocks / relates / duplicates) **a Kanban kártyáról is szerkeszthetők**, és minden nézetben láthatók.

**Indoklás:**
- A felhasználó kérte: "kanban-ban is tudjak már blockolni és lássam a többi nézetben"
- Egy `task_links` tábla minden kapcsolattípust kezel — nem kell külön táblát csinálni minden új típushoz
- A Roadmap (Gantt-szerű timeline) és a szabad Diagram nézet erőteljes vizualizációs többletet ad anélkül hogy új adatmodellt igényelnének — csak `tasks`-on új mezők (`start_date`, `position_x/y`, `parent_task_id`)

**Hatás:**
- A `task_dependencies` tábla **átnevezve és általánosítva** `task_links`-re, `link_type` enum-mal
- A `task_links` és a kapcsolódó `tasks` mezők **felkerültek Fázis 1-be** (eredetileg Fázis 3 volt) — mert a Kanban-ban már akarunk blockolni
- Külön migráció (`002_task_links_and_views.py`) — az alap `001_initial`-t nem terheli túl
- Cycle prevention `blocks` típuson alkalmazás szinten (PostgreSQL nem tud rekurzív CHECK-et)
- Részletes specifikáció: [TOPICS.md](TOPICS.md) — Task kapcsolatok szekció

**Alternatívák elvetve:**
- Csak `task_dependencies` (egy típus, blocks): kevésbé rugalmas, később breaking change kellene a `relates` / `duplicates` hozzáadásához
- Külön tábla minden link típusnak: redundáns séma, körülményes lekérdezés
- Blocking csak Pipeline / Diagram nézetben szerkeszthető: nem felel meg a felhasználó kérésének

---

## 2026-05-05 — Két dátum a feladatokon: `end_date` + `due_date`

**Döntés:** A `tasks` tábla **három** időpont mezőt tárol — `start_date`, `end_date`, `due_date` — eltérő szemantikával:
- `start_date`: mikor kezdődik a munka (Roadmap sáv eleje)
- `end_date`: mikorra **tervezed** befejezni (puha cél, Roadmap sáv vége)
- `due_date`: hard **határidő**, mikorra **muszáj** kész lenni

**Indoklás:**
- Egyetemi környezetben (és sok projekt-helyzetben) a tervezett befejezés és a hard határidő különbözik — a vizsgára 3 nappal előbb akarsz kész lenni, mint a tényleges deadline
- A különbség (`due_date - end_date`) **buffer / slack**, amit a Roadmap-ben világosabb csíkként jelenítünk meg — vizuális visszajelzés a mozgásterről
- Származtatott állapotok lesznek belőle: **at risk** (csúszás `end_date`-en, de még belefér), **overdue** (`due_date` lekésve)
- Mind a három mező opcionális — egyszerű feladatnál egyik sem kell, csak Kanban-ban kezeled

**Hatás:**
- `tasks.end_date` új mező a sémában (`002_task_links_and_views.py` migráció már fogja tartalmazni)
- `due_date` továbbra is a hard határidő — nem nevezzük át
- Roadmap nézet vizualizálja mindhárom mezőt (sáv + buffer csík)
- Validáció alkalmazás szinten: `end_date >= start_date`, `due_date >= end_date`
- Részletes vizualizáció: [TOPICS.md](TOPICS.md) — Roadmap dátum modell

**Alternatívák elvetve:**
- **Csak `due_date`**: nem ad mozgásteret a tervezésnek, nincs buffer fogalom
- **`due_date` átnevezése `end_date`-re**: akkor elveszne a "hard deadline" jelentés, és minden külső deadline-nál ad-hoc kéne kezelni
- **Teljes Gantt modell több mezővel** (estimated_duration, baseline_start, stb.): overkill, a 3 dátum 95%-os lefedettséget ad

---

## 2026-05-06 — Open-source self-hosted pozicionálás

**Döntés:** A DigiBrain **open-source és self-hosted**. A felhasználó saját maga telepíti és üzemelteti (Docker Compose-szal), az adatai a saját gépén/szerverén maradnak. **Nincs SaaS, nincs centralizált hosting**, nincs telemetria.

**Indoklás:**
- A target user (single-user, "második agy") gyakran adatszuverenitást akar
- Egyszerűbb biztonsági modell — bizalom-alapú, nem kell sandbox SaaS-szintű threat modelhez
- Kevesebb infrastruktúra fenntartani (nincs auth backend, billing, multi-tenant DB)
- Lehetővé teszi a későbbi plugin systemet (lásd [EXTENSIBILITY.md](EXTENSIBILITY.md)) — self-hosted környezetben a user maga dönt mit telepít, nem kell minden plugint security-review-zni

**Hatás:**
- A README és minden dokumentáció hangsúlyozza a self-hosted tényt
- Lehetséges későbbi multi-user "team" verzió is (megosztás), de továbbra is self-hosted
- A licenc valószínűleg permissive (MIT vagy Apache 2.0) — később döntjük el

**Alternatívák elvetve:**
- **SaaS-only:** elveszti az adatszuverenitás előnyt, drága fenntartás
- **Cloud-first hibrid:** komplex sync, nem fér bele a single-developer kapacitásba

---

## 2026-05-06 — Plugin architektúra Phase 6+-ra halasztva, 3-szintű roadmap

**Döntés:** A WordPress-szerű plugin ekoszisztéma jó hosszú távú vízió, de **Phase 6 előtt nem építjük**. Helyette egy 3-szintű roadmapet követünk:

1. **Phase 1-5 (most):** Core funkciók — auth, topics, tasks, time, finance, vault, notes
2. **Phase 6 (Custom Content Types):** User UI-ról definiál mezőkkel ellátott tartalom típust (`content_types` + `content_records` táblák, `fields` JSONB séma). A "gym tracking" példa ezzel megoldódik kód nélkül.
3. **Phase 7+ (Plugin csomagok):** Mások által írt csomagok (manifest + frontend bundle) telepíthetők a `plugins/` mappába. Build-time discovery.
4. **Hosszú távú (Full plugin system):** Backend kódfuttatással, csak ha emergens közösségi igény van.

**Indoklás:**
- Plugin systemet üres core-ra építeni hiábavaló — nincs mihez kapcsolódni
- A Szint 1 (Custom Content Types) megoldja a "tracker for X" use-case-ek 80%-át kód nélkül
- A self-hosted/OSS modell egyszerűsíti a plugin biztonságot (a user maga telepíti, implicit bizalom)
- Marketplace infrastruktúra elkerülhető — pluginok git repóként megoszthatók, az app `git clone`-olja a `plugins/` alá

**Hatás:**
- Új doc: [EXTENSIBILITY.md](EXTENSIBILITY.md) részletes roadmap, séma, manifest formátum
- A `tasks`, `topics`, `notes` táblák **nem** lesznek plugin-ek, mindig core funkció
- A Phase 6 előtti séma változások már most figyelnek arra hogy a `content_records.data` JSONB rugalmas legyen
- A frontend Vite config Phase 7-ben fog változni (plugin scan + dynamic import)

**Alternatívák elvetve:**
- **WordPress-szerű full plugin system az elejétől:** 3-6 hónap extra munka, nincs core mihez kapcsolni
- **Csak Custom Content Types, plugin distribution sosem:** elveszti a community-driven bővítés értékét hosszú távon

---

## 2026-05-05 — Markdown szinkron későbbre halasztva

**Döntés:** Az MVP-ben a jegyzetek csak az adatbázisban tárolódnak. A `notes` tábla `file_path` mezője NULLABLE — később, amikor implementáljuk a fájlrendszer szinkronizálást, ez megkapja az értéket.

**Indoklás:**
- Plusz komplexitás (fájl figyelés, kétirányú szinkron, konfliktuskezelés) elhalasztható.
- A séma már fel van készítve, nem kell migrálni.

---

## Sablonok jövőbeli bejegyzésekhez

```
## YYYY-MM-DD — [Döntés címe]

**Döntés:** Mit döntöttünk konkrétan.

**Indoklás:** Miért. Mi volt a probléma, mi nyer ezzel a döntéssel.

**Alternatívák elvetve:** Mit fontoltunk meg, miért nem azt választottuk.

**Hatás:** Milyen részekre van kihatása (séma, API, UI, stb.).
```
