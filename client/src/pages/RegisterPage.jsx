import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useTheme } from "../context/ThemeContext";

const emptyForm = {
  firstName: "", middleName: "", lastName: "",
  telephone: "", mobileNumber: "", faxNumber: "",
  primaryEmail: "", alternateEmail1: "", alternateEmail2: "",
  areaHeadManager: "", areaHeadManagerContact: "", position: "", department: "",
  username: "", email: "", password: "", confirmPassword: "",
};

export default function RegisterPage() {
  const [form, setForm] = useState({ ...emptyForm });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      return setError("First name and last name are required");
    }
    if (!form.email.trim()) {
      return setError("Email is required");
    }
    if (form.password.length < 8) {
      return setError("Password must be at least 8 characters");
    }
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      await api.post("/auth/register", payload);
      setSuccess("Registration successful! Please wait for admin approval before logging in.");
      setForm({ ...emptyForm });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  const inp = "w-full border border-card-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-header";

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg py-10 relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg bg-card-bg border border-card-border text-sidebar-text hover:opacity-80"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
      <div className="bg-card-bg border border-card-border rounded-lg p-8 w-full max-w-3xl shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary-header">Register</h1>
          <p className="text-sidebar-text text-sm mt-1">Create a new affiliate account</p>
        </div>

        {error && <div className="bg-error/10 text-error text-sm rounded p-3 mb-4">{error}</div>}
        {success && <div className="bg-success/10 text-success text-sm rounded p-3 mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">First Name <span className="text-error">*</span></label>
              <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" className={inp} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} placeholder="Middle Name" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Last Name <span className="text-error">*</span></label>
              <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className={inp} required />
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
              <label className="block text-sm font-bold text-primary-header mb-1">Primary Email</label>
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

          {/* Login Information */}
          <h3 className="text-base font-bold text-primary-header border-b border-card-border pb-2">Login Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Username</label>
              <input name="username" value={form.username} onChange={handleChange} placeholder="Minimum 2 characters" className={inp} />
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Email <span className="text-error">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Login email" className={inp} required />
            </div>
            <div className="relative">
              <label className="block text-sm font-bold text-primary-header mb-1">Password <span className="text-error">*</span></label>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className={inp}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-sidebar-text text-xs">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <div>
              <label className="block text-sm font-bold text-primary-header mb-1">Confirm Password <span className="text-error">*</span></label>
              <input
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className={inp}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-btn-primary text-btn-primary-text py-2 rounded font-medium hover:opacity-90 transition-opacity"
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
