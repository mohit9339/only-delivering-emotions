import { solutions } from "@/data/site";

export function SolutionSection() {
  return (
    <section id="solution" className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            The Solution
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Built for the moments that <span className="text-gradient-brand">can't wait</span>
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            A trusted, fast, transparent delivery experience designed end-to-end
            for personal essentials.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {solutions.map((s) => (
            <div
              key={s.title}
              className="relative overflow-hidden rounded-3xl bg-card p-7 shadow-card ring-1 ring-border transition-transform duration-300 hover:-translate-y-1.5"
            >
              <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.accent} text-white shadow-soft`}>
                <s.icon className="h-7 w-7" />
              </div>
              <h3 className="font-[Sora] text-xl font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {s.desc}
              </p>
              <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
