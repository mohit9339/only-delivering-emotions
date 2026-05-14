import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { renderTemplate } from "@/lib/notificationTemplates";

export const Route = createFileRoute("/api/public/hooks/dispatch-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require Supabase anon publishable key in apikey header
        const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!SERVICE_KEY || !SUPABASE_URL) {
          return Response.json({ error: "Server not configured" }, { status: 500 });
        }
        if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
          return Response.json(
            { error: "Email gateway not configured (LOVABLE_API_KEY / RESEND_API_KEY missing)" },
            { status: 500 }
          );
        }

        const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data: claims, error } = await admin.rpc("claim_pending_notifications", {
          p_limit: 25,
        });
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        const rows = (claims ?? []) as Array<{
          id: string;
          channel: string;
          recipient: string;
          subject: string;
          template: string;
          payload: Record<string, unknown>;
        }>;

        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const n of rows) {
          // Only handle email; skip non-email (e.g. phone-only customers)
          const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.recipient);
          if (n.channel !== "email" || !looksLikeEmail) {
            await admin.rpc("mark_notification_sent", { p_id: n.id }); // mark to drain
            skipped++;
            continue;
          }
          try {
            const { html, text } = renderTemplate(n.template, n.payload || {});
            const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: "ONLY <onboarding@resend.dev>",
                to: [n.recipient],
                subject: n.subject,
                html,
                text,
              }),
            });
            if (!res.ok) {
              const body = await res.text();
              await admin.rpc("mark_notification_failed", {
                p_id: n.id,
                p_error: `${res.status} ${body.slice(0, 400)}`,
              });
              failed++;
            } else {
              await admin.rpc("mark_notification_sent", { p_id: n.id });
              sent++;
            }
          } catch (e: unknown) {
            await admin.rpc("mark_notification_failed", {
              p_id: n.id,
              p_error: e instanceof Error ? e.message : "unknown error",
            });
            failed++;
          }
        }

        return Response.json({ ok: true, claimed: rows.length, sent, failed, skipped });
      },
    },
  },
});
