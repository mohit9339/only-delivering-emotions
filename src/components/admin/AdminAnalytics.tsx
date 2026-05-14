import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

interface Analytics {
  window_days: number;
  totals: {
    orders_window: number;
    delivered_window: number;
    cancelled_window: number;
    orders_today: number;
    emergency_window: number;
  };
  revenue_estimate: number;
  by_status: Record<string, number>;
  daily: { day: string; count: number }[];
  top_riders: { rider_id: string; name: string; delivered: number }[];
  riders: { pending_riders: number; approved_riders: number; rejected_riders: number };
  avg_delivery_seconds: number | null;
}

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#6b7280"];

export function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.rpc("get_admin_analytics", { p_days: days } as never).then(({ data, error }) => {
      if (!alive) return;
      if (!error && data) setData(data as unknown as Analytics);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading analytics…
      </div>
    );
  }
  if (!data) return <div className="py-10 text-center text-muted-foreground">No data</div>;

  const statusData = Object.entries(data.by_status || {}).map(([name, value]) => ({ name, value }));
  const avgMin = data.avg_delivery_seconds ? Math.round(data.avg_delivery_seconds / 60) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">Window: last {data.window_days} days</div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          {[7, 14, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Orders (window)" value={data.totals.orders_window} />
        <KPI label="Today" value={data.totals.orders_today} />
        <KPI label="Delivered" value={data.totals.delivered_window} />
        <KPI label="Cancelled" value={data.totals.cancelled_window} />
        <KPI label="Emergency" value={data.totals.emergency_window} />
        <KPI label="Revenue (est.)" value={`₹${data.revenue_estimate}`} />
        <KPI label="Avg delivery" value={avgMin !== null ? `${avgMin} min` : "—"} />
        <KPI label="Approved riders" value={data.riders.approved_riders} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Daily orders">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="By status">
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Top riders by deliveries">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-3 py-2">Rider</th><th className="px-3 py-2">Delivered</th></tr>
            </thead>
            <tbody>
              {data.top_riders.length === 0 && (
                <tr><td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">No deliveries yet.</td></tr>
              )}
              {data.top_riders.map((r) => (
                <tr key={r.rider_id} className="border-t border-border/60">
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.delivered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-[Sora] text-xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}

export function AuditLogPanel() {
  const [rows, setRows] = useState<Array<{
    id: string; created_at: string; actor_email: string | null;
    action: string; target_type: string | null; target_id: string | null;
    metadata: unknown;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => {
        setRows((data ?? []) as typeof rows);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="py-8 text-center text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin" />Loading…</div>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-3">When</th>
            <th className="px-3 py-3">Actor</th>
            <th className="px-3 py-3">Action</th>
            <th className="px-3 py-3">Target</th>
            <th className="px-3 py-3">Metadata</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No events yet.</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border/60 align-top">
              <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-xs">{r.actor_email ?? <span className="text-muted-foreground">system</span>}</td>
              <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
              <td className="px-3 py-2 text-xs">{r.target_type ? `${r.target_type}:${(r.target_id ?? "").slice(0, 8)}` : "—"}</td>
              <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[260px] truncate">
                {r.metadata ? JSON.stringify(r.metadata) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
