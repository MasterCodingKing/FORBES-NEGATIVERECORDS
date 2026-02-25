import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../ThemeToggle";
import api from "../../api/axios";

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

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const toggleNotifDropdown = async () => {
    const willOpen = !showNotifDropdown;
    setShowNotifDropdown(willOpen);
    if (willOpen) {
      setNotifLoading(true);
      try {
        const res = await api.get("/notifications?limit=10");
        setNotifications(res.data.data);
      } catch {
        // silently fail
      } finally {
        setNotifLoading(false);
      }
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

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

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={toggleNotifDropdown}
              className="relative text-primary-on-dark hover:opacity-80 focus:outline-none"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-error text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-page-bg border border-card-border rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-card-bg border-b border-card-border">
                  <span className="text-sm font-bold text-primary-header">Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-btn-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifLoading ? (
                    <div className="px-4 py-6 text-center text-sidebar-text text-sm">Loading...</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sidebar-text text-sm">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => n.isRead === 0 && markAsRead(n.id)}
                        className={`px-4 py-3 border-b border-card-border cursor-pointer hover:bg-card-bg transition-colors ${
                          n.isRead === 0 ? "bg-warning/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {n.isRead === 0 && (
                            <span className="mt-1 h-2 w-2 rounded-full bg-btn-primary shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary-header truncate">{n.title}</p>
                            <p className="text-xs text-sidebar-text mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-sidebar-text mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
                      ? "bg-sidebar-active text-sidebar-active-text rounded-md"
                      : "text-sidebar-text hover:bg-card-bg"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          {/* User name pinned at bottom */}
          {user && (
            <div className="border-t border-card-border px-4 py-3">
              <p className="text-xs text-sidebar-text">Logged in as</p>
              <p className="text-sm font-bold text-primary-header truncate">{user.fullName || user.email}</p>
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
