# Deployment & Infrastruktúra

Hogyan kerül a DigiBrain élesbe, és mi fut a Raspberry Pi-n.

## Áttekintés

- **Kód:** GitHub (`Csaszi05/digi_brain`), `main` branch.
- **Host:** Raspberry Pi otthoni hálózaton (`192.168.0.98`), Dockerrel.
- **Publikálás:** Nginx Proxy Manager (NPM) + Cloudflare DNS, domain: `digibrain.webcsaszar.com`.
- **CI/CD:** GitHub Actions **self-hosted runner** a Pi-n — minden `main`-re push automatikusan deployol.

## CI/CD — hogyan működik a deploy

A `.github/workflows/deploy.yml` `main`-re pushkor fut, a Pi-n lévő self-hosted runneren
(`runs-on: self-hosted`). A runner **a Pi-ről kérdezi le** a GitHubot (kifelé irányuló
kapcsolat), ezért nem kell publikus IP/nyitott port.

Lépések:
1. **Backup** — a deploy ELŐTT DB dump a Nextcloud `Backups_di/digibrain` mappába (utolsó 7 megmarad).
2. **Deploy** — `git pull` + `docker compose -f docker-compose.prod.yml up -d --build`.
3. **Cleanup** — `docker system prune -f`.

A `set -euo pipefail` miatt hiba esetén a job megáll és hibát jelez (nem ír hamis sikert).

## Konténerek (prod)

`docker-compose.prod.yml`:
- **db** — Postgres 16 (named volume `pgdata`).
- **backend** — FastAPI; indításkor `alembic upgrade head` (migrációk), majd uvicorn. Port `8001:8000`.
  A `/app/notes` egy **bind mount** a Nextcloud `DigiBrain` mappájára (markdown export).
- **frontend** — statikus build (nginx), port `3001:80`.

A Pi-n más konténerek is futnak (Nextcloud, NPM, stb.) — a portok ezért egyediek (8001/3001).

## Publikálás (NPM + Cloudflare)

- Cloudflare: a `digibrain` (és aldomainek) CNAME/A rekord.
- NPM: proxy host `digibrain.webcsaszar.com` → frontend (`localhost:3001`), és Custom Location
  `/api/` → backend (`localhost:8001`). Let's Encrypt SSL, Force SSL.
- A frontend relatív `/api/v1`-et hív, így minden egy domainen megy; az NPM választja szét.

## Backupok

Két forrásból, mindkettő a Nextcloud `Backups_di/digibrain` mappába (→ Mac kliens + iCloud is szinkronizálja):
1. **Deploy előtti** — a workflow backup lépése (lásd fent).
2. **Napi** — cron a Pi-n 02:00-kor (`/home/marcika05/digibrain_backup.sh`), log: `digibrain_backup.log`.

Mindkettő `pg_dump -Fc` (custom format), az utolsó 7 marad meg. Visszaállítás:
```
docker cp <dump> digi_brain-db-1:/tmp/restore.dump
docker exec digi_brain-db-1 pg_restore -U digibrain -d digibrain --clean --if-exists /tmp/restore.dump
```

> Figyelem: a Nextcloud mappa átnevezése elrontja a backup útvonalat — ha átnevezed, frissítsd
> a cron scriptet ÉS a workflow `BACKUP_DIR`-t.

## Markdown export (jegyzetek → Nextcloud/Obsidian)

A jegyzetek a DB-ben élnek, de egyirányban `.md` fájlként is kimennek a Nextcloudba
(topic-hierarchia szerinti mappákba), így Obsidianban olvashatók.
- Logika: `backend/app/services/notes_export.py`, futtatás: `python -m app.tools.export_notes`.
- Ütemezés: cron a Pi-n 10 percenként (export → chown www-data → Nextcloud `occ files:scan`).
- Egyirányú: az appban szerkesztesz; az export felülírja a fájlokat. Idempotens, és kitakarítja
  az árva `.md`-ket (de csak `.md`-t töröl).

## Gyakori műveletek

- **Deploy:** csak pusholj `main`-re.
- **Deploy státusz:** GitHub → Actions, vagy a Pi-n `~/actions-runner/_diag/Worker_*.log`.
- **Backend logok:** `docker logs digi_brain-backend-1`.
- **Migráció:** új modell-mező → új alembic migráció a `backend/alembic/versions/`-be; deploykor magától lefut.
