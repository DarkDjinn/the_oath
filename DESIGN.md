---
name: The Oath
description: A gilded line engraving on black; a wedding invitation as a night garden, plus a plain dashboard for the couple.
colors:
  ground: "#0a080b"
  plate: "#141015"
  plate-2: "#1d171d"
  ivory: "#efe6d6"
  mute: "#b7ad9c"
  gold: "#c9a961"
  gold-dim: "#8f7a48"
  wine: "#6b1626"
  wine-bright: "#8f2238"
  moon: "#e8dcc0"
  danger: "#f0a091"
  ok: "#a9c79a"
  admin-ground: "#100e11"
  admin-panel: "#161317"
  admin-control: "#1c181e"
  admin-border: "#3d3740"
  admin-ink: "#e9e3d8"
  admin-mute: "#a79f92"
typography:
  display:
    fontFamily: "'Frank Ruhl Libre Variable', 'Frank Ruhl Libre', 'Times New Roman', serif"
    fontSize: "clamp(3.4rem, 16.5vw, 5rem)"
    fontWeight: 600
    lineHeight: 1.02
  display-latin:
    fontFamily: "'UnifrakturCook', 'Frank Ruhl Libre Variable', serif"
    fontSize: "clamp(3.2rem, 15vw, 4.75rem)"
    fontWeight: 700
    lineHeight: 1.08
  headline:
    fontFamily: "'Frank Ruhl Libre Variable', 'Frank Ruhl Libre', 'Times New Roman', serif"
    fontSize: "clamp(2rem, 8.5vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 1.15
  title:
    fontFamily: "'Frank Ruhl Libre Variable', 'Frank Ruhl Libre', 'Times New Roman', serif"
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'David Libre', 'Frank Ruhl Libre Variable', Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "'David Libre', 'Frank Ruhl Libre Variable', Georgia, serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  numeral:
    fontFamily: "'Pirata One', 'Frank Ruhl Libre Variable', serif"
    fontSize: "1.6rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.06em"
  admin-body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  admin-title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Arial Hebrew', Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 650
    letterSpacing: "-0.01em"
rounded:
  none: "0"
  admin-control: "6px"
  admin-panel: "10px"
  admin-dialog: "12px"
  admin-tag: "999px"
spacing:
  column-gutter: "1.25rem"
  column-max: "30rem"
  form-gap: "1.5rem"
  section-gap: "4.5rem"
components:
  plate:
    backgroundColor: "{colors.wine}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.none}"
    padding: "0.5rem 1.75rem"
    height: "3.5rem"
  plate-hover:
    backgroundColor: "{colors.wine-bright}"
  plate-answered:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ivory}"
  text-button:
    textColor: "{colors.gold}"
    padding: "0.5rem 0.25rem"
  text-button-hover:
    textColor: "{colors.ivory}"
  field:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.none}"
    padding: "0.7rem 0.9rem"
    height: "3.25rem"
  field-focus:
    backgroundColor: "{colors.plate-2}"
  choice:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.none}"
    padding: "0.6rem 1.1rem"
    height: "4rem"
  choice-selected:
    backgroundColor: "{colors.plate-2}"
  admin-button:
    backgroundColor: "{colors.admin-control}"
    textColor: "{colors.admin-ink}"
    rounded: "{rounded.admin-control}"
    padding: "0.35rem 0.8rem"
    height: "2.25rem"
  admin-button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "#17130c"
    rounded: "{rounded.admin-control}"
  admin-panel:
    backgroundColor: "{colors.admin-panel}"
    rounded: "{rounded.admin-panel}"
---

# Design System: The Oath

## Overview

**Creative North Star: "The Night Garden Engraving"**

The invitation is a gilded line engraving on black: a heart of thorns above, a pointed iron gate below that holds the guest's answer. Everything decorative is drawn in antique-gold line, generated as SVG from seeded code, and it draws itself once on arrival (stems first, then leaves and roses fade in) and then holds still. Lettering is ivory; roses and the one primary plate are burgundy; the crescent is moon-white.

It is stationery, not an interface: a single centred column on a flat near-black ground, square corners, hairline rules, no cards, no glow. It refuses the dark wedding template (names in a thin gold rectangle, countdown, pill button).

A second, deliberately plain system serves the admin dashboard: system UI font, dark neutral panels, small radii, gold only as the primary-action accent. The two systems never mix.

