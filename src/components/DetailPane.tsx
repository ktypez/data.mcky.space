import { lazy, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { useClientStore } from '@/stores/client-store'
import { useAuthStore } from '@/stores/auth-store'
import { updateClient } from '@/lib/storage'
import { slideLeft, spring } from '@/lib/motion'
import type { Client } from '@/types'

const ClientDetail = lazy(() => import('@/components/ClientDetail'))

/**
 * DetailPane — right-side detail panel for desktop 3-pane layout.
 * Shows selected client detail, or empty prompt when none selected.
 * Hidden on mobile via max-md:hidden (mobile uses full-screen route switch).
 */
export default function DetailPane() {
  const { viewState, closeView } = useUIStore()
  const { clients, updateClient: updateStore } = useClientStore()
  const { isAdmin } = useAuthStore()

  const showDetail = viewState.view === 'detail'
  const client = showDetail
    ? (viewState.client ?? clients.find((c) => c.id === viewState.clientId) ?? null)
    : null

  const handleUpdate = useCallback(async (updated: Client) => {
    try {
      const saved = await updateClient(updated)
      updateStore(saved.id, saved)
      useUIStore.getState().openDetail(saved.id, saved)
    } catch {
      useClientStore.getState().refresh().catch(() => {})
    }
  }, [updateStore])

  const handleDelete = useCallback((id: string) => {
    useClientStore.getState().removeClient(id)
    closeView()
  }, [closeView])

  return (
    <div className="max-md:hidden w-[420px] shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {client ? (
          <motion.div
            key={client.id}
            variants={slideLeft}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={spring}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Pane header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <span className="text-sm font-medium text-foreground truncate">
                {client.name || client.shopName || 'รายละเอียด'}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={closeView}
                aria-label="ปิดรายละเอียด"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Detail content */}
            <div className="flex-1 overflow-y-auto">
              <ClientDetail
                client={client}
                isAdmin={isAdmin}
                clients={clients}
                onClientUpdated={handleUpdate}
                onClientDeleted={handleDelete}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center p-8"
          >
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/40">
                  <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">
                เลือกลูกค้าจากรายการด้านซ้าย
              </p>
              <p className="text-xs text-muted-foreground/60">
                หรือเพิ่มลูกค้าใหม่แล้วคลิกเพื่อดูรายละเอียด
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
