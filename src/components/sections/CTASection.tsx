import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CUSTOMER_URL = "https://only-customer.vercel.app/";

export function CTASection() {
  return (
    <section className="px-5 py-16 lg:px-8 lg:py-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-hero p-10 text-center text-white shadow-glow sm:p-16">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_30%,white,transparent_40%),radial-gradient(circle_at_70%_70%,white,transparent_40%)]" />
        <div className="relative">
          <h2 className="font-[Sora] text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
            Never forget anything again.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white sm:text-lg">
            Join thousands of people across India who trust ONLY to deliver the
            things that matter most — fast, safely, and on time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-white text-primary-deep shadow-soft hover:bg-white/95">
              <a href={CUSTOMER_URL} target="_blank" rel="noopener noreferrer">
                Start your delivery <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
