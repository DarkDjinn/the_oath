"""Converts the remix design pack into The Oath's style files (app/themes/remix/styles/<id>/).

Usage: python3 -I scripts/themes/remix-convert.py <unzipped pack dir> <app dir>
Regenerates art.ts (the hero SVG, colours made role-relative) and style.css (each preview's own
CSS, scoped to its style) for all twenty styles. index.vue, options.ts and extra.css are written
only when missing: they hold the hand work (option drawings, frames, fixes) and are kept.
"""
import json, math, os, re, sys

PACK, APP = sys.argv[1], sys.argv[2]
FAMILY = {}
for fam in ('original-ten', 'celebration-ten'):
    for f in os.listdir(f'{PACK}/{fam}/svg'):
        FAMILY[f[:-4]] = fam
PRESETS = json.load(open(f'{PACK}/all-60-presets.json'))
PRESETS = PRESETS.get('presets', PRESETS)
THEMES = json.load(open(f'{PACK}/all-20-themes.json'))
THEMES = THEMES.get('themes', THEMES)
ROLE_VAR = {'ground': '--color-ground', 'surface': '--color-plate', 'text': '--color-ivory', 'muted': '--color-mute', 'accent': '--color-gold', 'accent2': '--color-wine'}

# ------------------------------------------------------------------ colour maths (OKLab / OKLCH)
def hex_rgb(h):
    h = h.lstrip('#')
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def oklab(h):
    r, g, b = (lin(c) for c in hex_rgb(h))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (math.copysign(abs(x) ** (1 / 3), x) for x in (l, m, s))
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)
def oklch(h):
    L, a, b = oklab(h)
    return L, math.hypot(a, b), (math.degrees(math.atan2(b, a)) + 360) % 360
def hue_gap(a, b): d = abs(a - b) % 360; return min(d, 360 - d)

NEUTRAL = ('ground', 'surface', 'text', 'muted')
CHROMA = ('accent', 'accent2')

def anchor(hexc, roles):
    """The role an art colour is tied to: chromatic colours follow the nearer accent by hue,
    quiet ones the nearest neutral by lightness. Returns (role, exact)."""
    for r, v in roles.items():
        if v.lower() == hexc.lower(): return r, True
    L, C, H = oklch(hexc)
    if C >= 0.06:
        cands = [r for r in CHROMA if oklch(roles[r])[1] >= 0.03] or list(CHROMA)
        return min(cands, key=lambda r: hue_gap(H, oklch(roles[r])[2]) + 60 * abs(L - oklch(roles[r])[0])), False
    lab = oklab(hexc)
    return min(NEUTRAL, key=lambda r: sum((x - y) ** 2 for x, y in zip(lab, oklab(roles[r])))), False

