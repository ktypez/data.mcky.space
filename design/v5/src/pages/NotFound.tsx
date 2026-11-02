import { Compass } from "lucide-react";
import { Asterisk } from "@/components/ui";
import { navigate } from "@/lib/router";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 pt-28 pb-24 text-center">
      <span className="sticker grid size-20 rotate-3 place-items-center rounded-3xl bg-tint text-accink" style={{ boxShadow: "5px 5px 0 0 var(--acc)", animation: "floaty 3.2s ease-in-out infinite", ["--rot" as string]: "3deg" }}>
        <Asterisk className="size-10" strokeWidth={2.8} />
      </span>
      <p className="mt-8 font-mono text-[13px] font-bold tracking-[0.3em] text-faint uppercase">404 / lost page</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">This slip never made<br />it into the ledger</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-soft">
        The address you followed points at a blank line. Happens to the best books.
      </p>
      <div className="mt-8 flex gap-3">
        <button className="btn btn-acc" onClick={() => navigate("#/")}><Compass size={16} strokeWidth={2.4} /> Back to catalog</button>
        <a className="btn btn-line" href="https://github.com/ktypez/data.mcky.space" target="_blank" rel="noreferrer">Source</a>
      </div>
    </div>
  );
}
