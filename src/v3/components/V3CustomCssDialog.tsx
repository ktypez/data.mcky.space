import { useState, useEffect, useRef, useCallback } from 'react'
import { PaintBrush, Check, CircleNotch } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  getCustomCss,
  setCustomCss,
  clearCustomCss,
  isCustomCssOn,
  setCustomCssOn,
  applyCustomCss,
  looksLikeCss,
  MAX_CSS_CHARS,
} from '@/v3/lib/custom-css'
import type { CssPreset } from '@/v3/lib/css-presets'

/* Presets ship in a lazy chunk — the dialog is the only importer, so the
   catalog never pays for the 42 baked-in tweakcn themes. */
let presetsPromise: Promise<CssPreset[]> | null = null
function loadPresets(): Promise<CssPreset[]> {
  if (!presetsPromise)
    presetsPromise = import('@/v3/lib/css-presets').then((m) => m.CSS_PRESETS)
  return presetsPromise
}

/** Pull a few tokens out of a preset's :root block for the swatch dots. */
function presetSwatch(css: string) {
  const lightBlock = css.split('.dark')[0]
  const token = (name: string, fallback: string) =>
    lightBlock.match(new RegExp(`--${name}:\\s*([^;]+)`))?.[1]?.trim() || fallback
  return {
    background: token('background', '#eee'),
    primary: token('primary', '#888'),
    muted: token('secondary', '#ccc'),
  }
}

export function V3CustomCssButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Custom theme"
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
      >
        <PaintBrush className="h-4 w-4" />
      </button>
      <V3CustomCssDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

type Tab = 'presets' | 'custom'

function V3CustomCssDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [tab, setTab] = useState<Tab>('presets')
  const [css, setCss] = useState('')
  const [presets, setPresets] = useState<CssPreset[] | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Snapshot of what was in storage when we opened — Cancel restores it so
  // live previews can write freely without committing.
  const snapshotRef = useRef<{ css: string; on: boolean } | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (previewTimer.current) clearTimeout(previewTimer.current) }, [])

  useEffect(() => {
    if (!open) return
    snapshotRef.current = { css: getCustomCss(), on: isCustomCssOn() }
    setCss(snapshotRef.current.css)
    setSelectedPreset(
      isCustomCssOn()
        ? (presets ?? []).find((p) => p.css === snapshotRef.current?.css)?.id ?? null
        : null,
    )
    setTab('presets')
    setError(null)
    void loadPresets().then((ps) => {
      setPresets(ps)
      // Match selection once the roster arrives.
      const snap = snapshotRef.current
      if (snap?.on) setSelectedPreset(ps.find((p) => p.css === snap.css)?.id ?? null)
    })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Write + apply immediately (live preview behind the modal). */
  const preview = useCallback((nextCss: string, on: boolean) => {
    setCustomCss(nextCss)
    setCustomCssOn(on)
    applyCustomCss()
  }, [])

  const restoreSnapshot = useCallback(() => {
    const snap = snapshotRef.current
    if (snap) {
      setCustomCss(snap.css)
      setCustomCssOn(snap.on)
      applyCustomCss()
    }
  }, [])

  const close = useCallback(
    (commit: boolean) => {
      if (!commit) restoreSnapshot()
      onOpenChange(false)
    },
    [restoreSnapshot, onOpenChange],
  )

  const pickPreset = useCallback(
    (p: CssPreset) => {
      setSelectedPreset(p.id)
      setError(null)
      preview(p.css, true)
    },
    [preview],
  )

  // Textarea → debounced live preview (per-keystroke full-style rewrites
    // are wasteful on low-end devices).
  const onCssChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      setCss(value)
      setSelectedPreset(null)
      if (previewTimer.current) clearTimeout(previewTimer.current)
      previewTimer.current = setTimeout(() => {
        const trimmed = value.trim()
        if (trimmed && !looksLikeCss(trimmed)) {
          setError("Doesn't look like valid CSS — check for unmatched braces.")
          return
        }
        if (trimmed.length > MAX_CSS_CHARS) {
          setError(`Too long (max ${Math.round(MAX_CSS_CHARS / 1000)}k chars).`)
          return
        }
        setError(null)
        preview(trimmed, !!trimmed)
      }, 250)
    },
    [preview],
  )

  const editPresetAsCustom = useCallback(() => {
    const p = (presets ?? []).find((x) => x.id === selectedPreset)
    if (p) setCss(p.css)
    setTab('custom')
  }, [presets, selectedPreset])

  const clearAll = useCallback(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current)
    setCss('')
    setSelectedPreset(null)
    setError(null)
    clearCustomCss()
    applyCustomCss()
  }, [])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close(false)}>
      <DialogContent className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <DialogTitle className="text-base">Theme</DialogTitle>
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {(
              [
                ['presets', 'Presets'],
                ['custom', 'Custom CSS'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-lg transition-colors',
                  tab === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <DialogDescription className="text-xs">
          Presets via{' '}
          <a
            href="https://tweakcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            onClick={(e) => e.stopPropagation()}
          >
            tweakcn
          </a>{' '}
          or your own CSS. Previews live — Cancel restores.
        </DialogDescription>

        {tab === 'presets' ? (
          presets === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <CircleNotch className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading presets…</span>
            </div>
          ) : (
            <div className="max-h-[34vh] overflow-y-auto pr-1 grid grid-cols-3 gap-1.5">
              {presets.map((p) => {
                const sw = presetSwatch(p.css)
                const active = selectedPreset === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => pickPreset(p)}
                    title={p.label}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left text-xs transition-colors',
                      active
                        ? 'border-foreground bg-muted'
                        : 'border-border hover:bg-muted/60',
                    )}
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                      style={{ background: sw.background, borderColor: sw.muted }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: sw.primary }}
                      />
                    </span>
                    <span className="truncate">{p.label}</span>
                    {active && <Check weight="bold" className="h-3 w-3 ml-auto shrink-0" />}
                  </button>
                )
              })}
            </div>
          )
        ) : (
          <textarea
            value={css}
            onChange={onCssChange}
            spellCheck={false}
            placeholder={
              ":root {\n  --background: oklch(0.99 0.002 240);\n  --foreground: oklch(0.17 0.02 260);\n  ...\n}\n\n.dark {\n  ...\n}"
            }
            className="w-full h-32 resize-y rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Reset to V3 default
            </button>
            {tab === 'presets' && selectedPreset && (
              <button
                onClick={editPresetAsCustom}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Edit as custom →
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => close(false)}
              className="px-2.5 py-1 text-xs rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => close(true)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {tab === 'presets' ? 'Keep' : 'Save'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
