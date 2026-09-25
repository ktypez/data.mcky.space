import { useRef, useState } from 'react'
import { CaretDown, Check, X } from '@phosphor-icons/react'
import { Sketch } from '@uiw/react-color'
import { getTheme, themes } from '@/lib/design/themes'
import {
  DEFAULT_CUSTOM_PALETTE,
  contrastRatio,
  hasReadableForeground,
  readableForeground,
  type CustomColorSet,
  type CustomPalette,
} from '@/lib/app-theme'
import './AppThemePicker.css'

type ThemePickerProps = {
  themeId: string
  setThemeId: (themeId: string) => void
  customPalette: CustomPalette
  setCustomPalette: (palette: CustomPalette) => void
}

const PRESET_THEMES = themes.filter(theme => theme.id !== 'custom')
type ResolvedMode = 'light' | 'dark'
type PickerTab = 'themes' | 'custom'

function cleanDescription(value: string): string {
  return value.replace(/\s+[—–-]\s+/g, ', ')
}

function ThemeSwatches({ theme, dark, customPalette }: { theme: typeof themes[number]; dark: boolean; customPalette?: CustomPalette }) {
  const palette = theme.id === 'custom' && customPalette
    ? {
        '--background': customPalette[dark ? 'dark' : 'light'].background,
        '--primary': customPalette[dark ? 'dark' : 'light'].primary,
        '--accent': customPalette[dark ? 'dark' : 'light'].primary,
        '--border': customPalette[dark ? 'dark' : 'light'].border,
      }
    : dark ? theme.dark : theme.light
  return (
    <span className="app-theme-swatches" aria-hidden>
      <span style={{ backgroundColor: palette['--background'] }} />
      <span style={{ backgroundColor: palette['--primary'] }} />
      <span style={{ backgroundColor: palette['--accent'] }} />
      <span style={{ backgroundColor: palette['--border'] }} />
    </span>
  )
}

