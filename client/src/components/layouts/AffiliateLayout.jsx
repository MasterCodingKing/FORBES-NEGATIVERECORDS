import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import ThemeToggle from "../ThemeToggle";
import api from "../../api/axios";

const affiliateLinks = [
  { to: "/affiliate/search", label: "Negative Records Search", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
  { to: "/affiliate/unlocking", label: "Unlocking", icon: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
  { to: "/affiliate/directory", label: "Affiliate Directory", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
  { to: "/affiliate/search-logs", label: "Search Logs", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
  { to: "/affiliate/profile", label: "Profile", icon: "M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" },
];

export default function AffiliateLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const handleNotifClick = async (n) => {
    if (n.isRead === 0) {
      await markAsRead(n.id);
    }
    setShowNotifDropdown(false);
    if (
      n.type === "UNLOCK_REQUEST" ||
      n.type === "UNLOCK_REQUEST_RECEIVED" ||
      n.type === "UNLOCK_REQUEST_APPROVED" ||
      n.type === "UNLOCK_REQUEST_DENIED"
    ) {
      navigate("/affiliate/unlocking", { state: { requestId: n.relatedId } });
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
        <div className="flex items-center gap-3">
          {/* Hamburger menu */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-primary-on-dark hover:opacity-80 focus:outline-none"
            title="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          {/* Logo + Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-active rounded-lg flex items-center justify-center">
              <span className="text-sidebar-active-text font-bold text-sm">NR</span>
            </div>
            <h1 className="text-lg font-bold tracking-wide">NEGREC</h1>
          </div>
        </div>
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
                        onClick={() => handleNotifClick(n)}
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
        <aside className={`${sidebarOpen ? "w-60" : "w-0"} bg-sidebar-bg border-r border-card-border flex flex-col transition-all duration-200`}>
          {sidebarOpen && (
            <>
              <nav className="flex flex-col py-2 flex-1 overflow-y-auto">
                {affiliateLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-3 ${
                        isActive
                          ? "bg-sidebar-active text-sidebar-active-text rounded-md"
                          : "text-sidebar-text hover:bg-card-bg"
                      }`
                    }
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                    </svg>
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
            </>
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
