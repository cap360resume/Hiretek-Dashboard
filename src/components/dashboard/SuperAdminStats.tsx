import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCheck, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const STAGE_COLORS = {
  Screening: "hsl(var(--screening))",
  Interview: "hsl(var(--interview))",
  Offer: "hsl(var(--offer))",
  Hired: "hsl(var(--hired))",
  Rejected: "hsl(var(--rejected))",
};

export default function SuperAdminStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAdmins: 0,
    thisMonth: 0,
    thisWeek: 0,
  });
  const [stageData, setStageData] = useState<Array<{ name: string; value: number }>>([]);
  const [adminPerformance, setAdminPerformance] = useState<Array<{ name: string; candidates: number }>>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Total candidates
      const { count: totalCandidates } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true });

      // Total admins (sub_admins only)
      const { count: totalAdmins } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "sub_admin");

      // Candidates this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: thisMonth } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // Candidates this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: thisWeek } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfWeek.toISOString());

      setStats({
        totalCandidates: totalCandidates || 0,
        totalAdmins: totalAdmins || 0,
        thisMonth: thisMonth || 0,
        thisWeek: thisWeek || 0,
      });

      // Stage distribution
      const { data: candidates } = await supabase
        .from("candidates")
        .select("stage");

      if (candidates) {
        const stageCounts: Record<string, number> = {};
        candidates.forEach((c) => {
          stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
        });

        setStageData(
          Object.entries(stageCounts).map(([name, value]) => ({ name, value }))
        );
      }

      // Admin performance
      const { data: adminData } = await supabase
        .from("candidates")
        .select("created_by, profiles(full_name)");

      if (adminData) {
        const adminCounts: Record<string, number> = {};
        adminData.forEach((item) => {
          const adminName = (item.profiles as any)?.full_name || "Unknown";
          adminCounts[adminName] = (adminCounts[adminName] || 0) + 1;
        });

        setAdminPerformance(
          Object.entries(adminCounts)
            .map(([name, candidates]) => ({ name, candidates }))
            .sort((a, b) => b.candidates - a.candidates)
            .slice(0, 5)
        );
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAdmins}</div>
            <p className="text-xs text-muted-foreground">Sub admins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonth}</div>
            <p className="text-xs text-muted-foreground">New candidates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
            <p className="text-xs text-muted-foreground">New candidates</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidates by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.name as keyof typeof STAGE_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Performance (Top 5)</CardTitle>
          </CardHeader>
          <CardContent>
            {adminPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={adminPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="candidates" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
