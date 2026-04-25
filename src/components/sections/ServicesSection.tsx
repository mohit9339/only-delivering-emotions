import { emergencyItems, sameDayItems } from "@/data/site";
import { Zap, Package } from "lucide-react";

export function ServicesSection() {
  return (
    <section id="services" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Our Services
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Two speeds. <span className="text-gradient-brand">Endless possibilities.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {/* Emergency */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-cta p-8 text-white shadow-glow lg:p-10">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/80">Emergency</div>
                <h3 className="font-[Sora] text-2xl font-bold">30 – 90 minutes</h3>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm text-white/90">
              For the moments where every minute matters. Door-to-door urgency
              with a verified rider on the way in seconds.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {emergencyItems.map((i) => (
                <div
                  key={i.label}
                  className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2.5 text-sm backdrop-blur-md ring-1 ring-white/20"
                >
                  <i.icon className="h-4 w-4 shrink-0" />
                  <span className="font-medium">{i.label}</span>
                </div>
              ))}
            </div>
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          </div>

          {/* Same-day */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card lg:p-10">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-accent p-2.5 text-primary-deep">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-primary">Same-Day</div>
                <h3 className="font-[Sora] text-2xl font-bold text-foreground">Within 4 – 12 hrs</h3>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm text-muted-foreground">
              For things you still need today, but not in the next hour.
              Affordable, reliable and tracked the whole way.
            </p>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {sameDayItems.map((i) => (
                <div
                  key={i.label}
                  className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground"
                >
                  <i.icon className="h-4 w-4 shrink-0 text-primary-deep" />
                  <span className="font-medium">{i.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
