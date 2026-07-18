import { useNavigate } from "react-router-dom";
import { Badge, Button, Card } from "../../components/atoms";

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") ?? "null");

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card title="Dashboard" className="w-full max-w-md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-700">
              Salut, {user?.firstName} {user?.lastName}!
            </p>
            {user?.isVerified ? (
              <Badge variant="success">Email verified</Badge>
            ) : (
              <Badge variant="warning">Pending verification</Badge>
            )}
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </Card>
    </div>
  );
}
