import { motion } from "framer-motion";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { Asterisk, Squiggle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { navigate } from "@/lib/router";
import { useToast } from "@/lib/toast";

const FLOATERS = [
  { text: "+ 1 entry", cls: "top-[12%] left-[8%] bg-tint text-accink border-acc", rot: "-6deg", delay: "0s" },
  { text: "M8V7+9Q", cls: "top-[22%] right-[10%] bg-poptint text-popink border-pop font-mono", rot: "4deg", delay: ".5s" },
  { text: "มีโน้ต", cls: "bottom-[26%] left-[12%] bg-pentint text-penink border-pen", rot: "5deg", delay: "1s" },
  { text: "soft delete ♻", cls: "bottom-[16%] right-[8%] bg-credittint text-creditink border-credit font-mono", rot: "-4deg", delay: ".8s" },
];

export default function Login() {
  const { signedIn, name, signIn, signOut } = useAuth();
  const { push } = useToast();

  return (
    <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-20 sm:py-28">
      {/* floating chips */}
      {FLOATERS.map((f) => (
        <span
          key={f.text}
          className={`sticker pointer-events-none absolute hidden rounded-xl px-3 py-1.5 text-[12px] font-bold md:block ${f.cls}`}
          style={{ ["--rot" as string]: f.rot, transform: `rotate(${f.rot})`, animation: `floaty 3.6s ease-in-out ${f.delay} infinite`, boxShadow: "3px 3px 0 0 currentColor" }}
        >
          {f.text}
        </span>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 20, rotate: -1.2 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="sticker w-full max-w-md rounded-3xl p-8 text-center sm:p-10"
        style={{ boxShadow: "6px 6px 0 0 var(--hard)" }}
      >
        <span className="sticker mx-auto grid size-16 place-items-center rounded-2xl bg-acc text-white" style={{ boxShadow: "4px 4px 0 0 var(--hard)" }}>
          <Asterisk className="size-8" strokeWidth={3} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {signedIn ? "You're already in" : "Keeper sign-in"}
        </h1>
        <Squiggle className="mx-auto mt-2 h-[6px] w-28 text-acc" />

        {signedIn ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-soft">Stamped in as <span className="font-bold text-ink">{name}</span>. The whole book is yours.</p>
            <div className="mt-7 flex flex-col gap-2.5">
              <button className="btn btn-acc w-full" onClick={() => navigate("#/")}>Open the catalog <ArrowRight size={16} strokeWidth={2.5} /></button>
              <button className="btn btn-ghost w-full" onClick={() => { signOut(); push("Signed out — the book closes", "info"); }}>Sign out</button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-soft">Reading is open to all. Writing, editing and taking out the trash needs a stamp.</p>
            <div className="mt-7 flex flex-col gap-2.5">
              <button
                className="btn btn-acc w-full !py-3"
                onClick={() => { signIn(); push("Welcome back, keeper", "ok"); navigate("#/"); }}
              >
                <KeyRound size={16} strokeWidth={2.5} /> Continue as demo keeper
              </button>
              <button className="btn btn-ghost w-full" onClick={() => navigate("#/")}>Just browsing</button>
            </div>
            <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-dashed border-rule pt-5 text-[11.5px] text-faint">
              <ShieldCheck size={13} /> Production is guarded by Clerk — the demo stamps locally.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
