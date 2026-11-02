import { AnimatePresence, motion } from "framer-motion";
import { LogIn, Map, NotebookText, Settings2, Signpost, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useHashRoute, navigate } from "@/lib/router";
import { Wordmark } from "./ui";

const NAV = [
  { name: "catalog", to: "#/", label: "Catalog", icon: NotebookText },
  { name: "maps", to: "#/maps", label: "Maps", icon: Map },
  { name: "trash", to: "#/trash", label: "Trash", icon: Trash2 },
  { name: "settings", to: "#/settings", label: "Settings", icon: Settings2 },
] as const;

export default function TopBar() {
  const route = useHashRoute();
  const { signedIn, name, role, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);

  const isActive = (n: string) => {
    if (n === "catalog") return route.name === "catalog" || route.name === "record" || route.name === "editor";
    return route.name === n;
  };

  const navItems = (
    <>
      {NAV.map((item) => {
        const active = isActive(item.name);
        const Icon = item.icon;
        return (
          <a
            key={item.name}
            href={item.to}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[13.5px] font-semibold whitespace-nowrap transition-all duration-150 ${
              active
                ? "border-[1.5px] border-ink bg-card text-ink shadow-[2px_2px_0_0_var(--hard)]"
                : "text-soft hover:bg-paper2 hover:text-ink"
            }`}
          >
            <Icon size={15} strokeWidth={2.4} />
            {item.label}
          </a>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems}
        </nav>

        <div className="flex items-center gap-2.5">
          {signedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((m) => !m)}
                className="grid size-9 cursor-pointer place-items-center rounded-full border-[1.5px] border-ink bg-acc font-mono text-[13px] font-bold text-white shadow-[2px_2px_0_0_var(--hard)] transition-transform hover:-translate-y-px"
                aria-label="Account menu" aria-expanded={menu}
              >
                {name.slice(0, 1)}
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96, rotate: -1 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 500, damping: 32 }}
                    className="sticker absolute right-0 mt-2.5 w-56 rounded-2xl p-2"
                  >
                    <div className="border-b border-dashed border-rule px-3 pt-2 pb-3">
                      <p className="text-sm font-bold">{name}</p>
                      <span className="chip mt-1.5 bg-tint text-accink">{role} · demo session</span>
                    </div>
                    <button
                      className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-dangertint"
                      onClick={() => { setMenu(false); signOut(); }}
                    >
                      <Signpost size={15} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button className="btn btn-line !px-4 !py-2 text-[13px]" onClick={() => navigate("#/login")}>
              <LogIn size={15} strokeWidth={2.4} /> Sign in
            </button>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-4 pb-2.5 md:hidden" aria-label="Primary mobile">
        {navItems}
      </nav>
    </header>
  );
}
