import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../ui";

export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <PageLoader />;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function GuestOnly() {
  const { status } = useAuth();
  if (status === "loading") return <PageLoader />;
  if (status === "authenticated") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace state={{ denied: true }} />;
  return <Outlet />;
}
