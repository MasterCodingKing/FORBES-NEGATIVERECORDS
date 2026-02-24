import { useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AffiliateUnlocking() {
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("my");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReview = async (id, status) => {
    setError("");
    try {
      await api.patch(`/unlock-requests/${id}/review`, { status });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to review");
    }
  };

  // Columns for "My Requests" tab
  const myColumns = [
    { key: "id", label: "ID" },
    { key: "recordId", label: "Record ID" },
    {
      key: "record",
      label: "Record Name",
      render: (r) => {
        const rec = r.negativeRecord;
        if (!rec) return "—";
        return rec.type === "Individual"
          ? [rec.firstName, rec.middleName, rec.lastName].filter(Boolean).join(" ")
          : rec.companyName || "—";
      },
    },
    { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
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

  // Columns for "Requests for My Records" tab
  const ownedColumns = [
    { key: "id", label: "ID" },
    { key: "recordId", label: "Record ID" },
    {
      key: "record",
      label: "Record Name",
      render: (r) => {
        const rec = r.negativeRecord;
        if (!rec) return "—";
        return rec.type === "Individual"
          ? [rec.firstName, rec.middleName, rec.lastName].filter(Boolean).join(" ")
          : rec.companyName || "—";
      },
    },
    {
      key: "requester",
      label: "Requested By",
      render: (r) => {
        const u = r.requester;
        return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "Unknown";
      },
    },
    { key: "reason", label: "Reason", render: (r) => r.reason || "—" },
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
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex gap-2">
            <button
              onClick={() => handleReview(r.id, "approved")}
              className="text-success text-xs font-medium hover:underline"
            >
              Approve
            </button>
            <button
              onClick={() => handleReview(r.id, "denied")}
              className="text-error text-xs font-medium hover:underline"
            >
              Deny
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Unlocking</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded text-sm font-medium ${
            activeTab === "my"
              ? "bg-sidebar-active text-sidebar-active-text"
              : "bg-card-bg text-sidebar-text border border-card-border"
          }`}
        >
          My Requests
        </button>
        <button
          onClick={() => setActiveTab("owned")}
          className={`px-4 py-2 rounded text-sm font-medium ${
            activeTab === "owned"
              ? "bg-sidebar-active text-sidebar-active-text"
              : "bg-card-bg text-sidebar-text border border-card-border"
          }`}
        >
          Requests for My Records
        </button>
      </div>

      {activeTab === "my" && (
        <DataTable
          columns={myColumns}
          fetchUrl="/unlock-requests/my"
          api={api}
          refreshKey={refreshKey}
          searchable={false}
        />
      )}

      {activeTab === "owned" && (
        <DataTable
          columns={ownedColumns}
          fetchUrl="/unlock-requests/owned"
          api={api}
          refreshKey={refreshKey}
          searchable={false}
        />
      )}
    </div>
  );
}
