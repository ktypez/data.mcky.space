<script lang="ts">
  import { CaretDown, Check, X } from 'phosphor-svelte'
  import { getTheme, themeGroups, themes } from '@/lib/design/themes'
  import type { ThemeGroupId } from '@/lib/design/tokens'
  import {
    DEFAULT_CUSTOM_PALETTE,
    contrastRatio,
    hasReadableForeground,
    readableForeground,
    type CustomColorSet,
    type CustomPalette,
  } from '@/lib/app-theme'
  import './AppThemePicker.css'

  let {
    themeId,
    setThemeId,
    customPalette,
    setCustomPalette,
  }: {
    themeId: string
    setThemeId: (themeId: string) => void
    customPalette: CustomPalette
    setCustomPalette: (palette: CustomPalette) => void
  } = $props()

  const PRESET_THEMES = themes.filter((theme) => theme.id !== 'custom')
  type ResolvedMode = 'light' | 'dark'
  type PickerTab = 'themes' | 'custom'
  type ColorKey = keyof Omit<CustomColorSet, 'primaryForeground'>

  function groupOf(theme: (typeof themes)[number]): ThemeGroupId {
    const group = themeGroups.find((candidate) => candidate.matches(theme))
    if (!group) throw new Error(`Theme "${theme.id}" matches no theme group`)
    return group.id
  }

  function cleanDescription(value: string): string {
    return value.replace(/\s+[—–-]\s+/g, ', ')
  }

  let dialogRef: HTMLDialogElement
  let tab = $state<PickerTab>('themes')
  let resolvedMode: ResolvedMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  let draft = $state<CustomColorSet>(customPalette[resolvedMode])
  let selected = $derived(getTheme(themeId))
  let openGroups = $state<ThemeGroupId[]>([groupOf(getTheme(themeId))])
  let activeColor = $state<ColorKey>('primary')

  const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
    { key: 'background', label: 'พื้นหลัง' },
    { key: 'surface', label: 'พื้นการ์ด' },
    { key: 'text', label: 'ตัวอักษร' },
    { key: 'primary', label: 'สีหลัก' },
    { key: 'border', label: 'เส้นขอบ' },
  ]
  let activeField = $derived(COLOR_FIELDS.find((f) => f.key === activeColor) ?? COLOR_FIELDS[0])
  let lowTextContrast = $derived(contrastRatio(draft.text, draft.background) < 4.5)
  let lowPrimaryContrast = $derived(!hasReadableForeground(draft.primary))

  function updateColor(key: ColorKey, value: string) {
    draft = {
      ...draft,
      [key]: value,
      ...(key === 'primary' ? { primaryForeground: readableForeground(value) } : {}),
    }
  }

  function toggleGroup(groupId: ThemeGroupId) {
    openGroups = openGroups.includes(groupId) ? openGroups.filter((id) => id !== groupId) : [...openGroups, groupId]
  }

  function onTriggerKeyDown(event: KeyboardEvent, groupId: ThemeGroupId) {
    const order = themeGroups.map((group) => group.id)
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = order[(order.indexOf(groupId) + step + order.length) % order.length]
    document.getElementById(`app-theme-group-${next}-trigger`)?.focus()
  }

  function open() {
    tab = themeId === 'custom' ? 'custom' : 'themes'
    draft = customPalette[resolvedMode]
    if (dialogRef && !dialogRef.open) dialogRef.showModal()
  }
  function close() {
    dialogRef?.close()
  }
  function applyCustom() {
    setCustomPalette({ ...customPalette, [resolvedMode]: draft })
    setThemeId('custom')
    close()
  }
</script>

