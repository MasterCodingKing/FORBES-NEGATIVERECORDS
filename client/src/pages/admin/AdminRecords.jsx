import { useState, useRef } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function AdminRecords() {
  const [tab, setTab] = useState("list");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    type: "Individual",
    firstName: "",
    middleName: "",
    lastName: "",
    companyName: "",
    details: "",
    source: "",
  });
  const fileRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/records", form);
      setSuccess("Record added");
      setForm({ type: "Individual", firstName: "", middleName: "", lastName: "", companyName: "", details: "", source: "" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Select a file");

    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/records/ocr-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(res.data.message);
      fileRef.current.value = "";
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "type", label: "Type" },
    {
      key: "name",
      label: "Name / Company",
      render: (r) =>
        r.type === "Individual"
          ? [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")
          : r.companyName,
    },
    { key: "source", label: "Source", render: (r) => r.source || "—" },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-primary-header mb-4">Records</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      <div className="flex gap-2 mb-4">
        {["list", "add", "ocr"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded text-sm font-medium capitalize ${
              tab === t
                ? "bg-sidebar-active text-sidebar-active-text"
                : "bg-card-bg text-sidebar-text border border-card-border"
            }`}
          >
            {t === "ocr" ? "OCR Upload" : t === "add" ? "Add Record" : "All Records"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <DataTable columns={columns} fetchUrl="/records" api={api} refreshKey={refreshKey} />
      )}

      {tab === "add" && (
        <form onSubmit={handleAdd} className="bg-card-bg border border-card-border rounded-lg p-4 space-y-3 max-w-lg">
          <div>
            <label className="text-sm font-medium text-sidebar-text">Type</label>
            <select
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full border border-card-border rounded px-3 py-2 text-sm mt-1"
            >
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </div>
          {form.type === "Individual" ? (
            <>
              <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" className="w-full border border-card-border rounded px-3 py-2 text-sm" />
              <input name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle Name" className="w-full border border-card-border rounded px-3 py-2 text-sm" />
              <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className="w-full border border-card-border rounded px-3 py-2 text-sm" />
            </>
          ) : (
            <input name="companyName" value={form.companyName} onChange={handleChange} placeholder="Company Name" className="w-full border border-card-border rounded px-3 py-2 text-sm" />
          )}
          <textarea name="details" value={form.details} onChange={handleChange} placeholder="Details" rows="3" className="w-full border border-card-border rounded px-3 py-2 text-sm" />
          <input name="source" value={form.source} onChange={handleChange} placeholder="Source" className="w-full border border-card-border rounded px-3 py-2 text-sm" />
          <button type="submit" className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            Save Record
          </button>
        </form>
      )}

      {tab === "ocr" && (
        <form onSubmit={handleUpload} className="bg-card-bg border border-card-border rounded-lg p-4 max-w-lg space-y-3">
          <p className="text-sm text-sidebar-text">Upload a PDF or image file to extract records using OCR.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="block w-full text-sm text-sidebar-text file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-header file:text-primary-on-dark hover:file:opacity-90"
          />
          <button type="submit" className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            Upload & Process
          </button>
        </form>
      )}
    </div>
  );
}
