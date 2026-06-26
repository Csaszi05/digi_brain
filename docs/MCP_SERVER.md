# MCP szerver

A DigiBrain adatait (topicok, taskok, jegyzetek, idő, naptár, bevásárlólista) elérhetővé
teszi MCP-n keresztül, így a Claude (Desktop / Code) tud olvasni és írni bennük.

## Hol van

`mcp-server/` (önálló Python projekt, **nem** a Pi-deploy része — lokálisan fut a gépeden).
A backend REST API-ját hívja HTTPS-en (`https://digibrain.webcsaszar.com/api/v1`).

```
mcp-server/
  digibrain_mcp/
    config.py    # env: DIGIBRAIN_API_URL / EMAIL / PASSWORD (.env vagy a kliens config)
    client.py    # DigiBrainClient — API hívások, login (401-re újra), név→id feloldók. Transport-független.
    server.py    # FastMCP tool-definíciók (a 25+ tool)
    __main__.py  # belépési pont: python -m digibrain_mcp (stdio)
```

A `client.py` szándékosan **transport-független**, hogy a későbbi távoli (mobil) MCP
ugyanezt újrahasználhassa.

## Bekötés

- **Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json` →
  `mcpServers.digibrain` (command = a venv pythonja, args = `-m digibrain_mcp`, env = creds).
- **Claude Code:** a repo gyökerében `.mcp.json` (titok nélkül — a szerver a `mcp-server/.env`-ből
  olvassa a belépést).
- Telepítés: `cd mcp-server && python3 -m venv .venv && .venv/bin/pip install -e .`
- Kódváltozás után a klienst **újra kell indítani** (a szerver minden indításkor a friss kódból fut).

## Toolok

**Olvasás:** `list_topics`, `get_topic`, `list_tasks`, `list_topic_tasks`, `get_task`,
`list_notes`, `get_note`, `search_notes`, `get_active_timer`, `list_time_entries`,
`time_summary`, `list_calendars`, `list_events`, `list_shopping_lists`, `list_shopping_items`.

**Írás (létrehozás/módosítás):** `create_topic`, `update_topic`, `create_task`, `update_task`,
`complete_task`, `create_column`, `update_column`, `create_note`, `update_note`,
`start_timer`, `stop_timer`, `log_time`, `create_event`, `update_event`, `delete_event`.

**Bevásárlólista (törléssel):** `create_shopping_list`, `update_shopping_list`,
`delete_shopping_list`, `add_shopping_item`, `update_shopping_item`, `delete_shopping_item`,
`clear_checked_items`, `uncheck_all_items`.

### Tervezési elvek
- **Nincs destruktív törlés** a topic/task/jegyzet/pénzügy területen (éles adat védelme).
  Kivétel: a **naptáresemény** és a **bevásárlólista** törlés — kifejezetten kértük, alacsony tét.
- **Név→id feloldás:** a toolok elfogadnak emberi neveket (oszlopnév, naptárnév, listanév), az AI-nak
  nem kell id-t keresgélnie.
- A kanban „kész" oszlop az `is_done_column=true`; a `complete_task` ebbe mozgatja a taskot.

## Auth és a 2FA

A szerver email+jelszóval lép be (30 napos JWT, 401-re újra-login). **Fontos:** ha bekapcsolod a
2FA-t azon a fiókon, a gépi login elbukik (nincs aki beírja a kódot). Megoldás: külön API token a
gépi hozzáféréshez (lásd a mobil-MCP / API-token tervet). Lásd [[two-factor-auth]].

## Mobil elérés (terv)

A telefonos Claude appból custom connectorként: a stdio szervert távoli HTTP MCP-vé alakítjuk,
self-hosted OAuth 2.1-gyel. Részletek a Digi Brain task leírásában és a tervben.
