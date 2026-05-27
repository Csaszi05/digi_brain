# Nextcloud / Obsidian Sync — Tervezési dokumentum

## A probléma

Az Obsidian vault mappa struktúrája és a DigiBrain topic hierarchiája
nem feltétlenül egyezik meg. Obsidianban szabadon mélyen egymásba ágyazott
mappák vannak, DigiBrainben lineáris / kétszintű topic fa.

```
Obsidian /Pantheon/                DigiBrain topics
──────────────────────             ─────────────────
📁 Project Atlas/                  🟣 Project Atlas
   📁 Meetings/                    🟣 Project Atlas / Meetings (?)
      📄 2026-05-12.md             📝 Note
   📁 Specs/                       → hova kerüljön?
      📄 API design.md
📁 Uni/
   📁 Mikroökonómia/               🟣 Microeconomics
      📄 7. előadás.md
   📁 Jog/                         → nincs ilyen topic még
      📄 Ptk alapok.md
📁 Daily Notes/                    → 365 fájl, kellene-e topic?
   📄 2026-05-12.md
📁 Templates/                      → kizárandó
📁 .obsidian/                      → kizárandó (rendszer)
📁 Attachments/                    → kizárandó (képek/pdf-ek)
```

---

## Megoldás — Mappa mapper UI

### Alapelv

Nem próbáljuk automatikusan megoldani a struktúra eltérést.
Helyette: **vizuális mapper** ahol a felhasználó egyszer beállítja
melyik Obsidian mappa melyik DigiBrain topichoz tartozik.

Ezután a szinkron már tudja hova tegye az egyes fájlokat.

---

## UI terv — `/sync/settings`

```
┌──────────────────────────────────────────────────────────────────────┐
│  Nextcloud / Obsidian sync                          [+ Fiók] [Sync]  │
│  nextcloud.example.com · /Pantheon · utolsó: 3 perce                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  MAPPA HOZZÁRENDELÉSEK                                                │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                       │
│  📁 Project Atlas/          ──→  🟣 Project Atlas          14 .md   │
│     📁 Meetings/            ──→     🟣 Project Atlas       (örököl) │
│     📁 Specs/               ──→     🟣 Project Atlas       (örököl) │
│                                                                       │
│  📁 Uni/                    ──→  [Topic nincs rendelve]              │
│     📁 Mikroökonómia/       ──→     🟣 Microeconomics       8 .md   │
│     📁 Jog/                 ──→     [+ Új topic létrehozása]         │
│                                                                       │
│  📁 Daily Notes/            ──→  ⊘ Kizárva                32 .md   │
│  📁 Templates/              ──→  ⊘ Kizárva (auto)          -        │
│  📁 .obsidian/              ──→  ⊘ Kizárva (auto)          -        │
│  📁 Attachments/            ──→  ⊘ Kizárva (auto)          -        │
│                                                                       │
│  ✓ 3 mappa hozzárendelve · 3 kizárva · 1 figyelmeztetés             │
└──────────────────────────────────────────────────────────────────────┘
```

### Működési szabályok

**Öröklés:** ha egy almappa nincs külön hozzárendelve,
a szülő mappa topicját örökli. Így nem kell minden al-mappát
egyenként beállítani.

```
/Pantheon/Project Atlas/        → Project Atlas topic
/Pantheon/Project Atlas/Specs/  → Project Atlas topic (örökölt)
/Pantheon/Project Atlas/Specs/API design.md → Note: topic=Project Atlas
```

**Auto-kizárás:** ezek a mappák automatikusan ki vannak zárva:
- `.obsidian/` (Obsidian konfigurációs fájlok)
- `Templates/` vagy `templates/`
- `Attachments/` vagy `attachments/`
- `Assets/` vagy `assets/`
- Bármilyen `.`-tal kezdődő mappa

**Auto-egyezés (első scan):** az első scan után a rendszer
fuzzy match alapján megpróbál egyezést találni:
- `Project Atlas` mappa → `Project Atlas` topic (pontos egyezés)
- `Mikroökonómia` mappa → `Microeconomics` topic (nincs egyezés → nincs auto)
- A felhasználó látja az ajánlott egyezéseket és jóváhagyja/módosítja

---

## Szinkronizáció logika

### Pull (Nextcloud → DigiBrain)

```python
for md_file in webdav.list("/Pantheon/**/*.md"):
    folder = md_file.parent_folder
    topic_id = get_mapping(folder)  # None ha kizárva/nem hozzárendelt

    if topic_id is None and not excluded:
        # Berakjuk "nem hozzárendelt" gyűjtőbe
        queue_for_manual_assignment(md_file)
        continue

    etag = md_file.etag
    existing_note = db.find_by_webdav_path(md_file.path)

    if existing_note and existing_note.webdav_etag == etag:
        continue  # Nem változott

    content = webdav.download(md_file.path)
    title = md_file.stem  # fájlnév .md kiterjesztés nélkül

    if existing_note:
        # Konfliktus vizsgálat
        if existing_note.updated_at > md_file.last_modified:
            continue  # DigiBrain verziója újabb → push fog menni
        existing_note.title = title
        existing_note.content = content
        existing_note.webdav_etag = etag
    else:
        db.create_note(title, content, topic_id, webdav_path, etag)
```

