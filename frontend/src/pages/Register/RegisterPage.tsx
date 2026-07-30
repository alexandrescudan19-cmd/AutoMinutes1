import { useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button, Input, PasswordInput } from "../../components/atoms";
import { api } from "../../services/api";
import { AuthLayout } from "../../components/templates";

function getApiErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Something went wrong";
  }

  return "Something went wrong";
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");

      return;
    }
    setIsLoading(true);
    try {
      await api.post("/auth/register", {
        firstName,
        lastName,
        email,
        password,
      });
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
          <h2 className="text-2xl font-semibold tracking-tight text-white">Create your account</h2>
          <p className="mt-1 text-sm text-white/50">Start turning meetings into clean notes</p>
        </div>

        {success ? (
          <div className="flex flex-col gap-3 text-center">
            <p className="text-sm text-white/70">
              Account created! Check your email to verify your account before signing in.
            </p>
            <Link to="/login" className="text-sm font-medium text-white link-underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
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
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-4">
              <Button type="submit" isLoading={isLoading} fullWidth>
                Create account
              </Button>
              <p className="text-center text-sm text-white/40">
                Already have account?{" "}
                <Link to="/login" className="font-medium text-white link-underline">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
}
