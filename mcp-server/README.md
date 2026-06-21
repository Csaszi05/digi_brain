# DigiBrain MCP server

A local [MCP](https://modelcontextprotocol.io) server that exposes your DigiBrain
data — topics, tasks, notes and time tracking — to Claude Desktop. It runs on your
Mac and talks to the live backend (`https://digibrain.webcsaszar.com/api/v1`) over
HTTPS.

Read + create/update only — there are **no delete tools** in this version.

## Setup

```bash
cd mcp-server
python3 -m venv .venv
.venv/bin/pip install -e .
```

## Connect Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` and add a
`digibrain` entry under `mcpServers` (keep any existing keys):

```json
{
  "mcpServers": {
    "digibrain": {
      "command": "/Users/csaszarmarcell/dev/digi_brain/mcp-server/.venv/bin/python",
      "args": ["-m", "digibrain_mcp"],
      "env": {
        "DIGIBRAIN_API_URL": "https://digibrain.webcsaszar.com/api/v1",
        "DIGIBRAIN_EMAIL": "you@example.com",
        "DIGIBRAIN_PASSWORD": "your_password"
      }
    }
  }
}
```

Then fully quit and reopen Claude Desktop. The `digibrain` server should appear in
the tools list (🔌). Try: *"List my topics"*, *"Create a task in <topic>…"*,
*"How many hours did I track this week?"*.

## Test without Claude Desktop

```bash
# create a .env from .env.example first
npx @modelcontextprotocol/inspector .venv/bin/python -m digibrain_mcp
```

## How it works

- `config.py` — reads `DIGIBRAIN_API_URL`, `DIGIBRAIN_EMAIL`, `DIGIBRAIN_PASSWORD`.
- `client.py` — `DigiBrainClient`: logs in for a token, re-auths on 401, wraps the
  REST API, and resolves column names → ids. Transport-agnostic (reused by a future
  remote HTTP MCP server).
- `server.py` — FastMCP tool definitions (the entry point: `python -m digibrain_mcp`).

## Tools

**Read:** `list_topics`, `get_topic`, `list_tasks`, `list_topic_tasks`, `get_task`,
`list_notes`, `get_note`, `search_notes`, `get_active_timer`, `list_time_entries`,
`time_summary`, `list_calendars`, `list_events`, `list_shopping_lists`,
`list_shopping_items`.

**Write:** `create_topic`, `update_topic`, `create_task`, `update_task`,
`complete_task`, `create_column`, `update_column`, `create_note`, `update_note`,
`start_timer`, `stop_timer`, `log_time`, `create_event`, `update_event`.

**Shopping (incl. delete):** `create_shopping_list`, `update_shopping_list`,
`delete_shopping_list`, `add_shopping_item`, `update_shopping_item`,
`delete_shopping_item`, `clear_checked_items`, `uncheck_all_items`.
