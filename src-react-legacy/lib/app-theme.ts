import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { getTheme } from '@/lib/design/themes'
import type { Theme } from '@/lib/design/tokens'

export type AppMode = 'auto' | 'light' | 'dark'
export type ResolvedMode = 'light' | 'dark'
export type CustomColorSet = {
  background: string
  surface: string
  text: string
  primary: string
  primaryForeground: string
  border: string
}
export type CustomPalette = {
  light: CustomColorSet
  dark: CustomColorSet
}

export interface AppThemeState {
  themeId: string
  mode: AppMode
  resolvedMode: ResolvedMode
  customPalette: CustomPalette
}

const THEME_STORE_KEY = 'data-ledger-ui'
const MODE_KEY = 'data-ledger-mode'
const STYLESHEET_ID = 'app-theme-stylesheet'
const FONT_LINK_ID = 'app-theme-fonts'
const CUSTOM_THEME_ID = 'custom'
const COLOR_RE = /^#[0-9a-f]{6}$/i
const listeners = new Set<() => void>()

export const DEFAULT_CUSTOM_PALETTE: CustomPalette = {
  light: {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#111111',
    primary: '#2563eb',
    primaryForeground: '#ffffff',
    border: '#d1d5db',
  },
  dark: {
    background: '#0b0f19',
    surface: '#111827',
    text: '#f8fafc',
    primary: '#a3e635',
    primaryForeground: '#0f172a',
    border: '#334155',
  },
}

let activeState: AppThemeState | null = null
let stylesheetRequest = 0
const SERVER_STATE: AppThemeState = {
  themeId: 'portal',
  mode: 'auto',
  resolvedMode: 'light',
  customPalette: DEFAULT_CUSTOM_PALETTE,
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

function color(value: unknown, fallback: string): string {
  return typeof value === 'string' && COLOR_RE.test(value) ? value.toLowerCase() : fallback
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16)) as [number, number, number]
}

function luminance(hex: string): number {
  const channels = rgb(hex).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
}

export function contrastRatio(foreground: string, background: string): number {
  const first = luminance(color(foreground, '#ffffff'))
  const second = luminance(color(background, '#000000'))
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05)
}

export function readableForeground(background: string): '#0f172a' | '#ffffff' {
  const normalized = color(background, '#ffffff')
  return contrastRatio('#0f172a', normalized) >= contrastRatio('#ffffff', normalized) ? '#0f172a' : '#ffffff'
}

export function hasReadableForeground(background: string): boolean {
  return contrastRatio(readableForeground(background), background) >= 4.5
}

function normaliseColorSet(value: unknown, fallback: CustomColorSet): CustomColorSet {
  const input = value && typeof value === 'object' ? value as Partial<CustomColorSet> : {}
  const primary = color(input.primary, fallback.primary)
  return {
    background: color(input.background, fallback.background),
    surface: color(input.surface, fallback.surface),
    text: color(input.text, fallback.text),
    primary,
    primaryForeground: readableForeground(primary),
    border: color(input.border, fallback.border),
  }
}

export function normaliseCustomPalette(value: unknown): CustomPalette {
  const input = value && typeof value === 'object' ? value as Partial<CustomPalette> : {}
  return {
    light: normaliseColorSet(input.light, DEFAULT_CUSTOM_PALETTE.light),
    dark: normaliseColorSet(input.dark, DEFAULT_CUSTOM_PALETTE.dark),
  }
}

function readPersistedState(): { themeId?: unknown; customPalette?: unknown } {
  if (typeof localStorage === 'undefined') return {}
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_STORE_KEY) ?? '{}') as {
      state?: { theme?: unknown; customPalette?: unknown }
    }
    return {
      themeId: saved.state?.theme,
      customPalette: saved.state?.customPalette,
    }
  } catch {
    return {}
  }
}

function readThemeId(value?: unknown): string {
  return typeof value === 'string' ? getTheme(value).id : getTheme(null).id
}

function readMode(): AppMode {
  if (typeof localStorage === 'undefined') return 'auto'
  return normaliseAppMode(localStorage.getItem(MODE_KEY)) ?? 'auto'
}

