import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to the appropriate home for their actual role instead of "/" to avoid routing loops
    if (user.role === "Super Admin" || user.role === "Admin") {
      return <Navigate to="/admin/clients" replace />;
    }
    return <Navigate to="/affiliate/search" replace />;
  }

  return children;
}
