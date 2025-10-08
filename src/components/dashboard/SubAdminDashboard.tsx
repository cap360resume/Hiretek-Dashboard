import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "./DashboardLayout";
import CandidateList from "./CandidateList";
import SubAdminStats from "./SubAdminStats";
import { Users, BarChart3 } from "lucide-react";

export default function SubAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout title="My Dashboard">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-2">
            <Users className="h-4 w-4" />
            My Candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <SubAdminStats />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidateList isSuperAdmin={false} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
