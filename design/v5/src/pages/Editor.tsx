import { motion } from "framer-motion";
import { ArrowLeft, CircleSlash, Crosshair, ImagePlus, Lock, MapPin, Save } from "lucide-react";
import { useMemo, useState } from "react";
import MapView from "@/components/MapView";
import { Asterisk, ConfirmDialog, Monogram, SectionLabel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { badgeColor, ledger, PHOTOS, useClients, type ClientInput, type PayBadge } from "@/lib/data";
import { navigate } from "@/lib/router";
import { useToast } from "@/lib/toast";

const BADGES: Array<{ value: PayBadge; label: string; dot: string | null }> = [
  { value: null, label: "Cash / walk-in", dot: null },
  { value: "credit", label: "Credit card", dot: "#4c6fe7" },
  { value: "penpay", label: "Pay daily", dot: "#e08a0b" },
];

export default function Editor({ id }: { id?: string }) {
  const { signedIn } = useAuth();
  const { push } = useToast();
  const all = useClients();
  const existing = id ? all.find((c) => c.id === id) : undefined;

  const initial: ClientInput = useMemo(() => ({
    name: existing?.name ?? "",
    owner: existing?.owner ?? "",
    badge: existing?.badge ?? null,
    notes: existing?.notes ?? "",
    address: existing?.address ?? "",
    photo: existing?.photo ?? null,
    geo: existing?.geo ?? null,
  }), [existing]);

  const [form, setForm] = useState<ClientInput>(initial);
  const [showDiscard, setShowDiscard] = useState(false);
  const [touched, setTouched] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const nameMissing = touched && !form.name.trim();

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-md px-4 pt-28 pb-24 text-center">
        <span className="sticker mx-auto grid size-16 place-items-center rounded-2xl bg-tint text-accink" style={{ boxShadow: "4px 4px 0 0 var(--acc)" }}>
          <Lock className="size-7" strokeWidth={2.4} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Editor is for signed-in keepers</h1>
        <p className="mt-2 text-sm leading-relaxed text-soft">Reading the ledger is open to everyone. Writing in it needs a session.</p>
        <button className="btn btn-acc mt-6" onClick={() => navigate("#/login")}>Go to sign in</button>
      </div>
    );
  }

  if (id && !existing) {
    return (
      <div className="mx-auto max-w-md px-4 pt-28 pb-24 text-center">
        <span className="sticker mx-auto grid size-16 place-items-center rounded-2xl bg-poptint text-popink"><Asterisk className="size-7" /></span>
        <h1 className="mt-5 text-2xl font-extrabold">Nothing to edit</h1>
        <p className="mt-2 font-mono text-sm text-soft">no entry “{id}”</p>
        <button className="btn btn-acc mt-6" onClick={() => navigate("#/")}>Back to catalog</button>
      </div>
    );
  }

  const save = () => {
    if (!form.name.trim()) { setTouched(true); return; }
    const rec = existing
      ? (ledger.update(existing.id, form), existing)
      : ledger.add(form);
    push(existing ? "Entry updated" : "Added to the ledger", "ok");
    navigate(`#/c/${rec.id}`);
  };

  const back = () => (dirty ? setShowDiscard(true) : navigate(existing ? `#/c/${existing.id}` : "#/"));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-24 sm:px-6">
      <button className="btn btn-ghost !px-3 -ml-3 text-[13px]" onClick={back}>
        <ArrowLeft size={16} strokeWidth={2.5} /> {existing ? existing.name : "Catalog"}
      </button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-6">
        <h1 className="text-3xl font-extrabold tracking-tight">{existing ? "Edit entry" : "New entry"}</h1>
        <p className="mt-1.5 text-sm text-soft">
          {existing ? <>Tweaking <span className="font-mono font-semibold">{existing.code}</span> — history keeps the old copy.</> : "A fresh line in the book. Code is stamped on save."}
        </p>
      </motion.div>

      <div className="mt-8 space-y-6">
        {/* identity */}
        <section className="card card-pad">
          <SectionLabel>Who</SectionLabel>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="f-name">Client name</label>
              <input
                id="f-name" className="field" value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setTouched(true); }}
                placeholder="ร้านค้า / ชื่อลูกค้า" autoFocus
                aria-invalid={nameMissing}
              />
              {nameMissing && <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-danger"><CircleSlash size={12} /> The book needs a name for this line.</p>}
            </div>
            <div>
              <label className="label" htmlFor="f-owner">Contact / owner</label>
              <input id="f-owner" className="field" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="ป้าแดง" />
            </div>
            <div>
              <label className="label">Payment type</label>
              <div className="seg w-full sm:w-auto" role="group" aria-label="Payment type">
                {BADGES.map((b) => (
                  <button key={b.label} aria-pressed={form.badge === b.value} onClick={() => setForm({ ...form, badge: b.value })} className="flex-1 sm:flex-none">
                    {b.dot && <span className="mr-1.5 inline-block size-2 rounded-full align-middle" style={{ background: b.dot }} />}
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* photo */}
        <section className="card card-pad">
          <div className="flex items-center justify-between">
            <SectionLabel>Photo</SectionLabel>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-faint"><ImagePlus size={13} /> pick a shop snap</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-7">
            <button
              onClick={() => setForm({ ...form, photo: null })}
              aria-pressed={form.photo === null}
              className={`grid aspect-square place-items-center rounded-xl border-[1.5px] transition-all hover:-translate-y-0.5 ${form.photo === null ? "border-acc bg-tint shadow-[2.5px_2.5px_0_0_var(--acc)]" : "border-dashed border-rule2 text-faint hover:border-ink"}`}
            >
              <Monogram name={form.name || "?"} size={38} />
            </button>
            {PHOTOS.map((p) => (
              <button
                key={p}
                onClick={() => setForm({ ...form, photo: p })}
                aria-pressed={form.photo === p}
                className={`overflow-hidden rounded-xl border-[1.5px] transition-all hover:-translate-y-0.5 ${form.photo === p ? "border-acc shadow-[2.5px_2.5px_0_0_var(--acc)]" : "border-transparent opacity-75 hover:opacity-100"}`}
              >
                <img src={p} alt="" className="aspect-square size-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* address + notes */}
        <section className="card card-pad">
          <SectionLabel>Where & what</SectionLabel>
          <div className="mt-5 space-y-5">
            <div>
              <label className="label" htmlFor="f-addr">Address</label>
              <textarea id="f-addr" rows={2} className="field resize-none" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="12/4 ถ.สุขุมวิท ซ.22, คลองเตย, กรุงเทพฯ 10110" />
            </div>
            <div>
              <label className="label" htmlFor="f-notes">Notes</label>
              <textarea id="f-notes" rows={2} className="field resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ชอบจ่ายช่วงต้นเดือน…" />
              <p className="mt-2 text-[11.5px] text-faint">Short reminders render as a sticky note on the record.</p>
            </div>
          </div>
        </section>

        {/* location */}
        <section className="card overflow-hidden">
          <div className="card-pad flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
            <div>
              <SectionLabel>Pin on map</SectionLabel>
              <p className="mt-2 flex items-center gap-1.5 text-[12px] text-faint"><Crosshair size={13} /> Click anywhere on the map to drop the pin.</p>
            </div>
            {form.geo && (
              <div className="flex items-center gap-2">
                <span className="chip bg-tint font-mono text-accink">{form.geo.lat.toFixed(4)}, {form.geo.lng.toFixed(4)}</span>
                <button className="btn btn-ghost !px-3 !py-1.5 text-[12px]" onClick={() => setForm({ ...form, geo: null })}>Remove</button>
              </div>
            )}
          </div>
          <MapView
            className="h-60 w-full"
            pickable
            onPick={(lat, lng) => setForm({ ...form, geo: { lat, lng } })}
            pins={form.geo ? [{ id: "draft", lat: form.geo.lat, lng: form.geo.lng, color: badgeColor(form.badge), title: form.name || "new entry" }] : []}
            center={form.geo ? [form.geo.lat, form.geo.lng] : [13.7563, 100.5018]}
            zoom={11}
          />
          <div className="flex items-center gap-2 border-t border-rule bg-paper2/40 p-3 text-[11.5px] font-semibold text-faint">
            <MapPin size={13} /> {form.geo ? "Pin set — click again to nudge it." : "No pin yet — optional, only stamps coordinates."}
          </div>
        </section>

        {/* footer actions */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-rule bg-paper/90 p-3 backdrop-blur-md">
          <button className="btn btn-ghost" onClick={back}>Cancel</button>
          <div className="flex items-center gap-3">
            {dirty && <span className="chip bg-poptint text-popink">unsaved changes</span>}
            <button className="btn btn-acc" onClick={save}><Save size={16} strokeWidth={2.4} /> {existing ? "Save changes" : "Add to ledger"}</button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDiscard}
        title="Throw away changes?"
        body="The edits on this page haven't been saved yet."
        confirmLabel="Discard"
        danger
        onCancel={() => setShowDiscard(false)}
        onConfirm={() => { setShowDiscard(false); navigate(existing ? `#/c/${existing.id}` : "#/"); }}
      />
    </div>
  );
}
