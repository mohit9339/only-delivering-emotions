import { Smartphone, Bike, Warehouse, PackageCheck } from "lucide-react";

const steps = [
  { icon: Smartphone, title: "You Book", desc: "Pickup, drop & item details in 30 seconds." },
  { icon: Bike, title: "Rider Picks Up", desc: "A verified ONLY rider arrives in minutes." },
  { icon: Warehouse, title: "Hub Routing", desc: "Smart routing through micro-hubs for speed." },
  { icon: PackageCheck, title: "Delivered", desc: "Live tracking until it lands at the door." },
];

export function HowItWorksSection() {
  return (
    <section id="how" className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Four steps. <span className="text-gradient-brand">Zero stress.</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              {i < steps.length - 1 && (
                <div className="absolute left-1/2 top-8 hidden h-px w-full bg-gradient-to-r from-primary/40 to-transparent md:block" aria-hidden />
              )}
              <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-cta text-white shadow-glow">
                <s.icon className="h-7 w-7" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-deep shadow-soft ring-1 ring-border">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-center font-[Sora] text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-1.5 text-center text-sm text-muted-foreground">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
