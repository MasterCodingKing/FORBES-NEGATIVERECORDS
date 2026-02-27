import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./routes/ProtectedRoute";

import AdminLayout from "./components/layouts/AdminLayout";
import AffiliateLayout from "./components/layouts/AffiliateLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageClients from "./pages/admin/ManageClients";
import AffiliateBranches from "./pages/admin/AffiliateBranches";
import ProfileAccess from "./pages/admin/ProfileAccess";
import AdminUnlocking from "./pages/admin/AdminUnlocking";
import ManageNews from "./pages/admin/ManageNews";
import CreditManagement from "./pages/admin/CreditManagement";
import AdminRecords from "./pages/admin/AdminRecords";

// Affiliate pages
import NegativeRecordSearch from "./pages/affiliate/NegativeRecordSearch";
import AffiliateUnlocking from "./pages/affiliate/AffiliateUnlocking";
import AffiliateDirectory from "./pages/affiliate/AffiliateDirectory";
import SearchLogs from "./pages/affiliate/SearchLogs";
import ProfilePage from "./pages/affiliate/ProfilePage";

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/landing" replace />;
  if (user.role === "Super Admin" || user.role === "Admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/affiliate/search" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={["Super Admin", "Admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<ManageClients />} />
            <Route path="branches" element={<AffiliateBranches />} />
            <Route path="access" element={<ProfileAccess />} />
            <Route path="unlocking" element={<AdminUnlocking />} />
            <Route path="news" element={<ManageNews />} />
            <Route path="credits" element={<CreditManagement />} />
            <Route path="records" element={<AdminRecords />} />
          </Route>

          {/* Affiliate routes */}
          <Route
            path="/affiliate"
            element={
              <ProtectedRoute roles={["Affiliate"]}>
                <AffiliateLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="search" replace />} />
            <Route path="search" element={<NegativeRecordSearch />} />
            <Route path="unlocking" element={<AffiliateUnlocking />} />
            <Route path="directory" element={<AffiliateDirectory />} />
            <Route path="search-logs" element={<SearchLogs />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
