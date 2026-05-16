/**
 * Offline-tolerant outbox for rider mutations.
 *
 * Persists pending order status updates in IndexedDB so a rider can keep
 * working on a flaky connection (lifts, basements, dead zones) and have
 * everything sync the moment the network returns.
 *
 * Intentionally small — only the actions a rider takes on the road:
 *   - `order_status`  → update orders.status
 *
 * POD photo uploads stay synchronous because they require a fresh storage
 * session; we surface a clear error if offline.
 */

import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "only-offline";
const DB_VERSION = 1;
const STORE = "outbox";

export type OutboxKind = "order_status";

export interface OutboxItem {
  id: string;
  kind: OutboxKind;
  payload: { orderId: string; status: string };
  createdAt: number;
  attempts: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    Promise.resolve(fn(store)).then((v) => {
      t.oncomplete = () => resolve(v);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }, reject);
  });
}

export async function enqueue(kind: OutboxKind, payload: OutboxItem["payload"]): Promise<OutboxItem> {
  const item: OutboxItem = {
    id: `${kind}-${payload.orderId}-${Date.now()}`,
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await tx("readwrite", (s) => {
    s.put(item);
  });
  return item;
}

export async function listPending(): Promise<OutboxItem[]> {
  return tx("readonly", (s) =>
    new Promise<OutboxItem[]>((resolve, reject) => {
      const req = s.getAll();
      req.onsuccess = () => resolve(req.result as OutboxItem[]);
      req.onerror = () => reject(req.error);
    })
  );
}

async function remove(id: string) {
  await tx("readwrite", (s) => {
    s.delete(id);
  });
}

async function bump(item: OutboxItem) {
  await tx("readwrite", (s) => {
    s.put({ ...item, attempts: item.attempts + 1 });
  });
}

/**
 * Try to flush every pending item. Safe to call repeatedly — no-op when offline.
 * Returns the number of items successfully drained.
 */
export async function flushOutbox(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const items = await listPending();
  let drained = 0;
  for (const item of items) {
    try {
      if (item.kind === "order_status") {
        const { error } = await supabase
          .from("orders")
          .update({ status: item.payload.status })
          .eq("id", item.payload.orderId);
        if (error) throw error;
      }
      await remove(item.id);
      drained++;
    } catch {
      await bump(item);
      // Stop on first failure to avoid hammering the API.
      break;
    }
  }
  return drained;
}

export async function pendingCount(): Promise<number> {
  return (await listPending()).length;
}
