import { useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AffiliateUnlocking() {
  const [recordId, setRecordId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/unlock-requests", { recordId: Number(recordId), reason });
      setSuccess("Request submitted");
      setRecordId("");
      setReason("");
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "recordId", label: "Record ID" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span
          className={`text-xs font-medium px-2 py-1 rounded ${
            r.status === "approved"
              ? "bg-success/10 text-success"
              : r.status === "denied"
              ? "bg-error/10 text-error"
              : "bg-warning/10 text-warning"
          }`}
        >
          {r.status}
        </span>
      ),
    },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Unlocking</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-lg p-4 mb-6 space-y-3 max-w-md">
        <div>
          <label className="block text-sm font-medium text-sidebar-text mb-1">Record ID</label>
          <input type="number" value={recordId} onChange={(e) => setRecordId(e.target.value)} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-sidebar-text mb-1">Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows="3" className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" />
        </div>
        <button type="submit" className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90">Submit Request</button>
      </form>

      <h3 className="text-lg font-semibold text-primary-header mb-3">My Requests</h3>
      <DataTable columns={columns} fetchUrl="/unlock-requests/my" api={api} refreshKey={refreshKey} searchable={false} />
    </div>
  );
}
