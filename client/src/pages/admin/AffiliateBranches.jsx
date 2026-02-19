import { useEffect, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AffiliateBranches() {
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ clientId: "", branchName: "", status: "Active" });
  const [selectedClientCode, setSelectedClientCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api.get("/clients?limit=100").then((res) => setClients(res.data.data)).catch(() => {});
  }, []);

  const handleClientChange = (e) => {
    const cId = e.target.value;
    const client = clients.find((c) => String(c.id) === String(cId));
    setForm({ ...form, clientId: cId });
    setSelectedClientCode(client?.clientCode || "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = { name: form.branchName, clientId: Number(form.clientId), status: form.status };
      if (editingId) {
        await api.put(`/sub-domains/${editingId}`, payload);
        setSuccess("Branch updated");
      } else {
        await api.post("/sub-domains", payload);
        setSuccess("Branch added");
      }
      setForm({ clientId: "", branchName: "", status: "Active" });
      setSelectedClientCode("");
      setEditingId(null);
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    }
  };

  const handleEdit = (row) => {
    const client = clients.find((c) => c.id === row.clientId);
    setForm({
      clientId: String(row.clientId),
      branchName: row.name,
      status: row.status || "Active"
    });
    setSelectedClientCode(client?.clientCode || row.clientCode || "");
    setEditingId(row.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this branch?")) return;
    try {
      await api.delete(`/sub-domains/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  const columns = [
    { key: "clientCode", label: "Client Code" },
    {
      key: "clientName",
      label: "Client",
      render: (r) => r.Client?.name || "—"
    },
    { key: "name", label: "Branch Name" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`text-xs font-medium px-2 py-1 rounded ${r.status === "Active" ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
          {r.status}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
            className="text-primary-header text-xs font-medium hover:underline">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
            className="text-error text-xs font-medium hover:underline">Delete</button>
        </div>
      )
    }
  ];

  const inp = "w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-primary-header">Affiliate Branches</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ clientId: "", branchName: "", status: "Active" }); setSelectedClientCode(""); setError(""); setSuccess(""); }}
          className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ Add Branch"}
        </button>
      </div>

      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-lg p-5 mb-6 space-y-4">
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Affiliate Branches</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Client Code <span className="text-error">*</span></label>
              <input value={selectedClientCode} readOnly className={`${inp} bg-sidebar-bg`} placeholder="Auto-filled from Client" />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Client <span className="text-error">*</span></label>
              <select name="clientId" value={form.clientId} onChange={handleClientChange} className={inp} required>
                <option value="">-- Select Client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Branch Name <span className="text-error">*</span></label>
              <input value={form.branchName} onChange={(e) => setForm({ ...form, branchName: e.target.value })} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inp}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-primary-header text-primary-on-dark px-6 py-2 rounded text-sm font-medium hover:opacity-90">
              {editingId ? "Update Branch" : "Save Branch"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
              className="bg-card-bg text-sidebar-text border border-card-border px-6 py-2 rounded text-sm hover:bg-sidebar-bg">
              Cancel
            </button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        fetchUrl="/sub-domains"
        api={api}
        pageSize={10}
        refreshKey={refreshKey}
        emptyMessage="No branches found"
      />
    </div>
  );
}
