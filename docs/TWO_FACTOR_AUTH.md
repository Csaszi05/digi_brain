# Kétlépcsős hitelesítés (2FA / TOTP)

Opcionális második belépési lépés authenticator appal (Google Authenticator, Authy, 1Password).
Alapból **kikapcsolt**; bekapcsolásig a belépés változatlan.

## Hogyan működik

A belépés kétlépcsőssé válik, ha be van kapcsolva:
1. `POST /auth/login {email, password}` → ha 2FA aktív, **nem ad access tokent**, hanem
   `{requires_2fa: true, pending_token}`-t (a pending_token rövid életű, 5 perc).
2. `POST /auth/login/2fa {pending_token, code}` → a 6 jegyű kód (vagy egy backup kód)
   ellenőrzése után megkapod az access tokent.

A TOTP-titok a `users.totp_secret` oszlopban, **Fernet-tel titkosítva** van tárolva. A kód
ellenőrzése ±30s órascsúszást tűr.

## Beállítás (web → Profil → Two-factor authentication)

1. **Set up** → a backend generál egy titkot (még NEM kapcsol be), és mutat egy QR-t.
2. Beolvasod az authenticator appal.
3. Beírsz egy kódot a megerősítéshez → `enable`. Ekkor kapcsol be, és **egyszer** megmutatja
   a **10 backup kódot**.
4. A backup kódokat mentsd el biztonságos helyen (jelszókezelő) — telefonvesztés esetére.

> A beléptetés „verify-before-enable": csak akkor kapcsol be, ha igazoltál egy kódot, így a
> beállítás közben nem zárod ki magad.

## Backup kódok

- 10 db, hash-elve tárolva (`users.totp_backup_codes`), mint a jelszó.
- Mindegyik **egyszer** használható; használat után törlődik a listából.
- Belépésnél a 6 jegyű kód helyett is beírható.

## Kikapcsolás

`POST /auth/2fa/disable {current_password, code}` — jelszó ÉS egy érvényes kód (vagy backup kód)
kell, hogy egy ellopott session önmagában ne tudja kikapcsolni.

## Végső fallback (kizárás ellen)

Mivel self-hosted, ha minden eszközöd és backup kódod elveszne, a Pi-n az adatbázisban
kikapcsolható:
```
docker exec digi_brain-db-1 psql -U digibrain -d digibrain \
  -c "UPDATE users SET totp_enabled=false, totp_secret=NULL, totp_backup_codes=NULL;"
```

## ⚠️ Hatás az MCP-re

Az MCP szerver email+jelszóval lép be — ha bekapcsolod a 2FA-t azon a fiókon, **az MCP nem tud
belépni** (nincs aki beírja a kódot). Mielőtt a 2FA-t véglegesen bekapcsolod, kell egy **API token**
a gépi hozzáféréshez (2FA-mentes), és az MCP-t arra átállítani. Lásd [[mcp-server]].

## Releváns fájlok
- `backend/app/core/totp.py` — TOTP logika (pyotp), QR, backup kódok.
- `backend/app/api/v1/auth.py` — login kétlépcsős + `/auth/2fa/*` endpointok.
- `backend/app/core/security.py` — `create_pending_2fa_token` / `decode_pending_2fa_token`.
- `frontend/src/components/auth/TwoFactorSection.tsx`, `pages/LoginPage.tsx`.
- Migráció: `013_user_totp.py`.
