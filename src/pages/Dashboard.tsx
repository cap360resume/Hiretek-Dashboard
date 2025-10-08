import { useAuth } from "@/lib/auth";
import { Navigate } from "react-router-dom";
import SuperAdminDashboard from "@/components/dashboard/SuperAdminDashboard";
import SubAdminDashboard from "@/components/dashboard/SubAdminDashboard";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole === "super_admin") {
    return <SuperAdminDashboard />;
  }

  return <SubAdminDashboard />;
}
