# Platform plan: campaigns

The site becomes a small platform. A **campaign** is one couple's invitation site: its details, design, guest list, links and RSVPs. "Victor and Dani" is campaign 1 and keeps its data and links.

## Roles

| Role | Signs in with | Can do |
|---|---|---|
| **Owner** (you) | `admin` + the owner password (`ADMIN_PASSWORD_HASH`) | Everything: create, open, edit, pause, archive and delete campaigns; set a couple's password; change a slug; custom CSS. |
| **Couple** | their campaign address (slug) + the password you give them | Only their own campaign: details, wording, design, photos, guests, import, exports, WhatsApp messages, RSVP settings. |
| **Guest** | their personal link | See their invitation and answer. |

Every admin API call is scoped to one campaign and checked on the server; a couple's session cannot read or change another campaign, even by guessing ids.

## Addresses

- Owner panel and sign-in: `https://<BASE_DOMAIN>/admin`
- A couple's public page: `https://<slug>.<BASE_DOMAIN>/`
- A guest's link: `https://<slug>.<BASE_DOMAIN>/i/<token>`
- Tokens are resolved on any host, so links issued before the platform (`<BASE_DOMAIN>/i/<token>`) keep working, and so do tunnels such as ngrok.
- Fallback without subdomains (local tools, tunnels): `/w/<slug>`.
- HTTPS for subdomains uses Caddy on-demand certificates; the app tells Caddy which hostnames are real (`/api/tls-check`), so no wildcard certificate or DNS plugin is needed.

## Campaign lifecycle

`draft` (only signed-in admins can preview; guests see "not open yet") → `live` → `archived` (links show a closing note; data is kept and exportable). RSVPs can also be closed by hand or automatically after the reply-by date, while the invitation stays visible.

## What a couple controls

- **Details**: names in Hebrew and English, date, reception and ceremony times (ceremony optional), venue, navigation links, dress code, notes, reply-by date.
- **Languages**: Hebrew, English or both, and which is the default. Each invitee can still be given a language.
- **Wording**: the invitation line, the opening paragraph and the closing line, per language. Empty means the standard text.
- **Design** (the studio): the invitation sits in the middle; one topic at a time shows beside it (Styles, Colours, Lettering, Ornaments, Button, Photos, History). A couple starts from a ready-made style, then sets their own six colours and a typeface for each kind of text. Every change is drawn at once in the preview, in any of the campaign's languages, with undo and redo; nothing reaches guests until Save. A palette guests could not read is refused with the reason and a one-click repair. The last 10 saved designs are kept (`/api/admin/c/<id>/design/versions`) and can be restored.
- **Photos**: upload, replace or remove the two photo slots. Files are re-encoded on upload.
- **Guests**: everything from before, plus a limit on how many guests an invitee may bring (campaign default and per invitee), and whether each link has been opened.
- **RSVP form**: ask for dietary notes or not, allow a message or not, close replies.
- **WhatsApp messages** per language.

## Designs

A **theme** is a self-contained module: a component, its tokens, its ornament and a list of options. Themes are registered in one file, so adding a look does not touch the platform.

- `nocturne` (built): the gothic family. Options: emblem (thorn heart, rose wreath, moon ring), colours (gold on black, bone on black, gold on oxblood), backdrop (plain, stars, damask, spires), gate or plain plate.
- Non-gothic themes: next stage, chosen from rendered mocks.
- **One-off designs for a couple**: add a theme folder and mark it private to that campaign; it then appears only in their Design tab. For small adjustments the owner can attach custom CSS to a campaign.

## Data

`campaigns(id, slug, status, password_hash, design, content, settings, created_at, updated_at)`; `invitations` gains `campaign_id`, `guest_limit`, `first_opened_at`; sessions gain `campaign_id` (empty for the owner). Migration 2 creates campaign 1 from the existing event details and moves every existing invitation into it. Photos live in `photos/<campaign id>/`.

## Edge cases handled

- Two couples with the same names: slugs are unique; the owner picks another.
- Slug change: owner only, with a warning, because it changes the address in links not yet sent. Old links still resolve by token.
- Couple forgets the password: owner resets it; existing sessions for that campaign end.
- Deleting a campaign: owner only, typed confirmation, removes guests, sessions and photos.
- A guest opens a link for a paused, archived or closed campaign: a clear message instead of the form; their recorded answer is still shown.
- A lowered guest limit never deletes names already given; it only blocks adding more.
- Links (maps, Waze) must be `http(s)`; all text is length-limited and escaped.
- One language only: the switcher disappears and personal language is ignored.
- No ceremony time, no dress code, no photos: those blocks disappear without gaps.

## Likely next requests (not built)

Meal choice per guest; children count; table or seating; a schedule or FAQ section; gift or registry link; a second event (henna, Friday dinner); save-the-date mode; reminders for non-responders; per-campaign custom domain; billing.
