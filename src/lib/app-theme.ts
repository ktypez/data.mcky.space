import { writable } from 'svelte/store'
import { applyV6Mode, onV6ModeChange, V6_MODE_STORAGE_KEY, type V6Preference } from '@mcky/ui/theme'
import { getTheme } from '@/lib/design/themes'
import type { Theme } from '@/lib/design/tokens'

export type AppMode = 'auto' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'
export type Density = 'cozy' | 'compact'

export interface AppThemeState {
  themeId: string
  mode: AppMode
  resolvedMode: ResolvedMode
  /** V5 palette id — mirrors themeId (matcha · coral · blueberry · butter). */
  palette: string
  density: Density
  texture: boolean
}

const THEME_STORE_KEY = 'data-ledger-ui'
const MODE_KEY = 'data-ledger-mode'
const V5_KEY = 'data-ledger-v5'
const listeners = new Set<() => void>()

// The V6 helper has its own in-memory preference; the app's `data-ledger-mode`
// remains the only persisted source of truth. This guard stops the two wrappers
// from re-applying each other's changes.
let syncingV6 = false

let activeState: AppThemeState | null = null

export function normaliseAppMode(value: unknown): AppMode | null {
  if (value === 'system') return 'auto'
  return value === 'auto' || value === 'light' || value === 'dark' ? value : null
}

export function themeSupportsMode(theme: Theme, mode: AppMode): boolean {
  if (mode === 'auto') return true
  return !theme.modes || theme.modes.includes(mode)
}

export function resolveThemeMode(theme: Theme, mode: AppMode, prefersDark: boolean): ResolvedMode {
  if (theme.modes?.length === 1) return theme.modes[0]
  if (mode === 'auto') return prefersDark ? 'dark' : 'light'
  return mode
}

function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readPersistedThemeId(): unknown {
  if (typeof localStorage === 'undefined') return undefined
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_STORE_KEY) ?? '{}') as {
      state?: { theme?: unknown }
    }
    return saved.state?.theme
  } catch {
    return undefined
  }
}

// A stale/unknown id (including the 6 pre-V5 preset ids) falls back to the
// default palette inside getTheme() — i.e. stale ids migrate to matcha.
function readThemeId(value?: unknown): string {
  return typeof value === 'string' ? getTheme(value).id : getTheme(null).id
}

function readMode(): AppMode {
  if (typeof localStorage === 'undefined') return 'auto'
  return normaliseAppMode(localStorage.getItem(MODE_KEY)) ?? 'auto'
}

function readDensity(): Density {
  if (typeof localStorage === 'undefined') return 'cozy'
  try {
    const saved = JSON.parse(localStorage.getItem(V5_KEY) ?? '{}') as { state?: { density?: unknown } }
    return saved.state?.density === 'compact' ? 'compact' : 'cozy'
  } catch {
    return 'cozy'
  }
}

function readTexture(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const saved = JSON.parse(localStorage.getItem(V5_KEY) ?? '{}') as { state?: { texture?: unknown } }
    return saved.state?.texture !== false
  } catch {
    return true
  }
}

function makeState(themeId: string, mode: AppMode): AppThemeState {
  const theme = getTheme(themeId)
  const supportedMode = themeSupportsMode(theme, mode) ? mode : 'auto'
  return {
    themeId: theme.id,
    mode: supportedMode,
    resolvedMode: resolveThemeMode(theme, supportedMode, prefersDark()),
    palette: theme.id,
    density: readDensity(),
    texture: readTexture(),
  }
}

function readState(): AppThemeState {
  return makeState(readThemeId(readPersistedThemeId()), readMode())
}

function setActiveState(next: AppThemeState): void {
  if (
    activeState?.themeId === next.themeId &&
    activeState.mode === next.mode &&
    activeState.resolvedMode === next.resolvedMode &&
    activeState.palette === next.palette &&
    activeState.density === next.density &&
    activeState.texture === next.texture
  ) return
  activeState = next
  listeners.forEach(listener => listener())
}

function getSnapshot(): AppThemeState {
  if (!activeState) activeState = readState()
  return activeState
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function persist(state: AppThemeState): void {
  if (typeof localStorage === 'undefined') return
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_STORE_KEY) ?? '{}') as Record<string, unknown>
    const savedState = typeof saved.state === 'object' && saved.state !== null
      ? saved.state as Record<string, unknown>
      : {}
    localStorage.setItem(THEME_STORE_KEY, JSON.stringify({
      ...saved,
      state: { ...savedState, theme: state.themeId },
    }))
    localStorage.setItem(MODE_KEY, state.mode)
  } catch {
    // Private browsing and storage policies can reject writes. The active DOM theme still applies.
  }
}

