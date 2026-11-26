# SPEC — Adopt the V5 "Paper Pop" design in `data-ledger` (Svelte 5)

## 0. Read this first

`design/v5/` is the **visual source of truth**. It is a React 19 + TypeScript + Tailwind v4
prototype the user built by hand. **Read every file under `design/v5/src/` before writing any
code** — `styles/tokens.css`, `index.css`, `components/ui.tsx`, `components/TopBar.tsx`,
`components/MapView.tsx`, `pages/*.tsx`, `lib/theme.tsx`, `lib/data.ts`, `lib/router.ts`.

You are porting a **design**, not a framework. The app stays Svelte 5 (runes) +
svelte-spa-router + Tailwind v4 + Clerk + Elysia/D1 + leaflet + phosphor-svelte.
**Do not convert anything to React. Do not add runtime dependencies.**

## 1. Hard rules (violating any of these fails the task)

1. **Presentation only.** Do not change behaviour in: `src/lib/api.ts`, `src/lib/treaty.ts`,
   `src/lib/clerk.ts`, `src/stores/*`, `src/lib/data-cache.ts`, `src/lib/offline-*.ts`,
   `src/lib/form-dirty.ts`, `src/lib/pwa-*.ts`, `src/lib/map-*.ts`, `src/lib/photo-*.ts`,
   `src/types/*`, `src/lib/utils.ts`, `src/lib/clientText.ts`, `src/lib/clientNames.ts`.
   Every existing feature must survive: Clerk sign-in/out, admin gating (`canMutate`),
   offline queue + refresh, `@tanstack/svelte-virtual` list virtualization, keyboard nav
   (arrow keys / Enter / Escape), `setFormDirty` + `askLeave` guard, toasts, PWA update flow,
   photo upload/compress, map picker, command palette, filter chips with live counts.
2. **Routes stay exactly as they are** (svelte-spa-router): `/`, `/c/:id`, `/edit/:id`, `/add`,
   `/maps`, `/trash`, `/settings`, `/login`, 404. Keep the same `push(...)` call sites.
3. **All user-facing text stays Thai.** The prototype is English; translate every label using
   the map in §7. Do not invent new English UI copy.
4. **Accessibility is not optional.** Keep every `aria-label`, `aria-pressed`, `role="status"`,
   `role="group"`, `aria-hidden`, focus-visible ring, and ≥44px touch target that exists today.
   The V5 look must not remove them.
5. **No new dependencies.** `framer-motion` → Svelte transitions / CSS keyframes (the prototype's
   `index.css` already ships `floaty`, `pop-dots`, `lspin`). `lucide-react` → `phosphor-svelte`
   (already installed). `react-hook-form`/`zod` → keep the existing Svelte form logic.
6. `npm run build`, `npm run typecheck` (svelte-check) and `npm run test:run` (vitest) must all
   pass with **zero** errors. Fix tests you break; do not delete them.

## 2. Token layer

The prototype's `design/v5/src/styles/tokens.css` is the complete token set. Port it verbatim
(only the selector mechanics change, see §3):

```
--paper --paper-2 --card --ink --ink-soft --ink-faint --rule --rule-2
--acc --acc-strong --tint --acc-ink --pop --pop-tint --pop-ink
--credit --credit-tint --credit-ink --pen --pen-tint --pen-ink
--danger --danger-tint --danger-ink --banana --sky
--shadow --shadow-sm --shadow-pop --border-w --rowh --pad-card --font-ui --font-mono
```

Steps:

- Create `src/styles/v5-tokens.css` (tokens) and `src/styles/v5-ui.css` (the component classes
  from `design/v5/src/index.css`: `.card .sticker .btn .btn-acc .btn-pop .chip .kbd .field
  .label .seg .seg-item .count-sticker .squiggle .row .row:hover .mono .pop-dots` plus the
  `@keyframes` and the leaflet overrides). Import both from `src/index.css` **after**
  `@import 'tailwindcss'`.
- In the existing `@theme inline` block of `src/index.css`, expose the V5 tokens as Tailwind
  utilities (`--color-paper`, `--color-paper-2`, `--color-card`, `--color-ink`, `--color-ink-soft`,
  `--color-ink-faint`, `--color-rule`, `--color-rule-2`, `--color-acc`, `--color-acc-strong`,
  `--color-tint`, `--color-acc-ink`, `--color-pop`, `--color-pop-tint`, `--color-pop-ink`,
  `--color-credit`, `--color-credit-tint`, `--color-credit-ink`, `--color-pen`, `--color-pen-tint`,
  `--color-pen-ink`, `--color-danger`, `--color-danger-tint`, `--color-danger-ink`,
  `--color-banana`, `--color-sky`, `--font-sans`, `--font-mono`).
