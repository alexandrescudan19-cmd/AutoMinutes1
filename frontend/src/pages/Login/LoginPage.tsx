import { useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Button, Card, Input, PasswordInput } from "../../components/atoms";
import { AuthLayout } from "../../components/templates";
import { api, API_BASE_URL } from "../../services/api";
import { applyTheme } from "../../hooks/useTheme";
import { setAuthSession } from "../../services/authSession";

function getApiErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Something went wrong";
  }

  return "Something went wrong";
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuthSession(data.accessToken, data.user);
      if (data.user?.themePreference === "light" || data.user?.themePreference === "dark") {
        applyTheme(data.user.themePreference);
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      {" "}
      <Card
        title="Sign in"
        className="w-full max-w-md drop-shadow-[0_25px_50px_rgba(124,58,237,0.35)] dark:drop-shadow-[0_25px_50px_rgba(0,149,246,0.35)]"
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-brand link-underline"
            >
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" isLoading={isLoading} fullWidth>
            Sign in
          </Button>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Sign in with Google"
              className="h-11 w-11 rounded-full border border-gray-300 p-0 cursor-pointer dark:border-gray-700"
              onClick={() => {
                window.location.href = `${API_BASE_URL}/auth/google`;
              }}
            >
              <GoogleIcon />
            </Button>
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            No account?{" "}
            <Link to="/register" className="text-brand link-underline">
              Register
            </Link>
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
}