{#snippet swatches(theme: (typeof themes)[number], dark: boolean)}
  {@const palette = theme.id === 'custom'
    ? {
        '--background': customPalette[dark ? 'dark' : 'light'].background,
        '--primary': customPalette[dark ? 'dark' : 'light'].primary,
        '--accent': customPalette[dark ? 'dark' : 'light'].primary,
        '--border': customPalette[dark ? 'dark' : 'light'].border,
      }
    : dark
      ? theme.dark
      : theme.light}
  <span class="app-theme-swatches" aria-hidden>
    <span style="background-color: {palette['--background']}"></span>
    <span style="background-color: {palette['--primary']}"></span>
    <span style="background-color: {palette['--accent']}"></span>
    <span style="background-color: {palette['--border']}"></span>
  </span>
{/snippet}

<button type="button" class="app-theme-trigger" onclick={open} aria-haspopup="dialog">
  {@render swatches(selected, resolvedMode === 'dark')}
  <span class="app-theme-trigger-copy">
    <strong>{selected.label}</strong>
    <small>{cleanDescription(selected.description)}</small>
  </span>
  <CaretDown size={16} weight="bold" aria-hidden />
</button>

<dialog
  bind:this={dialogRef}
  class="app-theme-dialog"
  aria-labelledby="app-theme-dialog-title"
  onclick={(event) => {
    if (event.target === dialogRef) close()
  }}
>
  <div class="app-theme-dialog-bar">
    <div>
      <strong id="app-theme-dialog-title">เลือกธีม</strong>
      <small>ใช้ร่วมกันทุกหน้า</small>
    </div>
    <button type="button" class="app-theme-dialog-close" onclick={close} aria-label="ปิดตัวเลือกธีม">
      <X size={16} weight="bold" />
    </button>
  </div>

  <div class="app-theme-tabs" role="tablist" aria-label="หมวดธีม">
    <button
      type="button"
      id="app-theme-themes-tab"
      role="tab"
      aria-controls="app-theme-panel"
      aria-selected={tab === 'themes'}
      data-active={tab === 'themes'}
      onkeydown={(e) => e.key === 'ArrowRight' && (tab = 'custom')}
      onclick={() => (tab = 'themes')}
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
      onkeydown={(e) => e.key === 'ArrowLeft' && (tab = 'themes')}
      onclick={() => {
        draft = customPalette[resolvedMode]
        tab = 'custom'
      }}
    >
      Custom
    </button>
  </div>

  <div id="app-theme-panel" role="tabpanel" class="app-theme-dialog-body">
    {#if tab === 'themes'}
      <div class="app-theme-groups">
        {#each themeGroups as group}
          {@const items = PRESET_THEMES.filter((theme) => group.matches(theme))}
          {#if items.length > 0}
            {@const open = openGroups.includes(group.id)}
            {@const hasActive = items.some((theme) => theme.id === themeId)}
            <section class="app-theme-group">
              <h3 class="app-theme-group-heading">
                <button
                  type="button"
                  id="app-theme-group-{group.id}-trigger"
                  class="app-theme-group-trigger"
                  data-open={open}
                  data-has-active={hasActive}
                  aria-expanded={open}
                  aria-controls="app-theme-group-{group.id}"
                  onclick={() => toggleGroup(group.id)}
                  onkeydown={(event) => onTriggerKeyDown(event, group.id)}
                >
                  <CaretDown size={14} weight="bold" class="app-theme-group-caret" aria-hidden />
                  <span class="app-theme-group-copy">
                    <strong>{group.label}</strong>
                    <small>{group.description}</small>
                  </span>
                  <span class="app-theme-group-count">{items.length}</span>
                </button>
              </h3>
              <div id="app-theme-group-{group.id}" role="group" hidden={!open} class="app-theme-group-panel">
                <div class="app-theme-grid" role="radiogroup" aria-label="ธีมกลุ่ม{group.label}">
                  {#each items as theme}
                    {@const active = theme.id === themeId}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      data-active={active}
                      class="app-theme-card"
                      onclick={() => {
                        setThemeId(theme.id)
                        close()
                      }}
                    >
                      {@render swatches(theme, resolvedMode === 'dark')}
                      <span class="app-theme-card-copy">
                        <span class="app-theme-card-label">
                          {theme.label}
                          {#if active}<Check size={14} weight="bold" aria-label="ธีมปัจจุบัน" />{/if}
                        </span>
                        <span class="app-theme-card-description">{cleanDescription(theme.description)}</span>
                      </span>
                    </button>
                  {/each}
                </div>
              </div>
            </section>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="app-custom-editor">
        <div class="app-custom-heading">
          <div>
            <strong>สี Custom</strong>
            <small>จับคู่สำหรับโหมด{resolvedMode === 'dark' ? 'มืด' : 'สว่าง'}แยกกัน</small>
          </div>
          <span class="app-custom-mode">{resolvedMode === 'dark' ? 'DARK' : 'LIGHT'}</span>
        </div>

        <div class="app-custom-colors">
          {#each COLOR_FIELDS as field}
            <div class="app-color-field">
              <button
                type="button"
                class="app-color-trigger"
                data-active={activeColor === field.key}
                aria-pressed={activeColor === field.key}
                aria-label={`เลือกสี${field.label}`}
                onclick={() => (activeColor = field.key)}
              >
                <span>{field.label}</span>
                <span class="app-color-value">
                  <span class="app-color-swatch" style="background-color: {draft[field.key]}" aria-hidden></span>
                  <code>{draft[field.key]}</code>
                </span>
              </button>
            </div>
          {/each}
        </div>

        <section class="app-color-picker-panel" data-color-mode={resolvedMode}>
          <div class="app-color-picker-heading">
            <strong>{activeField.label}</strong>
            <code>{draft[activeColor]}</code>
          </div>
          <input
            type="color"
            value={draft[activeColor]}
            oninput={(e) => updateColor(activeColor, e.currentTarget.value)}
            aria-label={`ตัวเลือกสี${activeField.label}`}
            class="h-10 w-full cursor-pointer rounded-lg border border-border bg-card p-1"
          />
        </section>

        {#if lowTextContrast || lowPrimaryContrast}
          <p class="app-custom-warning" role="status">
            {lowTextContrast && 'คอนทราสต์ตัวอักษรบนพื้นหลังต่ำกว่า 4.5:1 '}
            {lowPrimaryContrast && 'คอนทราสต์ตัวอักษรบนสีหลักต่ำกว่า 4.5:1'}
            ควรปรับสีอีกครั้ง
          </p>
        {/if}

        <div class="app-custom-preview" style="background: {draft.background}; border-color: {draft.border}">
          <span style="color: {draft.text}">Aa ตัวอักษรหลัก</span>
          <span style="background: {draft.primary}; color: {draft.primaryForeground}">สีหลัก</span>
        </div>
      </div>
      <div class="app-custom-actions">
        <button type="button" onclick={() => (draft = DEFAULT_CUSTOM_PALETTE[resolvedMode])}>ค่าเริ่มต้น</button>
        <button type="button" class="app-custom-apply" onclick={applyCustom}>ใช้ธีม Custom</button>
      </div>
    {/if}
  </div>
</dialog>
