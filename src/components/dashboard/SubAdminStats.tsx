import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const STAGE_COLORS = {
  Screening: "hsl(var(--screening))",
  Interview: "hsl(var(--interview))",
  Offer: "hsl(var(--offer))",
  Hired: "hsl(var(--hired))",
  Rejected: "hsl(var(--rejected))",
  "Round 1": "hsl(45, 93%, 47%)", // yellow
  "Round 2": "hsl(120, 60%, 50%)", // green
  "CV Shared": "hsl(174, 72%, 56%)", // sea green
  "Offer Pending": "hsl(25, 95%, 53%)", // orange
};

export default function SubAdminStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    thisMonth: 0,
    thisWeek: 0,
  });
  const [growth, setGrowth] = useState({
    totalCandidates: 0,
    thisMonth: 0,
    thisWeek: 0,
  });
  const [stageData, setStageData] = useState<Array<{ name: string; value: number }>>([]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    try {
      // Total candidates for this admin
      const { count: totalCandidates } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id);

      // Candidates this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: thisMonth } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", startOfMonth.toISOString());

      // Candidates this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { count: thisWeek } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", startOfWeek.toISOString());

      // Previous month data for growth calculation
      const startOfPrevMonth = new Date(startOfMonth);
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
      const endOfPrevMonth = new Date(startOfMonth);
      endOfPrevMonth.setMilliseconds(-1);

      const { count: prevMonthTotal } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .lt("created_at", startOfMonth.toISOString());

      const { count: prevMonth } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", startOfPrevMonth.toISOString())
        .lt("created_at", startOfMonth.toISOString());

      // Previous week data
      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
      const endOfPrevWeek = new Date(startOfWeek);
      endOfPrevWeek.setMilliseconds(-1);

      const { count: prevWeek } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id)
        .gte("created_at", startOfPrevWeek.toISOString())
        .lt("created_at", startOfWeek.toISOString());

      // Calculate growth percentages
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setStats({
        totalCandidates: totalCandidates || 0,
        thisMonth: thisMonth || 0,
        thisWeek: thisWeek || 0,
      });

      setGrowth({
        totalCandidates: calculateGrowth(totalCandidates || 0, prevMonthTotal || 0),
        thisMonth: calculateGrowth(thisMonth || 0, prevMonth || 0),
        thisWeek: calculateGrowth(thisWeek || 0, prevWeek || 0),
      });

      // Stage distribution
      const { data: candidates } = await supabase
        .from("candidates")
        .select("stage")
        .eq("created_by", user.id);

      if (candidates) {
        const stageCounts: Record<string, number> = {};
        candidates.forEach((c) => {
          stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
        });

        setStageData(
          Object.entries(stageCounts).map(([name, value]) => ({ name, value }))
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
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">My Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.totalCandidates}</div>
              {growth.totalCandidates !== 0 && (
                <Badge variant={growth.totalCandidates > 0 ? "default" : "destructive"} className="gap-1">
                  {growth.totalCandidates > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(growth.totalCandidates)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.thisMonth}</div>
              {growth.thisMonth !== 0 && (
                <Badge variant={growth.thisMonth > 0 ? "default" : "destructive"} className="gap-1">
                  {growth.thisMonth > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(growth.thisMonth)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">New candidates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.thisWeek}</div>
              {growth.thisWeek !== 0 && (
                <Badge variant={growth.thisWeek > 0 ? "default" : "destructive"} className="gap-1">
                  {growth.thisWeek > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(growth.thisWeek)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">New candidates</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Candidates by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {stageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.name as keyof typeof STAGE_COLORS]} />
                  ))}
                </Pie>
                 <Tooltip />
                  <Legend 
                   formatter={(value, entry: any) => `${value} → ${entry.payload.value}`}
                   />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No candidates yet. Add your first candidate to see statistics.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
