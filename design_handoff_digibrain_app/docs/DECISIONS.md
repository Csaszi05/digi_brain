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
