import { useState } from "react";
import { isAxiosError } from "axios";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, PasswordInput } from "../../components/atoms";
import { AuthLayout } from "../../components/templates";
import { api } from "../../services/api";

function getApiErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Something went wrong";
  }

  return "Something went wrong";
}

export default function ResetPasswordPage() {
  const { token: tokenParam } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? tokenParam ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!token) {
      setError("Reset token is missing. Please use the link from your email.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        password,
      });
      setMessage(data.message);
      setSuccess(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white shadow-lg shadow-brand/40">
            A
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Reset password</h2>
          <p className="mt-1 text-sm text-white/50">Choose a new password for your account</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-green-400">{message}</p>
            <Link to="/login" className="text-sm font-medium text-white link-underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <PasswordInput
              label="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PasswordInput
              label="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" isLoading={isLoading} fullWidth>
              Reset password
            </Button>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
}
