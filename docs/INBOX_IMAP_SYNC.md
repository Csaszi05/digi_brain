# Inbox — IMAP Email Sync

## Mi az IMAP?

Az IMAP (Internet Message Access Protocol) egy szabványos protokoll, amivel egy kliens
bejelentkezik egy email szerverre és olvassa az üzeneteket — a levelek a szerveren maradnak,
csak a tartalmuk kerül át. Ez ugyanaz a protokoll, amit a Thunderbird, Apple Mail, stb. használ.

A DigiBrain poller ezt a protokollt használja arra, hogy automatikusan begyűjtse a beérkező
emaileket és ticket-eket hozzon belőlük.

---

## Hogyan működik a polling?

```
┌─────────────────────────────────────────────────────────┐
│                    DigiBrain backend                     │
│                                                          │
│  APScheduler (háttér ütemező)                            │
│  └── minden 2 percben: poll_all_accounts()               │
│        ├── EmailAccount #1 (marcell@digibrain.local)     │
│        │     └── IMAPClient.login()                      │
│        │     └── SELECT UNSEEN emails                    │
│        │     └── parse → Ticket + TicketMessage          │
│        │     └── futtatja az InboxRule-okat              │
│        └── EmailAccount #2 (m.cs@uni-corvinus.hu)        │
│              └── ugyanez                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
         │
         │  TLS titkosított kapcsolat (port 993)
         ▼
┌─────────────────────────────────────────────────────────┐
│              IMAP szerver (Gmail, Outlook, stb.)         │
└─────────────────────────────────────────────────────────┘
```

### Lépések részletesen

1. **Bejelentkezés** — Az IMAP kliens TLS-en keresztül kapcsolódik a szerverhez és
   bejelentkezik a tárolt (titkosított) jelszóval vagy OAuth tokennel.

2. **UNSEEN emailek lekérése** — Az IMAP `SEARCH UNSEEN` paranccsal csak az olvasatlan,
   még nem feldolgozott üzeneteket kéri le. Nem tölt le mindent újra.

3. **Email parse-olás** — Az email header-jéből kinyeri a feladót, tárgyat, dátumot.
   A body-ból kinyeri a text/plain és text/html részt.

4. **Thread azonosítás** — Az email `Message-ID` és `In-Reply-To` header alapján
   eldönti, hogy ez egy új ticket, vagy egy meglévő folytatása (thread).

5. **Ticket létrehozás / frissítés** — Ha új thread: új Ticket + TicketMessage.
   Ha válasz: új TicketMessage a meglévő Ticket alá, `last_message_at` frissítve.

6. **InboxRule futtatás** — A feltételek (from, subject, stb.) alapján automatikusan
   hozzárendeli a topic-ot, beállítja a prioritást, stb.

7. **sync_state mentés** — Az email fiókhoz elmenti, hogy melyik volt az utolsó
   feldolgozott üzenet (UID), hogy a következő körben ne dolgozza fel újra.

---

## Biztonság

### Kapcsolat titkossága ✅

Az IMAP polling kizárólag **IMAPS (IMAP over TLS, port 993)** kapcsolatot használ.
A kapcsolat SSL/TLS titkosított — a jelszó és az emailek tartalmát senki nem láthatja
a hálózaton.

```python
# A kapcsolat mindig TLS-sel indul:
client = IMAPClient(host, port=993, ssl=True)
```

### Jelszó tárolás 🔐

Az email fiók jelszavát **soha nem tároljuk plain text-ben**. Két lehetőség:

#### A) App jelszó (ajánlott IMAP-hoz)
A Gmail, Outlook, stb. lehetővé teszi, hogy egy dedikált "alkalmazás jelszót" hozz
létre a fiókodhoz — ez csak az adott alkalmazásnak ad hozzáférést, és bármikor
visszavonható a fő jelszó megváltoztatása nélkül.

Az app jelszót **Fernet szimmetrikus titkosítással** tároljuk az `email_accounts`
tábla `oauth_token_encrypted` oszlopában:

```
Plaintext jelszó
    │
    │  encrypt(FERNET_SECRET_KEY)
    ▼
titkosított string a DB-ben
    │
    │  decrypt(FERNET_SECRET_KEY) — csak a backend tudja
    ▼
IMAP login
```

A `FERNET_SECRET_KEY` egy environment variable, nem kerül a kódba vagy a DB-be.

#### B) OAuth token (Gmail / Outlook esetén)
OAuth2 flow: a felhasználó engedélyezi a hozzáférést a Google/Microsoft fiókjához,
a backend kap egy `access_token`-t (rövid életű) és egy `refresh_token`-t (hosszú életű).
Ezeket szintén Fernet titkosítással tároljuk.

### Mit NEM csinál a poller

- **Nem törli az emaileket** — csak olvassa, a levelek az eredeti fiókban maradnak
- **Nem küld emaileket** (egyelőre) — csak fogad
- **Nem tárolja az összes emailt** — csak az `email_accounts` táblában regisztrált
  fiókokhoz tartozókat

### Rate limiting / IMAP korlátok

A legtöbb email szolgáltató korlátozza az IMAP kapcsolatok számát és gyakoriságát.

