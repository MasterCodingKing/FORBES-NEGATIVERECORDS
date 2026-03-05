import { useState, useEffect } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AdminAuditTrail() {
  const [actions, setActions] = useState([]);
  const [modules, setModules] = useState([]);
  const [filterAction, setFilterAction] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // View detail modal
  const [viewTarget, setViewTarget] = useState(null);

  useEffect(() => {
    api.get("/audit-logs/actions").then((res) => setActions(res.data)).catch(() => {});
    api.get("/audit-logs/modules").then((res) => setModules(res.data)).catch(() => {});
  }, []);

  const fetchAuditLogs = async ({ page, limit, search, sort, order }) => {
    const params = new URLSearchParams();
    params.set("page", page);
    params.set("limit", limit);
    if (search) params.set("search", search);
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);
    if (filterAction) params.set("action", filterAction);
    if (filterModule) params.set("module", filterModule);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);

    const res = await api.get(`/audit-logs?${params.toString()}`);
    return res.data;
  };

  const handleFilter = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleClearFilters = () => {
    setFilterAction("");
    setFilterModule("");
    setFilterFrom("");
    setFilterTo("");
    setRefreshKey((k) => k + 1);
  };

  const getUserName = (log) => {
    if (!log.user) return "—";
    const name = [log.user.firstName, log.user.lastName].filter(Boolean).join(" ");
    return name || log.user.username || log.user.email;
  };

  const getActionBadgeClass = (action) => {
    if (!action) return "bg-card-bg text-sidebar-text";
    const a = action.toUpperCase();
    if (a.includes("DELETE") || a.includes("DENIED") || a.includes("FORCE"))
      return "bg-error/10 text-error";
    if (a.includes("CREATE") || a.includes("APPROVED") || a.includes("INSERT"))
      return "bg-success/10 text-success";
    if (a.includes("LOCK") || a.includes("TRANSFER"))
      return "bg-warning/10 text-warning";
    if (a.includes("PRINT") || a.includes("REQUEST"))
      return "bg-btn-primary/10 text-btn-primary";
    return "bg-card-bg text-sidebar-text";
  };

  const columns = [
    { key: "id", label: "ID", sortable: false },
    {
      key: "createdAt",
      label: "Date & Time",
      render: (log) =>
        log.createdAt ? new Date(log.createdAt).toLocaleString() : "—",
    },
    {
      key: "user",
      label: "User",
      sortable: false,
      render: (log) => (
        <div>
          <div className="font-medium">{getUserName(log)}</div>
          <div className="text-xs text-sidebar-text">
            {log.user?.role?.name || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "affiliate",
      label: "Affiliate",
      sortable: false,
      render: (log) => log.user?.client?.name || "—",
    },
    {
      key: "action",
      label: "Action",
      render: (log) => (
        <span
          className={`inline-block text-xs font-medium px-2 py-1 rounded ${getActionBadgeClass(
            log.action
          )}`}
        >
          {log.action}
        </span>
      ),
    },
    {
      key: "module",
      label: "Module",
      render: (log) => log.module || "—",
    },
    {
      key: "recordId",
      label: "Record ID",
      sortable: false,
      render: (log) => log.recordId || "—",
    },
    {
      key: "ipAddress",
      label: "IP Address",
      sortable: false,
      render: (log) => (
        <span className="text-xs font-mono">{log.ipAddress || "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (log) => (
        <button
          onClick={() => setViewTarget(log)}
          className="text-btn-primary text-xs font-medium hover:underline"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">
        Audit Trail
      </h2>
      <p className="text-sm text-sidebar-text mb-6">
        Complete activity log of all user actions across the system. Only
        administrators can view this page.
      </p>

      {/* Filters */}
      <div className="bg-card-bg border border-card-border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">
              Action
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header bg-input-bg"
            >
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">
              Module
            </label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header bg-input-bg"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">
              From
            </label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header bg-input-bg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-sidebar-text mb-1">
              To
            </label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header bg-input-bg"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
          >
            Clear
          </button>
          <button
            onClick={handleFilter}
            className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <DataTable
        key={refreshKey}
        columns={columns}
        fetchFn={fetchAuditLogs}
        searchable
        searchPlaceholder="Search by user, action, module, or IP..."
        pageSize={20}
      />

      {/* View Detail Modal */}
      {viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-page-bg rounded-lg shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary-header">
                Audit Log Detail
              </h3>
              <button
                onClick={() => setViewTarget(null)}
                className="text-sidebar-text hover:text-error text-xl font-bold"
              >
                &times;
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <span className="font-medium text-sidebar-text">Log ID:</span>{" "}
                  {viewTarget.id}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">Date:</span>{" "}
                  {new Date(viewTarget.createdAt).toLocaleString()}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">User:</span>{" "}
                  {getUserName(viewTarget)}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">Email:</span>{" "}
                  {viewTarget.user?.email || "—"}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">Role:</span>{" "}
                  {viewTarget.user?.role?.name || "—"}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">
                    Affiliate:
                  </span>{" "}
                  {viewTarget.user?.client?.name || "—"}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">Action:</span>{" "}
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${getActionBadgeClass(
                      viewTarget.action
                    )}`}
                  >
                    {viewTarget.action}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">Module:</span>{" "}
                  {viewTarget.module}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">
                    Record ID:
                  </span>{" "}
                  {viewTarget.recordId || "—"}
                </div>
                <div>
                  <span className="font-medium text-sidebar-text">
                    IP Address:
                  </span>{" "}
                  <span className="font-mono text-xs">
                    {viewTarget.ipAddress || "—"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => setViewTarget(null)}
                className="px-4 py-2 rounded text-sm font-medium bg-card-bg text-sidebar-text border border-card-border hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
