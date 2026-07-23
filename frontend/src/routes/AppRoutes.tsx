import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";
import ActionItemsPage from "../pages/ActionItems/ActionItemsPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import MeetingsPage from "../pages/Meetings/MeetingsPage";
import TestLabPage from "../pages/TestLab/TestLabPage";
import VerifyEmailPage from "../pages/VerifyEmail/VerifyEmailPage";
import OAuthCallbackPage from "../pages/Login/OAuthCallbackPage";
import SettingsPage from "../pages/Settings/SettingsPage";
import ForgotPasswordPage from "../pages/ResetPassword/ForgotPassword";
import ResetPasswordPage from "../pages/ResetPassword/ResetPassword";

function ProtectedRoute() {
  const token = localStorage.getItem("accessToken");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
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
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/action-items" element={<ActionItemsPage />} />
        <Route path="/test-lab" element={<TestLabPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
