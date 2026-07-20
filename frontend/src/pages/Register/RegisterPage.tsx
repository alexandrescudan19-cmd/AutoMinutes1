import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Input, PasswordInput } from "../../components/atoms";
import { api } from "../../services/api";
import { AuthLayout } from "../../components/templates";

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [succes, setSucces] = useState(false);

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
      setSucces(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card title="Create account" className="w-full max-w-md">
        {succes ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-green-700">
              Account created! Check your email to verify your account before
              signing in.
            </p>
            <Link to="/login" className="text-brand hover:underline">
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" isLoading={isLoading} fullWidth>
              Create account
            </Button>
            <p className="text-center text-sm text-gray-500">
              Already have account?{" "}
              <Link to="/login" className="text-brand link-underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </Card>
    </AuthLayout>
  );
}
