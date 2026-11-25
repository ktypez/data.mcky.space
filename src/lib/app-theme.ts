import { writable } from 'svelte/store'
import { getTheme } from '@/lib/design/themes'
import type { Theme } from '@/lib/design/tokens'

export type AppMode = 'auto' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'
export type Density = 'cozy' | 'compact'

export interface AppThemeState {
  themeId: string
  mode: AppMode
  resolvedMode: ResolvedMode
  /** Active palette id; mirrors themeId. */
  palette: string
  density: Density
  texture: boolean
}

const THEME_STORE_KEY = 'data-ledger-ui'
const MODE_KEY = 'data-ledger-mode'
const PREFERENCES_KEY = 'data-ledger-preferences'
const LEGACY_PREFERENCES_KEY = 'data-ledger-v5'
const listeners = new Set<() => void>()

let activeState: AppThemeState | null = null

function readPreferences(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(PREFERENCES_KEY) ?? localStorage.getItem(LEGACY_PREFERENCES_KEY)
}

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

// Map saved choices from the previous palette set to their closest new palette.
const PALETTE_MIGRATIONS: Record<string, string> = {
  coral: 'sakura',
  blueberry: 'soda',
  butter: 'mochi',
}

function readThemeId(value?: unknown): string {
  const id = typeof value === 'string' ? PALETTE_MIGRATIONS[value] ?? value : undefined
  return getTheme(id).id
}

function readMode(): AppMode {
  if (typeof localStorage === 'undefined') return 'auto'
  return normaliseAppMode(localStorage.getItem(MODE_KEY)) ?? 'auto'
}

function readDensity(): Density {
  if (typeof localStorage === 'undefined') return 'cozy'
  try {
    const saved = JSON.parse(readPreferences() ?? '{}') as { state?: { density?: unknown } }
    return saved.state?.density === 'compact' ? 'compact' : 'cozy'
  } catch {
    return 'cozy'
  }
}

function readTexture(): boolean {
  if (typeof localStorage === 'undefined') return true
  try {
    const saved = JSON.parse(readPreferences() ?? '{}') as { state?: { texture?: unknown } }
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

function persistPreferences(state: AppThemeState): void {
  if (typeof localStorage === 'undefined') return
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) ?? '{}') as Record<string, unknown>
    const savedState = typeof saved.state === 'object' && saved.state !== null
      ? saved.state as Record<string, unknown>
      : {}
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({
      ...saved,
      state: { ...savedState, density: state.density, texture: state.texture },
    }))
  } catch {
    /* storage unavailable — the DOM attributes still apply */
  }
}

function commitDom(_theme: Theme, state: AppThemeState): void {
  const root = document.documentElement
  root.dataset.theme = state.resolvedMode
  root.dataset.palette = state.palette
  root.dataset.mode = state.resolvedMode
  root.dataset.density = state.density
  root.dataset.texture = state.texture ? 'on' : 'off'
  root.classList.toggle('dark', state.resolvedMode === 'dark')
  root.style.colorScheme = state.resolvedMode
  window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: state }))
}

function applyThemeToDom(theme: Theme, state: AppThemeState): void {
  document.querySelectorAll<HTMLLinkElement>('link[data-app-theme]').forEach(link => link.remove())
  commitDom(theme, state)
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
  const current = getSnapshot()
  applyAppTheme(current.themeId, current.mode, false)

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    const latest = getSnapshot()
    if (latest.mode === 'auto') applyAppTheme(latest.themeId, 'auto', false)
  }
  const onStorage = (event: StorageEvent) => {
    if (![THEME_STORE_KEY, MODE_KEY, PREFERENCES_KEY, LEGACY_PREFERENCES_KEY].includes(event.key ?? '')) return
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

/** The palette id is the theme id. */
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
  persistPreferences(next)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.density = next.density
    window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: next }))
  }
}

export function setTexture(texture: boolean): void {
  const current = getSnapshot()
  const next: AppThemeState = { ...current, texture }
  setActiveState(next)
  persistPreferences(next)
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.texture = next.texture ? 'on' : 'off'
    window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: next }))
  }
}
