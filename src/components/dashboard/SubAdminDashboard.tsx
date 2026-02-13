import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "./DashboardLayout";
import CandidateList from "./CandidateList";
import SubAdminStats from "./SubAdminStats";
import DayPlannerDashboard from "./DayPlannerDashboard";
import { Users, BarChart3, CalendarDays } from "lucide-react";

export default function SubAdminDashboard() {
  const [activeTab, setActiveTab] = useState("planner");

  return (
    <DashboardLayout title="My Dashboard">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="planner" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Day Planner
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-2">
            <Users className="h-4 w-4" />
            My Candidates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planner" className="space-y-6">
          <DayPlannerDashboard />
        </TabsContent>

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
