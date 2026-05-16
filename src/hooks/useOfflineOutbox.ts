import { useCallback, useEffect, useState } from "react";
import { flushOutbox, pendingCount } from "@/lib/offlineQueue";
import { useOnlineStatus } from "./useOnlineStatus";

/**
 * Tracks the rider's offline outbox and auto-flushes when connectivity returns
 * or when the service worker pings us via `only:flush-outbox`.
 */
export function useOfflineOutbox() {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(async () => {
    setPending(await pendingCount());
  }, []);

  const flush = useCallback(async () => {
    if (flushing) return 0;
    setFlushing(true);
    try {
      const n = await flushOutbox();
      await refresh();
      return n;
    } finally {
      setFlushing(false);
    }
  }, [flushing, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (online) void flush();
  }, [online, flush]);

  useEffect(() => {
    const onFlush = () => void flush();
    window.addEventListener("only:flush-outbox", onFlush);
    window.addEventListener("only:outbox-changed", onFlush);
    return () => {
      window.removeEventListener("only:flush-outbox", onFlush);
      window.removeEventListener("only:outbox-changed", onFlush);
    };
  }, [flush]);

  return { online, pending, flushing, flush, refresh };
}
