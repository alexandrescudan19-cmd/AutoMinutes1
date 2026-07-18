import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, Loader } from "../../components/atoms";

function decodeJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

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

    const payload = decodeJwtPayload(token);
    localStorage.setItem(
      "user",
      JSON.stringify(
        payload
          ? {
              id: payload.sub,
              email: payload.email,
              role: payload.role,
              firstName: payload.firstName,
              lastName: payload.lastName,
              isVerified: true,
            }
          : null,
      ),
    );

    navigate("/dashboard", { replace: true });
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
