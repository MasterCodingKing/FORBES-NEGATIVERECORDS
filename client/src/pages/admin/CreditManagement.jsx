import { useEffect, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function CreditManagement() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clientCredit, setClientCredit] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get("/clients?limit=500").then((res) => setClients(res.data.data));
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      api.get(`/credits/client/${selectedClientId}`).then((res) => setClientCredit(res.data)).catch(() => {});
      setRefreshKey((k) => k + 1);
    }
  }, [selectedClientId]);

  const handleTopUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await api.post("/credits/topup", {
        clientId: Number(selectedClientId),
        amount: Number(topUpAmount),
      });
      setSuccess(`Credit added. New balance: ${res.data.creditBalance}`);
      setTopUpAmount("");
      setClientCredit({ ...clientCredit, creditBalance: res.data.creditBalance });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to top up");
    }
  };

  const logColumns = [
    {
      key: "user",
      label: "User",
      render: (r) => {
        const u = r.User;
        return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : r.userId;
      },
    },
    { key: "searchType", label: "Type" },
    { key: "searchTerm", label: "Search Term" },
    {
      key: "isBilled",
      label: "Billed",
      render: (r) => (
        <span className={r.isBilled ? "text-success" : "text-sidebar-text"}>
          {r.isBilled ? "Yes" : "No"}
        </span>
      ),
    },
    { key: "fee", label: "Fee" },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Credit Management</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      <div className="mb-4">
        <label className="block text-sm font-medium text-sidebar-text mb-1">Select Client</label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="border border-card-border rounded px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary-header"
        >
          <option value="">-- Select Client --</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {selectedClientId && clientCredit && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card-bg border border-card-border rounded-lg p-4">
              <p className="text-sm text-sidebar-text">Credit Balance</p>
              <p className="text-2xl font-bold text-primary-header">{clientCredit.creditBalance}</p>
              <p className="text-xs text-sidebar-text mt-1">Billing: {clientCredit.billingType || "N/A"}</p>
            </div>
            <form onSubmit={handleTopUp} className="bg-card-bg border border-card-border rounded-lg p-4 flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-sidebar-text mb-1">Top-up Amount</label>
                <input
                  type="number" min="1" step="0.01" value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" required
                />
              </div>
              <button type="submit" className="bg-success text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90">Add Credit</button>
            </form>
          </div>

          <h3 className="text-lg font-semibold text-primary-header mb-3">Search Logs</h3>
          <DataTable
            columns={logColumns}
            fetchUrl={`/credits/client/${selectedClientId}/search-logs`}
            api={api}
            refreshKey={refreshKey}
            searchable={false}
          />
        </>
      )}
    </div>
  );
}
