# The Oath

A self-hosted wedding invitation with personal RSVP links and a private guest-list dashboard.
One Nuxt app, one SQLite file, one container.

- **Invitation**: Hebrew-first (RTL) with English, a gothic night-garden engraving drawn in SVG, no photographs required.
- **Personal links**: every invited guest gets an unguessable URL. No accounts.
- **RSVP**: attend or decline, bring named guests when allowed, change the answer later through the same link.
- **Admin** at `/admin`: counts, search, filter, edit, CSV import with preview, two CSV exports, WhatsApp messages.

## The model

```
one invitation  →  one primary guest  →  zero or more guests they bring  →  one secure link
```

- The primary guest is `pending`, `attending` or `declined`.
- If the admin ticked **May bring guests**, an attending guest can add as many named guests as they like
  (capped at 20 per invitation as abuse protection: `MAX_EXTRA_GUESTS` in `shared/types.ts`).
- A guest who declines, or who is not allowed to bring guests, brings nobody. The server enforces this, not just the form.
- Attendees are counted as people: an attending guest who brings three counts as four.
- For a couple or a family, invite one of them and tick **May bring guests**.

## Quick start (local)

Requires Node 22 or newer (`nvm use`).

```bash
npm install
cp .env.example .env
npm run hash-password        # paste the printed line into .env
npm run dev                  # http://localhost:3000  and  http://localhost:3000/admin
```

In development `TOKEN_SECRET` may be left empty (a fixed dev secret is used). The database is created at `./data/wedding.db`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build, then run it |
| `npm test` | Unit tests (database, tokens, RSVP rules, CSV, auth) |
| `npm run test:e2e` | End-to-end tests against the production build (`npm run build` first) |
| `npm run typecheck` / `npm run lint` | Type check and ESLint |
| `npm run hash-password` | Create the `ADMIN_PASSWORD_HASH` line |
| `npm run backup` | Consistent backup of the database |

## Before you send invitations

1. **Event details**: edit `shared/event.ts` (names in both languages, date, reception and ceremony times, venue, navigation links, dress code, RSVP-by date). Nothing about the event is hardcoded anywhere else.
2. **Wording**: `shared/i18n/he.ts` and `shared/i18n/en.ts`.
3. **Photographs** (optional): put one or two files in the photos directory. They switch on by existing; no code or config change, no rebuild.

   | File | Where it appears |
   |---|---|
   | `hero.jpg` | In a pointed-arch frame directly under the opening screen (portrait works best) |
   | `second.jpg` | In a framed panel between the details and the RSVP (landscape works best) |

   `.jpg`, `.jpeg`, `.png`, `.webp` and `.avif` are accepted. Images are resized to four widths and served as WebP.
   Locally the directory is `./data/photos`. In Docker:

   ```bash
   docker compose cp ./hero.jpg wedding:/data/photos/hero.jpg
   ```

   Remove the file to return to the photo-free layout.
4. **WhatsApp message**: Admin → *WhatsApp messages*. One default per language; `{name}` and `{link}` are filled in per guest.

Changes to `shared/` need a rebuild (`docker compose up -d --build`). Photos and WhatsApp messages do not.

## Guest list workflow

1. **Import** (Admin → *Import CSV*). Download the template, fill it in Excel or Google Sheets, upload, check the preview, confirm.

   ```csv
   name,plus_one_allowed,language
   דניאל כהן,true,he
   Alex Levi,false,en
   נועה ישראלי,true,
   ```

   - `name` is required. `plus_one_allowed` accepts `true/false`, `1/0`, `yes/no`, `כן/לא`; blank means false. `language` is optional (`he` or `en`, default Hebrew).
   - Each row becomes exactly one invitation with its own link.
   - UTF-8 with or without BOM, Excel's Windows-1255 "CSV", UTF-16 "Unicode Text", and `;` or tab separators are all read correctly. Quoted values may contain commas and line breaks.
   - **Import only adds.** Existing invitations and their RSVPs are never modified or merged. If a name in the file matches an existing invitation or another row, the preview shows a warning and you decide (untick the row or keep it): two different people may share a name, so names are never treated as identity.
   - The whole file is validated before anything is written, and the write is a single transaction: an import happens completely or not at all. Rows with errors are listed with their spreadsheet row number and cannot be included.
   - Afterwards you can download the new links as CSV.
