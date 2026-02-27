import { useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

const emptyForm = {
  clientCode: "", name: "", clientGroup: "",
  website: "", street: "", barangay: "", city: "", province: "", postalCode: "",
  telephone: "", fax: "", mobile: "", email: "",
  billingType: "Postpaid", creditLimit: ""
};

export default function ManageClients() {
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const payload = { ...form };
      if (payload.billingType === "Postpaid") delete payload.creditLimit;
      else payload.creditLimit = Number(payload.creditLimit) || 0;

      if (editingId) {
        await api.put(`/clients/${editingId}`, payload);
        setSuccess("Client updated");
      } else {
        await api.post("/clients", payload);
        setSuccess("Client added");
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    }
  };

  const handleEdit = (row) => {
    setForm({
      clientCode: row.clientCode || "",
      name: row.name || "",
      clientGroup: row.clientGroup || "",
      website: row.website || "",
      street: row.street || "",
      barangay: row.barangay || "",
      city: row.city || "",
      province: row.province || "",
      postalCode: row.postalCode || "",
      telephone: row.telephone || "",
      fax: row.fax || "",
      mobile: row.mobile || "",
      email: row.email || "",
      billingType: row.billingType || "Postpaid",
      creditLimit: row.creditLimit ?? ""
    });
    setEditingId(row.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this client?")) return;
    try {
      await api.delete(`/clients/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  const columns = [
    { key: "clientCode", label: "Client Code" },
    { key: "name", label: "Client Name" },
    { key: "clientGroup", label: "Client Group" },
    { key: "billingType", label: "Billing" },
    {
      key: "creditBalance",
      label: "Credit Balance",
      sortable: false,
      render: (r) => Number(r.creditBalance).toFixed(2)
    },
    { key: "email", label: "Email" },
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
        <h2 className="text-xl font-bold text-primary-header">Manage Clients</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...emptyForm }); setError(""); setSuccess(""); }}
          className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-lg p-5 mb-6 space-y-5">
          {/* Client Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Client Code <span className="text-error">*</span></label>
              <input name="clientCode" value={form.clientCode} onChange={handleChange} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Client Name <span className="text-error">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Client Group <span className="text-error">*</span></label>
              <input name="clientGroup" value={form.clientGroup} onChange={handleChange} className={inp} />
            </div>
          </div>

          {/* Contact Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Website</label>
              <input name="website" value={form.website} onChange={handleChange} placeholder="Website" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">House/Billing No. Street</label>
              <input name="street" value={form.street} onChange={handleChange} placeholder="House/Billing No. Street" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Barangay/District</label>
              <input name="barangay" value={form.barangay} onChange={handleChange} placeholder="Barangay/District" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">City/Municipality</label>
              <input name="city" value={form.city} onChange={handleChange} placeholder="City/Municipality" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Metro Manila/Province</label>
              <input name="province" value={form.province} onChange={handleChange} placeholder="Metro Manila/Province" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Postal Code</label>
              <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="Postal Code" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Telephone No.</label>
              <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="Telephone No." className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Fax No.</label>
              <input name="fax" value={form.fax} onChange={handleChange} placeholder="Fax No." className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Mobile No.</label>
              <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="Mobile No." className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email Address" className={inp} />
            </div>
          </div>

          {/* Billing Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Billing Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Billing Type</label>
              <select name="billingType" value={form.billingType} onChange={handleChange} className={inp}>
                <option value="Postpaid">Postpaid</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
            {form.billingType === "Prepaid" && (
              <div>
                <label className="block text-sm font-bold text-primary-header mb-1">Credit Limit</label>
                <input name="creditLimit" type="number" step="0.01" min="0" value={form.creditLimit} onChange={handleChange} placeholder="Credit Limit" className={inp} />
              </div>
            )}
          </div>
          {form.billingType === "Postpaid" && (
            <p className="text-xs text-sidebar-text">Postpaid clients can search unlimited — no credit restriction.</p>
          )}
          {form.billingType === "Prepaid" && (
            <p className="text-xs text-sidebar-text">Prepaid clients are limited based on their credit balance.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-btn-primary text-btn-primary-text px-6 py-2 rounded text-sm font-medium hover:opacity-90">
              {editingId ? "Update Client" : "Save Client"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); }}
              className="bg-card-bg text-sidebar-text border border-card-border px-6 py-2 rounded text-sm hover:bg-sidebar-bg">
              Cancel
            </button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        fetchUrl="/clients"
        api={api}
        pageSize={10}
        refreshKey={refreshKey}
        emptyMessage="No clients found"
        exportable
        exportUrl="/export/clients"
      />
    </div>
  );
}
