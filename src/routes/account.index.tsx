import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ReviewForm } from "@/components/ReviewForm";
import { ReviewStars } from "@/components/ReviewStars";
import { Loader2, LogOut, MapPin, Package, Plus, Star, User } from "lucide-react";

export const Route = createFileRoute("/account/")({
  head: () => ({
    meta: [
      { title: "My Account — ONLY" },
      {
        name: "description",
        content:
          "Your ONLY delivery history, ratings and saved details — all in one place.",
      },
    ],
  }),
  component: AccountPage,
});

interface MyOrder {
  id: string;
  order_code: string;
  pickup_location: string;
  drop_location: string;
  item_type: string;
  delivery_type: "emergency" | "sameday";
  status: string;
  created_at: string;
  delivered_at: string | null;
  estimated_delivery_at: string | null;
  rider_name: string | null;
  rider_id: string | null;
  review_rating: number | null;
  review_feedback: string | null;
}

function AccountPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_my_orders" as never);
    if (!error) setOrders((data ?? []) as MyOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/account/login" });
      return;
    }
    // Ensure profile row exists; lazy-create on first visit.
    (async () => {
      const { data: existing } = await supabase
        .from("customer_profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        const fallback = user.email?.split("@")[0] ?? "Customer";
        await supabase.from("customer_profiles").insert({
          user_id: user.id,
          display_name: fallback,
        } as never);
        setDisplayName(fallback);
      } else {
        setDisplayName(existing.display_name);
      }
    })();
    refresh();
  }, [user, authLoading, navigate, refresh]);

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

  const delivered = orders.filter((o) => o.status === "delivered");
  const active = orders.filter(
    (o) => !["delivered", "cancelled"].includes(o.status),
  );
  const rated = delivered.filter((o) => o.review_rating != null).length;

  return (
    <Shell>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-gradient-cta p-6 text-white shadow-glow">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-white/85">
                Welcome back
              </div>
              <div className="font-[Sora] text-2xl font-bold text-white">
                {displayName || user?.email}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link to="/book">
                <Plus className="mr-1.5 h-4 w-4" /> New booking
              </Link>
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat icon={<Package className="h-5 w-5" />} label="Total orders" value={orders.length} />
          <Stat icon={<MapPin className="h-5 w-5" />} label="Active" value={active.length} />
          <Stat icon={<Star className="h-5 w-5" />} label="Ratings given" value={rated} />
        </div>

        <h2 className="mt-10 font-[Sora] text-xl font-bold text-foreground">
          Order history
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap any delivered order to leave a review for your rider.
        </p>

        {orders.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-border p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              You haven't booked any deliveries yet.
            </p>
            <Button asChild className="mt-4 bg-gradient-cta text-white">
              <Link to="/book">Book your first delivery</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} onReviewed={refresh} />
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}

function OrderCard({ order, onReviewed }: { order: MyOrder; onReviewed: () => void }) {
  const [reviewing, setReviewing] = useState(false);
  const canReview = order.status === "delivered" && order.rider_id;
  return (
    <li className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-foreground">
              {order.order_code}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                order.delivery_type === "emergency"
                  ? "bg-primary text-white"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {order.delivery_type}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                order.status === "delivered"
                  ? "bg-emerald-100 text-emerald-900"
                  : order.status === "cancelled"
                    ? "bg-destructive/15 text-destructive"
                    : "bg-amber-100 text-amber-900"
              }`}
            >
              {order.status}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="truncate">{order.pickup_location}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary-deep shrink-0" />
            <span className="truncate">{order.drop_location}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{new Date(order.created_at).toLocaleString()}</span>
            <span>•</span>
            <span>{order.item_type}</span>
            {order.rider_name && (
              <>
                <span>•</span>
                <span>Rider: {order.rider_name}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/track/$code" params={{ code: order.order_code }}>
              Track
            </Link>
          </Button>
          {order.review_rating != null && (
            <ReviewStars value={order.review_rating} size={14} showValue />
          )}
        </div>
      </div>

      {canReview && (
        <div className="mt-4">
          {reviewing || order.review_rating != null ? (
            <ReviewForm
              orderCode={order.order_code}
              riderName={order.rider_name}
              initialRating={order.review_rating}
              initialFeedback={order.review_feedback}
              onSubmitted={() => {
                setReviewing(false);
                onReviewed();
              }}
            />
          ) : (
            <Button
              size="sm"
              onClick={() => setReviewing(true)}
              className="bg-gradient-cta text-white"
            >
              <Star className="mr-1.5 h-4 w-4" /> Leave a review
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="font-[Sora] text-xl font-bold text-foreground">{value}</div>
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