2. **Send**. Each row has *Copy link* and *WhatsApp* (a personalised message you can copy, or open in WhatsApp to choose the contact yourself). Nothing is ever sent automatically. Copying does **not** mark an invitation as sent; use *Mark sent* (records `sent_at`).
3. **Track**. The dashboard keeps these apart: invited guests (links), links sent, no response, accepted, declined, guests being brought, and total confirmed attendees. Because invitees may bring any number of guests there is no true maximum; the dashboard shows the count if everyone pending comes, marked `+` while anyone can still add guests.
4. **Export**.
   - *Export links*: one row per invitation (name, URL, guests allowed, language, sent, RSVP status, confirmed attendees, last response).
   - *Export for planner*: one row per confirmed attendee. Guests who are brought get their own rows with a "Guest of" column naming who invited them.
   - Both are UTF-8 with BOM and CRLF (open directly in Excel and Google Sheets with Hebrew intact), with commas, quotes and line breaks escaped, and cells that could run as formulas (`=`, `+`, `-`, `@`) neutralised with a leading apostrophe.

Per-invitation language: the admin picks Hebrew (default) or English for each guest. The guest can still switch on the page, and their own choice is remembered.

## Deployment (Docker behind your existing Caddy)

The app does not bring its own Caddy and publishes no public ports.

### 1. DNS

Point your DuckDNS name (for example `wedding-example.duckdns.org`) at the server's public IP, and make sure ports 80 and 443 reach your existing Caddy. Caddy obtains and renews the HTTPS certificate on its own once the site block below is added. (If port 80 cannot be opened, use Caddy's DuckDNS DNS-challenge plugin instead; nothing in this app changes.)

### 2. Configure

```bash
git clone <this repository> the-oath && cd the-oath
cp .env.example .env
openssl rand -base64 48            # → TOKEN_SECRET
node scripts/hash-password.mjs     # → ADMIN_PASSWORD_HASH (needs only Node, no install)
```

No Node on the server? `docker run --rm -it -v "$PWD/scripts:/s:ro" node:22-slim node /s/hash-password.mjs`

| Variable | Required | Meaning |
|---|---|---|
| `SITE_URL` | yes | Public origin, e.g. `https://wedding-example.duckdns.org`. Invitation links are built from it. |
| `TOKEN_SECRET` | yes | At least 32 random characters. Links are derived from it; **changing it invalidates every link**. Back it up with the database. |
| `ADMIN_PASSWORD_HASH` | yes | scrypt hash of the admin password. The password itself is stored nowhere. |
| `COMPOSE_FILE` | yes | Selects the networking variant (below). |
| `APP_PORT` | no | Loopback port on the host, default `3000` (host-Caddy variant). |
| `CADDY_NETWORK` | no | Docker network your Caddy is on, default `caddy` (Docker-Caddy variant). |

### 3. Choose how Caddy reaches the app

**Caddy installed on the host**

```ini
COMPOSE_FILE=compose.yml:compose.host-caddy.yml
```

The container is published on `127.0.0.1:3000` only. Add the block from [`deploy/Caddyfile.host`](deploy/Caddyfile.host) to your Caddyfile and reload Caddy.

**Caddy running in Docker**

```ini
COMPOSE_FILE=compose.yml:compose.docker-caddy.yml
CADDY_NETWORK=caddy
```

The container publishes no ports and joins Caddy's existing network (`docker network ls` shows its name; create one with `docker network create caddy` and attach Caddy to it if needed). Add the block from [`deploy/Caddyfile.docker`](deploy/Caddyfile.docker), which proxies to `wedding:3000`, and reload Caddy.

### 4. Run

```bash
docker compose up -d --build       # start (first run builds the image)
docker compose ps                  # health should become "healthy"
docker compose logs -f wedding     # logs
docker compose stop                # stop        (docker compose down keeps the data volume)
git pull && docker compose up -d --build    # update
```

Then open `https://wedding-example.duckdns.org/admin`.

The container runs as an unprivileged user with a read-only root filesystem, restarts unless stopped, has a health check on `/api/health`, and closes the database cleanly on `SIGTERM`.

### Data and backups

