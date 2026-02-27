import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AdminUnlocking() {
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // View modal
  const [viewTarget, setViewTarget] = useState(null);

  // Approve modal
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveLoading, setApproveLoading] = useState(false);

  // Deny modal
  const [denyTarget, setDenyTarget] = useState(null);
  const [denialReason, setDenialReason] = useState("");
  const [denyLoading, setDenyLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getRecordName = (rec) => {
    if (!rec) return "—";
    return rec.type === "Individual"
      ? [rec.firstName, rec.middleName, rec.lastName].filter(Boolean).join(" ") || "—"
      : rec.companyName || "—";
  };

  // Auto-open view modal when navigated from a notification
  useEffect(() => {
    const requestId = location.state?.requestId;
    if (!requestId) return;
    // Clear state so refreshes don't re-trigger
    navigate(location.pathname, { replace: true, state: {} });
    api.get(`/unlock-requests/${requestId}`)
      .then((res) => setViewTarget(res.data))
      .catch(() => {});
  }, [location.state?.requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async () => {
    if (!approveTarget) return;
    setError("");
    setApproveLoading(true);
    try {
      await api.patch(`/unlock-requests/${approveTarget.id}/review`, { status: "approved" });
      setApproveTarget(null);
      setRefreshKey((k) => k + 1);
      showToast("Request approved. Lock has been transferred.", "success");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!denyTarget) return;
    if (!denialReason.trim()) {
      setError("Please provide a reason for denial.");
      return;
    }
    setError("");
    setDenyLoading(true);
    try {
      await api.patch(`/unlock-requests/${denyTarget.id}/review`, {
        status: "denied",
        denialReason: denialReason.trim(),
      });
      setDenyTarget(null);
      setDenialReason("");
      setRefreshKey((k) => k + 1);
      showToast("Request denied. The affiliate has been notified.", "error");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to deny");
    } finally {
      setDenyLoading(false);
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    {
      key: "requester",
      label: "Requested By",
      sortable: false,
      render: (r) => {
        const u = r.requester;
        return u ? [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email : "Unknown";
      },
    },
    {
      key: "affiliate",
      label: "Affiliate",
      sortable: false,
      render: (r) => r.requester?.client?.name || "—",
    },
    { key: "recordId", label: "Record ID" },
    {
      key: "recordName",
      label: "Record Name",
      sortable: false,
      render: (r) => getRecordName(r.negativeRecord),
    },
    {
      key: "lockOwner",
      label: "Lock Owner",
      sortable: false,
      render: (r) => {
        const lock = r.negativeRecord?.recordLock;
        if (!lock?.user) return "—";
        const u = lock.user;
        return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
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
      render: (r) => (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => { setError(""); setViewTarget(r); }}
            className="text-primary-header text-xs font-medium hover:underline"
          >
            View
          </button>
          {r.status === "pending" && (
            <>
              <button
                onClick={() => { setError(""); setApproveTarget(r); }}
                className="text-success text-xs font-medium hover:underline"
              >
                Approve
              </button>
              <button
                onClick={() => { setError(""); setDenialReason(""); setDenyTarget(r); }}
                className="text-error text-xs font-medium hover:underline"
              >
                Deny
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Unlocking Requests</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}

      <DataTable columns={columns} fetchUrl="/unlock-requests/all" api={api} refreshKey={refreshKey} searchable={false} exportable exportUrl="/export/unlock-requests" />

      {/* ── View Detail Modal ── */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary-header">Unlock Request Details</h3>
              <button
                onClick={() => setViewTarget(null)}
                className="text-sidebar-text hover:text-primary-header text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* Status badge */}
            <div className="mb-4">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  viewTarget.status === "approved"
                    ? "bg-success/15 text-success"
                    : viewTarget.status === "denied"
                    ? "bg-error/15 text-error"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {viewTarget.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4 text-sm">
              {/* Requester */}
              <div className="bg-card-bg border border-card-border rounded-lg p-4">
                <h4 className="font-semibold text-primary-header mb-2">Requestor Details</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <span className="text-sidebar-text">Name</span>
                    <p className="font-medium text-body-text">
                      {viewTarget.requester
                        ? [viewTarget.requester.firstName, viewTarget.requester.lastName].filter(Boolean).join(" ") || "—"
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-sidebar-text">Affiliate</span>
                    <p className="font-medium text-body-text">{viewTarget.requester?.client?.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sidebar-text">Branch</span>
                    <p className="font-medium text-body-text">{viewTarget.requester?.branch?.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-sidebar-text">Email</span>
                    <p className="font-medium text-body-text">{viewTarget.requester?.email || "—"}</p>
                  </div>
                  {viewTarget.requester?.telephone && (
                    <div>
                      <span className="text-sidebar-text">Tel</span>
                      <p className="font-medium text-body-text">{viewTarget.requester.telephone}</p>
                    </div>
                  )}
                  {viewTarget.requester?.mobileNumber && (
                    <div>
                      <span className="text-sidebar-text">Mobile</span>
                      <p className="font-medium text-body-text">{viewTarget.requester.mobileNumber}</p>
                    </div>
                  )}
                  {viewTarget.requester?.position && (
                    <div className="col-span-2">
                      <span className="text-sidebar-text">Position</span>
                      <p className="font-medium text-body-text">{viewTarget.requester.position}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Record */}
              <div className="bg-card-bg border border-card-border rounded-lg p-4">
                <h4 className="font-semibold text-primary-header mb-2">Record Details</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <span className="text-sidebar-text">Record ID</span>
                    <p className="font-medium text-body-text">#{viewTarget.recordId}</p>
                  </div>
                  <div>
                    <span className="text-sidebar-text">Record Name</span>
                    <p className="font-medium text-body-text">{getRecordName(viewTarget.negativeRecord)}</p>
                  </div>
                  <div>
                    <span className="text-sidebar-text">Lock Owner</span>
                    <p className="font-medium text-body-text">
                      {(() => {
                        const lock = viewTarget.negativeRecord?.recordLock;
                        if (!lock?.user) return "—";
                        const u = lock.user;
                        return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sidebar-text">Date Submitted</span>
                    <p className="font-medium text-body-text">{new Date(viewTarget.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                {viewTarget.reason && (
                  <div className="mt-2 pt-2 border-t border-card-border">
                    <span className="text-sidebar-text">Reason for Access</span>
                    <p className="font-medium text-body-text mt-0.5">{viewTarget.reason}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-5 justify-end">
              {viewTarget.status === "pending" && (
                <>
                  <button
                    onClick={() => { setViewTarget(null); setApproveTarget(viewTarget); }}
                    className="bg-success text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => { setViewTarget(null); setDenialReason(""); setDenyTarget(viewTarget); }}
                    className="bg-error text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90"
                  >
                    Deny
                  </button>
                </>
              )}
              <button
                onClick={() => setViewTarget(null)}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:bg-sidebar-bg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-primary-header mb-1">Approve Access Request</h3>
            <p className="text-sm text-sidebar-text mb-4">
              You are about to grant access to the following affiliate. The lock will be transferred to them.
            </p>

            <div className="bg-card-bg border border-card-border rounded-lg p-4 mb-4 space-y-2 text-sm">
              <h4 className="font-semibold text-primary-header mb-2">Requestor Details</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <span className="font-medium">Name:</span>{" "}
                  {approveTarget.requester
                    ? [approveTarget.requester.firstName, approveTarget.requester.lastName].filter(Boolean).join(" ") || "—"
                    : "—"}
                </div>
                <div><span className="font-medium">Affiliate:</span> {approveTarget.requester?.client?.name || "—"}</div>
                <div><span className="font-medium">Branch:</span> {approveTarget.requester?.branch?.name || "—"}</div>
                <div><span className="font-medium">Email:</span> {approveTarget.requester?.email || "—"}</div>
                {approveTarget.requester?.telephone && (
                  <div><span className="font-medium">Tel:</span> {approveTarget.requester.telephone}</div>
                )}
                {approveTarget.requester?.mobileNumber && (
                  <div><span className="font-medium">Mobile:</span> {approveTarget.requester.mobileNumber}</div>
                )}
                {approveTarget.requester?.position && (
                  <div className="col-span-2">
                    <span className="font-medium">Position:</span> {approveTarget.requester.position}
                  </div>
                )}
              </div>
              <div className="pt-1 border-t border-card-border mt-1">
                <span className="font-medium">Record:</span>{" "}
                {getRecordName(approveTarget.negativeRecord)} (#{approveTarget.recordId})
              </div>
              {approveTarget.reason && (
                <div><span className="font-medium">Reason for Access:</span> {approveTarget.reason}</div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setApproveTarget(null)}
                disabled={approveLoading}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approveLoading}
                className="bg-success text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {approveLoading ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal with Reason */}
      {denyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-primary-header mb-1">Deny Access Request</h3>
            <p className="text-sm text-sidebar-text mb-4">
              Please provide a reason for denying this request. The affiliate will be notified.
            </p>

            <div className="bg-card-bg border border-card-border rounded-lg p-3 mb-4 text-sm space-y-1">
              <div>
                <span className="font-medium">Requestor:</span>{" "}
                {denyTarget.requester
                  ? [denyTarget.requester.firstName, denyTarget.requester.lastName].filter(Boolean).join(" ") || denyTarget.requester.email
                  : "—"}
              </div>
              <div><span className="font-medium">Affiliate:</span> {denyTarget.requester?.client?.name || "—"}</div>
              <div>
                <span className="font-medium">Record:</span>{" "}
                {getRecordName(denyTarget.negativeRecord)} (#{denyTarget.recordId})
              </div>
              {denyTarget.reason && (
                <div><span className="font-medium">Their Reason:</span> {denyTarget.reason}</div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-sidebar-text mb-1">
                Reason for Denial <span className="text-error">*</span>
              </label>
              <textarea
                value={denialReason}
                onChange={(e) => setDenialReason(e.target.value)}
                rows="3"
                placeholder="Enter your reason for denying this request..."
                className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setDenyTarget(null); setDenialReason(""); }}
                disabled={denyLoading}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
              >
                Cancel
              </button>
              <button
                onClick={handleDeny}
                disabled={denyLoading || !denialReason.trim()}
                className="bg-error text-white px-4 py-2 rounded text-sm font-medium hover:opacity-90 disabled:opacity-50"
              >
                {denyLoading ? "Denying..." : "Confirm Denial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            toast.type === "success" ? "bg-success text-white" : "bg-error text-white"
          }`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70">&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}
