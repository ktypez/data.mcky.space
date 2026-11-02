import { Check, Download, Keyboard, Moon, RefreshCcw, Rows3, Sun } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog, CountSticker, SectionLabel, Squiggle } from "@/components/ui";
import { ledger, useClients } from "@/lib/data";
import { PALETTES, useTheme } from "@/lib/theme";
import { useToast } from "@/lib/toast";

const SHORTCUTS: Array<[string[], string]> = [
  [["/"], "Focus search"],
  [["j", "k", "↑", "↓"], "Move through rows"],
  [["↵"], "Open the selected entry"],
  [["?"], "Show this cheat sheet"],
  [["esc"], "Close dialogs / blur search"],
];

export default function Settings() {
  const theme = useTheme();
  const { push } = useToast();
  const all = useClients();
  const [confirmReset, setConfirmReset] = useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data-mcky-ledger.json";
    a.click();
    URL.revokeObjectURL(a.href);
    push("Ledger exported as JSON", "ok");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-24 sm:px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Settings</h1>
        <CountSticker n="5.0" label="paper pop" rot={2} />
      </div>
      <Squiggle className="mt-2 h-[6px] w-36 text-acc" />

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* appearance */}
        <section className="card card-pad">
          <SectionLabel>Mode</SectionLabel>
          <div className="seg mt-4 w-full">
            <button className="flex-1" aria-pressed={theme.mode === "light"} onClick={() => theme.set({ mode: "light" })}>
              <Sun size={14} className="mr-1.5 inline -translate-y-px" strokeWidth={2.4} />Paper light
            </button>
            <button className="flex-1" aria-pressed={theme.mode === "dark"} onClick={() => theme.set({ mode: "dark" })}>
              <Moon size={14} className="mr-1.5 inline -translate-y-px" strokeWidth={2.4} />Chalk night
            </button>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Dotted paper</p>
              <p className="text-[12px] text-faint">The soft dot grid behind everything.</p>
            </div>
            <button
              role="switch" aria-checked={theme.texture} aria-label="Toggle dotted paper"
              onClick={() => theme.set({ texture: !theme.texture })}
              className={`relative h-7 w-12 shrink-0 rounded-full border-[1.5px] border-ink transition-colors ${theme.texture ? "bg-acc" : "bg-paper2"}`}
            >
              <span className={`absolute top-[2.5px] size-[18px] rounded-full bg-white shadow transition-all duration-200 ${theme.texture ? "left-[24px]" : "left-[3px]"}`} />
            </button>
          </div>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-rule pt-5">
            <div>
              <p className="text-sm font-bold">Row density</p>
              <p className="text-[12px] text-faint">How the catalog breathes.</p>
            </div>
            <div className="seg">
              <button aria-pressed={theme.density === "cozy"} onClick={() => theme.set({ density: "cozy" })}><Rows3 size={13} className="mr-1 inline -translate-y-px" />Cozy</button>
              <button aria-pressed={theme.density === "compact"} onClick={() => theme.set({ density: "compact" })}>Compact</button>
            </div>
          </div>
        </section>

        {/* palette */}
        <section className="card card-pad">
          <SectionLabel>Palette</SectionLabel>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {PALETTES.map((p) => {
              const active = theme.palette === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => { theme.set({ palette: p.key }); push(`Palette: ${p.name}`, "info"); }}
                  aria-pressed={active}
                  className={`group relative rounded-2xl border-[1.5px] p-3.5 text-left transition-all duration-150 ${
                    active ? "border-ink bg-card shadow-[3px_3px_0_0_var(--acc)]" : "border-rule bg-card hover:-translate-y-0.5 hover:border-rule2"
                  }`}
                >
                  {active && (
                    <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border-[1.5px] border-ink bg-acc text-white">
                      <Check size={12} strokeWidth={3.4} />
                    </span>
                  )}
                  <span className="flex gap-1.5">
                    <span className="size-5 rounded-full border border-ink/15" style={{ background: p.acc }} />
                    <span className="size-5 rounded-full border border-ink/15" style={{ background: p.pop }} />
                    <span className="size-5 rounded-full border border-ink/15" style={{ background: p.tint }} />
                  </span>
                  <span className="mt-2.5 block text-[13px] font-bold">{p.name}</span>
                  <span className="block font-mono text-[10.5px] text-faint">{p.acc}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
            Each palette swaps <span className="font-mono">--acc</span>, <span className="font-mono">--pop</span> and tint tokens — badged rows keep their semantic credit/pay-daily colors.
          </p>
        </section>

        {/* data */}
        <section className="card card-pad">
          <SectionLabel>Ledger data</SectionLabel>
          <p className="mt-3 text-[12.5px] leading-relaxed text-soft">This demo keeps {all.length} entries in your browser. Export or reseed anytime.</p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <button className="btn btn-line !px-4 !py-2.5 text-[13px]" onClick={exportJson}><Download size={15} strokeWidth={2.4} /> Export JSON</button>
            <button className="btn btn-ghost !px-4 !py-2.5 text-[13px] !text-danger hover:!bg-dangertint" onClick={() => setConfirmReset(true)}>
              <RefreshCcw size={14} strokeWidth={2.5} /> Reseed demo
            </button>
          </div>
          <div className="mt-5 rounded-xl border border-dashed border-rule2 p-3.5 font-mono text-[11.5px] leading-relaxed text-faint">
            tokens → src/styles/tokens.css<br />
            attrs → data-mode · data-palette · data-density
          </div>
        </section>

        {/* shortcuts */}
        <section className="card card-pad">
          <div className="flex items-center justify-between">
            <SectionLabel>Shortcuts</SectionLabel>
            <Keyboard size={15} className="text-faint" />
          </div>
          <ul className="mt-4 space-y-2.5">
            {SHORTCUTS.map(([keys, label]) => (
              <li key={label} className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-soft">{label}</span>
                <span className="flex gap-1">{keys.map((k) => <kbd key={k} className="kbd">{k}</kbd>)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-dashed border-rule pt-4 font-mono text-[11px] text-faint">
            data·mcky ledger · v5 paper pop · concept UI<br />
            prod stack: Svelte 5 + leaflet + clerk
          </p>
        </section>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reseed the demo ledger?"
        body="Entries you added, edited or trashed will roll back to the original demo set."
        confirmLabel="Reseed"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { ledger.reset(); setConfirmReset(false); push("Fresh demo book, straight from the press", "ok"); }}
      />
    </div>
  );
}
