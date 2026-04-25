import { problems } from "@/data/site";

export function ProblemSection() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            The Problem
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Forgetting essentials is a <span className="text-gradient-brand">daily crisis</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Tiffin left at home. Charger at the office. Medicines forgotten on the
            counter. Today's delivery world has no real answer for these moments.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map((p) => (
            <div
              key={p.title}
              className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary-deep transition-colors group-hover:bg-gradient-cta group-hover:text-white">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-[Sora] text-lg font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
