import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { useOfflineOutbox } from "@/hooks/useOfflineOutbox";

export function OfflineBanner() {
  const { online, pending, flushing, flush } = useOfflineOutbox();
  if (online && pending === 0) return null;

  return (
    <div
      className={`fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium shadow-sm ${
        online
          ? "bg-amber-500 text-white"
          : "bg-destructive text-destructive-foreground"
      }`}
      role="status"
      aria-live="polite"
    >
      {online ? <Wifi className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      <span>
        {online
          ? `Back online — ${pending} pending update${pending === 1 ? "" : "s"} syncing…`
          : "You're offline. Updates will sync automatically when you reconnect."}
      </span>
      {online && pending > 0 && (
        <button
          onClick={() => void flush()}
          disabled={flushing}
          className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider hover:bg-white/30 disabled:opacity-60"
        >
          <RefreshCw className={`h-3 w-3 ${flushing ? "animate-spin" : ""}`} /> sync now
        </button>
      )}
    </div>
  );
}
