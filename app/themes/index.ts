import type { Component } from 'vue'
import NocturneInvitation from './nocturne/NocturneInvitation.vue'

/**
 * Theme id → component. Every theme component receives the same props
 * (`campaign`, `invitation`, `token`) and emits `update` with the guest's saved answer.
 * Options and names for the picker live in shared/themes.ts.
 */
export const themeComponents: Record<string, Component> = {
  nocturne: NocturneInvitation,
}
