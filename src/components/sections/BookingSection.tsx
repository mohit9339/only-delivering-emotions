import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Package, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const itemTypes = ["Tiffin", "Medicines", "Charger", "Keys", "Documents", "Clothes", "Books", "Other"];
const speeds = [
  { id: "emergency", label: "Emergency", eta: "30–90 min" },
  { id: "sameday", label: "Same-day", eta: "4–12 hrs" },
];

export function BookingSection() {
  const [speed, setSpeed] = useState("emergency");
  const [item, setItem] = useState("Tiffin");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Booking received! A rider is being assigned.", {
      description: `${speed === "emergency" ? "Emergency" : "Same-day"} • ${item}`,
    });
    setTimeout(() => setSubmitted(false), 3500);
  };

  return (
    <section id="book" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Book a delivery
            </span>
            <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              Send something <span className="text-gradient-brand">in 30 seconds.</span>
            </h2>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Pickup, drop, and item — that's all we need. Our nearest verified
              rider will be on the way before you finish your coffee.
            </p>
            <div className="mt-8 space-y-3">
              {[
                "No call centers. No paperwork.",
                "Real-time tracking from pickup to drop.",
                "Pay only after successful delivery.",
              ].map((p) => (
                <div key={p} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {p}
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
          >
            {/* Speed toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5">
              {speeds.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSpeed(s.id)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    speed === s.id
                      ? "bg-gradient-cta text-white shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div>{s.label}</div>
                  <div className="text-[10px] font-normal opacity-80">{s.eta}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="pickup" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Pickup location
                </Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input id="pickup" required placeholder="e.g. Indiranagar, Bengaluru" className="pl-9 h-11 rounded-xl" />
                </div>
              </div>
              <div>
                <Label htmlFor="drop" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Drop location
                </Label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-deep" />
                  <Input id="drop" required placeholder="e.g. Whitefield, Bengaluru" className="pl-9 h-11 rounded-xl" />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Item type
                </Label>
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
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone
                </Label>
                <Input id="phone" type="tel" required placeholder="+91 98XXXXXXXX" className="mt-1.5 h-11 rounded-xl" />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitted}
              className="mt-6 w-full bg-gradient-cta text-base text-white shadow-glow hover:opacity-95"
            >
              {submitted ? "Rider being assigned..." : "Book now"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              By booking you agree to ONLY's Terms & Privacy.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
