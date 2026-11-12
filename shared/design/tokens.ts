import { PRESETS, type Design } from '../themes'
import { isLight, mix } from './colour'

/**
 * Every colour an invitation draws with, worked out from the six the couple picked.
 * Themes read these (as CSS variables, or directly for SVG backdrops); they never hard-code a colour.
 */
export interface Tokens {
  ground: string
  plate: string
  plate2: string
  text: string
  muted: string
  accent: string
  accentDim: string
  accent2: string
  accent2Bright: string
  moon: string
  star: string
  /** Backdrop art: building silhouettes, the warm glow behind the emblem, low haze. */
  wall: string
  glow: string
  haze: string
  scheme: 'light' | 'dark'
}

export function designTokens(design: Pick<Design, 'preset' | 'colours'>): Tokens {
  const c = design.colours
  const worked: Tokens = {
    ground: c.ground,
    plate: c.surface,
    plate2: mix(c.surface, c.text, 0.06),
    text: c.text,
    muted: c.muted,
    accent: c.accent,
    accentDim: mix(c.accent, c.ground, 0.38),
    accent2: c.accent2,
    accent2Bright: mix(c.accent2, c.text, 0.18),
    moon: mix(c.text, c.accent, 0.25),
    star: mix(c.accent, c.text, 0.45),
    wall: c.surface,
    // The warm glow behind the emblem: a breath of the second accent, fainter on a light ground where it would read as a stain.
    glow: mix(c.ground, c.accent2, isLight(c.ground) ? 0.07 : 0.2),
    haze: mix(c.ground, c.surface, 0.7),
    scheme: isLight(c.ground) ? 'light' : 'dark',
  }
  // An untouched preset keeps its hand-tuned shades.
  const preset = PRESETS[design.preset]
  const untouched = preset && (Object.keys(c) as (keyof typeof c)[]).every(role => preset.colours[role] === c[role])
  return untouched ? { ...worked, ...preset.exact } : worked
}

/** The CSS variables the invitation's stylesheet reads. */
export function tokenVars(t: Tokens): Record<string, string> {
  return {
    '--color-ground': t.ground,
    '--color-plate': t.plate,
    '--color-plate-2': t.plate2,
    '--color-ivory': t.text,
    '--color-mute': t.muted,
    '--color-gold': t.accent,
    '--color-gold-dim': t.accentDim,
    '--color-wine': t.accent2,
    '--color-wine-bright': t.accent2Bright,
    '--color-moon': t.moon,
    '--color-star': t.star,
    '--inv-scheme': t.scheme,
  }
}
