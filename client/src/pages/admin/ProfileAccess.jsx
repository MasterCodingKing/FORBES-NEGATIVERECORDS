import { useEffect, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

const emptyForm = {
  firstName: "", middleName: "", lastName: "",
  telephone: "", mobileNumber: "", faxNumber: "",
  primaryEmail: "", alternateEmail1: "", alternateEmail2: "",
  areaHeadManager: "", areaHeadManagerContact: "", position: "", department: "",
  clientId: "", branchId: "",
  roleId: "", username: "", email: "", password: "", confirmPassword: ""
};

export default function ProfileAccess() {
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    Promise.all([
      api.get("/clients?limit=100"),
      api.get("/users/roles")
    ]).then(([cRes, rRes]) => {
      setClients(cRes.data.data);
      setRoles(rRes.data);
    }).catch(() => {});
  }, []);

  // Load branches when affiliate (client) changes
  useEffect(() => {
    if (form.clientId) {
      api.get(`/sub-domains?clientId=${form.clientId}&limit=100`)
        .then((res) => setBranches(res.data.data))
        .catch(() => setBranches([]));
    } else {
      setBranches([]);
      setForm((f) => ({ ...f, branchId: "" }));
    }
  }, [form.clientId]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editingId && form.password !== form.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (!editingId && form.password && form.password.length < 8) {
      return setError("Password must be at least 8 characters");
    }

    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      if (editingId && !payload.password) delete payload.password;

      if (editingId) {
        await api.put(`/users/${editingId}`, payload);
        setSuccess("User updated");
      } else {
        await api.post("/users", payload);
        setSuccess("User created");
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
      firstName: row.firstName || "",
      middleName: row.middleName || "",
      lastName: row.lastName || "",
      telephone: row.telephone || "",
      mobileNumber: row.mobileNumber || "",
      faxNumber: row.faxNumber || "",
      primaryEmail: row.primaryEmail || "",
      alternateEmail1: row.alternateEmail1 || "",
      alternateEmail2: row.alternateEmail2 || "",
      areaHeadManager: row.areaHeadManager || "",
      areaHeadManagerContact: row.areaHeadManagerContact || "",
      position: row.position || "",
      department: row.department || "",
      clientId: row.clientId ? String(row.clientId) : "",
      branchId: row.branchId ? String(row.branchId) : "",
      roleId: row.roleId ? String(row.roleId) : "",
      username: row.username || "",
      email: row.email || "",
      password: "",
      confirmPassword: ""
    });
    setEditingId(row.id);
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/users/${id}/approve`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve");
    }
  };

  const allColumns = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "username", label: "Username" },
    { key: "roleName", label: "Role", render: (r) => r.Role?.name || "—" },
    { key: "clientName", label: "Affiliate", render: (r) => r.Client?.name || "—" },
    { key: "branchName", label: "Branch", render: (r) => r.Branch?.name || "—" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span className={`text-xs font-medium px-2 py-1 rounded ${r.isApproved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          {r.isApproved ? "Approved" : "Pending"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          {!r.isApproved && (
            <button onClick={(e) => { e.stopPropagation(); handleApprove(r.id); }}
              className="text-success text-xs font-medium hover:underline">Approve</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
            className="text-primary-header text-xs font-medium hover:underline">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
            className="text-error text-xs font-medium hover:underline">Delete</button>
        </div>
      )
    }
  ];

  const pendingColumns = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email" },
    { key: "roleName", label: "Role", render: (r) => r.Role?.name || "—" },
    { key: "createdAt", label: "Registered", render: (r) => new Date(r.createdAt).toLocaleDateString() },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleApprove(r.id); }}
            className="text-success text-xs font-medium hover:underline">Approve</button>
          <button onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
            className="text-primary-header text-xs font-medium hover:underline">Edit</button>
        </div>
      )
    }
  ];

  const inp = "w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-primary-header">Profile & Accessing</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...emptyForm }); setError(""); setSuccess(""); }}
          className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-lg p-5 mb-6 space-y-5">
          {/* Personal Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">First Name</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle Name" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Last Name</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Telephone Number</label>
              <input name="telephone" value={form.telephone} onChange={handleChange} placeholder="+123-123-1234" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Mobile Number</label>
              <input name="mobileNumber" value={form.mobileNumber} onChange={handleChange} placeholder="+123 123456789" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Fax Number</label>
              <input name="faxNumber" value={form.faxNumber} onChange={handleChange} placeholder="+123-123-12345789" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Primary Email <span className="text-error">*</span></label>
              <input name="primaryEmail" type="email" value={form.primaryEmail} onChange={handleChange} placeholder="email@example.com" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">(1) Alternate Email</label>
              <input name="alternateEmail1" type="email" value={form.alternateEmail1} onChange={handleChange} placeholder="alternate@example.com" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">(2) Alternate Email</label>
              <input name="alternateEmail2" type="email" value={form.alternateEmail2} onChange={handleChange} placeholder="alternate@example.com" className={inp} />
            </div>
          </div>

          {/* Employment Details */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Employment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Area Head Manager</label>
              <input name="areaHeadManager" value={form.areaHeadManager} onChange={handleChange} placeholder="Manager Name" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Area Head Manager Contact</label>
              <input name="areaHeadManagerContact" value={form.areaHeadManagerContact} onChange={handleChange} placeholder="912840210" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Position</label>
              <input name="position" value={form.position} onChange={handleChange} placeholder="Account Officer, Marketing Officer" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Department</label>
              <input name="department" value={form.department} onChange={handleChange} placeholder="Department" className={inp} />
            </div>
          </div>

          {/* Affiliate and Branches */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Affiliate and Branches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Affiliate</label>
              <select name="clientId" value={form.clientId} onChange={handleChange} className={inp}>
                <option value="">Select Affiliate</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Branch</label>
              <select name="branchId" value={form.branchId} onChange={handleChange} className={inp} disabled={!form.clientId}>
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Login Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Login Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Role <span className="text-error">*</span></label>
              <select name="roleId" value={form.roleId} onChange={handleChange} className={inp} required>
                <option value="">Select</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Username</label>
              <input name="username" value={form.username} onChange={handleChange} placeholder="Minimum 2 characters" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Email <span className="text-error">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Login email" className={inp} required />
            </div>
            <div className="relative">
              <label className="block text-sm font-bold text-primary-header mb-1">Password {!editingId && <span className="text-error">*</span>}</label>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className={inp}
                required={!editingId}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-sidebar-text text-xs">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div className="relative">
              <label className="block text-sm font-bold text-primary-header mb-1">Confirm Password {!editingId && <span className="text-error">*</span>}</label>
              <input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className={inp}
                required={!editingId}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="bg-primary-header text-primary-on-dark px-6 py-2 rounded text-sm font-medium hover:opacity-90">
              {editingId ? "Update User" : "Save User"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm({ ...emptyForm }); }}
              className="bg-card-bg text-sidebar-text border border-card-border px-6 py-2 rounded text-sm hover:bg-sidebar-bg">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === "all" ? "bg-sidebar-active text-sidebar-active-text" : "bg-card-bg text-sidebar-text border border-card-border"}`}
        >
          All Users
        </button>
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded text-sm font-medium ${tab === "pending" ? "bg-sidebar-active text-sidebar-active-text" : "bg-card-bg text-sidebar-text border border-card-border"}`}
        >
          Pending Approval
        </button>
      </div>

      {tab === "all" && (
        <DataTable
          columns={allColumns}
          fetchUrl="/users/all"
          api={api}
          pageSize={10}
          refreshKey={refreshKey}
          emptyMessage="No users found"
        />
      )}

      {tab === "pending" && (
        <DataTable
          columns={pendingColumns}
          fetchUrl="/users/pending"
          api={api}
          pageSize={10}
          refreshKey={refreshKey}
          emptyMessage="No pending users"
        />
      )}
    </div>
  );
}
