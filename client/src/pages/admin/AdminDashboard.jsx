import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import api from "../../api/axios";

const CHART_COLORS = [
  "#000B5B",
  "#001F9E",
  "#1D4ED8",
  "#3B82F6",
  "#60A5FA",
  "#93C5FD",
  "#2563EB",
  "#1E40AF",
  "#1E3A8A",
  "#172554",
];

/* ── tiny reusable card ── */
function StatCard({ label, value, icon }) {
  return (
    <div className="bg-card-bg border border-card-border rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-btn-primary/10 text-btn-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-sidebar-text">
          {label}
        </p>
        <p className="text-2xl font-bold text-primary-header mt-0.5">
          {value?.toLocaleString() ?? "—"}
        </p>
      </div>
    </div>
  );
}

/* ── Skeleton loader ── */
function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-card-border/40 rounded-lg ${className}`}
    />
  );
}

/* ── Custom tooltip for the line chart ── */
function SearchTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card-bg border border-card-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-primary-header">{label}</p>
      <p className="text-sidebar-text">
        Searches:{" "}
        <span className="font-bold text-btn-primary">{payload[0].value}</span>
      </p>
    </div>
  );
}

/* ── Custom tooltip for bar chart ── */
function ClientTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { clientName, totalSearches } = payload[0].payload;
  return (
    <div className="bg-card-bg border border-card-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-primary-header">{clientName}</p>
      <p className="text-sidebar-text">
        Searches:{" "}
        <span className="font-bold text-btn-primary">{totalSearches}</span>
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("chart"); // "chart" | "table" for top clients

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/dashboard/stats");
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-primary-header">Dashboard</h2>
        {/* skeleton cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBlock className="h-80" />
        <SkeletonBlock className="h-72" />
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <svg
          className="w-14 h-14 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <p className="text-lg font-medium text-error">
          Failed to load dashboard
        </p>
        <p className="text-sm text-sidebar-text">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-btn-primary text-btn-primary-text hover:opacity-90"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Empty state ── */
  if (!data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sidebar-text text-sm">No data available.</p>
      </div>
    );
  }

  const { summary, dailySearchChart, topClients } = data;

  // Format date labels for chart (e.g. "Feb 26")
  const formattedChartData = dailySearchChart.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-8">
      {/* ── Page Title ── */}
      <div>
        <h2 className="text-2xl font-bold text-primary-header">Dashboard</h2>
        <p className="text-sm text-sidebar-text mt-1">
          Overview of system activity and search analytics.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Clients"
          value={summary.totalClients}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          }
        />
        <StatCard
          label="Affiliates"
          value={summary.totalAffiliates}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Searches"
          value={summary.totalSearches}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          }
        />
        <StatCard
          label="Records"
          value={summary.totalRecords}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Unlocks"
          value={summary.pendingUnlocks}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
        />
      </div>

      {/* ── Daily Searches Line Chart ── */}
      <section className="bg-card-bg border border-card-border rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-primary-header mb-1">
          Daily Searches
        </h3>
        <p className="text-xs text-sidebar-text mb-5">Last 30 days</p>

        {formattedChartData.length === 0 ? (
          <div className="flex items-center justify-center h-56 text-sidebar-text text-sm">
            No search data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={formattedChartData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-card-border)"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-sidebar-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-card-border)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-sidebar-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-card-border)" }}
                label={{
                  value: "Searches",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fontSize: 12,
                    fill: "var(--color-sidebar-text)",
                  },
                }}
              />
              <Tooltip content={<SearchTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-btn-primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-btn-primary)" }}
                activeDot={{ r: 5, fill: "var(--color-sidebar-active)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Top 10 Clients ── */}
      <section className="bg-card-bg border border-card-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-primary-header">
              Top 10 Clients by Searches
            </h3>
            <p className="text-xs text-sidebar-text mt-0.5">
              Ranked by total search requests
            </p>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-card-border overflow-hidden">
            <button
              onClick={() => setView("chart")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "chart"
                  ? "bg-btn-primary text-btn-primary-text"
                  : "bg-card-bg text-sidebar-text hover:bg-sidebar-bg"
              }`}
            >
              Chart
            </button>
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "table"
                  ? "bg-btn-primary text-btn-primary-text"
                  : "bg-card-bg text-sidebar-text hover:bg-sidebar-bg"
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {topClients.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sidebar-text text-sm">
            No client search data yet.
          </div>
        ) : view === "chart" ? (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={topClients}
              margin={{ top: 5, right: 20, bottom: 60, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-card-border)"
              />
              <XAxis
                dataKey="clientName"
                tick={{ fontSize: 11, fill: "var(--color-sidebar-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-card-border)" }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "var(--color-sidebar-text)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-card-border)" }}
                label={{
                  value: "Searches",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fontSize: 12,
                    fill: "var(--color-sidebar-text)",
                  },
                }}
              />
              <Tooltip content={<ClientTooltip />} />
              <Bar dataKey="totalSearches" radius={[6, 6, 0, 0]}>
                {topClients.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left py-3 px-4 font-semibold text-primary-header w-12">
                    #
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-primary-header">
                    Client Name
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-primary-header">
                    Total Searches
                  </th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-card-border/50 hover:bg-sidebar-bg/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sidebar-text font-medium">
                      {i + 1}
                    </td>
                    <td className="py-3 px-4 text-body-text font-medium">
                      {c.clientName}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-full text-xs font-bold bg-btn-primary/10 text-btn-primary">
                        {c.totalSearches.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
