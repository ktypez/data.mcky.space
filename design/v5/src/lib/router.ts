import { useCallback, useEffect, useState } from "react";

export type Route =
  | { name: "catalog" }
  | { name: "record"; id: string }
  | { name: "editor"; id?: string }
  | { name: "maps" }
  | { name: "trash" }
  | { name: "settings" }
  | { name: "login" }
  | { name: "404" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "catalog" };
  if (parts[0] === "c" && parts[1]) return { name: "record", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "add") return { name: "editor" };
  if (parts[0] === "edit" && parts[1]) return { name: "editor", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "maps") return { name: "maps" };
  if (parts[0] === "trash") return { name: "trash" };
  if (parts[0] === "settings") return { name: "settings" };
  if (parts[0] === "login") return { name: "login" };
  return { name: "404" };
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function useHashRoute(): Route {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parseHash(hash);
}

export function useIsActive(prefix: string): boolean {
  const check = useCallback(() => window.location.hash.replace(/^#/, "") === prefix, [prefix]);
  const [active, setActive] = useState(check);
  useEffect(() => {
    const onChange = () => setActive(check());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [check]);
  return active;
}
