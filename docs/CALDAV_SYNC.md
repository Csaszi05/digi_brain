# Naptár (CalDAV) szinkron

A DigiBrain CalDAV-on át szinkronizál a Google naptárral. Ez a doksi a működést, a
2026-06 incidenst és annak tanulságait írja le.

## Működés

- Fiók/kapcsolat: `CalendarAccount` (CalDAV URL, user, Fernet-titkosított jelszó).
- Service: `backend/app/services/caldav_sync.py`.
- **Sync (pull):** `sync_account` → a remote naptárból eseményeket húz be a `calendar_events`
  táblába. **Csak upsert — soha nem töröl lokálisan, és nincs tömeges remote törlés.**
- **Push:** `push_event` egyetlen eseményt ír ki (create/update). A `POST /calendar/events`
  létrehozáskor azonnal pushol.
- **Remote törlés:** `delete_event_remote` egyetlen eseményt töröl, a `DELETE /calendar/events/{id}`-ből.

A fiók jelenleg a **legacy** Google CalDAV végpontot használja:
`https://calendar.google.com/calendar/dav/<email>/events`.

## 2026-06 incidens — a teljes Google naptár kitörlődött

**Tünet:** a Google naptárból (mindenhol) eltűnt minden esemény; a DigiBrainben megvolt mind.

**Gyökérok (bizonyított):** a Google **legacy CalDAV végpontja figyelmen kívül hagyja a
`uid` szűrőt** a `search(uid=...)`-nál, és **az ÖSSZES eseményt visszaadja**. A régi
`delete_event_remote` ezt csinálta:
```python
results = target.search(uid=event.external_uid)
for r in results:
    r.delete()   # → egyetlen törlés az EGÉSZ naptárt kitörölte
```
Tehát egyetlen esemény törlése (UI-ból vagy MCP-ből) az egész remote naptárt letörölte.
A lokális adat megmaradt (a pull csak upsertel), ezért a DigiBrain volt a mentés.

**Javítás:** a `delete_event_remote` mostantól a `search` találatait Pythonban szűri, és
**csak a pontosan egyező uid-ot törli**; üres uid → nem töröl semmit.

**Helyreállítás:** a ~122 eseményt a DigiBrainből visszapusholtuk a Google-re (a `push` a
`save_event`-tel működik). Az egész napos eseményeknél figyelni kell a `VALUE=DATE` formátumra
(`DTSTART;VALUE=DATE:YYYYMMDD`), különben a Google 400-zal elutasítja.

## Tanulságok / teendők

- **Ne bízz a szerveroldali CalDAV szűrésben** — a Google legacy endpoint nem tartja be. Mindig
  ellenőrizd a uid-ot kliensoldalon törlés előtt.
- **Migráció a modern végpontra** ajánlott: `https://apidata.googleusercontent.com/caldav/v2/<calId>/events`
  (vagy Google Calendar API OAuth-tal). A legacy `/calendar/dav/` kivezetés alatt.
- A DigiBrain `pull` upsert-only → ha Google oldalon törölsz, a következő pull nem törli a
  lokálist (sőt vissza is hozhatja). Igazi törléshez a remote-on is törölni kell (most már biztonságosan).

## Releváns fájlok
- `backend/app/services/caldav_sync.py` — sync, push, delete (javított).
- `backend/app/api/v1/calendar_accounts.py` — endpointok (`/calendar/...`).
