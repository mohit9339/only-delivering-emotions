import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkLimit, recordAttempt } from "@/lib/rateLimit";
import { User } from "lucide-react";

export const Route = createFileRoute("/account/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ONLY" },
      {
        name: "description",
        content:
          "Sign in to ONLY to save your delivery history, rate riders, and re-book your favourites in one tap.",
      },
    ],
  }),
  component: AccountLogin,
});

function AccountLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendOtp(target: string) {
    const limited = await checkLimit("otp_send", `cust:${target}`, 5, 600);
    if (limited) {
      toast.error(limited);
      return false;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/account" },
    });
    if (error) {
      await recordAttempt("otp_send", `cust:${target}`, false, { error: error.message });
      toast.error(error.message);
      return false;
    }
    await recordAttempt("otp_send", `cust:${target}`, true);
    toast.success("Code sent — check your email.");
    setCooldown(30);
    return true;
  }

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const v = String(fd.get("email") ?? "").trim();
    setEmail(v);
    const ok = await sendOtp(v);
    setSubmitting(false);
    if (ok) setStep("otp");
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get("otp") ?? "").trim();
    const limited = await checkLimit("otp_verify", `cust:${email}`, 10, 600);
    if (limited) {
      setSubmitting(false);
      return toast.error(limited);
    }
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setSubmitting(false);
    if (error) {
      await recordAttempt("otp_verify", `cust:${email}`, false, { reason: error.message });
      return toast.error(error.message);
    }
    await recordAttempt("otp_verify", `cust:${email}`, true);
    toast.success("Welcome!");
    navigate({ to: "/account" });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex min-h-[80vh] items-center justify-center pt-24 pb-16">
        <div className="w-full max-w-md px-5">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-cta text-white">
              <User className="h-6 w-6" />
            </div>
            <h1 className="mt-5 font-[Sora] text-2xl font-bold text-foreground">
              Sign in to ONLY
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === "email"
                ? "No password. We'll email you a one-time code — new accounts created automatically."
                : `Enter the 6-digit code sent to ${email}.`}
            </p>

            {step === "email" ? (
              <form onSubmit={onEmail} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full bg-gradient-cta text-white"
                >
                  {submitting ? "Sending…" : "Continue"}
                </Button>
              </form>
            ) : (
              <form onSubmit={onVerify} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    One-time code
                  </Label>
                  <Input
                    name="otp"
                    required
                    maxLength={6}
                    className="mt-1.5 h-12 rounded-xl text-center font-mono text-xl tracking-[0.5em]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  size="lg"
                  className="w-full bg-gradient-cta text-white"
                >
                  {submitting ? "Verifying…" : "Sign in"}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setStep("email")}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    disabled={cooldown > 0 || submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      await sendOtp(email);
                      setSubmitting(false);
                    }}
                    className="text-primary hover:underline disabled:text-muted-foreground"
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Want to book without an account?{" "}
              <Link to="/book" className="text-primary underline">
                Continue as guest
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
