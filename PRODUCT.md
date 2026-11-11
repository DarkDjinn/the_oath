# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Nuxt 4 (Vue 3, TypeScript), Nitro server routes, SQLite, Tailwind CSS, Docker Compose behind the owner's existing Caddy reverse proxy on a DuckDNS hostname. Chosen by the owner. No external databases, auth services, analytics, or third-party scripts.

## Users

- **Guests** (about 50 to 60, mixed family and friends, grandparents to close friends, mostly Hebrew speakers in Israel). They open a personal link from WhatsApp on a phone, read the invitation, and answer whether they are coming. No account, no typing their own name.
- **The couple (one admin)**, a full-stack developer. Prepares the guest list in a spreadsheet, imports it, sends each link by hand over WhatsApp, watches responses arrive, and hands a final list to the wedding planner.

## Product Purpose

A self-hosted wedding invitation with a personal RSVP link per guest and a private dashboard for the couple. Success: every guest answers from their phone without help, and the couple can give the planner an accurate head count.

## Positioning

A personal project, not a SaaS. One invitation is one primary guest, zero or one plus-one, one secure personal link. The invitation is a crafted gothic and Norse artifact rather than a wedding template.

## Operating Context

- Links are sent manually over WhatsApp. Guests arrive on mobile, usually inside WhatsApp's in-app browser.
- The wedding takes place in Israel. The invitation is Hebrew-first and right-to-left, with English available.
- The admin chooses the language of each personal invitation (Hebrew by default). Guests can still switch.
- The evening has two times: reception (kabalat panim) and ceremony (chuppah).
- The admin dashboard is in English.

## Capabilities and Constraints

- Primary guest RSVP states: pending, attending, declined. A plus-one exists only when the admin allowed it and the primary guest attends. Never more than one.
- Admin: create, edit, delete invitations; regenerate links; mark as sent; CSV import with preview; two CSV exports (invitation management, wedding planner); Hebrew WhatsApp message per invitation.
- Event details, copy, and photos live in central configuration. Names, date, and venue are placeholders until the owner fills them in.
- Zero, one, or two photographs of the couple may be added later. The invitation must be complete without them. No stock photos.
- Out of scope: payments, guest accounts, seating, multiple events, analytics, automated messaging.

## Brand Commitments

- Gothic, Viking, Norse-inspired: dark romantic medieval atmosphere, carved knotwork, blackened iron, aged gold, charcoal, deep burgundy, warm ivory text, manuscript influence, dramatic display type.
- Must not read as: a generic wedding template, Viking clip art, a fantasy RPG interface, heavy-metal band art, Halloween, or a generic AI landing page. No glowing buttons, heavy gradients, decorative card grids, or emoji as ornament.
- Voice: warm and respectful Hebrew that a grandparent and a close friend both read comfortably. Romantic, not theatrical.
- A secular invitation: no parents' names, no Hebrew calendar date.

## Evidence on Hand

- No photographs yet. No real names, date, or venue yet (placeholders).
- Nothing may be invented about the couple beyond placeholder copy that is clearly replaceable.

## Product Principles

1. The guest's answer comes first: opening the link to a recorded RSVP should take under a minute on a phone.
2. People are counted, not links: invitations, primary guests, plus-ones, and confirmed attendees are never conflated.
3. Possession of a link is the only credential a guest needs, so links are unguessable, revocable, and never leaked.
4. Simple enough to trust on the day: one app, one SQLite file, one container.
5. The invitation is an object worth keeping; the dashboard is a tool worth five minutes.

## Accessibility & Inclusion

- Hebrew RTL and English LTR, including mixed-direction names.
- Readable by older guests on phones: generous body size, strong contrast on dark ground, large touch targets.
- All motion respects `prefers-reduced-motion`.
