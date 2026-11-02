import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Palette = "matcha" | "coral" | "blueberry" | "butter";
export type Mode = "light" | "dark";
export type Density = "cozy" | "compact";

interface ThemeState {
  mode: Mode;
  palette: Palette;
  density: Density;
  texture: boolean;
}

interface ThemeCtx extends ThemeState {
  set: (patch: Partial<ThemeState>) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const KEY = "ledger-theme-v1";

export const PALETTES: Array<{ key: Palette; name: string; acc: string; pop: string; tint: string }> = [
  { key: "matcha", name: "Matcha", acc: "#158068", pop: "#f2593f", tint: "#e2f2e8" },
  { key: "coral", name: "Coral", acc: "#e8503a", pop: "#17918c", tint: "#fce7e1" },
  { key: "blueberry", name: "Blueberry", acc: "#3e63dd", pop: "#f2a93b", tint: "#e7ecfc" },
  { key: "butter", name: "Butter", acc: "#c77d0a", pop: "#6d5bd0", tint: "#faedd3" },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { mode: "light", palette: "matcha", density: "cozy", texture: true, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { mode: "light", palette: "matcha", density: "cozy", texture: true };
  });

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.mode = state.mode;
    el.dataset.palette = state.palette;
    el.dataset.density = state.density;
    el.dataset.texture = state.texture ? "on" : "off";
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const set = useCallback((patch: Partial<ThemeState>) => setState((s) => ({ ...s, ...patch })), []);

  return <Ctx.Provider value={{ ...state, set }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme outside provider");
  return ctx;
}
