import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface MapboxMapProps {
  pickupLabel?: string;
  dropLabel?: string;
  className?: string;
}

const TOKEN_KEY = "only_mapbox_token";

export function MapboxMap({ pickupLabel, dropLabel, className = "" }: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) ||
      window.localStorage.getItem(TOKEN_KEY) ||
      ""
    );
  });
  const [draftToken, setDraftToken] = useState("");

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;

    // Demo coords (Bengaluru) — in production this comes from geocoded pickup/drop
    const pickup: [number, number] = [77.6408, 12.9719];
    const drop: [number, number] = [77.7506, 12.9698];
    const rider: [number, number] = [77.685, 12.9705];

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [(pickup[0] + drop[0]) / 2, (pickup[1] + drop[1]) / 2],
        zoom: 11.2,
        attributionControl: false,
      });
      mapRef.current = map;

      const pickupEl = document.createElement("div");
      pickupEl.className = "rounded-full bg-primary text-white text-[10px] font-bold px-2 py-1 shadow-glow";
      pickupEl.innerText = "Pickup";
      new mapboxgl.Marker({ element: pickupEl }).setLngLat(pickup).addTo(map);

      const dropEl = document.createElement("div");
      dropEl.className = "rounded-full bg-primary-deep text-white text-[10px] font-bold px-2 py-1 shadow-glow";
      dropEl.innerText = "Drop";
      new mapboxgl.Marker({ element: dropEl }).setLngLat(drop).addTo(map);

      const riderEl = document.createElement("div");
      riderEl.className = "h-5 w-5 rounded-full bg-white ring-4 ring-primary animate-pulse";
      new mapboxgl.Marker({ element: riderEl }).setLngLat(rider).addTo(map);

      map.on("load", () => {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [pickup, rider, drop],
            },
          },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#16A085",
            "line-width": 4,
            "line-dasharray": [0.5, 1.5],
          },
        });
      });
    } catch (e) {
      console.error("Mapbox init failed", e);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  if (!token) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center ${className}`}>
        <div className="text-sm font-medium text-foreground">
          Enter your Mapbox public token to enable the live map
        </div>
        <p className="text-xs text-muted-foreground max-w-md">
          Get a free public token at <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noreferrer" className="text-primary underline">mapbox.com</a>. Stored locally in your browser only.
        </p>
        <div className="flex w-full max-w-md gap-2">
          <Input
            placeholder="pk.eyJ1Ijoi..."
            value={draftToken}
            onChange={(e) => setDraftToken(e.target.value)}
          />
          <Button
            onClick={() => {
              if (!draftToken.startsWith("pk.")) return;
              window.localStorage.setItem(TOKEN_KEY, draftToken);
              setToken(draftToken);
            }}
            className="bg-gradient-cta text-white"
          >
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: 320 }} />
      {(pickupLabel || dropLabel) && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/95 p-2 shadow-card backdrop-blur">
            <div className="font-semibold text-primary">Pickup</div>
            <div className="truncate text-muted-foreground">{pickupLabel}</div>
          </div>
          <div className="rounded-lg bg-white/95 p-2 shadow-card backdrop-blur">
            <div className="font-semibold text-primary-deep">Drop</div>
            <div className="truncate text-muted-foreground">{dropLabel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
