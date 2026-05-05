import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { MapPin, Package, ArrowRight, CheckCircle2, Zap, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const itemTypes = ["Tiffin", "Medicines", "Charger", "Keys", "Documents", "Clothes", "Books", "Shoes", "Other"];
const speeds = [
  { id: "emergency" as const, label: "Emergency", eta: "30–90 min", icon: Zap },
  { id: "sameday" as const, label: "Same-day", eta: "4–12 hrs", icon: Clock },
];

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a Delivery — ONLY" },
      {
        name: "description",
        content:
          "Book hyperlocal delivery in 30 seconds. Pickup, drop, item — your forgotten essentials delivered fast by verified ONLY riders.",
      },
      { property: "og:title", content: "Book a Delivery — ONLY" },
      {
        property: "og:description",
        content: "Pickup, drop, item — that's all we need. ONLY delivers in 30–90 min.",
      },
    ],
  }),
  component: BookPage,
});

function BookPage() {
  const navigate = useNavigate();
  const [speed, setSpeed] = useState<"emergency" | "sameday">("emergency");
  const [item, setItem] = useState("Tiffin");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      p_customer_name: String(fd.get("name") ?? "").trim(),
      p_customer_phone: String(fd.get("phone") ?? "").trim(),
      p_pickup_location: String(fd.get("pickup") ?? "").trim(),
      p_drop_location: String(fd.get("drop") ?? "").trim(),
      p_item_type: item,
      p_delivery_type: speed,
      p_notes: String(fd.get("notes") ?? "").trim() || undefined,
      p_client_id: getClientId(),
    } as never;

    const { data, error } = await supabase.rpc("create_guest_order", payload);

    if (error || !data || (data as unknown[]).length === 0) {
      console.error(error);
      toast.error(formatRateLimitError(error, "Could not create order. Try again."));
      setSubmitting(false);
      return;
    }

    const code = data[0].order_code;
    toast.success(`Order ${code} created!`, {
      description: "Redirecting to live tracking…",
    });
    setTimeout(() => {
      navigate({ to: "/track/$code", params: { code } });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24">
        <section className="bg-gradient-hero py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white backdrop-blur">
                Book a delivery
              </span>
              <h1 className="mt-4 font-[Sora] text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                Send something in 30 seconds.
              </h1>
              <p className="mt-3 max-w-xl text-base text-white/95">
                Pickup, drop, and item — that's all we need. Our nearest verified
                rider will be on the way before you finish your coffee.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_1.2fr] lg:px-8">
            <div className="space-y-3">
              {[
                "No call centers. No paperwork.",
                "Real-time tracking from pickup to drop.",
                "Pay only after successful delivery.",
                "Verified background-checked riders.",
              ].map((p) => (
                <div key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  {p}
                </div>
              ))}

              <div className="mt-8 rounded-2xl bg-gradient-soft p-5 ring-1 ring-border">
                <div className="text-xs font-semibold uppercase tracking-wider text-primary-deep">
                  How pricing works
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Emergency deliveries are priced higher for guaranteed sub-90-minute
                  arrival. Same-day is wallet-friendly for non-urgent items.
                  Final price is shown before you confirm the rider.
                </p>
              </div>
            </div>

            <form
              onSubmit={onSubmit}
              className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
            >
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5">
                {speeds.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSpeed(s.id)}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        speed === s.id
                          ? "bg-gradient-cta text-white shadow-soft"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <Icon className="h-4 w-4" /> {s.label}
                      </div>
                      <div className="text-[10px] font-normal opacity-90">{s.eta}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-4">
                <Field label="Pickup location">
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                    <Input name="pickup" required placeholder="e.g. Indiranagar, Bengaluru" className="pl-9 h-11 rounded-xl" />
                  </div>
                </Field>
                <Field label="Drop location">
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-deep" />
                    <Input name="drop" required placeholder="e.g. Whitefield, Bengaluru" className="pl-9 h-11 rounded-xl" />
                  </div>
                </Field>

                <Field label="Item type">
                  <div className="mt-2 flex flex-wrap gap-2">
                    {itemTypes.map((it) => (
                      <button
                        type="button"
                        key={it}
                        onClick={() => setItem(it)}
                        className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                          item === it
                            ? "border-primary bg-primary/10 text-primary-deep"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Package className="mr-1.5 inline h-3 w-3" />
                        {it}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Your name">
                    <Input name="name" required placeholder="Jane Doe" className="mt-1.5 h-11 rounded-xl" />
                  </Field>
                  <Field label="Phone">
                    <Input name="phone" type="tel" required placeholder="+91 98XXXXXXXX" className="mt-1.5 h-11 rounded-xl" />
                  </Field>
                </div>

                <Field label="Notes (optional)">
                  <Textarea name="notes" rows={2} placeholder="Apt 4B, blue gate, hand to security…" className="mt-1.5 rounded-xl" />
                </Field>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={submitting}
                className="mt-6 w-full bg-gradient-cta text-base text-white shadow-glow hover:opacity-95"
              >
                {submitting ? "Creating order…" : "Confirm booking"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                By booking you agree to ONLY's <Link to="/" className="underline">Terms & Privacy</Link>.
              </p>
            </form>
          </div>
        </section>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
