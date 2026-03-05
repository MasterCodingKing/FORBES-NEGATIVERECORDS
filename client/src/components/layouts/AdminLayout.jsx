import { useEffect, useRef, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import ThemeToggle from "../ThemeToggle";

const sidebarSections = [
  {
    category: "Overview",
    links: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" },
    ],
  },
  {
    category: "Management",
    links: [
      { to: "/admin/clients", label: "Manage Clients", icon: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" },
      { to: "/admin/branches", label: "Affiliate Branches", icon: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" },
      { to: "/admin/access", label: "Profile & Access", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" },
      { to: "/admin/records", label: "Records", icon: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" },
    ],
  },
  {
    category: "Operations",
    links: [
      { to: "/admin/unlocking", label: "Unlocking", icon: "M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" },
      { to: "/admin/credits", label: "Credit Management", icon: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" },
      { to: "/admin/billing", label: "Billing", icon: "M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" },
    ],
  },
  {
    category: "Content",
    links: [
      { to: "/admin/news", label: "News", icon: "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" },
      { to: "/admin/audit-trail", label: "Audit Trail", icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const panelRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    } else if (
      notif.type === "UNLOCK_REQUEST_NEW" ||
      notif.type === "UNLOCK_REQUEST_RECEIVED"
    ) {
      navigate("/admin/unlocking", { state: { requestId: notif.relatedId } });
    } else if (notif.type === "SEARCH_ACCESS_REQUEST") {
      navigate("/admin/unlocking", { state: { tab: "search" } });
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
            <h1 className="text-lg font-bold tracking-wide">NEGREC Admin</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
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
                          !n.isRead ? "bg-sidebar-active/5" : ""
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
        <aside className={`${sidebarOpen ? "w-60" : "w-0"} bg-sidebar-bg border-r border-card-border overflow-y-auto transition-all duration-200`}>
          {sidebarOpen && (
            <nav className="flex flex-col py-2">
              {sidebarSections.map((section) => (
                <div key={section.category}>
                  <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-sidebar-text/50">
                    {section.category}
                  </p>
                  {section.links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        `px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-3 ${
                          isActive
                            ? "bg-sidebar-active text-sidebar-active-text"
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
                </div>
              ))}
            </nav>
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
