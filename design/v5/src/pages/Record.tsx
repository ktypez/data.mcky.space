import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, MapPin, PencilLine, Pin, StickyNote, Trash2 } from "lucide-react";
import { useState } from "react";
import MapView from "@/components/MapView";
import {
  Asterisk, BadgeChip, ConfirmDialog, CopyChip, DetailRow, Monogram, SectionLabel, badgeLabel,
} from "@/components/ui";
import { badgeColor, copyText, formatDate, ledger, timeAgo, useClients } from "@/lib/data";
import { navigate } from "@/lib/router";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

export default function Record({ id }: { id: string }) {
  const all = useClients();
  const client = all.find((c) => c.id === id);
  const { signedIn } = useAuth();
  const { push } = useToast();
  const [confirming, setConfirming] = useState(false);

  if (!client) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 pb-24 text-center">
        <span className="sticker mx-auto grid size-16 place-items-center rounded-2xl bg-poptint text-popink" style={{ boxShadow: "4px 4px 0 0 var(--pop)" }}>
          <Asterisk className="size-8" strokeWidth={2.8} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">This page fell out of the book</h1>
        <p className="mt-2 font-mono text-sm text-soft">no entry “{id}”</p>
        <button className="btn btn-acc mt-6" onClick={() => navigate("#/")}>Back to the catalog</button>
      </div>
    );
  }

  const gate = () => {
    if (signedIn) return true;
    push("Sign in to make changes", "info");
    navigate("#/login");
    return false;
  };

  const bg = badgeColor(client.badge);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6">
      <button className="btn btn-ghost !px-3 -ml-3 text-[13px]" onClick={() => navigate("#/")}>
        <ArrowLeft size={16} strokeWidth={2.5} /> Catalog
      </button>

      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="mt-6 flex flex-wrap items-end justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          {client.photo ? (
            <div className="sticker -rotate-2 overflow-hidden rounded-2xl p-1" style={{ boxShadow: "4px 4px 0 0 var(--hard)" }}>
              <img src={client.photo} alt={client.name} className="size-20 rounded-xl object-cover" />
            </div>
          ) : (
            <span className="-rotate-2"><Monogram name={client.name} size={84} className="!rounded-2xl" /></span>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{client.name}</h1>
            <p className="mt-0.5 text-sm text-soft">{client.owner}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <BadgeChip badge={client.badge} />
              <CopyChip text={client.code}><Pin size={11} strokeWidth={2.8} />{client.code}</CopyChip>
              {client.deletedAt && <span className="chip bg-dangertint text-dangerink">in trash</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            className="btn btn-line !px-4 !py-2.5 text-[13px]"
            onClick={async () => { if (await copyText(`${location.origin}${location.pathname}#/c/${client.id}`)) push("Record link copied", "copy"); }}
          >
            Copy link
          </button>
          {!client.deletedAt && (
            <>
              <button className="btn btn-ghost !px-4 !py-2.5 text-[13px]" onClick={() => gate() && navigate(`#/edit/${client.id}`)}>
                <PencilLine size={15} strokeWidth={2.5} /> Edit
              </button>
              <button
                className="btn btn-ghost !px-4 !py-2.5 text-[13px] !text-danger hover:!bg-dangertint hover:!text-dangerink"
                onClick={() => gate() && setConfirming(true)}
              >
                <Trash2 size={15} strokeWidth={2.5} /> Delete
              </button>
            </>
          )}
        </div>
      </motion.div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* details */}
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.35 }} className="card card-pad">
          <SectionLabel>Ledger details</SectionLabel>
          <dl className="mt-2">
            <DetailRow label="Entry ID" value={client.id} copy={client.id} mono />
            <DetailRow label="Code" value={<span className="rounded-md bg-paper2 px-1.5 py-0.5">{client.code}</span>} copy={client.code} mono />
            <DetailRow label="Payment" value={badgeLabel(client.badge)} />
            <DetailRow label="Notes" value={client.notes.trim() ? "1 note pinned" : "no notes yet"} />
            <DetailRow label="Updated" value={`${timeAgo(client.updatedAt)} · ${formatDate(client.updatedAt)}`} />
            <DetailRow label="Created" value={formatDate(client.createdAt)} />
            <DetailRow label="Added by" value={client.by} mono />
          </dl>
        </motion.section>

        <div className="space-y-6">
          {/* notes sticky */}
          <motion.section initial={{ opacity: 0, y: 12, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 1 }} transition={{ delay: 0.12, duration: 0.35 }}>
            {client.notes.trim() ? (
              <div className="sticker rotate-1 rounded-2xl !border-pop bg-poptint p-5" style={{ boxShadow: "4px 4px 0 0 var(--pop)" }}>
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-popink uppercase">
                  <StickyNote size={13} strokeWidth={2.6} /> Note
                </div>
                <p className="mt-2 text-[15px] leading-relaxed font-medium text-ink">{client.notes}</p>
              </div>
            ) : (
              <div className="rounded-2xl border-[1.5px] border-dashed border-rule2 p-5 text-sm text-faint">
                No notes on this entry — the editor has a spot for them.
              </div>
            )}
          </motion.section>

          {/* address */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.35 }} className="card card-pad">
            <SectionLabel>Address</SectionLabel>
            <p className="mt-3 text-[14.5px] leading-relaxed font-medium">{client.address}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="btn btn-line !px-3.5 !py-2 text-[12.5px]"
                onClick={async () => { if (await copyText(client.address)) push("Address copied", "copy"); }}
              >
                Copy address
              </button>
              <a
                className="btn btn-ghost !px-3.5 !py-2 text-[12.5px]"
                href={`https://www.google.com/maps/search/${encodeURIComponent(client.address)}`}
                target="_blank" rel="noreferrer"
              >
                Open in Google Maps <ExternalLink size={13} strokeWidth={2.4} />
              </a>
            </div>
          </motion.section>

          {/* location */}
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24, duration: 0.35 }} className="card overflow-hidden">
            {client.geo ? (
              <>
                <MapView
                  className="h-56 w-full"
                  pins={[{ id: client.id, lat: client.geo.lat, lng: client.geo.lng, color: bg, title: client.name, sub: client.code }]}
                  center={[client.geo.lat, client.geo.lng]}
                  zoom={15}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <span className="flex items-center gap-2 font-mono text-[12.5px] font-semibold text-soft">
                    <MapPin size={14} strokeWidth={2.5} className="text-pop" />
                    {client.geo.lat.toFixed(5)}, {client.geo.lng.toFixed(5)}
                  </span>
                  <button className="btn btn-ghost !px-3 !py-1.5 text-[12px]" onClick={() => navigate("#/maps")}>Full map</button>
                </div>
              </>
            ) : (
              <div className="card-pad">
                <SectionLabel>Location</SectionLabel>
                <p className="mt-3 text-sm text-soft">Not pinned on the map yet.</p>
                <button className="btn btn-line mt-4 !px-3.5 !py-2 text-[12.5px]" onClick={() => gate() && navigate(`#/edit/${client.id}`)}>
                  Drop a pin in the editor
                </button>
              </div>
            )}
          </motion.section>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Move to trash?"
        body={`“${client.name}” leaves the catalog but stays recoverable in Trash for 30 days.`}
        confirmLabel="Move to trash"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          ledger.softDelete(client.id);
          setConfirming(false);
          push("Moved to trash", "trash");
          navigate("#/");
        }}
      />
    </div>
  );
}