### Push (DigiBrain → Nextcloud)

```python
for note in db.notes_modified_since(last_sync):
    if note.webdav_path is None:
        continue  # Nem Obsidian-ból jött, nem írjuk vissza

    webdav.upload(
        path=note.webdav_path,
        content=note.content,  # MD tartalom
    )
```

### Konfliktus kezelés

```
Obsidian módosítva    DigiBrain módosítva    Eredmény
─────────────────────────────────────────────────────
Igen                  Nem                   Obsidian nyer (pull)
Nem                   Igen                  DigiBrain nyer (push)
Igen                  Igen                  Legújabb timestamp nyer
                                            + UI figyelmeztetés
```

---

## Adatbázis változások

### Migration 012 — `notes` tábla bővítése

```sql
ALTER TABLE notes ADD COLUMN webdav_path TEXT;      -- /Pantheon/Atlas/note.md
ALTER TABLE notes ADD COLUMN webdav_etag TEXT;      -- WebDAV ETag (change detect)
ALTER TABLE notes ADD COLUMN webdav_account_id TEXT REFERENCES webdav_accounts(id);
```

### Új táblák

**`webdav_accounts`** — Nextcloud kapcsolat:
| Mező | Leírás |
|---|---|
| id | UUID |
| user_id | FK users |
| display_name | pl. "Nextcloud" |
| url | https://nextcloud.example.com |
| username | Nextcloud felhasználónév |
| password_encrypted | Fernet titkosított app jelszó |
| vault_path | /Pantheon |
| active | polling aktív-e |

**`webdav_folder_mappings`** — mappa → topic hozzárendelés:
| Mező | Leírás |
|---|---|
| id | UUID |
| account_id | FK webdav_accounts |
| folder_path | /Pantheon/Project Atlas |
| topic_id | FK topics, nullable |
| excluded | bool — kizárt mappa |

---

## Frontend oldalak

### `/sync/settings` — Fő beállítások

1. **Fiók hozzáadás** panel (Nextcloud URL, felhasználónév, app jelszó, vault mappa)
2. **Mappa mapper** — a WebDAV scan eredménye, topic hozzárendeléssel
3. **Sync státusz** — utolsó szinkron, hibák, feldolgozott fájlok száma

### `/notes` — Meglévő oldal bővítve

- Új filter: "Obsidian-ból szinkronizált" / "Csak helyi"
- Note kártyákon: Nextcloud ikon ha WebDAV-ból jött
- "Megnyitás Obsidianban" gomb (`obsidian://open?vault=Pantheon&file=...`)

---

## Megvalósítás fázisai

### 1. fázis — Kapcsolat és scan
- [ ] Migration 012: webdav_accounts + folder_mappings + notes bővítés
- [ ] `webdavclient3` csomag
- [ ] WebDAV scan service — mappák listázása
- [ ] `/sync/settings` — fiók hozzáadás + kapcsolat teszt

### 2. fázis — Mappa mapper
- [ ] Első scan után mapper UI megjelenítése
- [ ] Fuzzy name matching az auto-egyezéshez
- [ ] Mappa → topic hozzárendelés mentése
- [ ] Kizárt mappák kezelése

### 3. fázis — Szinkronizáció
- [ ] Pull: Nextcloud → DigiBrain (5 perces polling)
- [ ] Push: DigiBrain → Nextcloud (módosítás után)
- [ ] Konfliktus kezelés
- [ ] Sync log a UI-ban

### 4. fázis — Obsidian deep integration
- [ ] "Megnyitás Obsidianban" deep link
- [ ] Frontmatter olvasás (`tags`, `aliases`, `date`)
- [ ] Wikilink → DigiBrain note link konverzió (`[[Note]]` → belső link)
- [ ] Backlinks megjelenítése

---

## Biztonság

| Szempont | Megoldás |
|---|---|
| Jelszó | Fernet titkosítás (azonos az IMAP/CalDAV-val) |
| Kapcsolat | HTTPS csak |
| Adatok | Csak a vault_path alatt lévő fájlok olvashatók |
| Törlés | Fiók törlésekor a sync metadatát töröljük, a note-ok maradnak |

---

## Nyitott kérdések a felhasználónak

1. **Mélység:** Az almappákat (pl. `Project Atlas/Specs/`) külön topicban
   akarod, vagy a szülő topicba (Project Atlas) kerüljenek?

2. **Daily Notes:** A `/Daily Notes/` mappát szinkronizálja-e,
   vagy kizárjuk? (32+ fájl)

3. **Képek / csatolmányok:** Az `.md` fájlokban lévő képhivatkozásokat
   (`![[image.png]]`) hogyan kezelje? Csak szöveg, vagy képek is?

4. **Törlés:** Ha Obsidianban törlöd a fájlt, DigiBrainben is törlődjön?
   Vagy csak archiválódjon?