| Szolgáltató | IMAP korlát |
|---|---|
| Gmail | Max 15 egyidejű kapcsolat, 2500 MB/nap letöltés |
| Outlook | Max 10 egyidejű kapcsolat |
| Általános IMAP | Nincs szabvány, szerver függő |

A 2 perces polling intervallum biztonságosan belül van ezeken a korlátokon.

---

## Implementációs terv

### 1. fázis — IMAP alapok

**Új csomag:** `imapclient` (pure-Python IMAP kliens)

```
backend/
├── app/
│   ├── services/
│   │   └── imap_sync.py       ← az IMAP logika
│   ├── workers/
│   │   └── poller.py          ← az ütemező
│   └── core/
│       └── crypto.py          ← Fernet titkosítás
```

**`app/core/crypto.py`** — jelszó titkosítás/visszafejtés:
```python
from cryptography.fernet import Fernet

def encrypt(plaintext: str) -> str:
    f = Fernet(settings.FERNET_KEY)
    return f.encrypt(plaintext.encode()).decode()

def decrypt(ciphertext: str) -> str:
    f = Fernet(settings.FERNET_KEY)
    return f.decrypt(ciphertext.encode()).decode()
```

**`app/services/imap_sync.py`** — egy fiók szinkronizálása:
```python
async def sync_account(account: EmailAccount, db: AsyncSession) -> int:
    password = decrypt(account.oauth_token_encrypted)
    
    with IMAPClient(account.imap_host, port=account.imap_port, ssl=True) as client:
        client.login(account.email, password)
        client.select_folder("INBOX")
        
        # Csak az utolsó sync óta érkezett üzenetek
        last_uid = (account.sync_state or {}).get("last_uid", 0)
        uids = client.search(["UID", f"{last_uid + 1}:*", "UNSEEN"])
        
        for uid, data in client.fetch(uids, ["RFC822"]).items():
            msg = email.message_from_bytes(data[b"RFC822"])
            await _upsert_ticket(account, msg, db)
        
        # Elmenti az utolsó feldolgozott UID-t
        await _update_sync_state(account, max(uids or [last_uid]), db)
    
    return len(uids)
```

**`app/workers/poller.py`** — ütemező:
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", minutes=2)
async def poll_all_accounts():
    async with AsyncSessionLocal() as db:
        accounts = await db.execute(
            select(EmailAccount).where(EmailAccount.active == True)
        )
        for account in accounts.scalars():
            await sync_account(account, db)
```

### 2. fázis — InboxRule engine

Az emailek beérkezésekor sorban végigfut az összes aktív szabályon:

```python
async def apply_rules(ticket: Ticket, account: EmailAccount, db: AsyncSession):
    rules = await db.execute(
        select(InboxRule)
        .where(InboxRule.user_id == account.user_id, InboxRule.active == True)
        .order_by(InboxRule.position)
    )
    for rule in rules.scalars():
        if matches(rule.conditions, ticket):
            await execute_actions(rule.actions, ticket, db)
```

**Feltételek (conditions):**
```json
{
  "operator": "AND",
  "rules": [
    { "field": "from_email", "op": "contains", "value": "anna@atlas.io" },
    { "field": "subject",    "op": "contains", "value": "Atlas" }
  ]
}
```

**Műveletek (actions):**
```json
[
  { "type": "set_topic",    "topic_id": "abc-123" },
  { "type": "set_priority", "value": "high" },
  { "type": "generate_ai_summary" }
]
```

### 3. fázis — Email fiók hozzáadása a UI-ban

Egy egyszerű form az `/inbox` oldalon (vagy beállításokban):
- IMAP host, port
- Email cím
- App jelszó (titkosítva kerül a DB-be)
- "Tesztelés" gomb (próbálja meg a bejelentkezést)

---

## Alternatíva: Gmail / Outlook OAuth

Ha nem szeretnél app jelszót használni, Gmail és Outlook esetén OAuth2 flow lehetséges:

```
Felhasználó → "Összekapcsolás Gmail-lal" gomb
    → Google OAuth consent screen
    → Google visszaad: access_token + refresh_token
    → Backend tárolja titkosítva
    → Polling: ha access_token lejár, refresh_token-nel újít
```

Ez biztonságosabb (nincs jelszó tárolva), de jóval több munka:
- Google Cloud Console project + OAuth credentials
- Redirect URI kezelés
- Token refresh logika
- Scope-ok: `https://mail.google.com/` (teljes IMAP hozzáférés)

**Ajánlás:** IMAP + app jelszóval kezdjük (1-2 nap munka), OAuth-ot later adunk hozzá.

---

## Összefoglalás

| Kérdés | Válasz |
|---|---|
| Biztonságos-e? | Igen — TLS kapcsolat + titkosított jelszó tárolás |
| Törli-e az emaileket? | Nem, csak olvassa |
| Valós idejű? | 2 perces késéssel (elegendő a legtöbb use case-hez) |
| Működik Gmaillel? | Igen, app jelszóval azonnal; OAuth-tal több munkával |
| Működik Outlookkal? | Igen, ugyanígy |
| Mikor implementáljuk? | 1. frontend mock→API összekötés, 2. IMAP sync |
