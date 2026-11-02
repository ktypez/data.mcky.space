import { ArrowDownAZ, ChevronRight, Clock3, MapPin, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeChip, CopyChip, CountSticker, EmptyState, Monogram, NotesFlag, PinFlag, Squiggle } from "@/components/ui";
import {
  FILTERS, matchesFilter, matchesQuery, timeAgo, useClients,
  type Client, type FilterKey,
} from "@/lib/data";
import { navigate } from "@/lib/router";

type SortKey = "updated" | "name";

export default function Catalog() {
  const all = useClients();
  const live = useMemo(() => all.filter((c) => !c.deletedAt), [all]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [sel, setSel] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const base = useMemo(() => live.filter((c) => matchesQuery(c, query)), [live, query]);
  const counts = useMemo(() => {
    const m = {} as Record<FilterKey, number>;
    FILTERS.forEach((f) => { m[f.key] = base.filter((c) => matchesFilter(c, f.key)).length; });
    return m;
  }, [base]);
  const rows = useMemo(() => {
    const r = base.filter((c) => matchesFilter(c, filter));
    r.sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : +new Date(b.updatedAt) - +new Date(a.updatedAt));
    return r;
  }, [base, filter, sort]);

  useEffect(() => { setSel((s) => Math.min(s, Math.max(0, rows.length - 1))); }, [rows.length]);

  const focusSearch = () => { searchRef.current?.focus(); searchRef.current?.select(); };

  /* shortcuts: / · j k · arrows · enter */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
      if (e.key === "/") { if (!typing) { e.preventDefault(); focusSearch(); } return; }
      if (typing || e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape") { (document.activeElement as HTMLElement)?.blur?.(); return; }
      if (rows.length === 0) return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSel((s) => { const n = Math.min(rows.length - 1, s + 1); rowRefs.current[n]?.scrollIntoView({ block: "nearest" }); return n; });
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSel((s) => { const n = Math.max(0, s - 1); rowRefs.current[n]?.scrollIntoView({ block: "nearest" }); return n; });
      } else if (e.key === "Enter" && rows[sel]) {
        navigate(`#/c/${rows[sel].id}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, sel]);

  const current: Client | undefined = rows[sel];

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      {/* head */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Catalog</h1>
            <CountSticker n={live.length} label="entries" />
          </div>
          <Squiggle className="mt-2 h-[6px] w-36 text-acc" />
          <p className="mt-2 text-sm text-soft">Every client in the little book — search, filter, open, copy.</p>
        </div>
        <button className="btn btn-acc" onClick={() => navigate("#/add")}>
          <Plus size={17} strokeWidth={2.6} /> New entry
        </button>
      </div>

      {/* search + filters */}
      <div className="mt-8 space-y-3">
        <div className="relative max-w-xl">
          <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" strokeWidth={2.4} />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (e.target as HTMLInputElement).blur()}
            className="field !py-3 !pl-11 !pr-20 shadow-[2.5px_2.5px_0_0_var(--rule)]"
            placeholder="Search names, codes, streets, notes…"
            aria-label="Search the catalog"
          />
          <div className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2">
            {query && (
              <button onClick={() => setQuery("")} className="grid size-6 place-items-center rounded-full text-faint hover:bg-paper2 hover:text-ink" aria-label="Clear search">
                <X size={14} strokeWidth={2.6} />
              </button>
            )}
            <kbd className="kbd">/</kbd>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filters">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={`chip cursor-pointer !py-1.5 transition-all duration-150 ${
                  active
                    ? "border-[1.5px] border-ink bg-ink text-paper shadow-[2px_2px_0_0_var(--acc)]"
                    : "border-[1.5px] border-rule2 bg-card text-soft hover:-translate-y-px hover:border-ink hover:text-ink"
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 font-mono text-[10.5px] font-bold ${active ? "bg-paper/20 text-paper" : "bg-paper2 text-faint"}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
          <div className="seg ml-auto">
            <button aria-pressed={sort === "updated"} onClick={() => setSort("updated")}><Clock3 size={13} className="mr-1 inline -translate-y-px" strokeWidth={2.6} />Recent</button>
            <button aria-pressed={sort === "name"} onClick={() => setSort("name")}><ArrowDownAZ size={13} className="mr-1 inline -translate-y-px" strokeWidth={2.6} />Name</button>
          </div>
        </div>
      </div>

      {/* list + preview */}
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_330px]">
        <div className="card overflow-hidden">
          {/* column header */}
          <div className="hidden items-center gap-3 border-b border-rule bg-paper2/50 px-4 py-2.5 text-[10.5px] font-bold tracking-[0.12em] text-faint uppercase md:grid md:grid-cols-[minmax(0,1.7fr)_120px_108px_84px_20px]">
            <span>Client</span><span>Code</span><span>Type · notes</span><span>Updated</span><span />
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title="Nothing in the book"
              hint={query ? `No matches for “${query}” — try fewer letters.` : "This filter is empty for now."}
              action={query || filter !== "all" ? (
                <button className="btn btn-line" onClick={() => { setQuery(""); setFilter("all"); }}>Clear everything</button>
              ) : undefined}
            />
          ) : (
            <ul role="listbox" aria-label="Catalog rows">
              {rows.map((c, i) => {
                const active = i === sel;
                return (
                  <li key={c.id}>
                    <button
                      ref={(el) => { rowRefs.current[i] = el; }}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => navigate(`#/c/${c.id}`)}
                      className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-dashed border-rule px-4 text-left transition-colors duration-100 last:border-0 md:grid-cols-[minmax(0,1.7fr)_120px_108px_84px_20px] ${
                        active ? "bg-tint/60 shadow-[inset_3px_0_0_0_var(--acc)]" : "hover:bg-paper2/40"
                      }`}
                      style={{ minHeight: "var(--rowh)" }}
                    >
                      <span className="flex min-w-0 items-center gap-3 py-2">
                        {c.photo ? (
                          <img src={c.photo} alt="" loading="lazy" className="size-10 shrink-0 rounded-xl border border-rule object-cover" />
                        ) : (
                          <Monogram name={c.name} size={40} className="!rounded-xl border-rule" />
                        )}
                        <span className="min-w-0">
                          <span className={`block truncate text-[14.5px] font-bold ${active ? "text-accink" : ""}`}>{c.name}</span>
                          <span className="block truncate text-[12px] text-faint">{c.owner}</span>
                        </span>
                      </span>
                      <span className="hidden font-mono text-[12.5px] font-semibold text-soft md:block">{c.code}</span>
                      <span className="hidden items-center gap-1.5 md:flex">
                        <BadgeChip badge={c.badge} />
                        {c.notes.trim() && <NotesFlag hasNotes />}
                      </span>
                      <span className="hidden text-[12px] font-medium text-faint md:block">{timeAgo(c.updatedAt)}</span>
                      <ChevronRight size={15} strokeWidth={2.6} className={`hidden transition-transform duration-150 md:block ${active ? "translate-x-0.5 text-accink" : "text-faint"}`} />
                      <span className="flex items-center gap-2 md:hidden">
                        <span className="text-[11px] text-faint">{timeAgo(c.updatedAt)}</span>
                        <ChevronRight size={15} className="text-faint" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {rows.length > 0 && (
            <div className="flex items-center justify-center gap-2 border-t border-rule bg-paper2/40 py-2.5 text-[10.5px] font-bold tracking-[0.14em] text-faint uppercase">
              <Squiggle className="h-1 w-10 text-rule2" /> end of entries <Squiggle className="h-1 w-10 text-rule2" />
            </div>
          )}
        </div>

        {/* preview panel */}
        <aside className="sticky top-24 hidden xl:block" aria-live="polite">
          {current ? <PreviewCard c={current} /> : (
            <div className="ticket card card-pad border-dashed text-center text-sm text-faint">
              Hover a row to peek at the entry.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function PreviewCard({ c }: { c: Client }) {
  return (
    <div className="sticker overflow-hidden rounded-3xl" style={{ boxShadow: "5px 5px 0 0 var(--hard)" }}>
      {c.photo ? (
        <div className="h-36 w-full overflow-hidden border-b-[1.5px] border-ink">
          <img src={c.photo} alt="" className="size-full object-cover" />
        </div>
      ) : (
        <div className="grid h-36 place-items-center border-b-[1.5px] border-dashed border-rule2 bg-paper2/60">
          <Monogram name={c.name} size={64} />
        </div>
      )}
      <div className="space-y-3.5 p-5">
        <div>
          <p className="text-[17px] leading-snug font-extrabold">{c.name}</p>
          <p className="mt-0.5 text-[12.5px] text-soft">{c.owner}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <BadgeChip badge={c.badge} />
          {c.geo && <PinFlag />}
          <CopyChip text={c.code}>{c.code}</CopyChip>
        </div>
        {c.notes.trim() && (
          <p className="rounded-xl border border-dashed border-rule2 bg-paper2/50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-soft italic">
            “{c.notes}”
          </p>
        )}
        <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-faint">
          <MapPin size={13} strokeWidth={2.5} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{c.address}</span>
        </p>
        <button className="btn btn-acc w-full !py-2.5 text-[13px]" onClick={() => navigate(`#/c/${c.id}`)}>
          Open full record
        </button>
      </div>
    </div>
  );
}