function persistV5(state: AppThemeState): void {
  if (typeof localStorage === 'undefined') return
  try {
    const saved = JSON.parse(localStorage.getItem(V5_KEY) ?? '{}') as Record<string, unknown>
    const savedState = typeof saved.state === 'object' && saved.state !== null
      ? saved.state as Record<string, unknown>
      : {}
    localStorage.setItem(V5_KEY, JSON.stringify({
      ...saved,
      state: { ...savedState, density: state.density, texture: state.texture },
    }))
  } catch {
    /* storage unavailable — the DOM attributes still apply */
  }
}

function commitDom(theme: Theme, state: AppThemeState): void {
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.dataset.palette = state.palette
  root.dataset.mode = state.resolvedMode
  // V6 reads the explicit attribute first and falls back to data-mode. Keeping
  // both in sync makes the shared theme CSS and <Scenery /> agree with the app.
  root.dataset.v6Mode = state.resolvedMode
  root.dataset.density = state.density
  root.dataset.texture = state.texture ? 'on' : 'off'
  root.classList.toggle('dark', state.resolvedMode === 'dark')
  root.style.colorScheme = state.resolvedMode
  window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: state }))
}

function applyThemeToDom(theme: Theme, state: AppThemeState): void {
  document.querySelectorAll<HTMLLinkElement>('link[data-app-theme]').forEach(link => link.remove())
  commitDom(theme, state)
  if (!syncingV6) {
    syncingV6 = true
    try { applyV6Mode(state.mode) } finally { syncingV6 = false }
  }
}

/** ModeToggle lives in @mcky/ui; fold its choice back into the app's mode. */
function handleV6ModeChange(_mode: 'light' | 'dark', preference: V6Preference): void {
  if (syncingV6) return
  try {
    // The shared component persists its own key on click. Remove it so the
    // app's stored mode stays authoritative on the next reload.
    localStorage.removeItem(V6_MODE_STORAGE_KEY)
  } catch {
    /* storage unavailable — the in-memory preference still applies */
  }
  syncingV6 = true
  try {
    setMode(preference)
  } finally {
    syncingV6 = false
  }
}

export function applyAppTheme(themeId: string, mode: AppMode, shouldPersist = true): AppThemeState {
  const theme = getTheme(themeId)
  const next = makeState(theme.id, mode)
  if (shouldPersist) persist(next)
  setActiveState(next)
  if (typeof document !== 'undefined') applyThemeToDom(theme, next)
  return next
}

// Svelte binding: a writable that mirrors the external store above, plus
// one-time DOM wiring (media query + storage listeners) from initAppTheme().
export const appTheme = writable<AppThemeState>(getSnapshot())
subscribe(() => appTheme.set(getSnapshot()))

let initialised = false
export function initAppTheme(): void {
  if (initialised || typeof window === 'undefined') return
  initialised = true
  onV6ModeChange(handleV6ModeChange)
  try {
    // Discard any stale shared key before the helper reads it; the existing
    // data-ledger-mode (mirrored into data-v6-mode at boot) is canonical.
    localStorage.removeItem(V6_MODE_STORAGE_KEY)
  } catch {
    /* storage unavailable — boot attributes already carry the mode */
  }
  const current = getSnapshot()
  applyAppTheme(current.themeId, current.mode, false)

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    const latest = getSnapshot()
    if (latest.mode === 'auto') applyAppTheme(latest.themeId, 'auto', false)
  }
  const onStorage = (event: StorageEvent) => {
    if (![THEME_STORE_KEY, MODE_KEY, V5_KEY].includes(event.key ?? '')) return
    applyAppTheme(readThemeId(readPersistedThemeId()), readMode(), false)
  }
  media.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
}

export function setThemeId(themeId: string): void {
  const current = getSnapshot()
  const theme = getTheme(themeId)
  const mode = themeSupportsMode(theme, current.mode) ? current.mode : 'auto'
  applyAppTheme(theme.id, mode, true)
}

/** V5 palette selection — the palette id IS the theme id. */
export function setPalette(palette: string): void {
  setThemeId(palette)
}

export function setMode(mode: AppMode): void {
  applyAppTheme(getSnapshot().themeId, mode, true)
}

export function setDensity(density: Density): void {
  const current = getSnapshot()
  const next: AppThemeState = { ...current, density }
  setActiveState(next)
  persistV5(next)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.density = next.density
    window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: next }))
  }
}

export function setTexture(texture: boolean): void {
  const current = getSnapshot()
  const next: AppThemeState = { ...current, texture }
  setActiveState(next)
  persistV5(next)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.texture = next.texture ? 'on' : 'off'
    window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: next }))
  }
}
