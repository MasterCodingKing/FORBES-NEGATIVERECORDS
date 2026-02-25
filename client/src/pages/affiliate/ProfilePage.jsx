import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/users/profile");
        setProfile(res.data);
        setForm({
          firstName: res.data.firstName || "",
          middleName: res.data.middleName || "",
          lastName: res.data.lastName || "",
          email: res.data.email,
        });
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.put("/users/profile", form);
      setSuccess("Profile updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.put("/users/profile/password", passwordForm);
      setSuccess("Password changed");
      setPasswordForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    }
  };

  if (!profile) return <div className="text-sidebar-text">Loading...</div>;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-primary-header mb-4">Profile</h2>
      {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
      {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

      <form onSubmit={handleUpdate} className="bg-card-bg border border-card-border rounded-lg p-4 mb-6 space-y-3">
        <h3 className="font-semibold text-primary-header">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">First Name</label>
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" />
          </div>
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Middle Name</label>
            <input value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" />
          </div>
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Last Name</label>
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-sidebar-text mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" />
        </div>
        <div>
          <label className="block text-sm font-medium text-sidebar-text mb-1">Role</label>
          <input value={profile.Role?.name || "N/A"} disabled className="w-full border border-card-border rounded px-3 py-2 text-sm bg-page-bg text-sidebar-text" />
        </div>
        <button type="submit" className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90">Save Changes</button>
      </form>

      <form onSubmit={handleChangePassword} className="bg-card-bg border border-card-border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-primary-header">Change Password</h3>
        <div>
          <label className="block text-sm font-medium text-sidebar-text mb-1">Current Password</label>
          <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-sidebar-text mb-1">New Password</label>
          <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header" required />
        </div>
        <button type="submit" className="bg-btn-primary text-btn-primary-text px-4 py-2 rounded text-sm font-medium hover:opacity-90">Change Password</button>
      </form>
    </div>
  );
}