function ThemeGrid({
  themeId,
  setThemeId,
  dark,
  onChoose,
}: {
  themeId: string
  setThemeId: (themeId: string) => void
  dark: boolean
  onChoose?: () => void
}) {
  return (
    <div className="app-theme-grid" role="radiogroup" aria-label="เลือกธีมสำเร็จรูป">
      {PRESET_THEMES.map((theme) => {
        const active = theme.id === themeId
        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-active={active}
            className="app-theme-card"
            onClick={() => {
              setThemeId(theme.id)
              onChoose?.()
            }}
          >
            <ThemeSwatches theme={theme} dark={dark} />
            <span className="app-theme-card-copy">
              <span className="app-theme-card-label">
                {theme.label}
                {active && <Check size={14} weight="bold" aria-label="ธีมปัจจุบัน" />}
              </span>
              <span className="app-theme-card-description">{cleanDescription(theme.description)}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

const COLOR_FIELDS: { key: keyof Omit<CustomColorSet, 'primaryForeground'>; label: string }[] = [
  { key: 'background', label: 'พื้นหลัง' },
  { key: 'surface', label: 'พื้นการ์ด' },
  { key: 'text', label: 'ตัวอักษร' },
  { key: 'primary', label: 'สีหลัก' },
  { key: 'border', label: 'เส้นขอบ' },
]

function CustomEditor({
  mode,
  draft,
  setDraft,
}: {
  mode: ResolvedMode
  draft: CustomColorSet
  setDraft: (value: CustomColorSet) => void
}) {
  type ColorKey = keyof Omit<CustomColorSet, 'primaryForeground'>
  const [activeColor, setActiveColor] = useState<ColorKey>('primary')
  const activeField = COLOR_FIELDS.find((field) => field.key === activeColor) ?? COLOR_FIELDS[0]

  const updateColor = (key: ColorKey, value: string) => {
    setDraft({
      ...draft,
      [key]: value,
      ...(key === 'primary' ? { primaryForeground: readableForeground(value) } : {}),
    })
  }
  const lowTextContrast = contrastRatio(draft.text, draft.background) < 4.5
  const lowPrimaryContrast = !hasReadableForeground(draft.primary)

  return (
    <div className="app-custom-editor">
      <div className="app-custom-heading">
        <div>
          <strong>สี Custom</strong>
          <small>จับคู่สำหรับโหมด{mode === 'dark' ? 'มืด' : 'สว่าง'}แยกกัน</small>
        </div>
        <span className="app-custom-mode">{mode === 'dark' ? 'DARK' : 'LIGHT'}</span>
      </div>

      <div className="app-custom-colors">
        {COLOR_FIELDS.map(field => (
          <div key={field.key} className="app-color-field">
            <button
              type="button"
              className="app-color-trigger"
              data-active={activeColor === field.key}
              aria-pressed={activeColor === field.key}
              aria-label={`เลือกสี${field.label}`}
              onClick={() => setActiveColor(field.key)}
            >
              <span>{field.label}</span>
              <span className="app-color-value">
                <span className="app-color-swatch" style={{ backgroundColor: draft[field.key] }} aria-hidden />
                <code>{draft[field.key]}</code>
              </span>
            </button>
          </div>
        ))}
      </div>

      <section
        className="app-color-picker-panel"
        data-color-mode={mode}
        aria-labelledby="app-custom-picker-title"
      >
        <div className="app-color-picker-heading">
          <strong id="app-custom-picker-title">{activeField.label}</strong>
          <code>{draft[activeColor]}</code>
        </div>
        <Sketch
          color={draft[activeColor]}
          onChange={color => updateColor(activeColor, color.hex)}
          disableAlpha
          aria-label={`ตัวเลือกสี${activeField.label}`}
        />
      </section>

      {(lowTextContrast || lowPrimaryContrast) && (
        <p className="app-custom-warning" role="status">
          {lowTextContrast && 'คอนทราสต์ตัวอักษรบนพื้นหลังต่ำกว่า 4.5:1 '}
          {lowPrimaryContrast && 'คอนทราสต์ตัวอักษรบนสีหลักต่ำกว่า 4.5:1'}
          ควรปรับสีอีกครั้ง
        </p>
      )}

      <div className="app-custom-preview" style={{ background: draft.background, borderColor: draft.border }}>
        <span style={{ color: draft.text }}>Aa ตัวอักษรหลัก</span>
        <span style={{ background: draft.primary, color: draft.primaryForeground }}>สีหลัก</span>
      </div>
    </div>
  )
}

export default function AppThemePicker({
  themeId,
  setThemeId,
  customPalette,
  setCustomPalette,
}: ThemePickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [tab, setTab] = useState<PickerTab>('themes')
  const resolvedMode: ResolvedMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  const [draft, setDraft] = useState<CustomColorSet>(customPalette[resolvedMode])
  const selected = getTheme(themeId)

  const open = () => {
    const nextTab: PickerTab = themeId === 'custom' ? 'custom' : 'themes'
    setTab(nextTab)
    setDraft(customPalette[resolvedMode])
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }
  const close = () => dialogRef.current?.close()
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: PickerTab) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    setTab(current === 'themes' ? 'custom' : 'themes')
  }
  const applyCustom = () => {
    setCustomPalette({ ...customPalette, [resolvedMode]: draft })
    setThemeId('custom')
    close()
  }
  const resetDraft = () => setDraft(DEFAULT_CUSTOM_PALETTE[resolvedMode])

  return (
    <>
      <button type="button" className="app-theme-trigger" onClick={open} aria-haspopup="dialog">
        <ThemeSwatches theme={selected} dark={resolvedMode === 'dark'} customPalette={customPalette} />
        <span className="app-theme-trigger-copy">
          <strong>{selected.label}</strong>
          <small>{cleanDescription(selected.description)}</small>
        </span>
        <CaretDown size={16} weight="bold" aria-hidden />
      </button>

      <dialog
        ref={dialogRef}
        className="app-theme-dialog"
        aria-labelledby="app-theme-dialog-title"
        onClick={event => {
          if (event.target === dialogRef.current) close()
        }}
      >
        <div className="app-theme-dialog-bar">
          <div>
            <strong id="app-theme-dialog-title">เลือกธีม</strong>
            <small>ใช้ร่วมกันทุกหน้า</small>
          </div>
          <button type="button" className="app-theme-dialog-close" onClick={close} aria-label="ปิดตัวเลือกธีม">
            <X size={16} weight="bold" />
          </button>
        </div>

        <div className="app-theme-tabs" role="tablist" aria-label="หมวดธีม">
          <button
            type="button"
            id="app-theme-themes-tab"
            role="tab"
            aria-controls="app-theme-panel"
            aria-selected={tab === 'themes'}
            data-active={tab === 'themes'}
            onKeyDown={event => handleTabKeyDown(event, 'themes')}
            onClick={() => setTab('themes')}
          >
            ธีมสำเร็จรูป
          </button>
          <button
            type="button"
            id="app-theme-custom-tab"
            role="tab"
            aria-controls="app-theme-panel"
            aria-selected={tab === 'custom'}
            data-active={tab === 'custom'}
            onKeyDown={event => handleTabKeyDown(event, 'custom')}
            onClick={() => {
              setDraft(customPalette[resolvedMode])
              setTab('custom')
            }}
          >
            Custom
          </button>
        </div>

        <div id="app-theme-panel" role="tabpanel" aria-labelledby={tab === 'themes' ? 'app-theme-themes-tab' : 'app-theme-custom-tab'} className="app-theme-dialog-body">
          {tab === 'themes' ? (
            <ThemeGrid
              themeId={themeId}
              setThemeId={setThemeId}
              dark={resolvedMode === 'dark'}
              onChoose={close}
            />
          ) : (
            <>
              <CustomEditor mode={resolvedMode} draft={draft} setDraft={setDraft} />
              <div className="app-custom-actions">
                <button type="button" onClick={resetDraft}>ค่าเริ่มต้น</button>
                <button type="button" className="app-custom-apply" onClick={applyCustom}>ใช้ธีม Custom</button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  )
}
