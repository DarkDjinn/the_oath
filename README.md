# The Oath

A self-hosted platform for wedding invitations with personal RSVP links. Each couple gets a **campaign**: their own invitation site, design, guest list and dashboard. One Nuxt app, one SQLite file, one container.

- **Owner panel**: create and manage campaigns for couples.
- **Couple login**: each couple manages only their own campaign: details, wording, design, photos, guests.
- **Invitation**: Hebrew-first (RTL), with English and Russian, phone-first and checked on desktop, complete without photographs.
- **Personal links**: every invited guest gets an unguessable URL. No guest accounts.
- **RSVP**: attend or decline, bring named guests up to a limit, change the answer later through the same link.

The first campaign, **Victor and Dani**, is created automatically and holds everything the site had before it became a platform. The design notes are in [docs/PLATFORM.md](docs/PLATFORM.md).

## Roles and addresses

| Who | Signs in with | Reaches |
|---|---|---|
| Owner | `admin` + the owner password | `https://<BASE_DOMAIN>/admin`: every campaign |
| Couple | their campaign address (slug) + the password you issue | the same sign-in page, then only their campaign |
| Guest | nothing | `https://<slug>.<BASE_DOMAIN>/i/<token>` |

- A couple's public page is `https://<slug>.<BASE_DOMAIN>/`.
- A token works on **any** hostname, so links issued before the platform (`<BASE_DOMAIN>/i/<token>`) still work, and so do tunnels such as ngrok.
- Without subdomains (no `BASE_DOMAIN`), campaigns live at `/w/<slug>` and links at `/i/<token>` on the one address.

## The guest model

```
one invitation  →  one invited guest  →  zero or more guests they bring  →  one secure link
```

- The invited guest is `pending`, `attending` or `declined`.
- Every invitee may bring guests. An attending guest adds each one by name, up to a limit: the campaign's default (Settings → Replies; set `1` for a plus-one) or that invitee's own limit, where `0` means they come alone. The hard ceiling is 20 (`MAX_EXTRA_GUESTS`).
- A guest who declines, or whose own limit is 0, brings nobody. The server enforces this, not just the form.
- Lowering a limit never removes names already given; it only stops more being added.
- Attendees are counted as people: an attending guest who brings three counts as four.

## Quick start (local)

Requires Node 22 or newer (`nvm use`).

```bash
npm install
cp .env.example .env
npm run hash-password        # paste the printed line into .env
npm run dev
```

Then open `http://localhost:3000/admin` and sign in as `admin`. With `BASE_DOMAIN=localhost:3000` in `.env`, campaigns are served on subdomains locally too: `http://victor-and-dani.localhost:3000`.

In development `TOKEN_SECRET` may be left empty (a fixed dev secret is used). The database is created at `./data/wedding.db`.

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build, then run it |
| `npm test` | Unit tests (campaigns, isolation, tokens, RSVP rules, CSV, auth, migration) |
| `npm run test:e2e` | End-to-end tests against the production build (`npm run build` first) |
| `npm run typecheck` / `npm run lint` | Type check and ESLint |
| `npm run hash-password` | Create the `ADMIN_PASSWORD_HASH` line |
| `npm run backup` | Consistent backup of the database |

## Running a campaign

1. **Create it** (owner): Campaigns → *New campaign*. Give the couple's names and an address (slug). It starts as a **draft**: guests cannot open it.
2. **Give the couple access** (optional): Settings → *Create the couple's password*. The sign-in link, name and password are shown once; send them to the couple. Issuing a new password signs them out.
3. **Details**: names in each language (Hebrew, English, Russian), which of them to offer and the default, date, reception and ceremony times (ceremony optional), venue, navigation links, wording, dress code, notes.
4. **Design**: choose the theme and its options with a live phone and computer preview; upload up to two photos. Photos are re-encoded on upload (which also strips location data) and served resized as WebP.
5. **Guests**: add them one by one or *Import* a CSV.

   ```csv
   name,plus_one_allowed,language
   דניאל כהן,true,he
   Alex Levi,false,en
   נועה ישראלי,1,
   ```

   - `plus_one_allowed` is optional. Blank or `true` means up to the campaign's limit; a number is that guest's own limit (`1` a plus-one, `4` a family); `0` or `false` means they come alone. Also accepts `yes/no`, `כן/לא`. `language` is optional: `he`, `en` or `ru`.
   - Each row becomes exactly one invitation with its own link.
   - UTF-8 with or without BOM, Excel's Windows-1255 "CSV", UTF-16 "Unicode Text", and `;` or tab separators are read correctly. Quoted values may contain commas and line breaks.
   - **Import only adds**, and only to this campaign. Existing invitations and RSVPs are never modified or merged. Matching names produce a warning in the preview; names are never treated as identity.
   - The whole file is validated first and written in one transaction: all or nothing.
