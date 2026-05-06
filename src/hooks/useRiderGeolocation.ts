import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 2 — Balanced live geolocation publisher.
 * Pushes the rider's GPS to the backend every ~15s (only on movement / freshness)
 * while the rider has at least one ACTIVE order. Auto-stops otherwise.
 *
 * Battery-aware: uses `watchPosition` once and throttles writes; pauses when
 * the tab is hidden to avoid background battery drain.
 */

const MIN_INTERVAL_MS = 15_000;     // Balanced cadence
const MIN_MOVE_M       = 8;         // Skip writes for sub-bike-jiggle drift
const STALE_AFTER_MS   = 45_000;    // Force a push if nothing sent for this long

export interface GeolocationPublisherState {
  enabled: boolean;
  lastSentAt: number | null;
  lastError: string | null;
  permission: "unknown" | "granted" | "denied" | "prompt";
}

function haversineMeters(a: GeolocationCoordinates, b: GeolocationCoordinates) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function useRiderGeolocation(active: boolean): GeolocationPublisherState {
  const [state, setState] = useState<GeolocationPublisherState>({
    enabled: false,
    lastSentAt: null,
    lastError: null,
    permission: "unknown",
  });

  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ at: number; coords: GeolocationCoordinates | null }>({
    at: 0,
    coords: null,
  });
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!active) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setState((s) => ({ ...s, enabled: false }));
      return;
    }
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, enabled: false, lastError: "Geolocation unsupported" }));
      return;
    }

    let cancelled = false;

    async function maybeSend(pos: GeolocationPosition) {
      if (cancelled || inFlightRef.current) return;
      if (typeof document !== "undefined" && document.hidden) return;

      const now = Date.now();
      const elapsed = now - lastSentRef.current.at;
      const moved = lastSentRef.current.coords
        ? haversineMeters(lastSentRef.current.coords, pos.coords)
        : Infinity;

      const shouldSend =
        elapsed >= MIN_INTERVAL_MS && (moved >= MIN_MOVE_M || elapsed >= STALE_AFTER_MS);
      if (!shouldSend) return;

      inFlightRef.current = true;
      try {
        const { error } = await supabase.rpc("upsert_rider_location", {
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
          p_accuracy_m: pos.coords.accuracy ?? null,
          p_heading_deg: pos.coords.heading ?? null,
          p_speed_mps: pos.coords.speed ?? null,
        } as never);
        if (error) throw error;
        lastSentRef.current = { at: now, coords: pos.coords };
        if (!cancelled) {
          setState((s) => ({ ...s, enabled: true, lastSentAt: now, lastError: null }));
        }
      } catch (e) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            enabled: true,
            lastError: (e as { message?: string })?.message ?? "Failed to send location",
          }));
        }
      } finally {
        inFlightRef.current = false;
      }
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState((s) => ({ ...s, permission: "granted" }));
        void maybeSend(pos);
      },
      (err) => {
        if (cancelled) return;
        const denied = err.code === err.PERMISSION_DENIED;
        setState((s) => ({
          ...s,
          enabled: !denied,
          permission: denied ? "denied" : s.permission,
          lastError: err.message,
        }));
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
    watchIdRef.current = id;
    setState((s) => ({ ...s, enabled: true }));

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active]);

  return state;
}
