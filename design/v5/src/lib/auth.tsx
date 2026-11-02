import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface AuthState {
  signedIn: boolean;
  name: string;
  role: "admin" | "guest";
}

interface AuthCtx extends AuthState {
  signIn: () => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "ledger-auth-v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...JSON.parse(raw), signedIn: true };
    } catch { /* ignore */ }
    return { signedIn: false, name: "", role: "guest" };
  });

  useEffect(() => {
    try {
      if (state.signedIn) localStorage.setItem(KEY, JSON.stringify(state));
      else localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  }, [state]);

  const signIn = useCallback(() => setState({ signedIn: true, name: "K. mcky", role: "admin" }), []);
  const signOut = useCallback(() => setState({ signedIn: false, name: "", role: "guest" }), []);

  return <Ctx.Provider value={{ ...state, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