- **Keep the legacy shadcn-ish tokens alive as aliases** so nothing breaks mid-port and the
  leaflet/pwa/photo CSS keeps resolving:
  `--color-background: var(--paper)`, `--color-foreground: var(--ink)`,
  `--color-card: var(--card)`, `--color-card-foreground: var(--ink)`,
  `--color-popover: var(--card)`, `--color-primary: var(--acc)`,
  `--color-primary-foreground: var(--acc-ink)`, `--color-secondary: var(--paper-2)`,
  `--color-muted: var(--paper-2)`, `--color-muted-foreground: var(--ink-soft)`,
  `--color-accent: var(--pop)`, `--color-border: var(--rule)`, `--color-input: var(--rule)`,
  `--color-ring: var(--acc)`, `--color-destructive: var(--danger)`,
  `--color-success: var(--acc)`, `--color-warning: var(--banana)`, `--color-info: var(--sky)`.
- `src/styles/ledger.css` (the V4 shell: `.ledger-rail`, `.ledger-colhead`, `.ledger-row`,
  `.ledger-topbar`, `.ledger-bottomnav`, …) is **replaced** by the V5 component classes. Delete
  what becomes dead; keep anything still referenced by leaflet/pwa/photo CSS.

## 3. Theme system → V5 palettes

The prototype drives colour with `data-palette` (4 palettes) × `data-mode` (light/dark) ×
`data-density` (cozy/compact) × `data-texture` (on/off). The app already has a pre-paint
stylesheet + `data-theme` + `.dark` mechanism (`public/themes/*.css`, `src/lib/design/themes.ts`
generated by `scripts/gen-themes.mjs`, boot script in `index.html`, `src/lib/app-theme.ts`).

**Keep that mechanism; swap its payload:**

- Replace the 6 presets (`ledger`, `claude`, `blueprint`, `mono`, `lotus`, `terminal`) with the
  4 V5 palettes: **`matcha` (default), `coral`, `blueberry`, `butter`** — ids, labels and hues
  exactly as `PALETTES` in `design/v5/src/lib/theme.tsx`.
- Ship **one** static stylesheet `public/themes/paper-pop.css` holding the whole V5 token block
  (all 4 palettes × light/dark). Every theme entry points `staticCss` at it.
- Colour selection moves from `data-theme` to **`data-palette`** on `<html>`; dark mode keeps
  using the existing `.dark` class (rewrite `:root[data-mode="dark"]` → `:root.dark` in the
  ported CSS, and keep setting `data-mode` too so nothing else breaks).
- Add `data-density` (`cozy` | `compact`) and `data-texture` (`on` | `off`) on `<html>`, persisted
  in `localStorage` under a new key (e.g. `data-ledger-v5`). Read them in the pre-paint boot
  script in `index.html` so there is no flash.
- Update `scripts/gen-themes.mjs` (the generator — do **not** hand-edit `themes.ts`), regenerate
  `src/lib/design/themes.ts`, and update the `THEMES` map in the `index.html` boot script.
  Keep `getTheme`, `isDarkOnlyTheme`, `isLightOnlyTheme`, `isDualModeTheme`, `isCharacterTheme`,
  `themeGroups` exports and their signatures.
- Update `src/lib/app-theme.test.ts`'s `PRESET_IDS` to the 4 new ids. Everything else in that
  test must still pass unchanged.
- `src/lib/app-theme.ts`: keep `themeId`/`mode`/`resolvedMode`/`setMode`/`initAppTheme`/`commitDom`
  API, add `palette`/`density`/`texture` state with setters, and keep the `data-ledger-ui` +
  `data-ledger-mode` storage keys working for backwards compatibility (migrate stale ids to
  `matcha`).

## 4. Shell (replaces rail + header + bottom nav)

Port `design/v5/src/components/TopBar.tsx` as `src/components/TopBar.svelte`:

- Sticky top bar, `border-bottom: 1.5px solid var(--ink)`, `background: var(--paper)`.
- Wordmark: **"DATA" in a rotated accent sticker + "Ledger" in ink** (the prototype's exact
  treatment), linking to `/`.
- Desktop (`sm:` and up): nav **pills** — รายการ / แผนที่ / ถังขยะ / ตั้งค่า — active pill gets
  `background: var(--acc); color: var(--acc-ink)` + hard shadow, inactive gets the dotted paper
  fill. Keep `aria-current`/`aria-pressed` semantics equivalent to today's active state.
- Admin-only "เพิ่มรายการ" pill (gate on the existing `canMutate`/admin check) — keep it.
- Right side: theme/mode toggle button, then the account menu (avatar monogram + name + email +
  Sign in / Sign out) wired to the existing `authStore`/`clerk` module. Keep the outside-click
  and Escape handling.
- Mobile: the nav becomes a horizontally scrollable pill row under the bar (prototype's
  `sm:hidden` block). **Drop the left rail and the bottom nav entirely** — V5 has neither.
