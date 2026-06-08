import { Button } from "./ui/button";
import { Bike, ArrowRight } from "lucide-react";

const RIDER_URL = "https://rider-companion-app-1cb8643e.vercel.app/";

export function EarnBanner() {
  return (
    <section className="bg-gradient-cta py-12 lg:py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 text-center lg:flex-row lg:px-8 lg:text-left">
        <div className="flex items-start gap-4 lg:items-center">
          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md lg:flex">
            <Bike className="h-7 w-7 text-white" />
          </div>
          <div>
            <h3 className="font-[Sora] text-2xl font-bold text-white sm:text-3xl">
              Earn with ONLY
            </h3>
            <p className="mt-1 max-w-xl text-sm text-white/95 sm:text-base">
              Become a verified delivery partner. Flexible hours, weekly payouts,
              and bonuses on peak hours.
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="bg-white text-primary-deep hover:bg-white/95">
          <a href={RIDER_URL} target="_blank" rel="noopener noreferrer">
            Become a Delivery Partner <ArrowRight className="ml-1.5 h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}
