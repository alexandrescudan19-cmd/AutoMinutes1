import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, Loader } from "../../components/atoms";
import { api } from "../../services/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token");
    api
      .get(`/auth/verify?token=${token ?? ""}`)
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.message ?? "Verification failed");
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card title="Email verification" className="w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          {status === "loading" && <Loader label="Verifying your account..." />}
          {status !== "loading" && (
            <p
              className={
                status === "success" ? "text-green-700" : "text-red-600"
              }
            >
              {message}
            </p>
          )}
          {status === "success" && (
            <Link to="/login" className="text-brand hover:underline">
              Go to sign in
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
