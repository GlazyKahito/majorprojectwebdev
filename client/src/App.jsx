import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { GuestOnly, RequireAuth, RequireRole } from "./components/routing/Guards";
import { PageLoader } from "./components/ui";
import Login from "./pages/auth/Login";

const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Customers = lazy(() => import("./pages/customers/Customers"));
const CustomerDetail = lazy(() => import("./pages/customers/CustomerDetail"));
const CustomerForm = lazy(() => import("./pages/customers/CustomerForm"));
const Leads = lazy(() => import("./pages/leads/Leads"));
const LeadDetail = lazy(() => import("./pages/leads/LeadDetail"));
const LeadForm = lazy(() => import("./pages/leads/LeadForm"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Users = lazy(() => import("./pages/Users"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/new" element={<CustomerForm />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/customers/:id/edit" element={<CustomerForm />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/leads/new" element={<LeadForm />} />
            <Route path="/leads/:id" element={<LeadDetail />} />
            <Route path="/leads/:id/edit" element={<LeadForm />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