**Key Characteristics:**
- Gold is line; burgundy is fill; ivory is lettering.
- One column (max 30rem), phone-first, Hebrew RTL first with English LTR.
- Ornament is generated vector, drawn once, then still.
- Square corners and hairlines on the invitation; rounded quiet panels only in admin.

## Colors

A night palette: near-black ground, aged gold line work, one deep burgundy, warm ivory text.

### Primary
- **Antique Gold** (`gold`): all line work (stems, thorns, ironwork, rules, plate and field borders), section headings, text links, focus rings, caret.
- **Dim Gold** (`gold-dim`): resting borders on fields, choices, and secondary controls; brightens to `gold` on hover or selection.

### Secondary
- **Rose Burgundy** (`wine`): the fill of roses and of the one primary plate. Nothing else.
- **Bright Burgundy** (`wine-bright`): plate hover and text selection.

### Tertiary
- **Moon White** (`moon`): crescents and moon phases only.

### Neutral
- **Night Ground** (`ground`): the page; also the fill of leaves, braid interiors, and the answered (quiet) plate.
- **Plate / Plate Raised** (`plate`, `plate-2`): field and choice backgrounds; `plate-2` marks focus or selection.
- **Ivory** (`ivory`): names, body lettering, key values.
- **Parchment Mute** (`mute`): supporting copy, labels, hints.
- **Danger / OK** (`danger`, `ok`): form error line and border; admin status tags.
- **Admin neutrals** (`admin-*`): dashboard ground, panels, controls, borders, ink. Admin only.

### Named Rules
**The Line-Work Rule.** Gold is stroke, never a filled surface on the invitation. (Solid gold appears only as tiny ornament ink: thorns, finials, sparkles.)

**The One Wine Rule.** Burgundy fills roses and the primary plate. A selected state is never wine.

**The Single Glow Rule.** One warm radial glow sits behind the heart. Every other surface is flat; no other gradients.

## Typography

**Display Font:** Frank Ruhl Libre Variable (Hebrew + Latin; fallback Times New Roman, serif)
**Body Font:** David Libre (fallback Frank Ruhl Libre, Georgia, serif)
**Blackletter:** UnifrakturCook (Latin names only); Pirata One (hero date numerals only)
**Admin:** system UI sans.

All faces are self-hosted via @fontsource; no third-party requests.

**Character:** A classic Israeli book face for reading, a high-contrast Hebrew serif for drama, and blackletter kept to a few Latin words so it reads as an accent, not a costume.

### Hierarchy
- **Display** (600, clamp(3.4rem, 16.5vw, 5rem), 1.02): the couple's names, stacked, ivory. In English the names switch to UnifrakturCook 700.
- **Headline** (800 Hebrew / 600 English, clamp(2rem, 8.5vw, 2.6rem), 1.15): section headings, gold, balanced wrap.
- **Title** (500 to 600, 1.6rem, 1.3): long date, venue name, footer names; times step up to 2.3rem with tabular lining figures.
- **Body** (400, 1.1875rem, 1.6): David Libre; form controls inherit it. Choices and plates use the display face at 1.25 to 1.35rem.
- **Label** (400, 1.0625rem, mute): time labels, hints. No uppercase, no tracking.
- **Numeral** (Pirata One, 1.6rem, 0.06em, LTR isolated): the hero date only.

### Named Rules
**The Joined Vav Rule.** In Hebrew, "and" is the vav joined to the second name on its own line; a lone vav never stands as a separate element. English shows a small gold "and" between the names.

**The Blackletter Ration Rule.** Blackletter is Latin only: the couple's Latin names and the hero date numerals. Never Hebrew, never body copy, never admin.

## Layout

One centred column, `min(100% - 2.5rem, 30rem)`, centre-aligned text; form groups align to the reading start. The hero fills the first viewport (`100svh`): moon phases, heart, greeting, names, date, then the gate rising from the bottom with the RSVP plate inside it. Sections stack with 4.5rem between them, each opened by a short ornamental rule (braid or rose) and flanked by briar sprays at the page edges.

Short screens (max-height 43.75rem) shrink heart, names, and vines so the gate plate stays in the first view. From 48rem wide the column does not grow; vines and sprays move out to stand beside it. Touch targets are at least 2.75rem; primary controls 3.25 to 4rem.

Admin is a conventional dense dashboard: stat row, bordered panels, a table that collapses to labelled two-column blocks below 60rem.

## Elevation & Depth

