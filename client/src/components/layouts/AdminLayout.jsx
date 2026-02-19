import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const adminLinks = [
  { to: "/admin/clients", label: "Manage Clients" },
  { to: "/admin/branches", label: "Affiliate Branches" },
  { to: "/admin/access", label: "Profile & Access" },
  { to: "/admin/unlocking", label: "Unlocking" },
  { to: "/admin/news", label: "News" },
  { to: "/admin/credits", label: "Credit Management" },
  { to: "/admin/records", label: "Records" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Header */}
      <header className="bg-primary-header text-primary-on-dark flex items-center justify-between px-6 py-3">
        <h1 className="text-lg font-bold tracking-wide">NEGRECT Admin</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">{user?.role}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-sidebar-active text-sidebar-active-text px-3 py-1 rounded hover:opacity-90"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-60 bg-sidebar-bg border-r border-card-border overflow-y-auto">
          <nav className="flex flex-col py-2">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-active text-sidebar-active-text"
                      : "text-sidebar-text hover:bg-card-bg"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-page-bg overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
