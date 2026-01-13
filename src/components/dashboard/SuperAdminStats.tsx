import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, UserCheck, Clock, ArrowUpRight, ArrowDownRight, Trophy } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const STAGE_COLORS: Record<string, string> = {
  Screening: "hsl(200, 70%, 50%)",
  Interview: "hsl(280, 60%, 55%)",
  Offer: "hsl(140, 60%, 45%)",
  Hired: "hsl(160, 70%, 40%)",
  Rejected: "hsl(0, 70%, 50%)",
  Backout: "hsl(30, 80%, 50%)",
  "On Hold": "hsl(45, 80%, 50%)",
  "Not Interested": "hsl(0, 40%, 55%)",
  Duplicate: "hsl(200, 30%, 50%)",
  "Round 1": "hsl(45, 93%, 47%)",
  "Round 2": "hsl(120, 60%, 50%)",
  "Round 3": "hsl(180, 60%, 45%)",
  "CV Shared": "hsl(174, 72%, 56%)",
  Joined: "hsl(150, 70%, 40%)",
  "Offer Pending": "hsl(25, 95%, 53%)",
  "CV Not Relevant": "hsl(0, 30%, 60%)",
};

export default function SuperAdminStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalAdmins: 0,
    thisMonth: 0,
    thisWeek: 0,
  });
  const [growth, setGrowth] = useState({
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

      // Previous month data for growth calculation
      const startOfPrevMonth = new Date(startOfMonth);
      startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);

      const { count: prevMonthTotal } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .lt("created_at", startOfMonth.toISOString());

      const { count: prevMonth } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfPrevMonth.toISOString())
        .lt("created_at", startOfMonth.toISOString());

      // Previous week data
      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);

      const { count: prevWeek } = await supabase
        .from("candidates")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfPrevWeek.toISOString())
        .lt("created_at", startOfWeek.toISOString());

      // Previous month admin count
      const { count: prevAdmins } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "sub_admin")
        .lt("created_at", startOfMonth.toISOString());

      // Calculate growth percentages
      const calculateGrowth = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      setStats({
        totalCandidates: totalCandidates || 0,
        totalAdmins: totalAdmins || 0,
        thisMonth: thisMonth || 0,
        thisWeek: thisWeek || 0,
      });

      setGrowth({
        totalCandidates: calculateGrowth(totalCandidates || 0, prevMonthTotal || 0),
        totalAdmins: calculateGrowth(totalAdmins || 0, prevAdmins || 0),
        thisMonth: calculateGrowth(thisMonth || 0, prevMonth || 0),
        thisWeek: calculateGrowth(thisWeek || 0, prevWeek || 0),
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
          Object.entries(stageCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        );
      }

      // Admin performance - fetch separately and join manually
      const { data: candidatesWithCreator } = await supabase
        .from("candidates")
        .select("created_by");

      if (candidatesWithCreator) {
        // Count candidates per admin
        const adminCounts: Record<string, number> = {};
        candidatesWithCreator.forEach((c) => {
          adminCounts[c.created_by] = (adminCounts[c.created_by] || 0) + 1;
        });

        // Get profile names for these admins
        const adminIds = Object.keys(adminCounts);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", adminIds);

        const profileMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          profileMap[p.id] = p.full_name || "Unknown";
        });

        const performanceData = Object.entries(adminCounts)
          .map(([id, count]) => ({
            name: profileMap[id] || "Unknown",
            candidates: count,
          }))
          .sort((a, b) => b.candidates - a.candidates)
          .slice(0, 5);

        setAdminPerformance(performanceData);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const totalStageCount = stageData.reduce((acc, item) => acc + item.value, 0);

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
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
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

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
            <div className="rounded-full bg-green-500/10 p-2">
              <UserCheck className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{stats.totalAdmins}</div>
              {growth.totalAdmins !== 0 && (
                <Badge variant={growth.totalAdmins > 0 ? "default" : "destructive"} className="gap-1">
                  {growth.totalAdmins > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(growth.totalAdmins)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Sub admins</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <div className="rounded-full bg-blue-500/10 p-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
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

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <div className="rounded-full bg-orange-500/10 p-2">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <span>Candidates by Stage</span>
              <Badge variant="secondary" className="ml-auto font-normal">
                Total: {totalStageCount}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stageData.length > 0 ? (
              <div className="space-y-3">
                {stageData.map((stage) => {
                  const percentage = totalStageCount > 0 
                    ? Math.round((stage.value / totalStageCount) * 100) 
                    : 0;
                  const color = STAGE_COLORS[stage.name] || "hsl(var(--primary))";
                  
                  return (
                    <div key={stage.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-medium truncate max-w-[150px]">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-semibold text-foreground">{stage.value}</span>
                          <span className="text-xs w-10 text-right">({percentage}%)</span>
                        </div>
                      </div>
                      <Progress 
                        value={percentage} 
                        className="h-2"
                        style={{ 
                          background: `${color}20`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Admin Performance (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {adminPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={adminPerformance} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value} candidates`, 'Total']}
                  />
                  <Bar 
                    dataKey="candidates" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
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
