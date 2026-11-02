import { AnimatePresence, motion } from "framer-motion";
import { Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { Asterisk } from "@/components/ui";
import { AuthProvider } from "@/lib/auth";
import { useHashRoute } from "@/lib/router";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/lib/toast";
import Catalog from "@/pages/Catalog";
import Editor from "@/pages/Editor";
import Login from "@/pages/Login";
import Maps from "@/pages/Maps";
import NotFound from "@/pages/NotFound";
import Record from "@/pages/Record";
import Settings from "@/pages/Settings";
import Trash from "@/pages/Trash";

const KEYS: Array<[string[], string]> = [
  [["/"], "Focus search"],
  [["j", "k"], "Move through rows"],
  [["↑", "↓"], "Same as j / k"],
  [["↵"], "Open selected entry"],
  [["?"], "This cheat sheet"],
  [["esc"], "Close things"],
];

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function Shell() {
  const route = useHashRoute();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
      if (e.key === "?") { e.preventDefault(); setHelp((h) => !h); }
      if (e.key === "Escape") setHelp(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const page = (() => {
    switch (route.name) {
      case "catalog": return <Catalog />;
      case "record": return <Record id={route.id} />;
      case "editor": return <Editor id={route.id} />;
      case "maps": return <Maps />;
      case "trash": return <Trash />;
      case "settings": return <Settings />;
      case "login": return <Login />;
      default: return <NotFound />;
    }
  })();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <AnimatePresence mode="wait">
        <motion.main
          key={JSON.stringify(route)}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex-1"
        >
          {page}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-dashed border-rule py-8">
        <p className="flex flex-wrap items-center justify-center gap-2 px-4 text-center text-[11.5px] font-semibold text-faint">
          <Asterisk className="size-3 text-acc" strokeWidth={3} />
          data·mcky ledger <span className="font-mono">v5 “paper pop”</span> — concept UI · demo data lives in your browser ·
          <a href="https://github.com/ktypez/data.mcky.space" target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-accink">github</a>
          <kbd className="kbd">?</kbd> for keys
          <Asterisk className="size-3 text-pop" strokeWidth={3} />
        </p>
      </footer>

      {/* shortcuts overlay */}
      <AnimatePresence>
        {help && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-ink/25 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onMouseDown={() => setHelp(false)}
          >
            <motion.div
              role="dialog" aria-label="Keyboard shortcuts"
              className="sticker w-full max-w-xs rounded-3xl p-6"
              style={{ boxShadow: "6px 6px 0 0 var(--hard)" }}
              initial={{ scale: 0.9, y: 14, rotate: -1.5 }} animate={{ scale: 1, y: 0, rotate: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <Keyboard size={18} strokeWidth={2.4} className="text-acc" />
                <h2 className="text-lg font-extrabold">Keys of the book</h2>
              </div>
              <ul className="mt-4 space-y-2.5">
                {KEYS.map(([keys, label]) => (
                  <li key={label} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-medium text-soft">{label}</span>
                    <span className="flex gap-1">{keys.map((k) => <kbd key={k} className="kbd">{k}</kbd>)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
