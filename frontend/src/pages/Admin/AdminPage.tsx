import { useEffect, useState } from "react";
import { AppLayout } from "../../components/templates";
import { Card } from "../../components/atoms";
import { getAdminStats, listAdminUsers } from "../../services/users";
import type { StoredUserProfile } from "../../types";

export default function AdminPage() {
  const [stats, setStats] = useState<{ users: number; verifiedUsers: number; googleConnectedUsers: number } | null>(null);
  const [users, setUsers] = useState<StoredUserProfile[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        const [nextStats, nextUsers] = await Promise.all([getAdminStats(), listAdminUsers()]);
        setStats(nextStats);
        setUsers(nextUsers);
      } catch {
        setError("Admin access required.");
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col gap-5">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Admin</h1>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><p className="text-2xl font-semibold">{stats.users}</p><p className="text-sm text-gray-500">Users</p></Card>
            <Card><p className="text-2xl font-semibold">{stats.verifiedUsers}</p><p className="text-sm text-gray-500">Verified</p></Card>
            <Card><p className="text-2xl font-semibold">{stats.googleConnectedUsers}</p><p className="text-sm text-gray-500">Google connected</p></Card>
          </div>
        )}
        <Card title="Users">
          <div className="flex flex-col gap-2">
            {users.map((user) => (
              <div key={user.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                <p className="text-xs text-gray-500">{user.email} / {user.role}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
