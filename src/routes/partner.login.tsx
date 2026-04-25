import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Bike } from "lucide-react";

export const Route = createFileRoute("/partner/login")({
  head: () => ({
    meta: [
      { title: "Rider Login — ONLY" },
      { name: "description", content: "Login to your ONLY delivery partner dashboard." },
    ],
  }),
  component: PartnerLogin,
});

function PartnerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [submitting, setSubmitting] = useState(false);

  const sendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const p = String(fd.get("phone") ?? "").trim();
    setPhone(p);
    const { error } = await supabase.auth.signInWithOtp({ phone: p });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("OTP sent!");
    setStep("otp");
  };

  const verify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get("otp") ?? "").trim();
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/partner/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex min-h-[80vh] items-center justify-center pt-24 pb-16">
        <div className="w-full max-w-md px-5">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-cta text-white">
              <Bike className="h-6 w-6" />
            </div>
            <h1 className="mt-5 font-[Sora] text-2xl font-bold text-foreground">Rider login</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "phone" ? "We'll text you a one-time code." : `Enter the code sent to ${phone}.`}
            </p>

            {step === "phone" ? (
              <form onSubmit={sendOtp} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</Label>
                  <Input name="phone" type="tel" required placeholder="+919876543210" className="mt-1.5 h-11 rounded-xl" />
                </div>
                <Button type="submit" disabled={submitting} size="lg" className="w-full bg-gradient-cta text-white">
                  {submitting ? "Sending…" : "Send OTP"}
                </Button>
              </form>
            ) : (
              <form onSubmit={verify} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OTP</Label>
                  <Input name="otp" required maxLength={6} className="mt-1.5 h-12 rounded-xl text-center font-mono text-xl tracking-[0.5em]" />
                </div>
                <Button type="submit" disabled={submitting} size="lg" className="w-full bg-gradient-cta text-white">
                  {submitting ? "Verifying…" : "Login"}
                </Button>
                <button type="button" onClick={() => setStep("phone")} className="block w-full text-center text-xs text-muted-foreground hover:text-primary">
                  Use a different phone
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Not a rider yet? <Link to="/partner/register" className="text-primary underline">Sign up</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