HEX = re.compile(r'#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
NAMED = {'white': '#ffffff', 'black': '#000000'}

def norm(h):
    h = h.lower()
    if len(h) == 4: h = '#' + ''.join(c * 2 for c in h[1:])
    return h

# ------------------------------------------------------------------ CSS handling
def parse_css(css):
    """Flat list of (selector, body) and ('@media ...', [(sel, body)])."""
    out, i = [], 0
    while i < len(css):
        j = css.find('{', i)
        if j < 0: break
        sel = css[i:j].strip()
        if sel.startswith('@'):
            depth, k = 1, j + 1
            while depth:
                if css[k] == '{': depth += 1
                elif css[k] == '}': depth -= 1
                k += 1
            out.append((sel, parse_css(css[j + 1:k - 1])))
            i = k
        else:
            k = css.find('}', j)
            out.append((sel, css[j + 1:k].strip()))
            i = k + 1
    return out

KEEP = {'form-submit', 'field', 'choice', 'text-button'}
HERO_CLASSES = ('hero', 'h-', 'hero-')
def is_hero(sel): return bool(re.search(r'\.(hero|h-[a-z]+|hero-[a-z]+)\b', sel))

def px_to_u(body):
    return re.sub(r'(-?\d*\.?\d+)px', lambda m: f'calc({m.group(1)} * var(--u))' if float(m.group(1)) != 0 else '0', body)

def fonts(sel, body):
    def fam(v):
        v2 = v.lower()
        if 'georgia' in v2: return 'var(--font-fraktur)'
        if 'serif hebrew' in v2: return 'var(--font-display)'
        if re.search(r'\b(date|time|times|strong|b)\b', sel) or 'h-date' in sel or 'hero-date' in sel: return 'var(--font-numeral)'
        if 'title' in sel or 'name' in sel or 'h2' in sel or 'head' in sel or 'label' in sel: return 'var(--font-display)'
        return 'var(--font-body)'
    body = re.sub(r'font-family:\s*([^;]+)', lambda m: 'font-family:' + fam(m.group(1)), body)
    body = re.sub(r'(font:\s*[^;]*?\d*\.?\d+px(?:/[\d.]+)?\s+)([^;]+)', lambda m: m.group(1) + fam(m.group(2)), body)
    return body

def scope_selector(sel, root):
    parts = []
    for s in sel.split(','):
        s = s.strip()
        if s in (':root', 'html', 'body', '*'): return None
        s = re.sub(r'\.([a-zA-Z][\w-]*)', lambda m: m.group(0) if m.group(1) in KEEP else '.rx-' + m.group(1), s)
        if s.startswith('.rx-page') or s.startswith('.rx-sheet'):
            s = root + s.replace('.rx-page', '', 1).replace('.rx-sheet', '', 1)
        else:
            s = f'{root} {s}'
        parts.append(s)
    return ','.join(parts)

# ------------------------------------------------------------------ per theme
R = lambda a, b: list(range(a, b + 1))
# Top-level SVG children (indexes as in the browser, <defs> included) that an option replaces.
PARTS = {
    'jaffa-sun': {'tile': R(27, 49)[::2] + R(51, 73)[::2]},
    'velvet-deco': {'crest': R(2, 26)},
    'herbarium': {'margin': R(4, 22), 'specimen': R(75, 84)},
    'saffron-dunes': {'horizon': R(7, 30), 'border': R(37, 96)},
    'ma': {'mark': [3, 4]},
    'postmarked-love': {'stamp': [26]},
    'jerusalem-stone': {'masonry': R(39, 62)},
    'golden-hour-groove': {'groove': R(10, 16), 'bands': R(2, 9)},
    'mazal-tov-papercut': {'papercut': [48, 49]},
    'chuppah-jubilee': {'flowers': R(6, 55), 'hanging': R(56, 63)},
    'seven-blessings': {'medallions': R(4, 15) + R(17, 28) + R(30, 41) + R(43, 54) + R(56, 67) + R(69, 80) + R(82, 93), 'border': [2]},
    'rimon-fiesta': {'tiles': [1, 2], 'fruit': [3, 4]},
    'klezmer-confetti': {'instrument': [5], 'confetti': R(6, 9)},
    'firework-finale': {'rays': R(0, 19) + R(41, 58) + R(78, 101) + R(127, 138), 'skyline': [152]},
    'poolside-vows': {'icon': R(22, 28), 'water': [2]},
    'confetti-couture': {'ribbons': [13], 'confetti': R(14, 17)},
    'gala-glow': {'arcs': R(10, 13), 'bulbs': R(16, 33), 'drapery': R(2, 9)},
    'neon-afterglow': {'shape': [5, 6], 'background': R(11, 14)},
}

def tag_parts(tid, svg):
    """Adds class="rx-part-<name>" to the listed top-level children, and a <!--rx-back--> marker
    after the background, where an option's replacement drawing goes when it belongs behind."""
    parts = PARTS.get(tid, {})
    owner = {i: name for name, idx in parts.items() for i in idx}
    last_of = {max(idx): name for name, idx in parts.items()}
    head = svg.index('>', svg.index('<svg')) + 1
    i, depth, child, out, last = head, 0, -1, [svg[:head]], head
    marked = False
    while i < len(svg):
        if svg.startswith('</svg>', i) and depth == 0: break
        if svg.startswith('<!--', i):
            i = svg.index('-->', i) + 3; continue
        if svg[i] == '<':
            close = svg.startswith('</', i)
            end = svg.index('>', i)
            selfclosing = svg[end - 1] == '/'
            if not close and depth == 0:
                child += 1
                tag = svg[i + 1:end].split()[0].rstrip('/')
                if child in owner:
                    out.append(svg[last:i]); out.append(svg[i:i + 1 + len(tag)] + f' class="rx-part-{owner[child]}"'); last = i + 1 + len(tag)
            if close: depth -= 1
            elif not selfclosing: depth += 1
            i = end + 1
            if depth == 0 and child in last_of and (close or selfclosing or svg[end - 1] == '/'):
                out.append(svg[last:i]); out.append(f'<!--rx-at-{last_of[child]}-->'); last = i
            if depth == 0 and not marked and child >= 0 and not svg[i - 7:i] == '</defs>' and 'defs' not in svg[max(0, i - 8):i]:
                out.append(svg[last:i]); out.append('<!--rx-back-->'); last = i; marked = True
            continue
        i += 1
    out.append(svg[last:])
    return ''.join(out)

def build(tid):
    fam = FAMILY[tid]
    roles = PRESETS[THEMES[tid]['preset']]['colours']
    html = open(f'{PACK}/{fam}/previews/{tid}.html').read()
    style = html[html.find('<style>') + 7:html.find('</style>')]
    theme_css = style[style.find(':root', 10):]
    svg = open(f'{PACK}/{fam}/svg/{tid}.svg').read().strip()
    svg = re.sub(r'<\?xml[^>]*>', '', svg)

    # unique ids
    ids = set(re.findall(r'\bid="([^"]+)"', svg))
    for i in ids:
        svg = re.sub(rf'\bid="{re.escape(i)}"', f'id="{tid}-{i}"', svg)
        svg = svg.replace(f'url(#{i})', f'url(#{tid}-{i})').replace(f'href="#{i}"', f'href="#{tid}-{i}"')
    svg = re.sub(r'\s(xmlns:xlink)="[^"]*"', '', svg)
    svg = re.sub(r'<svg\b[^>]*viewBox="([^"]+)"[^>]*>', lambda m: f'<svg viewBox="{m.group(1)}" preserveAspectRatio="{"xMidYMid meet" if fam == "original-ten" else "none"}" aria-hidden="true" focusable="false">', svg, count=1)
    svg = re.sub(r'\s+', ' ', svg)
    svg = re.sub(r'\s*/>', '/>', svg)
    svg = re.sub(r' stroke="none" stroke-width="1"', ' stroke="none"', svg)
    for k, v in NAMED.items():
        svg = re.sub(rf'(fill|stroke|stop-color)="{k}"', rf'\1="{v}"', svg, flags=re.I)

    palette, index, pairs = [], {}, []
    KEYOF = {}
    def var_for(h):
        h = norm(h)
        role, exact = anchor(h, roles)
        if exact:
            KEYOF[f'var({ROLE_VAR[role]})'] = role
            return f'var({ROLE_VAR[role]})'
        if h not in index:
            index[h] = len(palette)
            L, C, H = oklch(h)
            palette.append([role, round(L, 4), round(C, 4), round(H, 2), h])
        KEYOF[f'var(--x{index[h]})'] = index[h]
        return f'var(--x{index[h]})'

    svg = HEX.sub(lambda m: var_for(m.group(0)), svg)
    svg = tag_parts(tid, svg)

    root = f'.rx-{tid}'
    rules = []
    def emit(items, media=None):
        out = []
        for sel, body in items:
            if isinstance(body, list):
                inner = emit(body)
                if inner: out.append(f'{sel} {{\n' + '\n'.join('  ' + r for r in inner) + '\n}')
                continue
            sel = re.sub(r'\.rsvp button\b', '.rsvp .form-submit', sel)
            sel = re.sub(r'\.time-slot span\b', '.time-slot dt', sel)
            sc = scope_selector(sel, root)
            if not sc: continue
            body = re.sub(r'--on-accent:[^;]+;?', '', body)
            if is_hero(sel): body = px_to_u(body)
            body = fonts(sel, body)
            body = re.sub(r'\b(white|black)\b(?![-\w])', lambda m: NAMED[m.group(1)], body)
            body = HEX.sub(lambda m: var_for(m.group(0)), body)
            body = re.sub(r'var\(--(ground|surface|text|muted|accent2|accent)\)', lambda m: f'var({ROLE_VAR[m.group(1)]})', body)
            body = body.replace('var(--on-accent)', 'var(--rx-on-accent)')
            body = body.strip().rstrip(';')
            # Text set on a coloured panel gets its own variable, kept readable whatever the colours.
            bg = re.search(r'background(?:-color)?:\s*(var\(--[\w-]+\))\s*(?:;|$)', body)
            fg = re.search(r'(?<![-\w])color:\s*(var\(--[\w-]+\))', body)
            if bg and fg and bg.group(1) in KEYOF and fg.group(1) in KEYOF:
                pairs.append([KEYOF[bg.group(1)], KEYOF[fg.group(1)]])
                body = body[:fg.start(1)] + f'var(--p{len(pairs) - 1})' + body[fg.end(1):]
            if body: out.append(f'{sc} {{ {body}; }}')
        return out
    rules = emit(parse_css(theme_css))

    tag = re.search(r'class="(?:h-kicker|hero-tag)"[^>]*>([^<]*)<', html).group(1).replace('&amp;', '&')
    name = THEMES[tid]['name']
    comp = ''.join(w.capitalize() for w in tid.split('-'))
    d = f'{APP}/app/themes/remix/styles/{tid}'
    os.makedirs(d, exist_ok=True)
    with open(f'{d}/art.ts', 'w') as fh:
        fh.write('// Generated by the remix converter from the pack\'s original SVG; colours are role-relative (see ../../palette.ts).\n')
        fh.write('import type { ArtColour } from \'../../palette\'\n\n')
        fh.write(f'export const family = {json.dumps("poster" if fam == "original-ten" else "festival")} as const\n')
        fh.write('export const palette: ArtColour[] = ' + json.dumps([p[:4] for p in palette]) + '\n')
        fh.write('/** [background, text] colour pairs whose text must stay readable: role names or palette indexes. */\n')
        fh.write('export const pairs: [string | number, string | number][] = ' + json.dumps(pairs) + '\n')
        fh.write('export const hero = ' + json.dumps(svg) + '\n')
    with open(f'{d}/style.css', 'w') as fh:
        fh.write(f'/* Generated from the pack\'s {tid} preview: positions in the hero are in 375-wide design units (--u). */\n')
        fh.write('\n'.join(rules) + '\n')
    if not os.path.exists(f'{d}/index.vue'):
        with open(f'{d}/index.vue', 'w') as fh:
            fh.write(VUE.replace('@NAME@', name).replace('@TAG@', tag.replace("'", "\\'")).replace('@COMP@', comp))
    if not os.path.exists(f'{d}/extra.css'):
        with open(f'{d}/extra.css', 'w') as fh:
            fh.write(f'/* {name}: by hand, on top of the generated style.css. Option choices are .rx-o-<option>-<choice> on the sheet. */\n')
    return len(palette), len(svg)

VUE = '''<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import type { GuestInvitation } from '#shared/types'
import RemixPage from '../../RemixPage.vue'
import * as art from './art'
import './style.css'
import './extra.css'

/** @NAME@ — the composition is in art.ts (hero) and style.css / extra.css (placing and dressing). */
defineOptions({ name: '@COMP@Invitation' })
defineProps<{ campaign: PublicCampaign, invitation: GuestInvitation | null, token?: string }>()
defineEmits<{ update: [GuestInvitation] }>()
</script>

<template>
  <RemixPage :campaign="campaign" :invitation="invitation" :token="token" :art="art" tag="@TAG@" @update="$emit('update', $event)" />
</template>
'''

for tid in THEMES:
    print(tid, *build(tid))
