import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token);
      // Redirect based on role
      const decoded = JSON.parse(atob(res.data.token.split(".")[1]));
      if (decoded.role === "Super Admin" || decoded.role === "Admin") {
        navigate("/admin/clients");
      } else {
        navigate("/affiliate/search");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      <div className="bg-card-bg border border-card-border rounded-lg p-8 w-full max-w-md shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-header">NEGRECT</h1>
          <p className="text-sidebar-text text-sm mt-1">Negative Records Management System</p>
        </div>
        {error && (
          <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sidebar-text mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-header text-primary-on-dark py-2 rounded font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-sm text-sidebar-text mt-4">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="text-primary-header font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
