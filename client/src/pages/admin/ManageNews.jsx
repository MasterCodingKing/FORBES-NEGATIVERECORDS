import { useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/DataTable";

export default function ManageNews() {
  const [form, setForm] = useState({ title: "", content: "", imageUrl: "" });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await api.put(`/news/${editingId}`, form);
        setEditingId(null);
      } else {
        await api.post("/news", form);
      }
      setForm({ title: "", content: "", imageUrl: "" });
      setShowForm(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({ title: item.title, content: item.content, imageUrl: item.imageUrl || "" });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this news item?")) return;
    try {
      await api.delete(`/news/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete");
    }
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "title", label: "Title" },
    { key: "content", label: "Content", render: (r) => (r.content?.length > 60 ? r.content.slice(0, 60) + "…" : r.content) },
    { key: "createdAt", label: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
    {
      key: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(r)} className="text-primary-header text-xs font-medium hover:underline">Edit</button>
          <button onClick={() => handleDelete(r.id)} className="text-error text-xs font-medium hover:underline">Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-primary-header">Manage News</h2>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: "", content: "", imageUrl: "" }); }}
          className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90"
        >
          {showForm ? "Cancel" : "+ Add News"}
        </button>
      </div>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card-bg border border-card-border rounded-lg p-4 mb-6 space-y-3">
          <input name="title" value={form.title} onChange={handleChange} placeholder="Title" className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" required />
          <textarea name="content" value={form.content} onChange={handleChange} placeholder="Content" rows="4" className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" required />
          <input name="imageUrl" value={form.imageUrl} onChange={handleChange} placeholder="Image URL (optional)" className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" />
          <button type="submit" className="bg-primary-header text-primary-on-dark px-4 py-2 rounded text-sm font-medium hover:opacity-90">
            {editingId ? "Update" : "Add News"}
          </button>
        </form>
      )}

      <DataTable columns={columns} fetchUrl="/news" api={api} refreshKey={refreshKey} />
    </div>
  );
}
