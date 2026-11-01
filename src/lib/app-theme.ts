import { writable } from 'svelte/store'
import { getTheme } from '@/lib/design/themes'
import type { Theme } from '@/lib/design/tokens'

export type AppMode = 'auto' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'

export interface AppThemeState {
  themeId: string
  mode: AppMode
  resolvedMode: ResolvedMode
}

const THEME_STORE_KEY = 'data-ledger-ui'
const MODE_KEY = 'data-ledger-mode'
const STYLESHEET_ID = 'app-theme-stylesheet'
const FONT_LINK_ID = 'app-theme-fonts'
const listeners = new Set<() => void>()

let activeState: AppThemeState | null = null
let stylesheetRequest = 0

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

// A stale/unknown id (including a saved 'custom' from older sessions) falls
// back to the default theme inside getTheme().
function readThemeId(value?: unknown): string {
  return typeof value === 'string' ? getTheme(value).id : getTheme(null).id
}

function readMode(): AppMode {
  if (typeof localStorage === 'undefined') return 'auto'
  return normaliseAppMode(localStorage.getItem(MODE_KEY)) ?? 'auto'
}

function makeState(themeId: string, mode: AppMode): AppThemeState {
  const theme = getTheme(themeId)
  const supportedMode = themeSupportsMode(theme, mode) ? mode : 'auto'
  return {
    themeId: theme.id,
    mode: supportedMode,
    resolvedMode: resolveThemeMode(theme, supportedMode, prefersDark()),
  }
}

function readState(): AppThemeState {
  return makeState(readThemeId(readPersistedThemeId()), readMode())
}

function setActiveState(next: AppThemeState): void {
  if (
    activeState?.themeId === next.themeId &&
    activeState.mode === next.mode &&
    activeState.resolvedMode === next.resolvedMode
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

function commitDom(theme: Theme, state: AppThemeState): void {
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.classList.toggle('dark', state.resolvedMode === 'dark')
  root.style.colorScheme = state.resolvedMode
  window.dispatchEvent(new CustomEvent<AppThemeState>('app-theme-change', { detail: state }))
}

function ensureFontLink(theme: Theme): void {
  if (!theme.fontUrl) return
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (!link) {
    link = document.createElement('link')
    link.id = FONT_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  const nextHref = new URL(theme.fontUrl, window.location.origin).toString()
  if (link.href !== nextHref) link.href = nextHref
}

function applyStylesheet(theme: Theme, state: AppThemeState): void {
  ensureFontLink(theme)
  const current = document.getElementById(STYLESHEET_ID) as HTMLLinkElement | null
  if (current?.dataset.appTheme === theme.id) {
    commitDom(theme, state)
    return
  }

  const href = theme.staticCss
  if (!href) {
    commitDom(theme, state)
    return
  }

  const request = ++stylesheetRequest
  const next = document.createElement('link')
  next.rel = 'stylesheet'
  next.dataset.appTheme = theme.id
  const finish = () => {
    next.onload = null
    next.onerror = null
    if (request !== stylesheetRequest) {
      next.remove()
      return
    }
    document.querySelectorAll<HTMLLinkElement>('link[data-app-theme]').forEach(link => {
      if (link !== next) link.remove()
    })
    commitDom(theme, state)
    next.id = STYLESHEET_ID
  }
  next.onload = finish
  next.onerror = finish
  next.href = href
  document.head.appendChild(next)
}

export function applyAppTheme(themeId: string, mode: AppMode, shouldPersist = true): AppThemeState {
  const theme = getTheme(themeId)
  const next = makeState(theme.id, mode)
  if (shouldPersist) persist(next)
  setActiveState(next)
  if (typeof document !== 'undefined') applyStylesheet(theme, next)
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
  ensureFontLink(getTheme(current.themeId))
  applyAppTheme(current.themeId, current.mode, false)

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystemChange = () => {
    const latest = getSnapshot()
    if (latest.mode === 'auto') applyAppTheme(latest.themeId, 'auto', false)
  }
  const onStorage = (event: StorageEvent) => {
    if (![THEME_STORE_KEY, MODE_KEY].includes(event.key ?? '')) return
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

export function setMode(mode: AppMode): void {
  applyAppTheme(getSnapshot().themeId, mode, true)
}
