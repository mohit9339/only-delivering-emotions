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
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login — ONLY" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }

    // Verify the user actually has the admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", signInData.user!.id);

    const isAdmin = roles?.some((r) => r.role === "admin");
    if (!isAdmin) {
      await supabase.auth.signOut();
      setSubmitting(false);
      return toast.error("This account does not have admin access.");
    }

    toast.success("Welcome back!");
    navigate({ to: "/admin" });
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="flex min-h-[80vh] items-center justify-center pt-24 pb-16">
        <div className="w-full max-w-md px-5">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-cta text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-5 font-[Sora] text-2xl font-bold text-foreground">Admin login</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage orders, riders and analytics. Admin accounts are provisioned by the ONLY team.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input name="email" type="email" required className="mt-1.5 h-11 rounded-xl" placeholder="admin@onlydelivers.in" />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                <Input name="password" type="password" required minLength={8} className="mt-1.5 h-11 rounded-xl" placeholder="••••••••" />
              </div>
              <Button type="submit" disabled={submitting} size="lg" className="w-full bg-gradient-cta text-white">
                {submitting ? "Please wait…" : "Sign in"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Need admin access? Contact your ONLY workspace owner — admins are seeded by the team, not via self-signup.
            </p>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary">← Back to site</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}
