import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.post("/auth/register", form);
      setSuccess("Registration successful! Wait for admin approval before logging in.");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      <div className="bg-card-bg border border-card-border rounded-lg p-8 w-full max-w-md shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-header">Register</h1>
          <p className="text-sidebar-text text-sm mt-1">Create a new account</p>
        </div>
        {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
        {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Full Name</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-header text-primary-on-dark py-2 rounded font-medium hover:opacity-90 transition-opacity"
          >
            Register
          </button>
        </form>
        <p className="text-center text-sm text-sidebar-text mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-header font-medium hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
