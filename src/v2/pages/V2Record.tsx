import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowSquareOut,
  PencilSimple,
  Copy,
} from '@phosphor-icons/react'
import { useClientStore } from '@/stores/client-store'
import ClientNames from '@/components/ClientNames'
import AppImage from '@/components/AppImage'
import MapPreviewDynamic from '@/components/MapPreviewDynamic'
import Lightbox from '@/components/Lightbox'
import V2PanelBlock from '@/v2/components/V2PanelBlock'
import { copyToClipboard, formatDate, formatDateTime, getMapsUrl, hasValidCoords } from '@/lib/utils'
import { clientTextWithMaps } from '@/lib/clientText'

export default function V2Record() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const clients = useClientStore((s) => s.clients)
  const loading = useClientStore((s) => s.loading)
  const initialized = useClientStore((s) => s.initialized)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const client = useMemo(() => clients.find((c) => c.id === id), [clients, id])
  const coords = client && hasValidCoords(client.lat, client.lng)
    ? { lat: client.lat as number, lng: client.lng as number }
    : null

  if (!client) {
    // Still booting the shared store (direct URL / hard refresh)
    if (!initialized || loading) {
      return (
        <Shell>
          <p className="v2-meta animate-pulse-soft">loading record…</p>
        </Shell>
      )
    }
    return (
      <Shell>
        <div className="flex min-h-[240px] flex-col items-center justify-center border border-dashed border-border px-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase" style={{ color: 'var(--destructive)' }}>
            404
          </p>
          <h1 className="mt-3 font-mono text-base font-semibold">record not found</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            เรคคอร์ดนี้ถูกลบหรือไม่มีอยู่ (id: {id.slice(0, 12)})
          </p>
          <button type="button" className="v2-btn mt-6" onClick={() => navigate('/v2')}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            back to registry
          </button>
        </div>
      </Shell>
    )
  }

  const copyAll = () => void copyToClipboard(clientTextWithMaps(client, getMapsUrl))

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-6">
        <button type="button" className="v2-btn" onClick={() => navigate('/v2')}>
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          registry
        </button>
        <div className="flex items-center gap-2">
          <button type="button" className="v2-btn" onClick={copyAll}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">copy all</span>
          </button>
          <button
            type="button"
            className="v2-btn v2-btn-accent"
            onClick={() => navigate(`/v2/edit/${client.id}`)}
          >
            <PencilSimple className="h-3.5 w-3.5" aria-hidden="true" />
            edit
          </button>
        </div>
      </div>

      <p className="v2-eyebrow">Record · {client.id.slice(0, 8)}</p>
      <h1 className="v2-title">
        <ClientNames
          client={client}
          variant="detail"
          titleClassName="text-foreground"
          subClassName="mt-2 font-mono text-sm font-normal tracking-normal text-muted-foreground"
        />
      </h1>
      <p className="v2-meta mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>created {formatDate(client.createdAt)}</span>
        {client.updatedAt > client.createdAt && (
          <span>updated {formatDate(client.updatedAt)}</span>
        )}
        {client.badge === 'penpay' && (
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--v2-caution)' }}>
            <span className="v2-dot v2-dot-caution" aria-hidden="true" />
            penpay
          </span>
        )}
        <span>{coords ? 'pinned' : 'no pin'}</span>
        {client.images.length > 0 && <span>{client.images.length} photos</span>}
      </p>

      {/* Panels */}
      <div className="mt-8 space-y-4">
        {coords && (
          <V2PanelBlock label="Location">
            <a
              href={getMapsUrl(coords.lat, coords.lng)}
              target="_blank"
              rel="noreferrer"
              title="Open in Google Maps ↗"
              className="block h-52 cursor-pointer overflow-hidden border-b border-border md:h-64 [&_.maplibregl-marker]:transition-transform [&_.maplibregl-marker:hover]:scale-125"
            >
              <MapPreviewDynamic lat={coords.lat} lng={coords.lng} />
            </a>
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="truncate font-mono text-[12px] tabular-nums text-muted-foreground">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </span>
              <a
                href={getMapsUrl(coords.lat, coords.lng)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] tracking-[0.05em] text-primary uppercase hover:underline"
              >
                google maps
                <ArrowSquareOut className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </V2PanelBlock>
        )}

        {client.address && (
          <V2PanelBlock label="Address">
            <p className="px-3.5 py-3.5 text-[15px] leading-relaxed">{client.address}</p>
          </V2PanelBlock>
        )}

        <V2PanelBlock label="Notes">
          {client.notes ? (
            <p className="px-3.5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap">
              {client.notes}
            </p>
          ) : (
            <p className="px-3.5 py-3.5 font-mono text-[13px] text-muted-foreground">—</p>
          )}
        </V2PanelBlock>

        {client.images.length > 0 && (
          <V2PanelBlock label={`Photos · ${client.images.length}`}>
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
              {client.images.map((src, i) => (
                <button
                  key={`${i}-${src.slice(-16)}`}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  className="group aspect-square cursor-pointer overflow-hidden bg-background p-0"
                  aria-label={`Open photo ${i + 1}`}
                >
                  <AppImage
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          </V2PanelBlock>
        )}

        <p className="pt-2 font-mono text-[10px] tracking-[0.06em] text-muted-foreground/60 uppercase">
          record {client.id} · created {formatDateTime(client.createdAt)}
        </p>
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          images={client.images}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onIndexChange={setLightboxIdx}
        />
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in mx-auto w-full max-w-[880px] px-5 pt-10 pb-28 md:px-8">
      {children}
    </div>
  )
}