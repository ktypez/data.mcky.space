import { ArchiveRestore, Info, Trash2 } from "lucide-react";
import { useState } from "react";
import { Asterisk, BadgeChip, ConfirmDialog, CountSticker, EmptyState, Monogram, SectionLabel, Squiggle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { ledger, timeAgo, useClients, type Client } from "@/lib/data";
import { navigate } from "@/lib/router";
import { useToast } from "@/lib/toast";

export default function Trash() {
  const all = useClients();
  const trashed = all.filter((c) => c.deletedAt).sort((a, b) => +new Date(b.deletedAt!) - +new Date(a.deletedAt!));
  const { signedIn } = useAuth();
  const { push } = useToast();
  const [purging, setPurging] = useState<Client | null>(null);

  const gate = () => {
    if (signedIn) return true;
    push("Sign in to manage the trash", "info");
    navigate("#/login");
    return false;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Trash</h1>
            <CountSticker n={trashed.length} label="resting" rot={-2} />
          </div>
          <Squiggle className="mt-2 h-[6px] w-32 text-danger" />
        </div>
      </div>

      <div className="sticker mt-7 flex -rotate-[0.6deg] items-start gap-3 rounded-2xl !border-acc bg-tint p-4" style={{ boxShadow: "3px 3px 0 0 var(--acc)" }}>
        <Info size={17} strokeWidth={2.4} className="mt-0.5 shrink-0 text-accink" />
        <p className="text-[13.5px] leading-relaxed font-medium text-accink">
          Deletes are soft — entries nap here for 30 days, then disappear forever. Restore anytime.
        </p>
      </div>

      <div className="mt-8">
        <SectionLabel>Resting entries</SectionLabel>
        <div className="card mt-4 overflow-hidden">
          {trashed.length === 0 ? (
            <EmptyState
              title="Trash is squeaky clean"
              hint="Deleted clients will land here first — nothing is ever lost immediately."
              action={<button className="btn btn-line" onClick={() => navigate("#/")}>Back to catalog</button>}
            />
          ) : (
            <ul>
              {trashed.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b border-dashed border-rule px-4 py-3 last:border-0">
                  <span className="opacity-70 saturate-50">
                    {c.photo ? <img src={c.photo} alt="" className="size-10 rounded-xl border border-rule object-cover" /> : <Monogram name={c.name} size={40} className="!rounded-xl" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold">{c.name}</p>
                    <p className="font-mono text-[11.5px] text-faint">{c.code} · deleted {c.deletedAt ? timeAgo(c.deletedAt) : ""}</p>
                  </div>
                  <div className="hidden sm:block"><BadgeChip badge={c.badge} /></div>
                  <button
                    className="btn btn-line !px-3.5 !py-2 text-[12.5px]"
                    onClick={() => { if (!gate()) return; ledger.restore(c.id); push(`Restored “${c.name}”`, "ok"); }}
                  >
                    <ArchiveRestore size={14} strokeWidth={2.5} /> Restore
                  </button>
                  <button
                    className="grid size-9 place-items-center rounded-full text-faint transition-colors hover:bg-dangertint hover:text-danger"
                    aria-label={`Delete ${c.name} forever`}
                    onClick={() => gate() && setPurging(c)}
                  >
                    <Trash2 size={16} strokeWidth={2.4} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {trashed.length > 0 && (
          <p className="mt-4 flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.12em] text-faint uppercase">
            <Asterisk className="size-3" strokeWidth={3} /> gone for good after 30 days <Asterisk className="size-3" strokeWidth={3} />
          </p>
        )}
      </div>

      <ConfirmDialog
        open={purging !== null}
        title="Delete forever?"
        body={purging ? `“${purging.name}” will be shredded — there is no undo for this one.` : ""}
        confirmLabel="Shred it"
        danger
        onCancel={() => setPurging(null)}
        onConfirm={() => {
          if (purging) { ledger.purge(purging.id); push(`“${purging.name}” deleted forever`, "trash"); }
          setPurging(null);
        }}
      />
    </div>
  );
}
