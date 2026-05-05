import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Search, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/track/")({
  head: () => ({
    meta: [
      { title: "Track Your Order — ONLY" },
      { name: "description", content: "Enter your ONLY order code to track your delivery in real time." },
      { property: "og:title", content: "Track Your Order — ONLY" },
      { property: "og:description", content: "Live tracking for your ONLY delivery." },
    ],
  }),
  component: TrackIndex,
});

function TrackIndex() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    // Accept both legacy ON-XXXXXX and new ONLY-XXXXXX
    if (!/^(ON|ONLY)-[A-Z0-9]{6}$/.test(trimmed)) {
      toast.error("Order codes look like ONLY-XXXXXX");
      return;
    }
    navigate({ to: "/track/$code", params: { code: trimmed } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24">
        <section className="bg-gradient-hero py-16 lg:py-24">
          <div className="mx-auto max-w-2xl px-5 text-center lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white backdrop-blur">
              <MapPin className="h-3.5 w-3.5" /> Live tracking
            </div>
            <h1 className="mt-4 font-[Sora] text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
              Where's your delivery?
            </h1>
            <p className="mt-3 text-white/95">
              Enter the order code we shared after booking.
            </p>
            <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ON-AB12CD"
                  className="h-12 rounded-xl bg-white pl-9 font-mono text-base uppercase tracking-wider text-foreground placeholder:normal-case placeholder:text-muted-foreground/60"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 bg-foreground text-background hover:bg-foreground/90">
                Track Order
              </Button>
            </form>
          </div>
        </section>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
