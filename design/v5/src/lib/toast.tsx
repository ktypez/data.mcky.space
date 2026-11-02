import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Copy, Info, Trash2 } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Tone = "ok" | "info" | "copy" | "trash";

interface Toast {
  id: number;
  msg: string;
  tone: Tone;
}

interface ToastCtx {
  push: (msg: string, tone?: Tone) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const ICONS: Record<Tone, typeof Info> = { ok: CheckCircle2, info: Info, copy: Copy, trash: Trash2 };
const TONES: Record<Tone, string> = {
  ok: "var(--acc)",
  info: "var(--ink-soft)",
  copy: "var(--acc-ink)",
  trash: "var(--danger)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const push = useCallback((msg: string, tone: Tone = "ok") => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-3), { id, msg, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 18, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 480, damping: 30 }}
                className="sticker flex items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-semibold"
                role="status"
              >
                <Icon size={16} strokeWidth={2.4} style={{ color: TONES[t.tone] }} />
                {t.msg}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast outside provider");
  return ctx;
}
