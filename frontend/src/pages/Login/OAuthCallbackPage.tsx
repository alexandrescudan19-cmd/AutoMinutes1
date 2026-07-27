import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Loader } from "../../components/atoms";
import { applyTheme } from "../../hooks/useTheme";
import { getMe } from "../../services/users";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    localStorage.setItem("accessToken", token);

    // Fetch the real profile instead of decoding the JWT client-side, so the
    // stored user (and its theme preference) matches what a password login gets.
    getMe()
      .then((user) => {
        localStorage.setItem("user", JSON.stringify(user));
        if (user.themePreference === "light" || user.themePreference === "dark") {
          applyTheme(user.themePreference);
        }
      })
      .finally(() => {
        navigate("/dashboard", { replace: true });
      });
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card title="Signing you in" className="w-full max-w-md">
        <div className="flex justify-center">
          <Loader label="Completing Google sign in..." />
        </div>
      </Card>
    </div>
  );
}
