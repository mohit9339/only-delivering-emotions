import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRiderGeolocation } from "@/hooks/useRiderGeolocation";
import { useOfflineOutbox } from "@/hooks/useOfflineOutbox";
import { enqueue } from "@/lib/offlineQueue";
import { uploadRiderDoc, uploadPod } from "@/lib/storage";
import {
  Loader2, Bike, MapPin, Package, LogOut, CheckCircle2, Truck, Wallet, Radio,
  Camera, FileCheck2, Upload, CloudOff,
} from "lucide-react";

export const Route = createFileRoute("/partner/dashboard")({
  head: () => ({
    meta: [{ title: "Rider Dashboard — ONLY" }],
  }),
  component: PartnerDashboard,
});

interface Order {
  id: string;
  order_code: string;
  pickup_location: string;
  drop_location: string;
  item_type: string;
  delivery_type: string;
  status: string;
  rider_id: string | null;
  customer_name: string;
  customer_phone: string;
  estimated_delivery_at: string | null;
}

interface Rider {
  id: string;
  name: string;
  status: string;
  vehicle_type: string;
  profile_photo_path: string | null;
  id_doc_path: string | null;
  license_doc_path: string | null;
  vehicle_doc_path: string | null;
  rejection_reason: string | null;
}

type DocField = "profile_photo" | "id_doc" | "license_doc" | "vehicle_doc";
const DOC_FIELDS: { key: DocField; col: keyof Rider; label: string; hint: string }[] = [
  { key: "profile_photo", col: "profile_photo_path", label: "Profile photo", hint: "A clear selfie" },
  { key: "id_doc", col: "id_doc_path", label: "Government ID", hint: "Aadhaar / PAN / Passport" },
  { key: "license_doc", col: "license_doc_path", label: "Driver's licence", hint: "Front side" },
  { key: "vehicle_doc", col: "vehicle_doc_path", label: "Vehicle RC", hint: "Registration certificate" },
];

function PartnerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [rider, setRider] = useState<Rider | null>(null);
  const [available, setAvailable] = useState<Order[]>([]);
  const [mine, setMine] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Compute hasActive at top-level so the hook order stays stable across renders.
  const hasActive = mine.some((o) => ["assigned", "picked", "in_transit"].includes(o.status));
  const geo = useRiderGeolocation(
    hasActive && rider !== null && rider.status !== "pending"
  );
  const { online, pending, flush } = useOfflineOutbox();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/partner/login" });
      return;
    }
    refresh();
    const ch = supabase
      .channel("rider-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function refresh() {
    if (!user) return;
    const { data: rd } = await supabase
      .from("riders")
      .select("id,name,status,vehicle_type,profile_photo_path,id_doc_path,license_doc_path,vehicle_doc_path,rejection_reason")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!rd) {
      setLoading(false);
      return;
    }
    setRider(rd as Rider);

    const [{ data: avail }, { data: assigned }] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .is("rider_id", null)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("orders")
        .select("*")
        .eq("rider_id", rd.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setAvailable((avail ?? []) as Order[]);
    setMine((assigned ?? []) as Order[]);
    setLoading(false);
  }

  async function acceptOrder(id: string) {
    if (!rider) return;
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: rider.id, status: "assigned" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order accepted!");
    refresh();
  }

  async function updateStatus(id: string, status: string) {
    if (!online) {
      await enqueue("order_status", { orderId: id, status });
      window.dispatchEvent(new CustomEvent("only:outbox-changed"));
      toast.success(`Saved offline · syncs when you're back online`);
      // Optimistic local update so the UI moves forward.
      setMine((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      return;
    }
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      // Network glitch mid-request → queue it.
      await enqueue("order_status", { orderId: id, status });
      window.dispatchEvent(new CustomEvent("only:outbox-changed"));
      toast.message("Queued for retry", { description: error.message });
      setMine((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      return;
    }
    toast.success(`Marked ${status.replace("_", " ")}`);
    void flush();
    refresh();
  }

  async function deliverWithPod(orderId: string, file: File) {
    if (!online) {
      toast.error("You're offline — POD photo needs a connection to upload");
      return;
    }
    try {
      const path = await uploadPod(orderId, file);
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", pod_photo_path: path })
        .eq("id", orderId);
      if (error) throw error;
      toast.success("Delivered! Proof uploaded.");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload proof");
    }
  }

  async function uploadDoc(field: DocField, col: keyof Rider, file: File) {
    if (!user || !rider) return;
    try {
      const path = await uploadRiderDoc(user.id, field, file);
      const update: Record<string, string> = { [col as string]: path };
      const { error } = await supabase.from("riders").update(update as never).eq("id", rider.id);
      if (error) throw error;
      toast.success("Document uploaded");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (authLoading || loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading dashboard…
        </div>
      </Shell>
    );
  }

  if (!rider) {
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-[Sora] text-2xl font-bold">No rider profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete signup to start accepting deliveries.
          </p>
          <Button asChild className="mt-5 bg-gradient-cta text-white">
            <Link to="/partner/register">Sign up as a rider</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const earnings = mine.filter((o) => o.status === "delivered").length * 60;

  return (
    <Shell>
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-cta p-6 text-white shadow-glow">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Bike className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/85">Welcome back</div>
              <div className="font-[Sora] text-2xl font-bold text-white">{rider.name}</div>
              <div className="text-xs text-white/85">
                {rider.vehicle_type} ·{" "}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {rider.status}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <LogOut className="mr-1.5 h-4 w-4" /> Logout
          </Button>
        </div>

        {rider.status === "rejected" && (
          <div className="mt-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <strong>Application rejected.</strong>{" "}
            {rider.rejection_reason ?? "Please contact support or re-upload your documents."}
          </div>
        )}

        {(rider.status === "pending" || rider.status === "rejected") && (
          <Section
            title="Verification documents"
            subtitle="Upload these to get approved. Files stay private and only admins can view them."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {DOC_FIELDS.map((d) => {
                const uploaded = Boolean(rider[d.col]);
                return (
                  <label
                    key={d.key}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft hover:border-primary/50"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        uploaded ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {uploaded ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{d.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {uploaded ? "Uploaded · tap to replace" : d.hint}
                      </div>
                    </div>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadDoc(d.key, d.col, f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </Section>
        )}

        {hasActive && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-2xl border p-3 text-sm ${
              geo.permission === "denied"
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : geo.enabled
                ? "border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <Radio className={`h-4 w-4 ${geo.enabled ? "animate-pulse" : ""}`} />
            <div className="flex-1">
              {geo.permission === "denied"
                ? "Location permission denied — customers can't see your live position. Enable it in your browser settings."
                : geo.enabled
                ? `Sharing live location · last ping ${
                    geo.lastSentAt
                      ? `${Math.max(1, Math.round((Date.now() - geo.lastSentAt) / 1000))}s ago`
                      : "starting…"
                  }`
                : "Waiting for GPS signal…"}
            </div>
            {geo.lastError && geo.permission !== "denied" && (
              <span className="text-xs opacity-70">{geo.lastError}</span>
            )}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package className="h-5 w-5" />} label="Active" value={mine.filter((m) => !["delivered", "cancelled"].includes(m.status)).length} />
          <Stat icon={<CheckCircle2 className="h-5 w-5" />} label="Delivered" value={mine.filter((m) => m.status === "delivered").length} />
          <Stat icon={<Wallet className="h-5 w-5" />} label="Est. Earnings" value={`₹${earnings}`} />
        </div>

        <Section title="My Deliveries" subtitle="Update status as you progress">
          {mine.length === 0 ? (
            <Empty text="No assigned deliveries yet." />
          ) : (
            <div className="grid gap-3">
              {mine.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onUpdate={(s) => updateStatus(o.id, s)}
                  onDeliver={(file) => deliverWithPod(o.id, file)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Available Orders" subtitle="Tap to accept and start earning">
          {available.length === 0 ? (
            <Empty text="No orders waiting right now. Check back in a moment." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((o) => (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">{o.order_code}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${o.delivery_type === "emergency" ? "bg-primary text-white" : "bg-secondary text-secondary-foreground"}`}>
                      {o.delivery_type}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-sm">
                    <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /><span className="truncate">{o.pickup_location}</span></div>
                    <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary-deep" /><span className="truncate">{o.drop_location}</span></div>
                    <div className="flex items-center gap-2 text-muted-foreground"><Package className="h-3.5 w-3.5" />{o.item_type}</div>
                  </div>
                  <Button onClick={() => acceptOrder(o.id)} className="mt-4 w-full bg-gradient-cta text-white">
                    Accept Order
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </Shell>
  );
}

function OrderCard({
  order,
  onUpdate,
  onDeliver,
}: {
  order: Order;
  onUpdate: (s: string) => void;
  onDeliver: (file: File) => void;
}) {
  const next: Record<string, { label: string; status: string; icon: React.ElementType }> = {
    assigned: { label: "Mark Picked Up", status: "picked", icon: Package },
    picked: { label: "Start Transit", status: "in_transit", icon: Truck },
  };
  const action = next[order.status];
  const isDeliverStep = order.status === "in_transit";

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">{order.order_code}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary-deep">
          {order.status.replace("_", " ")}
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-1.5 text-sm">
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /><span className="truncate">{order.pickup_location}</span></div>
          <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary-deep" /><span className="truncate">{order.drop_location}</span></div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-3.5 w-3.5" /> {order.item_type} · {order.customer_name} · {order.customer_phone}
          </div>
        </div>
        {action && (
          <Button onClick={() => onUpdate(action.status)} className="bg-gradient-cta text-white">
            <action.icon className="mr-1 h-4 w-4" /> {action.label}
          </Button>
        )}
        {isDeliverStep && (
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md bg-gradient-cta px-4 text-sm font-medium text-white shadow hover:opacity-95">
            <Camera className="h-4 w-4" /> Capture POD & Deliver
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onDeliver(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-[Sora] text-xl font-bold text-foreground">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <h2 className="font-[Sora] text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      {text}
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
