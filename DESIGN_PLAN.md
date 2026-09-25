# DESIGN_PLAN — DATA Ledger V3

**Status:** Locked and implemented
**Direction:** Command catalog with dense filter pills, compact records, and shared themes

## Shell and routes

- `src/App.tsx` owns the application shell, navigation, route guards, and page loading.
- `/` renders the complete virtualized catalog.
- `/c/:id` renders a client record and lazy-loads full details.
- `/add` and `/edit/:id` render the shared editor workflow.
- `/trash`, `/maps`, and `/settings` are top-level application routes.
- `/__design_lab/detail` is the retained detail-design reference route.

## Catalog

- `src/pages/Catalog.tsx` provides search, keyboard navigation, filter counts, copy actions, and row navigation.
- The full filtered result set remains in memory while `@tanstack/react-virtual` renders only the visible row window plus a small overscan.
- The lightweight list response includes `hasNotes`, allowing the Notes filter without downloading note contents for every client.
- The Notes filter also accepts full records whose note text is already loaded.

## Record and editor

- `src/pages/Record.tsx` uses semantic rows, resilient image fallbacks, copy feedback, detail status, and an on-demand map.
- `src/pages/Editor.tsx` shares name, badge, notes, address, photo, and location components with the rest of the application.
- Dirty-form protection prevents accidental navigation while edits are unsaved.
- Authentication gates all mutating actions on both client and API.

## Visual system

- `src/styles/ledger.css` defines the application shell and structural CSS without embedding a single theme palette.
- `src/lib/design/themes.ts` and `src/lib/app-theme.ts` provide shared light/dark themes, mode persistence, and custom palettes.
- `src/components/AppThemePicker.tsx` uses `@uiw/react-color` for custom color selection and reports unsafe text contrast combinations.
- Theme fonts, background treatments, and color tokens are applied consistently across catalog, records, editor, maps, and settings.

## Accessibility and resilience

- Search, filters, dialogs, rows, tabs, uploads, and status regions have explicit labels or semantic controls.
- Keyboard focus is visible, dialogs restore focus, and reduced-motion preferences are respected.
- Deep links hydrate their data before rendering.
- Stale thumbnails fall back cleanly, map instances are disposed on exit, and offline/404 states are explicit.