function makeState(themeId: string, mode: AppMode, customPalette: CustomPalette): AppThemeState {
  const theme = getTheme(themeId)
  const supportedMode = themeSupportsMode(theme, mode) ? mode : 'auto'
  return {
    themeId: theme.id,
    mode: supportedMode,
    resolvedMode: resolveThemeMode(theme, supportedMode, prefersDark()),
    customPalette,
  }
}

function readState(): AppThemeState {
  const persisted = readPersistedState()
  return makeState(
    readThemeId(persisted.themeId),
    readMode(),
    normaliseCustomPalette(persisted.customPalette),
  )
}

function sameCustomPalette(left: CustomPalette, right: CustomPalette): boolean {
  return (['light', 'dark'] as const).every(mode =>
    left[mode].background === right[mode].background &&
    left[mode].surface === right[mode].surface &&
    left[mode].text === right[mode].text &&
    left[mode].primary === right[mode].primary &&
    left[mode].primaryForeground === right[mode].primaryForeground &&
    left[mode].border === right[mode].border,
  )
}

function setActiveState(next: AppThemeState): void {
  if (
    activeState?.themeId === next.themeId &&
    activeState.mode === next.mode &&
    activeState.resolvedMode === next.resolvedMode &&
    sameCustomPalette(activeState.customPalette, next.customPalette)
  ) return
  activeState = next
  listeners.forEach(listener => listener())
}

function getSnapshot(): AppThemeState {
  if (!activeState) activeState = readState()
  return activeState
}

function getServerSnapshot(): AppThemeState {
  return SERVER_STATE
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
      state: { ...savedState, theme: state.themeId, customPalette: state.customPalette },
    }))
    localStorage.setItem(MODE_KEY, state.mode)
  } catch {
    // Private browsing and storage policies can reject writes. The active DOM theme still applies.
  }
}

function applyCustomTokens(state: AppThemeState): void {
  const root = document.documentElement
  const palette = state.customPalette[state.resolvedMode]
  root.style.setProperty('--custom-background', palette.background)
  root.style.setProperty('--custom-surface', palette.surface)
  root.style.setProperty('--custom-text', palette.text)
  root.style.setProperty('--custom-primary', palette.primary)
  root.style.setProperty('--custom-primary-foreground', palette.primaryForeground)
  root.style.setProperty('--custom-border', palette.border)
}

function commitDom(theme: Theme, state: AppThemeState): void {
  const root = document.documentElement
  if (state.themeId === CUSTOM_THEME_ID) applyCustomTokens(state)
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

export function applyAppTheme(
  themeId: string,
  mode: AppMode,
  shouldPersist = true,
  customPalette = getSnapshot().customPalette,
): AppThemeState {
  const theme = getTheme(themeId)
  const next = makeState(theme.id, mode, normaliseCustomPalette(customPalette))
  if (shouldPersist) persist(next)
  setActiveState(next)
  if (typeof document !== 'undefined') applyStylesheet(theme, next)
  return next
}

export function useAppTheme() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    const current = getSnapshot()
    ensureFontLink(getTheme(current.themeId))
    applyAppTheme(current.themeId, current.mode, false, current.customPalette)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = () => {
      const latest = getSnapshot()
      if (latest.mode === 'auto') applyAppTheme(latest.themeId, 'auto', false, latest.customPalette)
    }
    const onStorage = (event: StorageEvent) => {
      if (![THEME_STORE_KEY, MODE_KEY].includes(event.key ?? '')) return
      const persisted = readPersistedState()
      applyAppTheme(readThemeId(persisted.themeId), readMode(), false, normaliseCustomPalette(persisted.customPalette))
    }
    media.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => {
      media.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const setThemeId = useCallback((themeId: string) => {
    const current = getSnapshot()
    const theme = getTheme(themeId)
    const mode = themeSupportsMode(theme, current.mode) ? current.mode : 'auto'
    applyAppTheme(theme.id, mode, true, current.customPalette)
  }, [])

  const setMode = useCallback((mode: AppMode) => {
    const current = getSnapshot()
    applyAppTheme(current.themeId, mode, true, current.customPalette)
  }, [])

  const setCustomPalette = useCallback((palette: CustomPalette) => {
    const current = getSnapshot()
    applyAppTheme(current.themeId, current.mode, true, palette)
  }, [])

  return { ...state, setThemeId, setMode, setCustomPalette }
}
