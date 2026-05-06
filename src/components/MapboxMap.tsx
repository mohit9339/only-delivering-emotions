import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getClientId } from "@/lib/clientId";

interface MapboxMapProps {
  pickupLabel?: string;
  dropLabel?: string;
  /** Order code — when provided, the map subscribes to live rider position. */
  orderCode?: string;
  className?: string;
  /** Notify parent of the latest traffic-aware ETA in seconds. */
  onEta?: (etaSeconds: number | null) => void;
}

const TOKEN_KEY = "only_mapbox_token";

interface Coord {
  lng: number;
  lat: number;
}

export function MapboxMap({
  pickupLabel,
  dropLabel,
  orderCode,
  className = "",
  onEta,
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const riderMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastRiderRef = useRef<Coord | null>(null);
  const pickupRef = useRef<Coord | null>(null);
  const dropRef = useRef<Coord | null>(null);
  const recalcTimerRef = useRef<number | null>(null);

  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      (import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined) ||
      window.localStorage.getItem(TOKEN_KEY) ||
      ""
    );
  });
  const [draftToken, setDraftToken] = useState("");
  const [etaSec, setEtaSec] = useState<number | null>(null);

  // ---- Routing helpers (declared inside effect to capture token) ----
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = token;
    let isCancelled = false;

    const geocode = async (q?: string): Promise<Coord | null> => {
      if (!q) return null;
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?limit=1&access_token=${token}`
        );
        const json = await res.json();
        const c = json?.features?.[0]?.center;
        if (Array.isArray(c) && c.length === 2) return { lng: c[0], lat: c[1] };
      } catch (e) {
        console.warn("Geocoding failed for", q, e);
      }
      return null;
    };

    const fetchRoute = async (
      from: Coord,
      via: Coord | null,
      to: Coord
    ): Promise<{ coords: [number, number][]; durationSec: number } | null> => {
      const points = [from, ...(via ? [via] : []), to]
        .map((p) => `${p.lng},${p.lat}`)
        .join(";");
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${points}?geometries=geojson&overview=full&access_token=${token}`
        );
        const json = await res.json();
        const r = json?.routes?.[0];
        if (!r?.geometry?.coordinates?.length) return null;
        return { coords: r.geometry.coordinates as [number, number][], durationSec: r.duration };
      } catch (e) {
        console.warn("Directions API failed", e);
        return null;
      }
    };

    const drawRoute = (coords: [number, number][]) => {
      const map = mapRef.current;
      if (!map) return;
      const data: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: coords },
      };
      const src = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(data);
      } else {
        map.addSource("route", { type: "geojson", data });
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#0F766E", "line-width": 7, "line-opacity": 0.25 },
        });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: { "line-color": "#16A085", "line-width": 4 },
        });
      }
    };

    const recalcRoute = async () => {
      const pickup = pickupRef.current;
      const drop = dropRef.current;
      if (!pickup || !drop) return;
      const rider = lastRiderRef.current;
      // Route from rider→drop if we have a rider, else pickup→drop.
      const route = await fetchRoute(rider ?? pickup, rider ? null : null, drop);
      if (!route || isCancelled) return;
      drawRoute(route.coords);
      setEtaSec(route.durationSec);
      onEta?.(route.durationSec);
    };

    const scheduleRecalc = () => {
      if (recalcTimerRef.current) window.clearTimeout(recalcTimerRef.current);
      recalcTimerRef.current = window.setTimeout(recalcRoute, 1500);
    };

    const animateRiderTo = (target: Coord) => {
      const marker = riderMarkerRef.current;
      if (!marker) return;
      const start = marker.getLngLat();
      const startCoord: Coord = { lng: start.lng, lat: start.lat };
      const duration = 1200;
      const t0 = performance.now();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const lng = startCoord.lng + (target.lng - startCoord.lng) * t;
        const lat = startCoord.lat + (target.lat - startCoord.lat) * t;
        marker.setLngLat([lng, lat]);
        if (t < 1) animFrameRef.current = requestAnimationFrame(step);
      };
      animFrameRef.current = requestAnimationFrame(step);
    };

    (async () => {
      // Default fallback: Bengaluru
      const fallbackPickup: Coord = { lng: 77.6408, lat: 12.9719 };
      const fallbackDrop: Coord = { lng: 77.7506, lat: 12.9698 };

      const [geoPickup, geoDrop] = await Promise.all([
        geocode(pickupLabel),
        geocode(dropLabel),
      ]);
      if (isCancelled || !containerRef.current) return;

      const pickup = geoPickup ?? fallbackPickup;
      const drop = geoDrop ?? fallbackDrop;
      pickupRef.current = pickup;
      dropRef.current = drop;
      const initialRider: Coord = {
        lng: (pickup.lng + drop.lng) / 2,
        lat: (pickup.lat + drop.lat) / 2,
      };

      try {
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [initialRider.lng, initialRider.lat],
          zoom: 11.2,
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        const pickupEl = document.createElement("div");
        pickupEl.className = "rounded-full bg-primary text-white text-[10px] font-bold px-2 py-1 shadow-glow";
        pickupEl.innerText = "Pickup";
        new mapboxgl.Marker({ element: pickupEl }).setLngLat([pickup.lng, pickup.lat]).addTo(map);

        const dropEl = document.createElement("div");
        dropEl.className = "rounded-full bg-primary-deep text-white text-[10px] font-bold px-2 py-1 shadow-glow";
        dropEl.innerText = "Drop";
        new mapboxgl.Marker({ element: dropEl }).setLngLat([drop.lng, drop.lat]).addTo(map);

        const riderEl = document.createElement("div");
        riderEl.className =
          "h-5 w-5 rounded-full bg-white ring-4 ring-primary animate-pulse shadow-glow";
        riderMarkerRef.current = new mapboxgl.Marker({ element: riderEl })
          .setLngLat([initialRider.lng, initialRider.lat])
          .addTo(map);

        const bounds = new mapboxgl.LngLatBounds()
          .extend([pickup.lng, pickup.lat])
          .extend([drop.lng, drop.lat]);
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });

        map.on("load", () => {
          void recalcRoute();
        });
      } catch (e) {
        console.error("Mapbox init failed", e);
      }
    })();

    return () => {
      isCancelled = true;
      if (recalcTimerRef.current) window.clearTimeout(recalcTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
      riderMarkerRef.current = null;
      lastRiderRef.current = null;
    };
    // Helpers below need access to fetchRoute closure — re-init when labels change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pickupLabel, dropLabel]);

  // ---- Live rider position via Realtime + initial fetch ----
  useEffect(() => {
    if (!orderCode) return;

    let cancelled = false;

    const applyPoint = (lng: number, lat: number) => {
      const marker = riderMarkerRef.current;
      lastRiderRef.current = { lng, lat };
      if (!marker) return;
      // Inline animation (kept independent from re-init effect closure)
      const start = marker.getLngLat();
      const t0 = performance.now();
      const dur = 1200;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        marker.setLngLat([
          start.lng + (lng - start.lng) * t,
          start.lat + (lat - start.lat) * t,
        ]);
        if (t < 1 && !cancelled) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);

      // Recalculate route from new rider position with debounce
      if (recalcTimerRef.current) window.clearTimeout(recalcTimerRef.current);
      recalcTimerRef.current = window.setTimeout(async () => {
        const pickup = pickupRef.current;
        const drop = dropRef.current;
        if (!pickup || !drop || !token) return;
        try {
          const res = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${lng},${lat};${drop.lng},${drop.lat}?geometries=geojson&overview=full&access_token=${token}`
          );
          const json = await res.json();
          const r = json?.routes?.[0];
          if (!r?.geometry?.coordinates?.length) return;
          const map = mapRef.current;
          const src = map?.getSource("route") as mapboxgl.GeoJSONSource | undefined;
          src?.setData({
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: r.geometry.coordinates },
          } as GeoJSON.Feature<GeoJSON.LineString>);
          if (!cancelled) {
            setEtaSec(r.duration);
            onEta?.(r.duration);
          }
        } catch (e) {
          console.warn("Live route recalc failed", e);
        }
      }, 1200);
    };

    // Initial fetch
    (async () => {
      const { data } = await supabase.rpc("get_order_live_location", {
        p_code: orderCode,
        p_client_id: getClientId(),
      } as never);
      const row = Array.isArray(data) ? data[0] : null;
      if (row && !cancelled) applyPoint(row.lng, row.lat);
    })();

    const channel = supabase
      .channel(`live-loc-${orderCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_live_locations",
          filter: `order_code=eq.${orderCode}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { lat?: number; lng?: number } | null;
          if (row?.lat != null && row?.lng != null) applyPoint(row.lng, row.lat);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode, token]);

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

  const etaLabel =
    etaSec != null
      ? etaSec < 60
        ? `${Math.round(etaSec)}s`
        : `${Math.round(etaSec / 60)} min`
      : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: 320 }} />
      {etaLabel && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-primary-deep shadow-card backdrop-blur">
          Traffic ETA · {etaLabel}
        </div>
      )}
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
