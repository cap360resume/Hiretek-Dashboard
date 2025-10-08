import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "./DashboardLayout";
import AdminManagement from "./AdminManagement";
import CandidateList from "./CandidateList";
import SuperAdminStats from "./SuperAdminStats";
import { Users, BarChart3, UserPlus } from "lucide-react";

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout title="Candidate Management System">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Candidates</span>
          </TabsTrigger>
          <TabsTrigger value="admins" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Admins</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SuperAdminStats />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidateList isSuperAdmin={true} />
        </TabsContent>

        <TabsContent value="admins">
          <AdminManagement />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
