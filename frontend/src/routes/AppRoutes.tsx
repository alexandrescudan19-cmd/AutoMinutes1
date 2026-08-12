import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";
import ActionItemsPage from "../pages/ActionItems/ActionItemsPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import MeetingsPage from "../pages/Meetings/MeetingsPage";
import MeetingDetailPage from "../pages/MeetingDetail/MeetingDetailPage";
import VerifyEmailPage from "../pages/VerifyEmail/VerifyEmailPage";
import OAuthCallbackPage from "../pages/Login/OAuthCallbackPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import AssignedToMePage from "../pages/AssignedToMe/AssignedToMePage";
import SearchPage from "../pages/Search/SearchPage";
import SharePage from "../pages/Share/SharePage";
import ForgotPasswordPage from "../pages/ResetPassword/ForgotPassword";
import ResetPasswordPage from "../pages/ResetPassword/ResetPassword";
import { useAuth } from "../hooks/useAuth";

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
      <Route path="/share/:token" element={<SharePage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/meetings/:id" element={<MeetingDetailPage />} />
        <Route path="/action-items" element={<ActionItemsPage />} />
        <Route path="/assigned-to-me" element={<AssignedToMePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
