import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, TrendingUp, Clock, Calendar, Target, Award, 
  ArrowUpRight, ArrowDownRight, UserCircle, BarChart3 
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";

interface Admin {
  id: string;
  full_name: string;
  email: string;
}

// Key stages to highlight - candidates in active/important stages
const KEY_STAGES = ["Interview", "Round 1", "Round 2", "Round 3", "Offer Pending", "Offer", "Joined"];

interface AdminStats {
  totalCandidates: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
  avgPerDay: number;
  stageData: Array<{ name: string; value: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  activeCandidates: Array<{ name: string; stage: string; date: string; email: string; phone: string }>;
}

const STAGE_COLORS: Record<string, string> = {
  Screening: "hsl(200, 40%, 85%)",
  Interview: "hsl(280, 40%, 85%)",
  Offer: "hsl(140, 40%, 85%)",
  Hired: "hsl(160, 40%, 85%)",
  Rejected: "hsl(0, 40%, 85%)",
  Backout: "hsl(30, 40%, 85%)",
  "On Hold": "hsl(45, 40%, 85%)",
  "Not Interested": "hsl(0, 30%, 88%)",
  Duplicate: "hsl(200, 30%, 88%)",
  "Round 1": "hsl(45, 40%, 85%)",
  "Round 2": "hsl(120, 40%, 85%)",
  "Round 3": "hsl(180, 40%, 85%)",
  "CV Shared": "hsl(174, 40%, 85%)",
  Joined: "hsl(150, 40%, 85%)",
  "Offer Pending": "hsl(25, 40%, 85%)",
  "CV Not Relevant": "hsl(0, 25%, 88%)",
};

export default function IndividualAdminPerformance() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      loadAdminStats(selectedAdmin);
    }
  }, [selectedAdmin]);

  const loadAdmins = async () => {
    try {
      // Get all sub_admins
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "sub_admin");

      if (roles && roles.length > 0) {
        const userIds = roles.map((r) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profiles) {
          setAdmins(profiles);
          // Auto-select first admin
          if (profiles.length > 0) {
            setSelectedAdmin(profiles[0].id);
          }
        }
      }
    } catch (error) {
      console.error("Error loading admins:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminStats = async (adminId: string) => {
    setStatsLoading(true);
    try {
      // Get all candidates for this admin
      const { data: candidates } = await supabase
        .from("candidates")
        .select("id, full_name, email, phone, stage, created_at, updated_at")
        .eq("created_by", adminId)
        .order("created_at", { ascending: false });

      if (!candidates) {
        setStats(null);
        return;
      }

      const now = new Date();
      const startOfThisMonth = startOfMonth(now);
      const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate stats
      const thisMonth = candidates.filter(
        (c) => new Date(c.created_at) >= startOfThisMonth
      ).length;

      const thisWeek = candidates.filter(
        (c) => new Date(c.created_at) >= startOfThisWeek
      ).length;

      const todayCount = candidates.filter(
        (c) => new Date(c.created_at) >= today
      ).length;

      // Stage distribution
      const stageCounts: Record<string, number> = {};
      candidates.forEach((c) => {
        stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
      });

      const stageData = Object.entries(stageCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Daily trend (last 30 days)
      const last30Days = eachDayOfInterval({
        start: subDays(now, 29),
        end: now,
      });

      const dailyCounts: Record<string, number> = {};
      last30Days.forEach((day) => {
        dailyCounts[format(day, "MMM dd")] = 0;
      });

      candidates.forEach((c) => {
        const dateKey = format(new Date(c.created_at), "MMM dd");
        if (dailyCounts[dateKey] !== undefined) {
          dailyCounts[dateKey]++;
        }
      });

      const dailyTrend = Object.entries(dailyCounts).map(([date, count]) => ({
        date,
        count,
      }));

      // Calculate average per day (last 30 days)
      const totalLast30 = dailyTrend.reduce((acc, d) => acc + d.count, 0);
      const avgPerDay = Math.round((totalLast30 / 30) * 10) / 10;

      // Active candidates in key stages (Interview, Round 1/2/3, Offer Pending, etc.)
      const activeCandidates = candidates
        .filter((c) => KEY_STAGES.includes(c.stage))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 15)
        .map((c) => ({
          name: c.full_name,
          stage: c.stage,
          date: format(new Date(c.updated_at), "MMM dd, yyyy"),
          email: c.email,
          phone: c.phone,
        }));

      setStats({
        totalCandidates: candidates.length,
        thisMonth,
        thisWeek,
        today: todayCount,
        avgPerDay,
        stageData,
        dailyTrend,
        activeCandidates,
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const selectedAdminData = admins.find((a) => a.id === selectedAdmin);
  const totalStageCount = stats?.stageData.reduce((acc, item) => acc + item.value, 0) || 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (admins.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No Admins Found</h3>
          <p className="text-muted-foreground text-center mt-2">
            There are no sub-admins in the system yet. Add admins to view their performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Selector */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Individual Admin Performance
              </CardTitle>
              <CardDescription className="mt-1.5">
                Select an admin to view their detailed performance metrics
              </CardDescription>
            </div>
            <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Select an admin" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4" />
                      <span>{admin.full_name || admin.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {statsLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Admin Info Banner */}
          {selectedAdminData && (
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-4 border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserCircle className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedAdminData.full_name || "Unknown"}</h3>
                  <p className="text-muted-foreground text-sm">{selectedAdminData.email}</p>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Sub Admin
                </Badge>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCandidates}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <div className="rounded-full bg-green-500/10 p-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisMonth}</div>
                <p className="text-xs text-muted-foreground">New candidates</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <div className="rounded-full bg-blue-500/10 p-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisWeek}</div>
                <p className="text-xs text-muted-foreground">New candidates</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <div className="rounded-full bg-orange-500/10 p-2">
                  <Target className="h-4 w-4 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today}</div>
                <p className="text-xs text-muted-foreground">Added today</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Daily Avg</CardTitle>
                <div className="rounded-full bg-purple-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgPerDay}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Stage Distribution Pie Chart */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  Candidates by Stage
                  <Badge variant="secondary" className="ml-auto font-normal">
                    Total: {totalStageCount}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.stageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {stats.stageData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={STAGE_COLORS[entry.name] || `hsl(${index * 40}, 60%, 50%)`}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number, name: string) => [
                          `${value} (${Math.round((value / totalStageCount) * 100)}%)`,
                          name,
                        ]}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        formatter={(value, entry: any) => (
                          <span className="text-xs">
                            {value}: {entry.payload?.value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No candidates added yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Trend Chart */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Activity Trend (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.dailyTrend.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={stats.dailyTrend}>
                      <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        interval="preserveStartEnd"
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => [`${value} candidates`, "Added"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorCount)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No activity in the last 30 days
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Candidates in Key Stages */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Active Pipeline Candidates
                <Badge variant="secondary" className="ml-auto font-normal">
                  In Progress: {stats.activeCandidates.length}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Candidates in Interview, Round 1/2/3, Offer Pending, or Offer stages
              </p>
            </CardHeader>
            <CardContent>
              {stats.activeCandidates.length > 0 ? (
                <div className="space-y-3">
                  {stats.activeCandidates.map((candidate, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ 
                            backgroundColor: `${STAGE_COLORS[candidate.stage]}20` || "hsl(var(--primary)/0.1)"
                          }}
                        >
                          <span className="text-sm font-semibold" style={{ color: STAGE_COLORS[candidate.stage] }}>
                            {candidate.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{candidate.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="truncate">{candidate.email}</span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0">{candidate.phone}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Updated: {candidate.date}</p>
                        </div>
                      </div>
                      <Badge
                        className="shrink-0 ml-2"
                        style={{
                          backgroundColor: `${STAGE_COLORS[candidate.stage]}20` || "hsl(var(--secondary))",
                          borderColor: STAGE_COLORS[candidate.stage] || "hsl(var(--border))",
                          color: STAGE_COLORS[candidate.stage] || "inherit",
                        }}
                      >
                        {candidate.stage}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No candidates in active pipeline stages
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Select an Admin</h3>
            <p className="text-muted-foreground text-center mt-2">
              Choose an admin from the dropdown to view their performance metrics.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
