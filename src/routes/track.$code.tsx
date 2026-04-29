import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MapboxMap } from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  CheckCircle2,
  Bike,
  Clock,
  Phone,
  MapPin,
  Loader2,
  XCircle,
} from "lucide-react";

type OrderStatus = "pending" | "assigned" | "picked" | "in_transit" | "delivered" | "cancelled";

interface Order {
  id: string;
  order_code: string;
  pickup_location: string;
  drop_location: string;
  item_type: string;
  delivery_type: "emergency" | "sameday";
  status: OrderStatus;
  rider_id: string | null;
  estimated_delivery_at: string | null;
  created_at: string;
  rider_name?: string | null;
  rider_vehicle?: string | null;
}

interface Rider {
  name: string;
  vehicle_type: string;
}

export const Route = createFileRoute("/track/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Tracking ${params.code} — ONLY` },
      { name: "description", content: `Live tracking for ONLY order ${params.code}.` },
    ],
  }),
  component: TrackOrderPage,
});

const STEPS: { key: OrderStatus; label: string; desc: string }[] = [
  { key: "pending", label: "Order placed", desc: "Looking for the nearest rider" },
  { key: "assigned", label: "Rider assigned", desc: "Rider is heading to pickup" },
  { key: "picked", label: "Picked up", desc: "Item is with the rider" },
  { key: "in_transit", label: "On the way", desc: "Rider is heading to drop" },
  { key: "delivered", label: "Delivered", desc: "Enjoy your day!" },
];

function TrackOrderPage() {
  const { code } = useParams({ from: "/track/$code" });
  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchOrder() {
      // Use secure RPC — returns tracking-safe fields only (no PII)
      const { data, error } = await supabase
        .rpc("get_order_by_code", { p_code: code });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrder(row as unknown as Order);
      if (row.rider_name) {
        setRider({ name: row.rider_name, vehicle_type: row.rider_vehicle ?? "" });
      }
      setLoading(false);
    }
    fetchOrder();

    // Realtime status updates (RLS allows anon to subscribe to public changefeed only if policy allows;
    // we re-fetch via RPC on any update event to keep PII off the wire)
    const channel = supabase
      .channel(`order-${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_code=eq.${code}` },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [code]);

  if (loading) {
    return (
      <Shell>
        <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading order…
        </div>
      </Shell>
    );
  }

  if (notFound || !order) {
    return (
      <Shell>
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <XCircle className="h-10 w-10 text-destructive" />
          <h2 className="mt-3 font-[Sora] text-2xl font-bold">Order not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find an order with code <span className="font-mono">{code}</span>.
          </p>
          <Button asChild className="mt-5 bg-gradient-cta text-white">
            <Link to="/track">Try another code</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const currentStepIdx = order.status === "cancelled"
    ? -1
    : STEPS.findIndex((s) => s.key === order.status);

  return (
    <Shell>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Status panel */}
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order
              </div>
              <div className="font-mono text-2xl font-bold text-foreground">{order.order_code}</div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                order.delivery_type === "emergency"
                  ? "bg-primary text-white"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {order.delivery_type === "emergency" ? "Emergency" : "Same-day"}
            </span>
          </div>

          {order.estimated_delivery_at && order.status !== "delivered" && order.status !== "cancelled" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-soft p-3 text-sm">
              <Clock className="h-4 w-4 text-primary-deep" />
              <span className="text-foreground">
                ETA{" "}
                <strong>
                  {new Date(order.estimated_delivery_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
            </div>
          )}

          <ol className="mt-6 space-y-4">
            {STEPS.map((step, idx) => {
              const done = idx <= currentStepIdx;
              const active = idx === currentStepIdx;
              return (
                <li key={step.key} className="flex gap-3">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2 ${
                      done
                        ? "bg-primary text-white ring-primary"
                        : "bg-background text-muted-foreground ring-border"
                    } ${active ? "animate-pulse-ring" : ""}`}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{step.desc}</div>
                  </div>
                </li>
              );
            })}
            {order.status === "cancelled" && (
              <li className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> Order cancelled
              </li>
            )}
          </ol>

          <div className="mt-6 grid gap-3 border-t border-border pt-5 text-sm">
            <Detail icon={<MapPin className="h-4 w-4 text-primary" />} label="Pickup" value={order.pickup_location} />
            <Detail icon={<MapPin className="h-4 w-4 text-primary-deep" />} label="Drop" value={order.drop_location} />
            <Detail icon={<Package className="h-4 w-4 text-primary" />} label="Item" value={order.item_type} />
          </div>

          {rider ? (
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-soft p-4 ring-1 ring-border">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-cta text-white">
                <Bike className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">{rider.name}</div>
                <div className="text-xs text-muted-foreground">{rider.vehicle_type}</div>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                On the way
              </span>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Assigning the nearest rider…
            </div>
          )}
        </div>

        {/* Map */}
        <div className="space-y-3">
          <MapboxMap
            pickupLabel={order.pickup_location}
            dropLabel={order.drop_location}
            className="h-[500px] shadow-card"
          />
          <p className="text-center text-xs text-muted-foreground">
            Live rider location updates every few seconds.
          </p>
        </div>
      </div>
    </Shell>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28 pb-16">
        <div className="px-5 lg:px-8">{children}</div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
