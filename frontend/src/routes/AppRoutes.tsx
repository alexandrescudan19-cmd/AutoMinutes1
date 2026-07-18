import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import VerifyEmailPage from "../pages/VerifyEmail/VerifyEmailPage";
import OAuthCallbackPage from "../pages/Login/OAuthCallbackPage";

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
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
    </Routes>
  );
}
