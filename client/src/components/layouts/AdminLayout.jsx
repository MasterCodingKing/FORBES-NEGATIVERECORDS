import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

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
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const panelRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch {
      /* ignore */
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await api.get("/notifications?limit=20");
      setNotifications(res.data.data);
    } catch {
      /* ignore */
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleNotifPanel = () => {
    if (!showNotifPanel) fetchNotifications();
    setShowNotifPanel(!showNotifPanel);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const handleNotifClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    setShowNotifPanel(false);
    if (notif.type === "NEW_REGISTRATION") {
      navigate("/admin/access");
    }
  };

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
          {/* Notification Bell */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={toggleNotifPanel}
              className="relative text-primary-on-dark hover:opacity-80 focus:outline-none"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sidebar-active text-sidebar-active-text text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifPanel && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card-bg border border-card-border rounded-lg shadow-lg z-50 max-h-96 flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
                  <h4 className="text-sm font-bold text-primary-header">Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary-header hover:underline">
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifLoading ? (
                    <p className="text-sm text-sidebar-text text-center py-4">Loading...</p>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-sidebar-text text-center py-4">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 border-b border-card-border hover:bg-sidebar-bg transition-colors ${
                          !n.isRead ? "bg-primary-header/5" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-sidebar-active flex-shrink-0" />}
                          <div className={!n.isRead ? "" : "ml-4"}>
                            <p className="text-sm font-medium text-primary-header">{n.title}</p>
                            <p className="text-xs text-sidebar-text mt-0.5">{n.message}</p>
                            <p className="text-xs text-sidebar-text/60 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </button>
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
