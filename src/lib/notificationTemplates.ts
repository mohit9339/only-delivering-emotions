// Email templates rendered server-side. Keep deps zero — pure functions.
type Payload = Record<string, unknown>;

const wrap = (title: string, body: string) => `
<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7fb;margin:0;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;box-shadow:0 8px 30px rgba(15,23,42,.06)">
    <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#ef4444;font-weight:700">ONLY · Delivery</div>
    <h1 style="font-size:22px;margin:8px 0 16px">${title}</h1>
    ${body}
    <hr style="border:none;border-top:1px solid #eef2f7;margin:24px 0"/>
    <div style="font-size:12px;color:#64748b">You received this because an order or rider account is linked to this address.</div>
  </div>
</body></html>`;

const human = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function renderTemplate(template: string, p: Payload): { html: string; text: string } {
  const code = String(p.order_code ?? "");
  const name = String(p.customer_name ?? p.name ?? "there");
  const status = String(p.status ?? "");

  switch (template) {
    case "order_created":
      return {
        html: wrap(
          `Order ${code} is confirmed`,
          `<p>Hi ${name}, we've received your delivery request.</p>
           <p><b>Pickup:</b> ${p.pickup}<br/><b>Drop:</b> ${p.drop}<br/><b>Type:</b> ${p.delivery_type}</p>
           <p>Track live at <a href="https://only-delivering-emotions.lovable.app/track/${code}">/track/${code}</a>.</p>`
        ),
        text: `Order ${code} confirmed. Track at /track/${code}`,
      };
    case "rider_approved":
      return {
        html: wrap(
          "You're approved to ride with ONLY",
          `<p>Welcome aboard, ${name}! You can now accept and complete deliveries from your partner dashboard.</p>`
        ),
        text: `Welcome ${name}, your ONLY rider account is approved.`,
      };
    case "rider_rejected":
      return {
        html: wrap(
          "Update on your ONLY application",
          `<p>Hi ${name}, your application wasn't approved at this time.</p>
           <p><b>Reason:</b> ${p.reason ?? "Not specified"}</p>
           <p>You can update your documents and reapply from the partner dashboard.</p>`
        ),
        text: `Hi ${name}, your application was not approved. Reason: ${p.reason ?? "n/a"}`,
      };
    default:
      // generic order_status_*
      if (template.startsWith("order_status_")) {
        return {
          html: wrap(
            `Order ${code} — ${human(status)}`,
            `<p>Status update for your order <b>${code}</b>.</p>
             <p>New status: <b>${human(status)}</b></p>
             <p>Track live at <a href="https://only-delivering-emotions.lovable.app/track/${code}">/track/${code}</a>.</p>`
          ),
          text: `Order ${code} status: ${status}. Track at /track/${code}`,
        };
      }
      return {
        html: wrap("ONLY", `<pre>${JSON.stringify(p, null, 2)}</pre>`),
        text: JSON.stringify(p),
      };
  }
}
