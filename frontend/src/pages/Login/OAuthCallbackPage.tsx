import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader } from "../../components/atoms";
import { AuthLayout } from "../../components/templates";
import { applyTheme } from "../../hooks/useTheme";
import { clearAuthSession, setAuthSession } from "../../services/authSession";
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

    const finishGoogleSignIn = async () => {
      localStorage.setItem("accessToken", token);
      try {
        const user = await getMe();
        setAuthSession(token, user);
        if (user.themePreference === "light" || user.themePreference === "dark") {
          applyTheme(user.themePreference);
        }
        navigate("/dashboard", { replace: true });
      } catch {
        clearAuthSession();
        navigate("/login", { replace: true });
      }
    };

    void finishGoogleSignIn();
  }, [searchParams, navigate]);

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl"
      >
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white shadow-lg shadow-brand/40">
          A
        </div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight text-white">Signing you in</h2>
        <div className="flex justify-center">
          <Loader label="Completing Google sign in..." />
        </div>
      </motion.div>
    </AuthLayout>
  );
}
