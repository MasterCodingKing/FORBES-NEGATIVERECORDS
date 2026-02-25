import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle";

const affiliateLinks = [
  { to: "/affiliate/search", label: "Negative Records Search" },
  { to: "/affiliate/unlocking", label: "Unlocking" },
  { to: "/affiliate/directory", label: "Affiliate Directory" },
  { to: "/affiliate/search-logs", label: "Search Logs" },
  { to: "/affiliate/profile", label: "Profile" },
];

export default function AffiliateLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top Header */}
      <header className="bg-nav-bg text-primary-on-dark flex items-center justify-between px-6 py-3 shadow-md">
        <h1 className="text-lg font-bold tracking-wide">NEGRECT</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
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
        <aside className="w-60 bg-sidebar-bg border-r border-card-border flex flex-col">
          <nav className="flex flex-col py-2 flex-1 overflow-y-auto">
            {affiliateLinks.map((link) => (
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
          {/* Affiliate name pinned at bottom */}
          {user?.clientName && (
            <div className="border-t border-card-border px-4 py-3">
              <p className="text-xs text-sidebar-text">Affiliate</p>
              <p className="text-sm font-bold text-primary-header truncate">{user.clientName}</p>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-page-bg overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
