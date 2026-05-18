import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, fetchUserRoles } from "@/hooks/useAuth";
import { signedUrl } from "@/lib/storage";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminAnalytics, AuditLogPanel } from "@/components/admin/AdminAnalytics";
import {
  Loader2, Package, Users, TrendingUp, ShieldCheck, LogOut, MapPin, Truck,
  CheckCircle2, XCircle, Eye, Image as ImageIcon,
} from "lucide-react";
import { ReviewStars } from "@/components/ReviewStars";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — ONLY" }] }),
  component: AdminDashboard,
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
  created_at: string;
  pod_photo_path: string | null;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  city: string;
  status: string;
  created_at: string;
  rejection_reason: string | null;
  profile_photo_path: string | null;
  id_doc_path: string | null;
  license_doc_path: string | null;
  vehicle_doc_path: string | null;
  avg_rating: number | null;
  reviews_count: number;
}

const STATUSES = ["pending", "assigned", "picked", "in_transit", "delivered", "cancelled"];

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    fetchUserRoles(user.id).then((roles) => {
      const ok = roles.includes("admin");
      setIsAdmin(ok);
      if (ok) refresh();
      else setLoading(false);
    });

    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "riders" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function refresh() {
    const [{ data: o }, { data: r }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("riders").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setOrders((o ?? []) as Order[]);
    setRiders((r ?? []) as Rider[]);
    setLoading(false);
  }

  async function setOrderStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
  }

  async function assignRider(orderId: string, riderId: string | null) {
    const { error } = await supabase
      .from("orders")
      .update({ rider_id: riderId, status: riderId ? "assigned" : "pending" })
      .eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success(riderId ? "Rider assigned" : "Rider unassigned");
  }

  async function approveRider(id: string) {
    const { error } = await supabase.rpc("admin_approve_rider", { p_rider_id: id } as never);
    if (error) return toast.error(error.message);
    toast.success("Rider approved");
  }

  async function rejectRider(id: string) {
    const reason = window.prompt("Reason for rejection? (visible to the rider)");
    if (!reason || reason.trim().length < 3) return;
    const { error } = await supabase.rpc("admin_reject_rider", {
      p_rider_id: id,
      p_reason: reason.trim(),
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Rider rejected");
  }

  async function openDoc(path: string | null) {
    if (!path) return toast.error("Not uploaded yet");
    const url = await signedUrl("rider-docs", path, 300);
    if (!url) return toast.error("Could not generate link");
    window.open(url, "_blank", "noopener");
  }

  async function openPod(path: string | null) {
    if (!path) return toast.error("No POD on file");
    const url = await signedUrl("pod", path, 300);
    if (!url) return toast.error("Could not generate link");
    window.open(url, "_blank", "noopener");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (authLoading || loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="mx-auto max-w-md text-center">
          <XCircle className="mx-auto h-10 w-10 text-destructive" />
          <h2 className="mt-3 font-[Sora] text-2xl font-bold">Not authorised</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have admin access.
          </p>
          <Button asChild className="mt-5 bg-gradient-cta text-white">
            <Link to="/admin/login">Back to login</Link>
          </Button>
        </div>
      </Shell>
    );
  }

  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const delivered = orders.filter((o) => o.status === "delivered");
  const revenue = delivered.length * 60 + orders.filter((o) => o.delivery_type === "emergency").length * 40;
  const approvedRiders = riders.filter((r) => r.status === "approved").length;

  return (
    <Shell>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-cta p-6 text-white shadow-glow">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/85">Admin</div>
              <div className="font-[Sora] text-2xl font-bold text-white">Operations Dashboard</div>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            <LogOut className="mr-1.5 h-4 w-4" /> Logout
          </Button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Package />} label="Total Orders" value={orders.length} />
          <Stat icon={<Truck />} label="Active" value={active.length} />
          <Stat icon={<TrendingUp />} label="Revenue" value={`₹${revenue}`} />
          <Stat icon={<Users />} label="Approved Riders" value={approvedRiders} />
        </div>

        <Tabs defaultValue="orders" className="mt-8">
          <TabsList className="bg-muted/50 flex-wrap h-auto">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="riders">Riders</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Section title="Orders" subtitle="Assign riders, update status, monitor live deliveries">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">Code</th>
                      <th className="px-3 py-3">Customer</th>
                      <th className="px-3 py-3">Route</th>
                      <th className="px-3 py-3">Item</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Rider</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">No orders yet.</td></tr>
                    )}
                    {orders.map((o) => (
                      <tr key={o.id} className="border-t border-border/60 align-top">
                        <td className="px-3 py-3 font-mono text-xs">{o.order_code}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium">{o.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                        </td>
                        <td className="px-3 py-3 max-w-[260px]">
                          <div className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 text-primary shrink-0" /><span className="truncate">{o.pickup_location}</span></div>
                          <div className="flex items-center gap-1 truncate text-muted-foreground"><MapPin className="h-3 w-3 text-primary-deep shrink-0" /><span className="truncate">{o.drop_location}</span></div>
                        </td>
                        <td className="px-3 py-3">{o.item_type}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${o.delivery_type === "emergency" ? "bg-primary text-white" : "bg-secondary text-secondary-foreground"}`}>
                            {o.delivery_type}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={o.rider_id ?? ""}
                            onChange={(e) => assignRider(o.id, e.target.value || null)}
                            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                          >
                            <option value="">— Unassigned —</option>
                            {riders.filter((r) => r.status === "approved").map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <select
                              value={o.status}
                              onChange={(e) => setOrderStatus(o.id, e.target.value)}
                              className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                            >
                              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {o.pod_photo_path && (
                              <button
                                onClick={() => openPod(o.pod_photo_path)}
                                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-1 text-[10px] font-medium text-primary-deep hover:bg-primary/20"
                                title="View proof of delivery"
                              >
                                <ImageIcon className="h-3 w-3" /> POD
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="riders">
            <Section title="Riders" subtitle="Approve or reject rider applications">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-3">Name</th>
                      <th className="px-3 py-3">Phone</th>
                      <th className="px-3 py-3">Vehicle</th>
                      <th className="px-3 py-3">City</th>
                      <th className="px-3 py-3">Documents</th>
                      <th className="px-3 py-3">Rating</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riders.length === 0 && (
                      <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No riders yet.</td></tr>
                    )}
                    {riders.map((r) => (
                      <tr key={r.id} className="border-t border-border/60">
                        <td className="px-3 py-3 font-medium">{r.name}</td>
                        <td className="px-3 py-3 text-muted-foreground">{r.phone}</td>
                        <td className="px-3 py-3">{r.vehicle_type}</td>
                        <td className="px-3 py-3">{r.city}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {[
                              { label: "Photo", path: r.profile_photo_path },
                              { label: "ID", path: r.id_doc_path },
                              { label: "Licence", path: r.license_doc_path },
                              { label: "RC", path: r.vehicle_doc_path },
                            ].map((d) => (
                              <button
                                key={d.label}
                                onClick={() => openDoc(d.path)}
                                disabled={!d.path}
                                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                                  d.path
                                    ? "bg-primary/10 text-primary-deep hover:bg-primary/20"
                                    : "bg-muted text-muted-foreground/60 cursor-not-allowed"
                                }`}
                              >
                                <Eye className="h-3 w-3" /> {d.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <ReviewStars value={r.avg_rating} size={12} showValue />
                          <div className="text-[10px] text-muted-foreground">
                            {r.reviews_count} review{r.reviews_count === 1 ? "" : "s"}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            r.status === "approved" ? "bg-primary text-white" :
                            r.status === "rejected" ? "bg-destructive text-destructive-foreground" :
                            "bg-amber-100 text-amber-900"
                          }`}>{r.status}</span>
                          {r.rejection_reason && (
                            <div className="mt-1 max-w-[180px] text-[10px] text-destructive">{r.rejection_reason}</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {r.status !== "approved" && (
                              <Button size="sm" onClick={() => approveRider(r.id)} className="h-8 bg-primary text-white">
                                <CheckCircle2 className="mr-1 h-3 w-3" /> Approve
                              </Button>
                            )}
                            {r.status !== "rejected" && (
                              <Button size="sm" variant="outline" onClick={() => rejectRider(r.id)} className="h-8">
                                <XCircle className="mr-1 h-3 w-3" /> Reject
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="analytics">
            <Section title="Analytics" subtitle="Operational health & performance">
              <AdminAnalytics />
            </Section>
          </TabsContent>

          <TabsContent value="audit">
            <Section title="Audit log" subtitle="Last 100 admin & system events">
              <AuditLogPanel />
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
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