The invitation is flat. Depth comes from line over ground and from two tonal steps (`plate`, `plate-2`); there are no shadows. The only inset is the selected choice's doubled gold line (`inset 0 0 0 1px` gold).

Admin uses shadow only for things that float: the dialog (`0 24px 60px -12px rgb(0 0 0 / 0.7)`) and the toast (`0 10px 30px -8px rgb(0 0 0 / 0.6)`).

## Shapes

Square corners (radius 0) on every invitation control and frame, with 1px hairline borders. The only curves are drawn ones: the pointed gate arch, the arched photo clip and its gold outline, roses, moons, and the circular rose socket inside an RSVP choice. A framed photo takes a gold hairline plus a second dim-gold line offset 0.35rem.

**The Braid Rule.** The braided two-strand ring and braided rule are the only Norse element. No runes, knot panels, or other Viking motifs.

**The Generated Ornament Rule.** Ornament is SVG generated in code from a fixed seed, styled only through the `o-*` class vocabulary (line, hair, ink, gap, leaf, rose, moon, star; `o-draw` and `o-bloom` for arrival). Never raster, never emoji, never an icon font.

Admin shapes are ordinary: 6px controls, 10px panels, 12px dialog, pill status tags.

## Components

### Plate (primary button)
- **Shape:** square, 1px gold hairline, min-height 3.5rem.
- **Primary:** wine fill, ivory display type (1.25rem, 600). One per view: the gate RSVP plate, or the form submit.
- **Hover / Active:** wine-bright; 1px press. Disabled while saving at 60% opacity.
- **Answered:** once the guest has replied, the gate plate turns quiet (ground fill, 500 weight, `plate-2` on hover).

### Text button
Gold underlined text (1px, offset 0.22em), ivory on hover. Language switch, map links, "change my answer", "add a note".

### Field
- **Style:** square, dim-gold hairline, `plate` fill, ivory text, min-height 3.25rem.
- **Hover / Focus:** border goes gold; focus also lifts to `plate-2`. Gold caret.
- **Error:** one message line in `danger` with a `danger` hairline, above the submit plate.

### RSVP choice
A full-width square row (min-height 4rem) with a round socket and a display-face label.
- **Selected:** a doubled gold line and `plate-2` fill. Never wine.
- **Attending:** a rose blooms in the socket (scale and rotate in, 0.7s expo-out). **Declined:** a plain ivory dot.
- Keyboard focus draws the 2px gold outline around the whole row.

### Guest rows
Field plus a square dim-gold remove button; "add guest" is a dashed dim-gold square control in gold text. Icons are 1.5px line strokes.

### The Gate (signature)
The hero's iron gate carries the answer: its rose is an empty bud (ground fill) while pending or declined and fills with wine when the guest attends (0.8s fade).

### Ornament motion
On arrival, stems draw over 2.2s (expo-out, staggered), then leaves, thorns, and roses fade in over 1.4s. It plays once. Under `prefers-reduced-motion` nothing animates.

### Admin
- **Buttons:** 6px radius, dark neutral with 1px border; variants primary (gold fill, dark ink), danger (danger text and border), quiet (transparent), small.
- **Fields, panels, dialog:** dark neutral fills, 1px neutral borders, gold border on focus.
- **Status tags:** pill with a leading dot; attending (ok), declined (danger), pending (neutral).

## Do's and Don'ts

### Do:
- **Do** draw every decorative element as gold line on ground, using the existing generators and `o-*` classes.
- **Do** keep burgundy to roses and the single primary plate.
- **Do** mark selection with the doubled gold line and `plate-2`.
- **Do** keep invitation corners square and borders at 1px.
- **Do** join the Hebrew vav to the second name.
- **Do** keep body text at 1.1875rem or larger and touch targets at 2.75rem or larger.
- **Do** let the engraving draw once, then hold still; honour `prefers-reduced-motion`.
- **Do** keep admin in the system font with neutral panels, gold only on the primary action.

### Don't:
- **Don't** fill a surface with gold on the invitation, or use wine for a selected state.
- **Don't** add cards, shadows, glows, or gradients; the one ground glow behind the heart is the only one.
- **Don't** add Norse motifs beyond the braided ring and rule.
- **Don't** use raster ornament, emoji, or icon fonts.
- **Don't** set Hebrew, body copy, or admin text in blackletter.
- **Don't** round invitation controls or bring invitation ornament and display faces into admin.
- **Don't** loop or replay ornament motion.
