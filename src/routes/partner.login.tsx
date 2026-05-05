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
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const requestOtp = async (targetEmail: string) => {
    // 5 OTP sends per email per 10 minutes
    const limited = await checkLimit("otp_send", `email:${targetEmail}`, 5, 600);
    if (limited) {
      toast.error(limited);
      return false;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: false },
    });
    if (error) {
      await recordAttempt("otp_send", `email:${targetEmail}`, false, { error: error.message });
      toast.error(error.message || "Could not send code. Try again.");
      return false;
    }
    await recordAttempt("otp_send", `email:${targetEmail}`, true);
    toast.success("OTP sent! Check your email.");
    setResendCooldown(30);
    return true;
  };

  const sendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const p = String(fd.get("email") ?? "").trim();
    setEmail(p);
    const ok = await requestOtp(p);
    setSubmitting(false);
    if (ok) setStep("otp");
  };

  const resend = async () => {
    if (resendCooldown > 0 || !email) return;
    setSubmitting(true);
    await requestOtp(email);
    setSubmitting(false);
  };

  const verify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get("otp") ?? "").trim();

    // 10 verify attempts per email per 10 min, with backoff after that
    const limited = await checkLimit("otp_verify", `email:${email}`, 10, 600);
    if (limited) {
      setSubmitting(false);
      return toast.error(limited);
    }

    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setSubmitting(false);
    if (error) {
      await recordAttempt("otp_verify", `email:${email}`, false, { reason: error.message });
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("expired")) return toast.error("Code expired. Tap Resend to get a new one.");
      if (msg.includes("invalid")) return toast.error("Invalid code. Double-check and try again.");
      return toast.error(error.message);
    }
    await recordAttempt("otp_verify", `email:${email}`, true);
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
              {step === "email" ? "We'll email you a one-time code." : `Enter the code sent to ${email}.`}
            </p>

            {step === "email" ? (
              <form onSubmit={sendOtp} className="mt-6 space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input name="email" type="email" required placeholder="rahul@example.com" className="mt-1.5 h-11 rounded-xl" />
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
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={() => setStep("email")} className="text-muted-foreground hover:text-primary">
                    Use a different email
                  </button>
                  <button
                    type="button"
                    onClick={resend}
                    disabled={resendCooldown > 0 || submitting}
                    className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
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
