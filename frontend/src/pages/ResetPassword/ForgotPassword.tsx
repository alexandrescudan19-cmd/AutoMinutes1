import { useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { Button, Card, Input } from "../../components/atoms";
import { api } from "../../services/api";

function getApiErrorMessage(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "Something went wrong";
  }

  return "Something went wrong";
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card title="Forgot password" className="w-full max-w-md">
        {submitted ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-green-700">{message}</p>
            <Link to="/login" className="text-brand hover:underline">
              Back to sign in
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
            <p className="text-sm text-gray-500">
              Enter the email address associated with your account and we'll
              send you a link to reset your password.
            </p>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" isLoading={isLoading} fullWidth>
              Send reset link
            </Button>
            <p className="text-center text-sm text-gray-500">
              Remembered your password?{" "}
              <Link to="/login" className="text-brand link-underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
