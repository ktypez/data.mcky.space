import { useState, useEffect, useRef, useCallback } from 'react'
import { PaintBrush } from '@phosphor-icons/react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
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

function V3CustomCssDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [css, setCss] = useState('')
  const [on, setOn] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Sync from localStorage when dialog opens
  useEffect(() => {
    if (!open) return
    setCss(getCustomCss())
    setOn(isCustomCssOn())
    setDirty(false)
    setError(null)
  }, [open])

  const save = useCallback(() => {
    const trimmed = css.trim()
    if (trimmed && !looksLikeCss(trimmed)) {
      setError("Doesn't look like valid CSS — check for unmatched braces.")
      return
    }
    if (trimmed.length > MAX_CSS_CHARS) {
      setError(`Too long (max ${Math.round(MAX_CSS_CHARS / 1000)}k chars).`)
      return
    }
    setCustomCss(trimmed)
    setCustomCssOn(on)
    applyCustomCss()
    setDirty(false)
    setError(null)
    onOpenChange(false)
  }, [css, on, onOpenChange])

  const clearAll = useCallback(() => {
    setCss('')
    setOn(false)
    clearCustomCss()
    applyCustomCss()
    setDirty(false)
    setError(null)
  }, [])

  const onCssChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCss(e.target.value)
    setDirty(true)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Custom Theme</DialogTitle>
        <DialogDescription>
          Paste CSS from{' '}
          <a
            href="https://tweakcn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            tweakcn.com
          </a>{' '}
          or any shadcn theme generator. Variables like <code>--background</code>,{' '}
          <code>--primary</code>, etc. will override the active theme.
        </DialogDescription>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm font-medium">Active</span>
          <Switch
            checked={on}
            onCheckedChange={(v) => {
              setOn(v)
              setDirty(true)
            }}
          />
        </div>

        <textarea
          ref={taRef}
          value={css}
          onChange={onCssChange}
          spellCheck={false}
          placeholder={":root {\n  --background: oklch(0.99 0.002 240);\n  --foreground: oklch(0.17 0.02 260);\n  ...\n}\n\n.dark {\n  ...\n}"}
          className="w-full h-48 resize-y rounded-lg border border-border bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear all
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!dirty}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Save
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
