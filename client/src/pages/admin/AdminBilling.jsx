import { useEffect, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AdminBilling() {
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get("/clients?limit=500").then((res) => setClients(res.data.data)).catch(() => {});
    api.get("/users/all?limit=500").then((res) => setUsers(res.data.data)).catch(() => {});
  }, []);

  // Fetch summary when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (userId) params.set("userId", userId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    api.get(`/billing/summary?${params.toString()}`)
      .then((res) => setSummary(res.data))
      .catch(() => {});
  }, [clientId, userId, from, to, refreshKey]);

  // Build fetch URL with filters
  let fetchUrl = "/billing?";
  const qp = [];
  if (clientId) qp.push(`clientId=${clientId}`);
  if (userId) qp.push(`userId=${userId}`);
  if (from) qp.push(`from=${from}`);
  if (to) qp.push(`to=${to}`);
  fetchUrl += qp.join("&");

  // Build export URL with filters
  let exportUrl = "/export/billing/export?";
  const ep = [...qp];
  exportUrl += ep.join("&");

  const handleReset = () => {
    setClientId("");
    setUserId("");
    setFrom("");
    setTo("");
    setRefreshKey((k) => k + 1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);
      if (userId) params.set("userId", userId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      params.set("format", format);

      const response = await api.get(`/export/billing/export?${params.toString()}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "excel" ? "xlsx" : format;
      a.download = `billing-report.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // silently fail
    }
  };

  const columns = [
    {
      key: "client",
      label: "Client",
      sortable: false,
      render: (r) => r.client?.name || "—",
    },
    {
      key: "affiliate",
      label: "Affiliate",
      sortable: false,
      render: (r) => {
        const u = r.user;
        return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "—";
      },
    },
    { key: "searchType", label: "Type" },
    { key: "searchTerm", label: "Search Term" },
    {
      key: "isBilled",
      label: "Billed",
      render: (r) => (
        <span className={r.isBilled ? "text-success font-medium" : "text-sidebar-text"}>
          {r.isBilled ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "fee",
      label: "Fee",
      render: (r) => Number(r.fee).toFixed(2),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
  ];

  const inp = "border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-primary-header">Billing</h2>
          <p className="text-sm text-sidebar-text">All searches performed (listed and non-listed records)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-card-bg text-sidebar-text border border-card-border px-3 py-2 rounded text-sm hover:bg-sidebar-bg flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            Print
          </button>
          <button onClick={() => handleExport("csv")} className="bg-card-bg text-sidebar-text border border-card-border px-3 py-2 rounded text-sm hover:bg-sidebar-bg">CSV</button>
          <button onClick={() => handleExport("pdf")} className="bg-card-bg text-sidebar-text border border-card-border px-3 py-2 rounded text-sm hover:bg-sidebar-bg">PDF</button>
          <button onClick={() => handleExport("excel")} className="bg-card-bg text-sidebar-text border border-card-border px-3 py-2 rounded text-sm hover:bg-sidebar-bg">Excel</button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card-bg border border-card-border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">Client</label>
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setRefreshKey((k) => k + 1); }} className={`w-full ${inp}`}>
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">Affiliate</label>
            <select value={userId} onChange={(e) => { setUserId(e.target.value); setRefreshKey((k) => k + 1); }} className={`w-full ${inp}`}>
              <option value="">All Affiliates</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">From</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRefreshKey((k) => k + 1); }} className={`w-full ${inp}`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">To</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRefreshKey((k) => k + 1); }} className={`w-full ${inp}`} />
          </div>
          <div>
            <button onClick={handleReset} className="w-full bg-card-bg text-sidebar-text border border-card-border px-3 py-2 rounded text-sm hover:bg-sidebar-bg">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-sidebar-text">Total Searches</p>
            <p className="text-2xl font-bold text-primary-header mt-1">{summary.totalSearches.toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-sidebar-text">Billed</p>
            <p className="text-2xl font-bold text-success mt-1">{summary.billedSearches.toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-sidebar-text">Unbilled</p>
            <p className="text-2xl font-bold text-warning mt-1">{summary.unbilledSearches.toLocaleString()}</p>
          </div>
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-sidebar-text">Total Fees</p>
            <p className="text-2xl font-bold text-primary-header mt-1">{Number(summary.totalFees).toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Billing Table */}
      <DataTable
        columns={columns}
        fetchUrl={fetchUrl}
        api={api}
        pageSize={15}
        refreshKey={refreshKey}
        emptyMessage="No billing records found"
      />
    </div>
  );
}
