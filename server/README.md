# Istiqamah VPS

Python 3.12 stdlib, SQLite WAL, four worker threads, 128 MB memory limit. No runtime packages or extra database daemon. Runs as the existing `ubuntu` user, on loopback port 8792, behind the existing Caddy HTTPS proxy at `/istiqamah-api/*`.

Data lives in `~/istiqamah/server/data/istiqamah.sqlite`, separate from frontend deployment. Each browser has a device UUID and a latest backup containing prayer logs, journals, hopes, reflections, fasting, preferences and schedule settings. Offline writes remain local and retry on reconnect. The settings screen can restore another device's backup. This is per-device backup/restore, not concurrent cross-device editing.

The private connection code lives in `server/data/access-code` with mode 0600. Sessions are random, stored hashed in SQLite, expire after 30 days, and can be revoked. Browser requests require an allowed Origin and authentication. AI requests are limited to 20 per UTC day. Request bodies and credentials are not logged.

AI uses the existing `VPS-Combo-gue` router on `127.0.0.1:20128/v1`. The router key is read into memory from the existing protected Hermes environment. It never enters frontend builds. The router may use external model providers. Only an explicitly requested section's answers are sent; first-day question generation sends no journal content.

Chat AI provides private sign-in and an authenticated model connection test (`/test`). `/chat` accepts only bounded user/assistant messages; server instructions cannot be supplied by the browser. Chat uses the same 20-request daily quota. Conversation history stays in browser sessionStorage for the tab session and is not added to journal backups. Settings exposes backup/restore controls, not model/server configuration.

Frontend configuration: `NEXT_PUBLIC_VPS_API_URL=https://mathspeedy.duckdns.org/istiqamah-api`. With this variable, the app uses VPS backups instead of the existing Supabase sync path.

Checks:

```sh
python3 server/test_app.py
node --import tsx src/lib/engine/engine.test.ts
node --import tsx src/lib/chat.test.ts
npm run lint
npm run build
```

`server/check_live.py` uses the ignored local access-code file and synthetic data to exercise public HTTPS, authenticated backup/restore, and real questions/fasting responses. Its test backup and session are removed afterward.

Install the code and `server/istiqamah.service` into the user's systemd directory, then run `systemctl --user daemon-reload` and `systemctl --user enable --now istiqamah`. The Caddy addition is:

```caddyfile
handle_path /istiqamah-api/* {
    reverse_proxy 127.0.0.1:8792
}
```

The previous Caddyfile is preserved in `~/istiqamah/Caddyfile.before`. Reload Caddy after validation; do not restart other applications. Update only `server/app.py` and restart the `istiqamah` unit. Never overwrite or delete its data directory during deployment. To create an independent database backup, use Python's `sqlite3.Connection.backup()`; copying a live WAL database alone is not a reliable backup.

Daily reflections are claimed once per civil day per browser. They pause from 30 minutes before the next obligatory prayer until 60 minutes after the previous prayer start or a later recorded check-in. No actual prayer-finish time or iqamah is available. Dhuha is an approximate window from sunrise +20 minutes to unadjusted Dhuhr −15 minutes; local mosque schedules remain the reference.
