import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Users, TrendingUp, Clock, Calendar, Target, Award, 
  UserCircle, BarChart3, Activity, Zap, Mail, Phone,
  ChevronRight, Sparkles, PieChart as PieChartIcon, History, MessageSquare, Loader2
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subDays, startOfMonth, eachDayOfInterval, startOfWeek } from "date-fns";
import { toast } from "sonner";

interface Admin {
  id: string;
  full_name: string;
  email: string;
}

import { STAGE_COLORS, ACTIVE_PIPELINE_STAGES, PIPELINE_GROUPS } from "@/lib/pipeline-config";

// Key stages to highlight - candidates in active/important stages
const KEY_STAGES = ACTIVE_PIPELINE_STAGES;

interface ActiveCandidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  stage: string;
  updated_at: string;
  created_by: string;
}

interface StageHistoryEntry {
  id: string;
  old_stage: string;
  new_stage: string;
  changed_by: string;
  comment: string | null;
  created_at: string;
  changer_name?: string;
}

interface AdminStats {
  totalCandidates: number;
  thisMonth: number;
  thisWeek: number;
  today: number;
  avgPerDay: number;
  stageData: Array<{ name: string; value: number }>;
  dailyTrend: Array<{ date: string; count: number }>;
  activeCandidates: ActiveCandidate[];
}

// STAGE_COLORS imported from pipeline-config

// Stat card configuration
const STAT_CARDS = [
  { key: 'totalCandidates', label: 'Total Candidates', subtitle: 'All time', icon: Users, gradient: 'from-blue-500 to-blue-600', bgGradient: 'from-blue-500/10 to-blue-600/5' },
  { key: 'thisMonth', label: 'This Month', subtitle: 'New candidates', icon: Calendar, gradient: 'from-emerald-500 to-green-600', bgGradient: 'from-emerald-500/10 to-green-600/5' },
  { key: 'thisWeek', label: 'This Week', subtitle: 'New candidates', icon: Clock, gradient: 'from-cyan-500 to-blue-500', bgGradient: 'from-cyan-500/10 to-blue-500/5' },
  { key: 'today', label: 'Today', subtitle: 'Added today', icon: Target, gradient: 'from-orange-500 to-amber-500', bgGradient: 'from-orange-500/10 to-amber-500/5' },
  { key: 'avgPerDay', label: 'Daily Average', subtitle: 'Last 30 days', icon: TrendingUp, gradient: 'from-purple-500 to-violet-600', bgGradient: 'from-purple-500/10 to-violet-600/5' },
];

