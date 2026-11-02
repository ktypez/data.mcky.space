import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, FileText, MapPin } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { BADGE_META, copyText, type Client, type PayBadge } from "@/lib/data";
import { useToast } from "@/lib/toast";

/* ——— wordmark ——— */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <a href="#/" className="group flex items-center gap-2.5" aria-label="data·mcky — home">
      <span className="sticker grid size-9 place-items-center rounded-xl bg-acc text-white transition-transform duration-200 group-hover:-rotate-6">
        <Asterisk className="size-5" strokeWidth={3} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-mono text-[15px] font-bold tracking-tight">data·mcky</span>
          <Squiggle className="mt-1 h-[5px] w-[74px] text-acc" />
        </span>
      )}
    </a>
  );
}

export function Asterisk({ className, strokeWidth = 2.6, style }: { className?: string; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <path d="M12 3v18M4.3 7.5l15.4 9M19.7 7.5l-15.4 9" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
}

export function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 74 6" className={className} aria-hidden preserveAspectRatio="none">
      <path d="M1 4c6-3.5 8-3.5 14 0s8 3.5 14 0 8-3.5 14 0 8 3.5 14 0 8-3.5 14 0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/* ——— monogram / photo ——— */
const TINTS = ["var(--acc-tint)", "var(--pop-tint)", "var(--credit-tint)", "var(--penpay-tint)"];
const INKS = ["var(--acc-ink)", "var(--pop-ink)", "var(--credit-ink)", "var(--penpay-ink)"];

export function Monogram({ name, size = 40, className = "" }: { name: string; size?: number; className?: string }) {
  const i = Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % TINTS.length;
  const letters = Array.from(name.replace(/\s/g, "")).slice(0, 2).join("");
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border font-bold ${className}`}
      style={{
        width: size, height: size,
        background: TINTS[i], color: INKS[i],
        borderColor: "color-mix(in srgb, currentColor 35%, transparent)",
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {letters}
    </span>
  );
}

/* ——— chips ——— */
export function BadgeChip({ badge }: { badge: PayBadge }) {
  if (badge === "credit")
    return <span className="chip bg-credittint text-creditink border-creditink/20"><CreditDot />Credit</span>;
  if (badge === "penpay")
    return <span className="chip bg-pentint text-penink border-penink/20"><PenDot />Pay daily</span>;
  return <span className="chip border-rule text-faint bg-paper2/60">—</span>;
}
const CreditDot = () => <span className="size-1.5 rounded-full bg-credit" />;
const PenDot = () => <span className="size-1.5 rounded-full bg-pen" />;

export function NotesFlag({ hasNotes }: { hasNotes: boolean }) {
  return hasNotes ? (
    <span className="chip bg-tint text-accink gap-1.5"><FileText size={12} strokeWidth={2.6} />noted</span>
  ) : (
    <span className="chip text-faint">—</span>
  );
}

export function PinFlag() {
  return <span className="chip bg-poptint text-popink gap-1"><MapPin size={12} strokeWidth={2.6} />pinned</span>;
}

/* ——— copy chip ——— */
export function CopyChip({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  const [done, setDone] = useState(false);
  const { push } = useToast();
  return (
    <button
      type="button"
      className={`chip cursor-copy border border-rule2 bg-card font-mono text-[12px] font-semibold text-soft transition-all hover:-translate-y-px hover:border-acc hover:text-accink hover:bg-tint ${className}`}
      onClick={async (e) => {
        e.stopPropagation();
        if (await copyText(text)) { setDone(true); push(`Copied ${text}`, "copy"); setTimeout(() => setDone(false), 1200); }
      }}
      title={`Copy ${text}`}
    >
      {children}
      {done ? <Check size={12} strokeWidth={3} className="text-acc" /> : <Copy size={12} strokeWidth={2.5} />}
    </button>
  );
}

/* ——— count sticker ——— */
export function CountSticker({ n, label, rot = -2 }: { n: number | string; label: string; rot?: number }) {
  return (
    <span
      className="sticker inline-flex -rotate-2 items-baseline gap-1.5 rounded-xl px-3 py-1.5"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <span className="font-mono text-lg font-bold text-accink">{n}</span>
      <span className="text-[11px] font-bold tracking-wide text-soft uppercase">{label}</span>
    </span>
  );
}

/* ——— empty state ——— */
export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="sticker grid size-16 place-items-center rounded-2xl bg-tint text-accink" style={{ boxShadow: "4px 4px 0 0 var(--acc)" }}>
        <Asterisk className="size-8" strokeWidth={2.8} />
      </span>
      <div>
        <p className="text-lg font-bold">{title}</p>
        <p className="mt-1 text-sm text-soft">{hint}</p>
      </div>
      {action}
    </div>
  );
}

/* ——— confirm dialog ——— */
export function ConfirmDialog({
  open, title, body, confirmLabel = "Confirm", danger = false, onCancel, onConfirm,
}: {
  open: boolean; title: string; body?: string; confirmLabel?: string; danger?: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] grid place-items-center bg-ink/25 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={onCancel}
        >
          <motion.div
            role="alertdialog" aria-label={title}
            className="sticker w-full max-w-sm rounded-3xl p-6"
            style={{ boxShadow: "6px 6px 0 0 var(--hard)" }}
            initial={{ scale: 0.9, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl border-[1.5px] ${danger ? "border-danger bg-dangertint text-dangerink" : "border-acc bg-tint text-accink"}`} style={{ boxShadow: "2px 2px 0 0 currentColor" }}>
                <Asterisk className="size-5" strokeWidth={3} />
              </span>
              <div>
                <h3 className="text-[17px] font-bold">{title}</h3>
                {body && <p className="mt-1 text-sm leading-relaxed text-soft">{body}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button className="btn btn-ghost" onClick={onCancel}>Back</button>
              <button
                className={`btn ${danger ? "btn-line text-dangerink" : "btn-acc"}`}
                style={danger ? { boxShadow: "2.5px 2.5px 0 0 var(--danger)" } : undefined}
                onClick={onConfirm}
                autoFocus
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ——— misc ——— */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-faint uppercase">
      <Asterisk className="size-3 text-acc" strokeWidth={3.5} />
      {children}
    </h2>
  );
}

export function DetailRow({ label, value, copy, mono = false }: { label: string; value: ReactNode; copy?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-rule py-3.5 last:border-0">
      <dt className="shrink-0 pt-0.5 text-[12px] font-bold tracking-wide text-faint uppercase">{label}</dt>
      <dd className={`min-w-0 text-right text-[14px] font-medium ${mono ? "font-mono" : ""}`}>
        <span className="inline-flex flex-wrap items-center justify-end gap-2">
          {value}
          {copy && <CopyChip text={copy} className="!px-2" children={null} />}
        </span>
      </dd>
    </div>
  );
}

export function badgeLabel(badge: PayBadge): string {
  return badge ? `${BADGE_META[badge].label} · ${BADGE_META[badge].th}` : "Cash / walk-in";
}

export function clientHasNotes(c: Client): boolean {
  return c.notes.trim().length > 0;
}
