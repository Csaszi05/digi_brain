# AI Integráció Terv

Ez a dokumentum az AI asszisztens integrációjának tervét írja le. Az AI még nincs implementálva, de az adatstruktúrák már AI-kompatibilis formátumban vannak.

---

## Vízió

Egy AI asszisztens aki képes:
- **Olvasni** a user összes adatát (topic-ok, task-ok, note-ok, idő bejegyzések, pénzügyek)
- **Létrehozni** task-okat, topic-okat, note-okat
- **Szerkeszteni** meglévő elemeket (status váltás, priority módosítás stb.)
- **Összesíteni** és elemezni (mit csináltál ezen a héten, mi van lemaradásban stb.)

---

## Miért AI-kompatibilis most az adatstruktúra

### Markdown format
- A note-ok tartalom markdown stringként tárolódnak → Claude natívan érti
- A task description-ök is markdown-ok lehetnek
- Nincs proprietary JSON-blob amit externally parse-olni kellene

### REST API
- Minden entitás egyszerű REST endpoint-okon elérhető
- `GET /api/v1/topics` → fa struktúra visszaadható prompt kontextusnak
- `GET /api/v1/tasks?order_by=due_date` → boundary tasks a következő hetekre

### Relációk
- Topic → sub-topic → task → sub-task hierarchia egyszerűen bejárható
- Task linking (`linked_topic_id`, `blocks`, `relates`) megadja a kontextust

---

## Tervezett API endpoint

```
POST /api/v1/ai/chat
```

Request:
```json
{
  "message": "Mi van holnapra tervezett feladatom?",
  "context_topics": ["topic_id_1", "topic_id_2"]  // optional: only these topics
}
```

Response:
```json
{
  "reply": "Holnapra 3 feladatod van...",
  "tool_calls": [...]  // what the AI did (e.g. created a task)
}
```

---

## AI Tool Definitions (Claude Tool Use)

Az AI a következő toolokat hívhatja:

### Read tools
```python
get_topics()
# → lista az összes topic-ról fa struktúrában

get_tasks(topic_id=None, status=None, due_before=None)
# → task lista szűrőkkel

get_notes(topic_id=None, query=None)
# → note lista + tartalom

get_time_summary(since=None, until=None)
# → összesített idő topic-onként

get_topic_summary(topic_id)
# → egy topic összes adata: task-ok, note-ok, idő, blocking linkek
```

### Write tools
```python
create_topic(name, parent_id=None, icon=None, color=None)
# → új topic létrehozása

create_task(topic_id, title, column_name="To Do", priority="medium",
            due_date=None, story_points=None, description=None)
# → új task a megadott topic adott oszlopába

update_task_status(task_id, column_name)
# → task áthelyezése egy adott nevű kanban oszlopba

create_note(topic_id, title, content)
# → új markdown note

update_note(note_id, content)
# → note tartalom frissítése (AI saját maga is írhat note-ba)

link_tasks(source_task_id, target_task_id, link_type="blocks")
# → task kapcsolat létrehozása
```

---

## Context window stratégia

Az AI nem kapja meg az összes adatot minden lekérdezésnél — csak a releváns részt:

```python
def build_context(user_id: str, message: str) -> str:
    """
    1. Meghatározza melyik topic-ok relevánsak a kérdéshez
    2. Betölti azok összefoglalóját (task-ok, note-ok fejlécek)
    3. Ha specifikus note-ot kér: teljes tartalom
    4. Heti idő összesítő
    5. Upcoming deadlines
    """
    ...
```

Token limit: ~50 000 token (Claude-nak 200K context ablaka van) → bőven elegendő egy teljes user adatbázishoz kis/közepes méretig.

---

## Implementációs sorrend (jövőbeli)

1. **Phase A — Read only AI** (biztonságos, alacsony kockázat)
   - GET endpoint a context-hez
   - Claude API integráció
   - Chat UI a sidebar-ban vagy floating button-ként

2. **Phase B — Write via confirmation**
   - AI javasolja a változtatást
   - User megerősíti → mutation végrehajtása
   - Biztonságosabb mint a közvetlen írás

3. **Phase C — Full agentic**
   - AI önállóan hívja a tool-okat
   - Undo lehetőség minden AI akcióhoz (audit log)

---

## Adat formátum az AI számára (példa context)

```markdown
# User context: Marcell — 2026-05-07

## Active topics (top level)
- 📚 University - Business Informatics (47 tasks, 3 notes)
  - Semester 1 (18 tasks)
    - Microeconomics: 5 open, 3 done, 8h this week
    - Mathematics: 4 open, 2 done
  ...
- 💼 Work (23 tasks, 2 notes)

## Upcoming deadlines (next 7 days)
- Microeconomics ZH — Problem set 4 [due: 2026-05-09, HIGH priority, 5 sp]
- Q2 roadmap draft [due: 2026-05-10, HIGH priority, 8 sp]

## Currently blocked tasks
- Essay writing [blocked by: Literature review]

## This week's time (Mon-Sun)
- Microeconomics: 8.5h
- Work: 4.2h
- Total: 12.7h
```

---

## Biztonsági megfontolások

- Az AI csak a bejelentkezett user adatait látja (user_id alapú auth)
- Write toolok naplózva (`ai_actions` tábla — jövőbeli)
- Rate limiting az AI endpointon
- A note tartalmak alapértelmezetten NEM kerülnek a kontextbe (csak ha user kéri / specifikusan hivatkozza)

---

## Kapcsolódó döntések

Lásd [DECISIONS.md](DECISIONS.md) — Plugin architektúra és Open-source self-hosted döntések.

A self-hosted megközelítés lehetővé teszi hogy a user saját Claude API key-jét használja az AI integrációhoz — adatai nem kerülnek harmadik fél szerverére.