export default function IndividualAdminPerformance() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // Stage change dialog state
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stageDialogCandidate, setStageDialogCandidate] = useState<ActiveCandidate | null>(null);
  const [newStage, setNewStage] = useState("");
  const [stageComment, setStageComment] = useState("");
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([]);
  const [savingStage, setSavingStage] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      const { data: candidates } = await supabase
        .from("candidates")
        .select("id, full_name, email, phone, stage, created_at, updated_at, created_by")
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

      const thisMonth = candidates.filter((c) => new Date(c.created_at) >= startOfThisMonth).length;
      const thisWeek = candidates.filter((c) => new Date(c.created_at) >= startOfThisWeek).length;
      const todayCount = candidates.filter((c) => new Date(c.created_at) >= today).length;

      const stageCounts: Record<string, number> = {};
      candidates.forEach((c) => {
        stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1;
      });

      const stageData = Object.entries(stageCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const last30Days = eachDayOfInterval({ start: subDays(now, 29), end: now });
      const dailyCounts: Record<string, number> = {};
      last30Days.forEach((day) => { dailyCounts[format(day, "MMM dd")] = 0; });
      candidates.forEach((c) => {
        const dateKey = format(new Date(c.created_at), "MMM dd");
        if (dailyCounts[dateKey] !== undefined) dailyCounts[dateKey]++;
      });

      const dailyTrend = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
      const totalLast30 = dailyTrend.reduce((acc, d) => acc + d.count, 0);
      const avgPerDay = Math.round((totalLast30 / 30) * 10) / 10;

      const activeCandidates: ActiveCandidate[] = candidates
        .filter((c) => KEY_STAGES.includes(c.stage))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 15);

      setStats({ totalCandidates: candidates.length, thisMonth, thisWeek, today: todayCount, avgPerDay, stageData, dailyTrend, activeCandidates });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const openStageDialog = async (candidate: ActiveCandidate) => {
    setStageDialogCandidate(candidate);
    setNewStage(candidate.stage);
    setStageComment("");
    setStageDialogOpen(true);
    setHistoryLoading(true);

    try {
      const { data: history } = await supabase
        .from("stage_history")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (history && history.length > 0) {
        // Fetch changer names
        const changerIds = [...new Set(history.map((h) => h.changed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", changerIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => { nameMap[p.id] = p.full_name; });

        setStageHistory(history.map((h) => ({
          ...h,
          changer_name: nameMap[h.changed_by] || "Unknown",
        })));
      } else {
        setStageHistory([]);
      }
    } catch (error) {
      console.error("Error loading history:", error);
      setStageHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleStageChange = async () => {
    if (!stageDialogCandidate || !user || newStage === stageDialogCandidate.stage) return;
    setSavingStage(true);
    try {
      // Update candidate stage
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ stage: newStage as any })
        .eq("id", stageDialogCandidate.id);

      if (updateError) throw updateError;

      // Insert stage history
      const { error: historyError } = await supabase
        .from("stage_history")
        .insert({
          candidate_id: stageDialogCandidate.id,
          old_stage: stageDialogCandidate.stage,
          new_stage: newStage,
          changed_by: user.id,
          comment: stageComment || null,
        });

      if (historyError) throw historyError;

      toast.success(`Stage changed to ${newStage}`);
      setStageDialogOpen(false);
      setStageDialogCandidate(null);
      // Reload stats
      if (selectedAdmin) loadAdminStats(selectedAdmin);
    } catch (error) {
      console.error("Error changing stage:", error);
      toast.error("Failed to change stage");
    } finally {
      setSavingStage(false);
    }
  };

  const selectedAdminData = admins.find((a) => a.id === selectedAdmin);
  const totalStageCount = stats?.stageData.reduce((acc, item) => acc + item.value, 0) || 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (admins.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <UserCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold">No Admins Found</h3>
          <p className="text-muted-foreground text-center mt-2 max-w-sm">
            There are no sub-admins in the system yet. Add admins to view their performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Admin Selector */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/20 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
              <BarChart3 className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Performance</h1>
              <p className="text-muted-foreground">Detailed analytics for individual administrators</p>
            </div>
          </div>
          
          <Select value={selectedAdmin} onValueChange={setSelectedAdmin}>
            <SelectTrigger className="w-full lg:w-[300px] h-12 bg-card/80 backdrop-blur-sm border-primary/20 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-4 w-4 text-primary" />
                </div>
                <SelectValue placeholder="Select an admin" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {(admin.full_name || admin.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{admin.full_name || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {statsLoading ? (
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-24 rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[400px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      ) : stats ? (
        <>
          {/* Admin Profile Card */}
          {selectedAdminData && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-2 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-bold text-white">
                        {(selectedAdminData.full_name || selectedAdminData.email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-card flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{selectedAdminData.full_name || "Unknown"}</h2>
                      <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/20">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Sub Admin
                      </Badge>
                    </div>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      {selectedAdminData.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-center">
                    <div>
                      <p className="text-3xl font-bold text-primary">{stats.totalCandidates}</p>
                      <p className="text-xs text-muted-foreground">Total Candidates</p>
                    </div>
                    <div className="h-12 w-px bg-border" />
                    <div>
                      <p className="text-3xl font-bold text-emerald-500">{stats.activeCandidates.length}</p>
                      <p className="text-xs text-muted-foreground">In Pipeline</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {STAT_CARDS.map((card, index) => {
              const Icon = card.icon;
              const value = stats[card.key as keyof AdminStats] as number;
              return (
                <Card 
                  key={card.key} 
                  className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-50`} />
                  <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${card.gradient}`} />
                  <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="text-3xl font-bold tracking-tight">{value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stage Distribution */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <PieChartIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Stage Distribution</CardTitle>
                      <CardDescription>Candidates by current stage</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm font-semibold">
                    {totalStageCount} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {stats.stageData.length > 0 ? (
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={stats.stageData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                          >
                            {stats.stageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.name] || `hsl(${index * 40}, 60%, 50%)`} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                            formatter={(value: number, name: string) => [`${value} (${Math.round((value / totalStageCount) * 100)}%)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ScrollArea className="h-[220px] flex-1">
                      <div className="space-y-2 pr-4">
                        {stats.stageData.map((stage) => {
                          const percentage = Math.round((stage.value / totalStageCount) * 100);
                          return (
                            <div key={stage.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: STAGE_COLORS[stage.name] }} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium truncate">{stage.name}</span>
                                  <span className="text-sm font-bold">{stage.value}</span>
                                </div>
                                <Progress value={percentage} className="h-1.5 mt-1" />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">{percentage}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground">No candidates added yet</div>
                )}
              </CardContent>
            </Card>

            {/* Activity Trend */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Activity Trend</CardTitle>
                    <CardDescription>Candidates added over last 30 days</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {stats.dailyTrend.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={stats.dailyTrend}>
                      <defs>
                        <linearGradient id="colorCountGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        formatter={(value: number) => [`${value} candidates`, "Added"]}
                      />
                      <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCountGradient)" dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="h-12 w-12 mb-3 opacity-50" />
                    <p>No activity in the last 30 days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Pipeline Candidates */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Active Pipeline</CardTitle>
                    <CardDescription>Candidates in Interview, Round 1/2/3, Offer stages</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm font-semibold w-fit">
                  <Zap className="h-3 w-3 mr-1" />
                  {stats.activeCandidates.length} in progress
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {stats.activeCandidates.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.activeCandidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="group relative p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 hover:shadow-md cursor-pointer"
                      onClick={() => openStageDialog(candidate)}
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{ backgroundColor: `${STAGE_COLORS[candidate.stage]}15` }}
                        >
                          <span className="text-sm font-bold" style={{ color: STAGE_COLORS[candidate.stage] }}>
                            {candidate.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm truncate">{candidate.full_name}</p>
                            <Badge
                              className="shrink-0 text-[10px] px-2 py-0.5"
                              style={{
                                backgroundColor: `${STAGE_COLORS[candidate.stage]}20`,
                                color: STAGE_COLORS[candidate.stage],
                                border: `1px solid ${STAGE_COLORS[candidate.stage]}40`,
                              }}
                            >
                              {candidate.stage}
                            </Badge>
                          </div>
                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              {candidate.email}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Phone className="h-3 w-3" />
                              {candidate.phone}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Updated: {format(new Date(candidate.updated_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No candidates in active pipeline stages</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold">Select an Admin</h3>
            <p className="text-muted-foreground text-center mt-2 max-w-sm">
              Choose an admin from the dropdown to view their performance metrics.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={(open) => {
        setStageDialogOpen(open);
        if (!open) setStageDialogCandidate(null);
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Change Stage — {stageDialogCandidate?.full_name}
            </DialogTitle>
            <DialogDescription>
              Update the pipeline stage and add an optional comment.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Stage */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <span className="text-sm text-muted-foreground">Current:</span>
              <Badge
                style={{
                  backgroundColor: `${STAGE_COLORS[stageDialogCandidate?.stage || ""]}20`,
                  color: STAGE_COLORS[stageDialogCandidate?.stage || ""],
                  border: `1px solid ${STAGE_COLORS[stageDialogCandidate?.stage || ""]}40`,
                }}
              >
                {stageDialogCandidate?.stage}
              </Badge>
            </div>

            {/* New Stage Selector */}
            <div className="space-y-2">
              <Label>New Stage</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const seen = new Set<string>();
                    return PIPELINE_GROUPS.map((group) => {
                      const uniqueStages = group.stages.filter((stage) => {
                        if (seen.has(stage)) return false;
                        seen.add(stage);
                        return true;
                      });
                      if (uniqueStages.length === 0) return null;
                      return (
                        <div key={group.label}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                            {group.emoji} {group.label}
                          </div>
                          {uniqueStages.map((stage) => (
                            <SelectItem key={stage} value={stage} className="pl-6">
                              {stage}
                            </SelectItem>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </SelectContent>
              </Select>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label>Comment (optional)</Label>
              <Textarea
                placeholder="Add a note about this stage change..."
                value={stageComment}
                onChange={(e) => setStageComment(e.target.value)}
                rows={2}
              />
            </div>

            {/* Save Button */}
            <Button
              onClick={handleStageChange}
              disabled={savingStage || newStage === stageDialogCandidate?.stage}
              className="w-full"
            >
              {savingStage && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {newStage === stageDialogCandidate?.stage ? "Select a different stage" : `Change to ${newStage}`}
            </Button>

            {/* Stage History */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Stage History</Label>
              </div>
              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : stageHistory.length > 0 ? (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2 pr-2">
                    {stageHistory.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-muted/30 text-sm space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{entry.old_stage}</Badge>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            <Badge
                              className="text-[10px]"
                              style={{
                                backgroundColor: `${STAGE_COLORS[entry.new_stage]}20`,
                                color: STAGE_COLORS[entry.new_stage],
                                border: `1px solid ${STAGE_COLORS[entry.new_stage]}40`,
                              }}
                            >
                              {entry.new_stage}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.created_at), "MMM dd, hh:mm a")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserCircle className="h-3 w-3" />
                          by {entry.changer_name}
                        </p>
                        {entry.comment && (
                          <p className="text-xs flex items-start gap-1 text-foreground/80">
                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                            {entry.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No stage changes recorded yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}