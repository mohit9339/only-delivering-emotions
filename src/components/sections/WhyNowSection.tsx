import { whyNow } from "@/data/site";

export function WhyNowSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Why Now
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            The timing is <span className="text-gradient-brand">perfect.</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {whyNow.map((w, i) => (
            <div
              key={w.title}
              className="group relative rounded-3xl bg-card p-8 shadow-card ring-1 ring-border transition-all hover:-translate-y-1 hover:ring-primary/40"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-2xl bg-gradient-cta p-3.5 text-white shadow-soft">
                  <w.icon className="h-6 w-6" />
                </div>
                <span className="font-[Sora] text-3xl font-extrabold text-primary/15">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-6 font-[Sora] text-xl font-semibold text-foreground">
                {w.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {w.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
