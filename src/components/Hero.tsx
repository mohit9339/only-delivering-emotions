import { Button } from "./ui/button";
import { ArrowRight, Sparkles, Zap, MapPin, Bike } from "lucide-react";
import heroRider from "@/assets/hero-rider.png";

const CUSTOMER_URL = "https://only-customer.vercel.app/";
const RIDER_URL = "https://rider-companion-app-1cb8643e.vercel.app/";

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden pt-28 pb-20 lg:pt-36 lg:pb-28">
      <div className="absolute inset-0 -z-10 bg-gradient-hero" />
      <div className="absolute inset-0 -z-10 opacity-40 [background:radial-gradient(circle_at_20%_10%,white,transparent_45%),radial-gradient(circle_at_85%_60%,white,transparent_40%)]" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8">
        <div className="animate-fade-up text-primary">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md ring-1 ring-white/30 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            India's first hyperlocal personal delivery
          </div>
          <h1 className="mt-5 font-[Sora] text-4xl font-extrabold leading-[1.05] text-primary sm:text-5xl lg:text-6xl">
            Forgot something?
            <br />
            <span className="text-primary">We deliver it</span>{" "}
            <span className="relative inline-block text-primary">
              <span className="relative z-10">fast.</span>
              <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded bg-white/25" />
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-primary sm:text-lg">
            Tiffin, charger, medicines, keys, documents — ONLY brings your forgotten
            essentials to your doorstep in <strong className="text-primary">30–90 minutes</strong>. Because
            small things carry big emotions.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="lg"
              className="group relative h-12 overflow-hidden rounded-full bg-gradient-to-r from-primary to-primary-deep px-7 text-base font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.62_0.12_180/0.6)] ring-1 ring-primary/30 transition-all hover:shadow-[0_14px_40px_-10px_oklch(0.62_0.12_180/0.75)] hover:-translate-y-0.5"
            >
              <a href={CUSTOMER_URL} target="_blank" rel="noopener noreferrer">
                <span className="relative z-10 flex items-center">
                  Order on ONLY
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-12 rounded-full border-2 border-primary/40 bg-white/80 px-7 text-base font-semibold text-primary backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:text-primary-deep hover:shadow-[0_10px_30px_-10px_oklch(0.72_0.13_178/0.5)]"
            >
              <a href={CUSTOMER_URL} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                Track Order
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="group h-12 rounded-full border-2 border-dashed border-primary/50 bg-transparent px-7 text-base font-semibold text-primary transition-all hover:-translate-y-0.5 hover:border-solid hover:border-primary hover:bg-primary/10 hover:text-primary-deep"
            >
              <a href={RIDER_URL} target="_blank" rel="noopener noreferrer">
                <Bike className="mr-2 h-4 w-4 transition-transform group-hover:-rotate-12" />
                Become a Rider
              </a>
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-primary">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" /> 30–90 min ETA
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live tracking
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-primary">★ 4.9</span>
              Verified riders
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-white/10 blur-2xl" />
          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur-xl ring-1 ring-white/30 shadow-glow">
            <img
              src={heroRider}
              alt="ONLY delivery rider"
              width={1280}
              height={1024}
              className="animate-float w-full"
            />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-primary">
              <div className="rounded-xl bg-white/15 p-3 backdrop-blur-md">
                <div className="font-[Sora] text-lg font-bold text-primary">30m</div>
                <div className="text-[10px] uppercase tracking-wider text-primary/90">Avg ETA</div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 backdrop-blur-md">
                <div className="font-[Sora] text-lg font-bold text-primary">10k+</div>
                <div className="text-[10px] uppercase tracking-wider text-primary/90">Deliveries</div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 backdrop-blur-md">
                <div className="font-[Sora] text-lg font-bold text-primary">4.9★</div>
                <div className="text-[10px] uppercase tracking-wider text-primary/90">Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <svg
        className="absolute inset-x-0 -bottom-px text-background"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path fill="currentColor" d="M0,32 C360,80 1080,0 1440,48 L1440,80 L0,80 Z" />
      </svg>
    </section>
  );
}