6. **Go live** (owner): Settings → Status → *Live*.
7. **Send**: each guest row has *Copy link* and *WhatsApp* (a personalised message to copy or open in WhatsApp). Nothing is sent automatically. Copying does not mark an invitation as sent; *Mark sent* does. The list shows which links have been opened.
8. **Track and export**: counts keep invitations, people and attendees apart. *Export links* gives one row per invitation; *Export for planner* one row per confirmed attendee, with brought guests naming who invited them. Both open in Excel and Google Sheets with Hebrew intact and are protected against formula injection.
9. **Close**: Settings → Replies can close replies by hand or automatically after the reply-by date; the invitation stays visible. *Archived* keeps the invitation readable and the data exportable.

Guests also get an *Add to calendar* link once a date is set.

## Designs

A theme is a self-contained module. The catalogue is `shared/themes.ts` (names and options, validated on the server); the components are registered in `app/themes/index.ts`.

- **Nocturne** (built): gothic romance. Options: emblem (thorn heart, rose wreath, moon in a braided ring), colours (gold on black, bone white on black, gold on oxblood), backdrop (starlit, plain, rose damask, gothic spires), RSVP button inside a garden gate or on its own.
- **Adding a theme**: create `app/themes/<id>/<Name>.vue` taking the props `campaign`, `invitation`, `token` and emitting `update`; add its entry to `shared/themes.ts` and `app/themes/index.ts`. `RsvpForm` is shared and styled through CSS variables.
- **A one-off design for one couple**: add a theme and set `onlyFor: ['their-slug']`; only that campaign sees it. For small adjustments, the owner can attach custom CSS to a campaign in the Design tab.

## Deployment (Docker behind your existing Caddy)

The app does not bring its own Caddy and publishes no public ports.

### 1. DNS

Point your DuckDNS name (for example `wedding-example.duckdns.org`) at the server's public IP, and make sure ports 80 and 443 reach Caddy. DuckDNS already resolves every name under yours (`anything.wedding-example.duckdns.org`) to the same address, so campaign subdomains need no extra DNS.

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
| `SITE_URL` | yes | The platform's own origin, e.g. `https://wedding-example.duckdns.org`. |
| `BASE_DOMAIN` | for subdomains | Host under which each campaign gets `<slug>.<BASE_DOMAIN>`, e.g. `wedding-example.duckdns.org`. Leave empty to serve campaigns at `/w/<slug>` instead. |
| `TOKEN_SECRET` | yes | At least 32 random characters. Links are derived from it; **changing it invalidates every link**. Back it up with the database. |
| `ADMIN_PASSWORD_HASH` | yes | scrypt hash of the owner password. |
| `COMPOSE_FILE` | yes | Selects the networking variant (below). |
| `APP_PORT` | no | Loopback port on the host, default `3000` (host-Caddy variant). |
| `CADDY_NETWORK` | no | Docker network your Caddy is on, default `caddy` (Docker-Caddy variant). |

### 3. Choose how Caddy reaches the app

**Caddy installed on the host**: `COMPOSE_FILE=compose.yml:compose.host-caddy.yml`. The container is published on `127.0.0.1:3000` only. Use [`deploy/Caddyfile.host`](deploy/Caddyfile.host).

**Caddy running in Docker**: `COMPOSE_FILE=compose.yml:compose.docker-caddy.yml` and `CADDY_NETWORK=<its network>`. The container publishes no ports and joins Caddy's network. Use [`deploy/Caddyfile.docker`](deploy/Caddyfile.docker).

Both Caddyfiles serve the platform address and `*.` under it with **on-demand HTTPS**: the first visit to a campaign's subdomain makes Caddy obtain that hostname's certificate, after asking the app (`/api/tls-check`) whether the campaign exists. No wildcard certificate and no DNS plugin are needed. The `on_demand_tls` block goes in the global options at the top of your Caddyfile (merge it into yours if you already have one).

### 4. Run

```bash
docker compose up -d --build       # start (first run builds the image)
docker compose ps                  # health should become "healthy"
docker compose logs -f wedding     # logs
docker compose stop                # stop        (docker compose down keeps the data volume)
git pull && docker compose up -d --build    # update; the database migrates itself on start
```

Then open `https://wedding-example.duckdns.org/admin`.

The container runs as an unprivileged user with a read-only root filesystem, restarts unless stopped, has a health check on `/api/health`, and closes the database cleanly on `SIGTERM`.

### Data and backups

