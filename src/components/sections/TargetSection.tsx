import { targets } from "@/data/site";

export function TargetSection() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Who it's for
            </span>
            <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl">
              Made for <span className="text-gradient-brand">modern city life.</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Whether you're juggling meetings, deadlines, or family — ONLY shows
              up when it matters.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {targets.map((t) => (
              <div
                key={t.label}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-cta text-white shadow-soft">
                  <t.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-[Sora] text-base font-semibold text-foreground">
                  {t.label}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {t.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
