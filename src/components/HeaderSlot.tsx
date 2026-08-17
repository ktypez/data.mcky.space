import { createContext, useContext, useState, type ReactNode } from 'react'

/**
 * HeaderSlotContext — lets a deeply-nested page register an extra control
 * row that should render in the PageHeader (between search/title and the
 * right-side theme + add buttons). Currently used by the Clients page to
 * hoist its SelectionToolbar (filter / refresh / view-mode / selection
 * toggle) up into the header bar so it stays visible while the list scrolls.
 *
 * Only ONE slot is supported; the last provider wins. On mobile (<md) the
 * page can register null to hide the slot and fall back to the in-pane
 * toolbar pattern.
 */
type Slot = ReactNode

const HeaderSlotContext = createContext<{
  slot: Slot
  setSlot: (s: Slot) => void
} | null>(null)

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<Slot>(null)
  return (
    <HeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </HeaderSlotContext.Provider>
  )
}

export function useHeaderSlot() {
  const ctx = useContext(HeaderSlotContext)
  if (!ctx) {
    // No provider — caller just no-ops. Lets non-Client pages opt out
    // without ceremony.
    return { slot: null as Slot, setSlot: () => {} }
  }
  return ctx
}