Everything persistent is in the `wedding-data` volume, mounted at `/data`: `/data/wedding.db` (plus SQLite's `-wal` and `-shm` files), `/data/photos/<campaign id>/`, `/data/backups`.

SQLite runs in WAL mode, so **do not copy `wedding.db` while the app is running**: recent writes live in the `-wal` file and a plain copy can be incomplete or corrupt. Use the backup command, which uses SQLite's online backup API and verifies the result:

```bash
docker compose exec wedding node .output/server/backup.mjs       # writes /data/backups/wedding-<timestamp>.db
docker compose cp wedding:/data/backups ./backups                 # copy the backups off the volume
docker compose cp wedding:/data/photos ./photos-backup            # photos are plain files
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

**Move to another server**: take a backup; copy the backup file, your `.env` (it holds `TOKEN_SECRET`, without which the links cannot be reproduced) and the photos; run the restore steps there; repoint DNS.

## Security notes

- **Links are the credential.** A token is `HMAC-SHA256(TOKEN_SECRET, random nonce)`: 256 bits, base64url. The database stores only the nonce and a SHA-256 hash, so a leaked database or backup contains no working links. Unknown, malformed and revoked tokens all return the same 404. Links can be revoked, restored, or regenerated.
- **Campaign isolation.** Every admin route names its campaign and checks the session against it on the server; invitation ids are looked up within that campaign. A couple asking for another campaign gets the same 404 as for one that does not exist. Owner-only actions (create, status, address, password, delete, custom CSS) are refused to couples.
- A guest's link returns only that guest and their campaign's public details.
- **Admin sessions** are stored hashed in SQLite; the cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, 14 days. State-changing admin requests must come from the same origin. Couple passwords are generated (96 bits), shown once, stored as scrypt hashes.
- **Rate limits**: invitation lookups and RSVPs 90 per 5 minutes per address; sign-in 5 failures per 15 minutes per address. Sign-in answers wrong names and wrong passwords identically. In-memory, which fits a single container.
- **Input**: all SQL is parameterised; text is length-limited and rendered as text, never markup; navigation links must be `http(s)`; uploads are decoded and re-encoded as images or refused; request bodies are capped (1 MB, 12 MB for photos).
- **Custom CSS** is owner-only and cannot close its `<style>` element.
- **Headers**: `Referrer-Policy: no-referrer`, a CSP with no third-party origins (`'unsafe-inline'` for Nuxt's hydration payload and styles), framing allowed from the same origin only (the design preview), `nosniff`, and `no-store` plus `noindex` on invitation and admin pages. Fonts are self-hosted; no third-party scripts or analytics.
- **Certificates**: Caddy obtains one only for hostnames the app confirms, so nobody can make your server request certificates for arbitrary names.
- **Tokens in logs**: the app does not log request URLs and the RSVP API carries the token in a header. `/i/<token>` would appear in a reverse-proxy access log, so the Caddy examples enable none.
- The client address is read from `X-Forwarded-For`, which Caddy sets; keep the app reachable only through Caddy (both Compose variants do).

## Project layout

```
shared/campaign.ts         A campaign's content model, defaults, reply-closing rule
shared/themes.ts           Theme catalogue and option validation
shared/i18n/               Standard Hebrew, English and Russian copy
shared/types.ts            Types and limits shared by client and server
server/core/               Framework-free logic, unit-tested directly
  db.ts                      SQLite connection and migrations (PRAGMA user_version)
  campaigns.ts               Campaign CRUD, content and design validation, passwords
  invitations.ts             Scoped guest operations, RSVP rules, statistics
  tokens.ts auth.ts          Link derivation; passwords, sessions, roles
  csv.ts importer.ts exports.ts photos.ts rateLimit.ts
server/api/                Thin HTTP handlers
  site, host, rsvp, calendar, tls-check     public
  admin/login, session, campaigns           sign-in and the owner's list
  admin/c/[cid]/…                           everything inside one campaign
server/middleware/security.ts   Headers, rate limit, session guard, CSRF origin check
app/pages/                 /, /w/[slug], /i/[token], /admin, /admin/login, /admin/c/[cid]/{guests,import,details,design,settings}
app/themes/                One folder per theme; index.ts registers them
app/components/            CampaignSite (theme host), RsvpForm, OrnamentArt, …
app/utils/ornament.ts      Nocturne's engraving: seeded, server-rendered SVG generators
tests/unit, tests/e2e      Vitest
deploy/                    Caddyfile examples
```

### Database

```
campaigns(id, slug, status, password_hash, design, content, whatsapp, created_at, updated_at)
invitations(id, campaign_id, guest_name, language, token_hash, token_nonce, revoked_at,
            guests_allowed, guest_limit, rsvp_status, extra_guests, dietary_notes, message,
            sent_at, first_opened_at, responded_at, created_at, updated_at)
admin_sessions(token_hash, expires_at, campaign_id)      -- campaign_id empty = owner
```

`design`, `content` and `whatsapp` are JSON documents validated on every write. `extra_guests` is a JSON list of names: brought guests have no status or link of their own, so a table for them would add joins without adding meaning. Migrations are an ordered list in `server/core/db.ts`; append to it, never edit a shipped entry. Migration 2 turned the single site into campaign 1.

### API errors

Every API error has the shape `{ statusCode, message, data: { code } }`, with a human-readable `message` and a stable `code` (`guests_not_allowed`, `too_many_guests`, `rsvp_closed`, `rate_limited`, `unauthorized`, `forbidden`, …).

## Assumptions made

- Victor and Dani's date (20 May 2027) and venue are still placeholders; edit them in the Details tab.
- The admin panels are English-only; invitations are Hebrew, English and Russian. New campaigns start with Hebrew and English; Russian is switched on in Details.
- Russian text is set in Vollkorn, because the Hebrew and blackletter faces have no Cyrillic.
- All events are in Israel time (`EVENT_TIMEZONE`).
- Couples cannot take their own campaign live, change its address or delete it; the owner does.
- Guests answer only "attending" or "declined"; returning to "no response" is an admin action.