- Keep the footer (`src/components/Footer.svelte` or wherever it lives) but restyle it to the V5
  paper treatment. Keep the existing PWA update banner and offline/online indicator, restyled.
- Keep the command palette and the PWA install prompt, restyled to V5 (`.card` + `.btn`).

## 5. Svelte component primitives to build

Create `src/components/ui/` (Svelte 5, runes, typed props) mirroring `design/v5/src/components/ui.tsx`:

| Component | Notes |
|---|---|
| `Card.svelte` | `.card` + `.sticker` treatment, optional `title`/`right` snippet |
| `Button.svelte` | variants `acc` / `pop` / `ghost` / `danger`, sizes, `disabled`, keeps ≥44px hit area |
| `Chip.svelte` | filter chip with optional count badge, `aria-pressed` |
| `Field.svelte` | `.field` label + control wrapper |
| `Seg.svelte` / `SegItem.svelte` | segmented control (`.seg`), radiogroup semantics |
| `Kbd.svelte` | `.kbd` |
| `CountSticker.svelte` | rotated count sticker |
| `Squiggle.svelte` | inline SVG squiggle underline |
| `Monogram.svelte` | avatar initial from a name, deterministic hue |
| `Badge.svelte` | payment badge (credit / penpay / none) using `--credit*` / `--pen*` |
| `Toast` | keep the existing toast system, restyle to V5 stickers |

Reuse them everywhere; do not re-implement the classes inline per page.

## 6. Page-by-page port

Keep each page's **existing script block** (stores, derived state, handlers, keyboard nav,
virtualization, treaty calls, dirty guard) and rewrite only the **markup + classes** to match
the prototype.