Everything persistent is in the `wedding-data` volume, mounted at `/data`:
`/data/wedding.db` (plus SQLite's `-wal` and `-shm` files), `/data/photos`, `/data/backups`.

SQLite runs in WAL mode, so **do not copy `wedding.db` while the app is running**: recent writes live in the `-wal` file and a plain copy can be incomplete or corrupt. Use the backup command, which uses SQLite's online backup API and verifies the result:

```bash
docker compose exec wedding node .output/server/backup.mjs       # writes /data/backups/wedding-<timestamp>.db
docker compose cp wedding:/data/backups ./backups                 # copy the backups off the volume
```

A nightly cron entry on the host is enough:

```cron
15 3 * * * cd /path/to/the-oath && docker compose exec -T wedding node .output/server/backup.mjs && docker compose cp wedding:/data/backups ./backups
```

**Restore**

```bash
docker compose stop wedding
docker compose run --rm --no-deps -v "$PWD/backups:/restore:ro" wedding \
  sh -c 'rm -f /data/wedding.db-wal /data/wedding.db-shm && cp /restore/wedding-<timestamp>.db /data/wedding.db'
docker compose up -d
```

**Move to another server**: take a backup, copy the backup file, your `.env` (it holds `TOKEN_SECRET`, without which the links in the database cannot be reproduced) and any photos to the new server, run the restore steps there, and repoint DNS. Sent links keep working as long as `TOKEN_SECRET` and the hostname are unchanged.

## Security notes

- **Links are the credential.** A token is `HMAC-SHA256(TOKEN_SECRET, random nonce)`: 256 bits, base64url. The database stores only the nonce and a SHA-256 hash of the token, so a leaked database or backup contains no working links. Lookups go through the hash; unknown, malformed and revoked tokens all return the same 404.
- Links can be **revoked**, **restored**, or **regenerated** (old link dies immediately, RSVP is kept) from the edit dialog.
- A guest's link returns only that guest's invitation. No endpoint lists guests without an admin session.
- **Rate limits**: invitation lookups and RSVPs 90 per 5 minutes per address; sign-in 5 failures per 15 minutes per address. In-memory, which fits a single container.
- **Admin**: one password (scrypt), server-side sessions stored hashed in SQLite, cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, 14 days. State-changing admin requests must also come from the site's own origin.
- **Headers**: `Referrer-Policy: no-referrer`, a CSP with no third-party origins (`'unsafe-inline'` is allowed for Nuxt's inline hydration payload and styles), `X-Frame-Options: DENY`, `nosniff`, and `no-store` plus `noindex` on invitation and admin pages. Fonts are self-hosted; there are no third-party scripts, fonts, or analytics.
- **Tokens in logs**: the app does not log request URLs, and the RSVP API carries the token in a header. The page URL `/i/<token>` would appear in a reverse-proxy access log, so the Caddy examples enable none. If you want access logs, strip the path, for example with Caddy's `log` → `format filter` → `fields { request>uri delete }`.
- The client address is read from `X-Forwarded-For`. Caddy sets it and discards client-supplied values by default; keep the app reachable only through Caddy (both Compose variants do).
- All SQL is parameterised. Names are limited to 80 characters, notes to 500, messages to 1000, request bodies to 1 MB.

## Project layout

```
shared/event.ts            Event details: the one file to edit
shared/i18n/               Hebrew and English copy
shared/types.ts            Types and limits shared by client and server
server/core/               Framework-free logic, unit-tested directly
  db.ts                      SQLite connection and migrations (PRAGMA user_version)
  tokens.ts                  Link derivation and hashing
  invitations.ts             Create, look up, RSVP rules, admin edits, statistics
  csv.ts importer.ts exports.ts
  auth.ts rateLimit.ts settings.ts photos.ts
server/api/                Thin HTTP handlers (guest: /api/rsvp, admin: /api/admin/*)
server/middleware/security.ts   Headers, rate limit, admin guard, CSRF origin check
app/pages/                 /, /i/[token], /admin, /admin/login, /admin/import
app/components/            InvitationView, RsvpForm, OrnamentArt
app/utils/ornament.ts      The engraving: seeded, server-rendered SVG generators
app/assets/css/main.css    Design tokens and shared styles
tests/unit, tests/e2e      Vitest
deploy/                    Caddyfile examples
```

### Database

One table does the work:

```
invitations(id, guest_name, language, token_hash, token_nonce, revoked_at,
            guests_allowed, rsvp_status, extra_guests, dietary_notes, message,
            sent_at, responded_at, created_at, updated_at)
```

Differences from the original single-table sketch, and why:

- `extra_guests` (a JSON array of names) replaces `plus_one_attending` + `plus_one_name`, because an invitee may bring any number of guests. They have no status or link of their own, so a second table would add joins without adding meaning.
- `token_nonce` lets the dashboard re-display a link without storing the token itself. `revoked_at` supports revoking without regenerating.
- `responded_at` is the guest's last answer; `updated_at` also moves on admin edits.
- `language` is the per-invitation language.
- Dietary and accessibility needs share one field (`dietary_notes`) to keep the form short.

`admin_sessions` and `settings` (the WhatsApp message templates) are the only other tables. Migrations are an ordered list in `server/core/db.ts`; append to it, never edit a shipped entry.

### API errors

Every API error has the shape `{ statusCode, message, data: { code } }`, with a human-readable `message` and a stable `code` (`guests_not_allowed`, `rate_limited`, `unauthorized`, …).

## Assumptions made

- Names, date and venue are placeholders ("Astrid" and "Erik", 20 May 2027) until you edit `shared/event.ts`.
- A secular invitation with two times (reception and ceremony); no parents' names or Hebrew date.
- The admin dashboard is English-only.
- No countdown: it added nothing a guest needs.
- Guests answer only "attending" or "declined"; returning to "no response" is an admin action.
