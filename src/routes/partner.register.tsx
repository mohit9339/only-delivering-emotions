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
import { Bike, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/partner/register")({
  head: () => ({
    meta: [
      { title: "Become a Delivery Partner — ONLY" },
      { name: "description", content: "Earn flexible income with ONLY. Sign up in minutes — phone OTP, no paperwork." },
      { property: "og:title", content: "Become a Delivery Partner — ONLY" },
      { property: "og:description", content: "Flexible hours, weekly payouts, peak-hour bonuses." },
    ],
  }),
  component: PartnerRegister,
});

function PartnerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    vehicle_type: "Bike",
    city: "",
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const requestOtp = async (targetEmail: string) => {
    const limited = await checkLimit("otp_send", `email:${targetEmail}`, 5, 600);
    if (limited) {
      toast.error(limited);
      return false;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true },
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
    setProfile({
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      vehicle_type: String(fd.get("vehicle_type") ?? "Bike"),
      city: String(fd.get("city") ?? "").trim(),
    });
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

  const verifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const token = String(fd.get("otp") ?? "").trim();

    const limited = await checkLimit("otp_verify", `email:${email}`, 10, 600);
    if (limited) {
      setSubmitting(false);
      return toast.error(limited);
    }

    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error || !data.user) {
      await recordAttempt("otp_verify", `email:${email}`, false, { reason: error?.message });
      const msg = error?.message?.toLowerCase() ?? "";
      if (msg.includes("expired")) toast.error("Code expired. Tap Resend to get a new one.");
      else if (msg.includes("invalid")) toast.error("Invalid code. Double-check and try again.");
      else toast.error(error?.message ?? "Invalid code");
      setSubmitting(false);
      return;
    }
    await recordAttempt("otp_verify", `email:${email}`, true);

    // Upsert rider profile (idempotent if user retries)
    const { error: insertError } = await supabase.from("riders").upsert(
      [{
        user_id: data.user.id,
        name: profile.name,
        email,
        phone: profile.phone,
        vehicle_type: profile.vehicle_type,
        city: profile.city,
      }],
      { onConflict: "user_id" }
    );
    if (insertError) {
      console.error(insertError);
      toast.error("Could not save profile: " + insertError.message);
      setSubmitting(false);
      return;
    }

    // Assign rider role (allowed by RLS for self + role='rider'); ignore duplicate
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: data.user.id, role: "rider" });
    if (roleError && !roleError.message.toLowerCase().includes("duplicate")) {
      console.error(roleError);
      toast.error("Could not assign rider role: " + roleError.message);
      setSubmitting(false);
      return;
    }

    toast.success("Welcome to ONLY!");
    navigate({ to: "/partner/dashboard" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24">
        <section className="bg-gradient-hero py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium uppercase tracking-wider text-white backdrop-blur">
                Earn with ONLY
              </span>
              <h1 className="mt-4 font-[Sora] text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                Become a Delivery Partner
              </h1>
              <p className="mt-3 text-white/95">
                Flexible hours, weekly payouts, peak-hour bonuses. Sign up with your
                phone — no paperwork, no waiting.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[1fr_1.2fr] lg:px-8">
            <div className="space-y-4">
              {[
                { icon: Wallet, title: "Weekly payouts", desc: "Earn daily, paid every Monday — directly to your bank." },
                { icon: ShieldCheck, title: "Insured & supported", desc: "Accident insurance and 24/7 partner helpline." },
                { icon: Bike, title: "Any vehicle", desc: "Bicycle, scooter, motorcycle — all welcome." },
              ].map((b) => (
                <div key={b.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{b.title}</div>
                    <div className="text-sm text-muted-foreground">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {step === "form" ? (
              <form onSubmit={sendOtp} className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
                <h2 className="font-[Sora] text-xl font-bold text-foreground">Tell us about yourself</h2>
                <p className="mt-1 text-sm text-muted-foreground">We'll send a one-time code to verify your email.</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" name="name" required placeholder="Rahul Sharma" />
                  <Field label="Email" name="email" type="email" required placeholder="rahul@example.com" />
                  <Field label="Phone (with country code)" name="phone" type="tel" required placeholder="+919876543210" />
                  <Field label="City" name="city" required placeholder="Bengaluru" />
                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Vehicle type
                    </Label>
                    <select
                      name="vehicle_type"
                      defaultValue="Bike"
                      required
                      className="mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option>Bicycle</option>
                      <option>Bike</option>
                      <option>Scooter</option>
                      <option>Car</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" disabled={submitting} size="lg" className="mt-6 w-full bg-gradient-cta text-white">
                  {submitting ? "Sending OTP…" : "Send OTP"}
                </Button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  Already a rider? <Link to="/partner/login" className="text-primary underline">Login</Link>
                </p>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8">
                <h2 className="font-[Sora] text-xl font-bold text-foreground">Verify your email</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a 6-digit code to <strong>{email}</strong>.
                </p>
                <div className="mt-5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OTP</Label>
                  <Input name="otp" required maxLength={6} className="mt-1.5 h-12 rounded-xl text-center font-mono text-xl tracking-[0.5em]" />
                </div>
                <Button type="submit" disabled={submitting} size="lg" className="mt-6 w-full bg-gradient-cta text-white">
                  {submitting ? "Verifying…" : "Verify & Join"}
                </Button>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <button type="button" className="text-muted-foreground hover:text-primary" onClick={() => setStep("form")}>
                    Edit details
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
          </div>
        </section>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input {...rest} className="mt-1.5 h-11 rounded-xl" />
    </div>
  );
}
