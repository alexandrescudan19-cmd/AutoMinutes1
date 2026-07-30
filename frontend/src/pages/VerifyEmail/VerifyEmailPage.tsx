import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader } from "../../components/atoms";
import { AuthLayout } from "../../components/templates";
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
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white shadow-lg shadow-brand/40">
            A
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white">Email verification</h2>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          {status === "loading" && <Loader label="Verifying your account..." />}
          {status !== "loading" && (
            <p className={status === "success" ? "text-sm text-green-400" : "text-sm text-red-400"}>
              {message}
            </p>
          )}
          {status === "success" && (
            <Link to="/login" className="text-sm font-medium text-white link-underline">
              Go to sign in
            </Link>
          )}
        </div>
      </motion.div>
    </AuthLayout>
  );
}
