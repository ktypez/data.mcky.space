import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import { navigate } from "@/lib/router";
import { useTheme } from "@/lib/theme";

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  color: string;
  title: string;
  sub?: string;
  openable?: boolean;
}

interface Props {
  pins?: MapPin[];
  center?: [number, number];
  zoom?: number;
  fit?: boolean;
  pickable?: boolean;
  onPick?: (lat: number, lng: number) => void;
  className?: string;
}

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

export default function MapView({ pins = [], center = [13.7563, 100.5018], zoom = 11, fit = false, pickable = false, onPick, className = "" }: Props) {
  const { mode } = useTheme();
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const pinsRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  /* create once */
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { center, zoom, zoomControl: true, scrollWheelZoom: true });
    tilesRef.current = L.tileLayer(TILES[document.documentElement.dataset.mode === "dark" ? "dark" : "light"], {
      attribution: ATTR, subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    pinsRef.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onPickRef.current) onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    const el = elRef.current;
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement).closest("[data-open]") as HTMLElement | null;
      if (a?.dataset.open) {
        ev.preventDefault();
        navigate(`#/c/${a.dataset.open}`);
      }
    };
    el.addEventListener("click", onClick);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      el.removeEventListener("click", onClick);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* theme tiles */
  useEffect(() => {
    tilesRef.current?.setUrl(TILES[mode]);
  }, [mode]);

  /* pins */
  useEffect(() => {
    const map = mapRef.current;
    const layer = pinsRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const pts: L.LatLngExpression[] = [];
    pins.forEach((p) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="lp" style="--pin:${p.color}"></div>`,
        iconSize: [24, 28],
        iconAnchor: [12, 26],
        popupAnchor: [0, -26],
      });
      const marker = L.marker([p.lat, p.lng], { icon });
      const openLink = p.openable ? `<br><a class="pop-open" data-open="${p.id}">Open record →</a>` : "";
      marker.bindPopup(
        `<div><strong>${p.title}</strong>${p.sub ? `<br><span style="font-family:var(--font-mono);font-size:11px;color:var(--ink-soft)">${p.sub}</span>` : ""}${openLink}</div>`,
        { className: "ledger-pop", closeButton: true },
      );
      layer.addLayer(marker);
      pts.push([p.lat, p.lng]);
    });
    if (fit && pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts).pad(0.15), { animate: false, maxZoom: 13 });
    }
  }, [pins, fit]);

  /* pickable cursor */
  useEffect(() => {
    const el = elRef.current;
    if (el) el.style.cursor = pickable ? "crosshair" : "";
  }, [pickable]);

  return <div ref={elRef} className={className} role="application" aria-label="Map" />;
}
