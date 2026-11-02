import { MousePointerClick } from "lucide-react";
import { useMemo } from "react";
import MapView from "@/components/MapView";
import { CountSticker, Squiggle } from "@/components/ui";
import { badgeColor, useClients } from "@/lib/data";

export default function Maps() {
  const all = useClients();
  const pins = useMemo(
    () => all.filter((c) => !c.deletedAt && c.geo).map((c) => ({
      id: c.id,
      lat: c.geo!.lat,
      lng: c.geo!.lng,
      color: badgeColor(c.badge),
      title: c.name,
      sub: c.code,
      openable: true,
    })),
    [all],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 pb-24 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Maps</h1>
            <CountSticker n={pins.length} label="pins" rot={2} />
          </div>
          <Squiggle className="mt-2 h-[6px] w-36 text-pop" />
          <p className="mt-2 flex items-center gap-1.5 text-sm text-soft">
            <MousePointerClick size={14} strokeWidth={2.4} /> Click a pin, then “Open record”.
          </p>
        </div>
        <div className="flex items-center gap-2" aria-label="Legend">
          <span className="chip bg-credittint text-creditink"><span className="size-2 rounded-full bg-credit" />credit</span>
          <span className="chip bg-pentint text-penink"><span className="size-2 rounded-full bg-pen" />pay daily</span>
          <span className="chip bg-tint text-accink"><span className="size-2 rounded-full bg-acc" />other</span>
        </div>
      </div>

      <div className="card mt-8 overflow-hidden p-2">
        <MapView className="h-[68vh] w-full rounded-2xl" pins={pins} fit zoom={11} />
      </div>

      {pins.length === 0 && (
        <p className="mt-4 text-center text-sm text-faint">No pinned entries yet — drop pins from the editor.</p>
      )}
    </div>
  );
}
