import { roadmap } from "@/data/site";

export function RoadmapSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Roadmap
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            The road to <span className="text-gradient-brand">every doorstep.</span>
          </h2>
        </div>

        <div className="relative mt-16">
          <div className="absolute left-4 top-0 hidden h-full w-px bg-gradient-to-b from-primary via-primary/40 to-transparent md:left-1/2 md:block" aria-hidden />
          <div className="space-y-6 md:space-y-10">
            {roadmap.map((r, i) => (
              <div
                key={r.phase}
                className={`grid gap-4 md:grid-cols-2 md:gap-12 ${
                  i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                }`}
              >
                <div className={`md:${i % 2 === 0 ? "text-right" : "text-left"}`}>
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-cta font-[Sora] text-sm font-bold text-white">
                      0{i + 1}
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                        {r.phase}
                      </div>
                      <h3 className="font-[Sora] text-base font-semibold text-foreground">
                        {r.title}
                      </h3>
                    </div>
                  </div>
                </div>
                <p className="self-center text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
