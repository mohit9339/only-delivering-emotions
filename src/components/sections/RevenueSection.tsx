import { revenue } from "@/data/site";
import { Check } from "lucide-react";

export function RevenueSection() {
  return (
    <section id="pricing" className="relative overflow-hidden py-20 lg:py-28">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Revenue Model
          </span>
          <h2 className="mt-3 font-[Sora] text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
            Built to <span className="text-gradient-brand">scale sustainably</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {revenue.map((r, i) => (
            <div
              key={r.title}
              className={`rounded-3xl p-8 shadow-card transition-transform hover:-translate-y-1 ${
                i === 1
                  ? "bg-gradient-cta text-white ring-1 ring-white/20"
                  : "bg-card ring-1 ring-border"
              }`}
            >
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${
                  i === 1 ? "bg-white/20 text-white" : "bg-accent text-primary-deep"
                }`}
              >
                <r.icon className="h-6 w-6" />
              </div>
              <h3 className={`mt-5 font-[Sora] text-xl font-semibold ${i === 1 ? "text-white" : "text-foreground"}`}>
                {r.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {r.items.map((item) => (
                  <li
                    key={item}
                    className={`flex items-start gap-2 text-sm ${
                      i === 1 ? "text-white/95" : "text-muted-foreground"
                    }`}
                  >
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${i === 1 ? "text-white" : "text-primary"}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
