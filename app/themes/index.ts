import { defineAsyncComponent, type Component } from 'vue'
import KeepsakeInvitation from './keepsake/KeepsakeInvitation.vue'
import NocturneInvitation from './nocturne/NocturneInvitation.vue'

/**
 * Theme id → component. Every theme component receives the same props
 * (`campaign`, `invitation`, `token`) and emits `update` with the guest's saved answer.
 * Options and names for the picker live in shared/themes.ts.
 *
 * The twenty expansion styles each have their own component (remix/styles/<id>), loaded
 * only when a page uses that style.
 */
const remix = (load: () => Promise<{ default: Component }>) => defineAsyncComponent(load)

export const themeComponents: Record<string, Component> = {
  nocturne: NocturneInvitation,
  keepsake: KeepsakeInvitation,
  'still': remix(() => import('./remix/styles/still/index.vue')),
  'jaffa-sun': remix(() => import('./remix/styles/jaffa-sun/index.vue')),
  'velvet-deco': remix(() => import('./remix/styles/velvet-deco/index.vue')),
  'herbarium': remix(() => import('./remix/styles/herbarium/index.vue')),
  'saffron-dunes': remix(() => import('./remix/styles/saffron-dunes/index.vue')),
  'ma': remix(() => import('./remix/styles/ma/index.vue')),
  'postmarked-love': remix(() => import('./remix/styles/postmarked-love/index.vue')),
  'happy-accident': remix(() => import('./remix/styles/happy-accident/index.vue')),
  'jerusalem-stone': remix(() => import('./remix/styles/jerusalem-stone/index.vue')),
  'golden-hour-groove': remix(() => import('./remix/styles/golden-hour-groove/index.vue')),
  'mazal-tov-papercut': remix(() => import('./remix/styles/mazal-tov-papercut/index.vue')),
  'chuppah-jubilee': remix(() => import('./remix/styles/chuppah-jubilee/index.vue')),
  'seven-blessings': remix(() => import('./remix/styles/seven-blessings/index.vue')),
  'rimon-fiesta': remix(() => import('./remix/styles/rimon-fiesta/index.vue')),
  'klezmer-confetti': remix(() => import('./remix/styles/klezmer-confetti/index.vue')),
  'firework-finale': remix(() => import('./remix/styles/firework-finale/index.vue')),
  'poolside-vows': remix(() => import('./remix/styles/poolside-vows/index.vue')),
  'confetti-couture': remix(() => import('./remix/styles/confetti-couture/index.vue')),
  'gala-glow': remix(() => import('./remix/styles/gala-glow/index.vue')),
  'neon-afterglow': remix(() => import('./remix/styles/neon-afterglow/index.vue')),
}
