# DESIGN_PLAN — v3 Registry (locked from Lab F)

**Chosen:** Variant F — Command + C pill (E ทั้งหมด + filter pill แบบ C, avatar ใช้รูป)
**Source:** Design Lab `/__design_lab/f` → synthesized from E (keyboard palette) + C (dense mono pill)
**Locked:** 2026-08-30

## Tokens
- Isolation: `html:has(.v3-shell)` + `.v3-shell` (ไม่ชน v2/classic)
- Light only: --background oklch(98% 0.005 95) warm, --foreground near-black 18%, --card white, --border 88%, --radius 16px
- Font: Inter + Noto Sans Thai (body), mono for pills/kbd
- Pill: `.v3-pill[data-active]` — active=bg-foreground text-background, inactive=muted

## Components
- `src/v3/V3App.tsx` — shell + routing /v3, /v3/c/:id, /v3/add, /v3/edit/:id, /v3/trash
- `src/v3/pages/V3Catalog.tsx` — command list: search (⌘K) + C-style dense pill (mono, counts) + focused row (bg-foreground) + avatar round image (AppImage) + keyboard ArrowUp/Down Enter
- `src/v3/pages/V3Record.tsx` — header avatar round image, copy/link, edit/delete, map, photos lightbox
- `src/v3/pages/V3Editor.tsx` — reuse InlineAddEditView
- `src/v3/pages/V3Trash.tsx` — avatar round image + restore/force delete
- `src/v3/styles/v3.css` — isolation contract

## A11y
- Search input autoFocus, aria-label, keyboard nav
- Row role=button? uses button element (accessible)
- Pill aria via data-active
- Focus ring via outline
- Contrast: foreground on background 16:1, muted 4.5:1+

## Avatar Change (requested)
- From: letter initial in circle
- To: `AppImage` src={c.images[0]} rounded-full 28x28 (catalog), 56x56 (record), 40x40 (trash) — fallback to initial if no image

## Next steps
- Verify at /v3: keyboard, filter, navigation, avatar image loads
- If need dark mode, add [data-mode] variant later
- Cleanup: `design-lab:cleanup` removes `src/__design_lab` and `.design-lab` if no longer needed (keep global skill)

## Routes
- /v3 → V3Catalog (Command)
- /v3/c/:id → V3Record
- /v3/add, /v3/edit/:id → V3Editor
- /v3/trash → V3Trash
- /__design_lab/* → Lab (keep for reference)
