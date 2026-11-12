import type { Component } from 'vue'
import GalleryInvitation from './gallery/GalleryInvitation.vue'
import KeepsakeInvitation from './keepsake/KeepsakeInvitation.vue'
import NocturneInvitation from './nocturne/NocturneInvitation.vue'

/**
 * Theme id → component. Every theme component receives the same props
 * (`campaign`, `invitation`, `token`) and emits `update` with the guest's saved answer.
 * Options and names for the picker live in shared/themes.ts.
 */
export const themeComponents: Record<string, Component> = {
  nocturne: NocturneInvitation,
  keepsake: KeepsakeInvitation,
  // The gallery styles share one page; each brings its own art and look.
  'still': GalleryInvitation,
  'jaffa-sun': GalleryInvitation,
  'velvet-deco': GalleryInvitation,
  'herbarium': GalleryInvitation,
  'saffron-dunes': GalleryInvitation,
  'ma': GalleryInvitation,
  'postmarked-love': GalleryInvitation,
  'happy-accident': GalleryInvitation,
  'jerusalem-stone': GalleryInvitation,
  'golden-hour-groove': GalleryInvitation,
  // The celebration collection uses the same page, with art from ./celebration.
  'mazal-tov-papercut': GalleryInvitation,
  'chuppah-jubilee': GalleryInvitation,
  'seven-blessings': GalleryInvitation,
  'rimon-fiesta': GalleryInvitation,
  'klezmer-confetti': GalleryInvitation,
  'firework-finale': GalleryInvitation,
  'poolside-vows': GalleryInvitation,
  'confetti-couture': GalleryInvitation,
  'gala-glow': GalleryInvitation,
  'neon-afterglow': GalleryInvitation,
}
