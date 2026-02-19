import { useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AdminUnlocking() {
  const [error, setError] = useState("");
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

  const columns = [
    { key: "id", label: "ID" },
    {
      key: "requester",
      label: "Requested By",
      render: (r) => {
        const u = r.Requester;
        return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") : "Unknown";
      },
    },
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
    {
      key: "actions",
      label: "Actions",
      render: (r) =>
        r.status === "pending" ? (
          <div className="flex gap-2">
            <button onClick={() => handleReview(r.id, "approved")} className="text-success text-xs font-medium hover:underline">Approve</button>
            <button onClick={() => handleReview(r.id, "denied")} className="text-error text-xs font-medium hover:underline">Deny</button>
          </div>
        ) : null,
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Unlocking Requests</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      <DataTable columns={columns} fetchUrl="/unlock-requests/all" api={api} refreshKey={refreshKey} searchable={false} />
    </div>
  );
}