- **`Catalog.svelte`** → `design/v5/src/pages/Catalog.tsx`. Big page header with squiggle +
  count sticker; search `.field` with hard shadow + clear button + refresh button; filter chips
  row with live counts (keep the app's 7 filters: ทั้งหมด / มีรูป / ไม่มีรูป / มีโน้ต / ล่าสุด /
  จ่ายในวัน / บัตรเครดิต — the prototype only has 5, use the app's set); sort seg; the card list
  with a column header row; **keep `@tanstack/svelte-virtual`**; the sticky hover-preview aside
  (`lg:` only) becomes a V5 `.card` with monogram, badges and two buttons. Keep the mobile
  filter sheet trigger.
- **`Record.svelte`** → `Record.tsx`. Ghost back button; header with rotated photo sticker
  (keep `PhotoModal`/upload preview), monogram fallback, badges, action buttons (คัดลอกลิงก์ /
  แก้ไข / คัดลอกข้อมูล / ย้ายไปถังขยะ — keep `canMutate` gating and the confirm dialog);
  two-column grid: details `<dl>` + notes card + address card + map card (keep
  `MapPreviewDynamic`). Keep the stale-refresh and offline-restore logic untouched.
- **`Editor.svelte`** → `Editor.tsx`. Sections: ข้อมูลหลัก / รูปภาพ / ที่อยู่และโน้ต /
  ปักหมุดบนแผนที่. Sticky bottom action bar with บันทึก / เพิ่มในระเบียน + ยกเลิก. Keep
  `setFormDirty`, `askLeave`, read-only mode, photo upload, and `MapPicker`.
- **`Maps.svelte`** → `Maps.tsx` + `MapView.tsx`. Legend chips (บัตรเครดิต / จ่ายในวัน / อื่นๆ)
  with counts, one big `.card` map, keep the existing marker grouping, selection panel and
  `map-dark-mode.ts` integration. Keep leaflet CSS overrides from the prototype.
- **`Trash.svelte`** → `Trash.tsx`. Info sticker banner, list rows with กู้คืน / ลบถาวร and the
  confirm dialogs. Keep the treaty restore/force-delete calls and admin gating.
- **`Settings.svelte`** → `Settings.tsx`. Cards: โหมด (สว่าง/มืด seg), กระดาษจุด (texture
  toggle), ความหนาแน่นแถว (cozy/compact seg), ชุดสี (4 palette stickers, rotated, with acc/pop
  swatches), ข้อมูลระเบียน (keep the app's real data controls — Clerk account, API status,
  offline queue count, export/import, cache clear — restyled, **not** the prototype's
  "Reseed demo data"), คีย์ลัด (keep the app's real shortcut list).
- **`Login.svelte`** → `Login.tsx`. Centered sticker card, floating chips, keep the real Clerk
  sign-in flow and its loading/error states.
- **`NotFound.svelte`** → the prototype's 404 treatment.

## 7. Thai label map (prototype English → app Thai)

`Catalog` → รายการ · `New entry` → เพิ่มรายการ · `Maps` → แผนที่ · `Trash` → ถังขยะ ·
`Settings` → ตั้งค่า · `Search` placeholder → ค้นหาชื่อ ร้าน หรือ ID · `All` → ทั้งหมด ·
`Credit` → บัตรเครดิต · `Pay daily` → จ่ายในวัน · `Has notes` → มีโน้ต · `Pinned` → มีพิกัด ·
`Recent` → ล่าสุด · `Name` → ชื่อ · `Ledger details` → รายละเอียดระเบียน · `Entry ID` → รหัสรายการ ·
`Code` → โคด · `Payment` → การชำระ · `Notes` → โน้ต · `Updated` → แก้ไขล่าสุด · `Created` → สร้างเมื่อ ·
`Added by` → เพิ่มโดย · `Address` → ที่อยู่ · `Copy address` → คัดลอกที่อยู่ ·
`Open in Google Maps` → เปิดใน Google Maps · `Full map` → แผนที่เต็ม · `Location` → ตำแหน่ง ·
`Not pinned` → ยังไม่ปักหมุด · `Drop a pin` → ปักหมุดในตัวแก้ไข · `Move to trash` → ย้ายไปถังขยะ ·
`Edit` → แก้ไข · `Copy link` → คัดลอกลิงก์ · `Copy details` → คัดลอกข้อมูล ·
`Edit entry` → แก้ไขรายการ · `New entry` → รายการใหม่ · `Who` → ข้อมูลหลัก ·
`Client name` → ชื่อลูกค้า/ร้านค้า · `Contact / owner` → ผู้ติดต่อ/เจ้าของ ·
`Payment type` → ประเภทการชำระ · `Cash / walk-in` → เงินสด · `Photo` → รูปภาพ ·
`Where & what` → ที่อยู่และโน้ต · `Pin on map` → ปักหมุดบนแผนที่ · `Save changes` → บันทึก ·
`Add to ledger` → เพิ่มในระเบียน · `Cancel` → ยกเลิก · `Unsaved changes` → ยังไม่บันทึก ·
`Throw away changes?` → ทิ้งการเปลี่ยนแปลง? · `Mode` → โหมด · `Dotted paper` → กระดาษจุด ·
`Row density` → ความหนาแน่นแถว · `Cozy` → สบายตา · `Compact` → กระชับ · `Palette` → ชุดสี ·
`Ledger data` → ข้อมูลระเบียน · `Shortcuts` → คีย์ลัด · `Keys of the book` → คีย์ลัดของหนังสือ ·
`Resting entries` → รายการที่พักอยู่ · `Restore` → กู้คืน · `Delete forever` → ลบถาวร ·
`Sign in` → เข้าสู่ระบบ · `Sign out` → ออกจากระบบ · `Account menu` → เมนูบัญชี ·
`Back` → กลับ · `Open record` → เปิดระเบียน · `just now` → เมื่อสักครู่ ·
`{n}m ago` → {n} นาทีที่แล้ว · `{n}h ago` → {n} ชม. ที่แล้ว · `{n}d ago` → {n} วันที่แล้ว ·
`{n}w ago` → {n} สัปดาห์ที่แล้ว

Dates: the app already has `formatDate`/`formatDateTime` in `src/lib/utils.ts` — keep using them,
do not switch to the prototype's `toLocaleDateString('en-GB')`.

## 8. Fonts

Add **Sora** (400/600/700/800) + **JetBrains Mono** (500/700) to `index.html` with `preconnect`,
and keep **Noto Sans Thai** in the stack — Thai glyphs must never fall back to a Latin-only font.
Set `--font-ui: "Sora", "Noto Sans Thai", ui-sans-serif, system-ui, sans-serif` and
`--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
Remove the now-unused Instrument Sans / Noto Sans Thai `fontUrl` entries from the theme
generator only if nothing else references them.

## 9. Motion

Replace `framer-motion` usage with Svelte's built-in transitions (`fade`, `fly`, `scale`) or the
prototype's CSS keyframes. Match the prototype's feel: cards `scale` in from 0.97 + fade, rows
stagger, the account menu and mobile filter sheet `fly`/`scale`. Respect
`prefers-reduced-motion` (the prototype already does — keep that).

## 10. Verify before you finish

Run all of these and paste the results in your final report:

```
npm ci
npm run typecheck      # svelte-check, zero errors
npm run test:run       # vitest, zero failures
npm run build          # vite build, zero errors
```

Then start `npm run preview` and confirm the shell, all 8 routes, light/dark, all 4 palettes,
both densities, texture on/off, mobile ≤640px and desktop render without console errors.
Report anything you could not verify.

## 11. Out of scope

- No changes to the API worker (`api/`), the database schema, or Clerk configuration.
- No new npm dependencies.
- No new routes, no new features, no data-model changes.
- Do not delete `design/v5/` — it stays in the repo as the design reference.
