import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays, Phone, Mail, Clock, AlertCircle,
  CheckCircle2, UserCheck, Briefcase, ArrowRight,
  Target, TrendingUp, Flame, Star, FileCheck, Gift
} from "lucide-react";
import { format, isToday, isThisWeek, parseISO, differenceInDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import {
  PIPELINE_GROUPS, STAGE_COLORS, STAGE_ACTIONS,
  URGENT_STAGES, FOLLOW_UP_STAGES, CLOSED_STAGES, SUCCESS_STAGES,
  STAGE_TO_GROUP
} from "@/lib/pipeline-config";
import CandidateDialog from "./CandidateDialog";

type Candidate = Tables<"candidates">;

const STAGE_ICONS: Record<string, typeof AlertCircle> = {
  Screening: Target,
  "CV On Hold": Clock,
  "CV Shared": ArrowRight,
  "CV Not Relevant": AlertCircle,
  Duplicate: AlertCircle,
  "Not Interested": AlertCircle,
  "Interview Scheduled": CalendarDays,
  Interview: Briefcase,
  "Round 1": Star,
  "Round 2": Star,
  "Round 3": Star,
  Selected: CheckCircle2,
  Rejected: AlertCircle,
  Backout: AlertCircle,
  "On Hold": Clock,
  "Documents Requested": FileCheck,
  "Documents Shared": FileCheck,
  "Documents Verified": FileCheck,
  "Offer Discussion": Gift,
  "Offer Pending Approval": Clock,
  "Offer Pending": Clock,
  "Offer Released": Gift,
  Offer: CheckCircle2,
  "Offer Accepted": CheckCircle2,
  "Offer Rejected": AlertCircle,
  "Joining Pending": Clock,
  Joined: UserCheck,
  Hired: UserCheck,
};

export default function DayPlannerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCandidate = (c: Candidate) => {
    setSelectedCandidate(c);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setDialogOpen(false);
    setSelectedCandidate(null);
    loadCandidates();
  };

  useEffect(() => {
    if (user) loadCandidates();
  }, [user]);

  const loadCandidates = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("candidates")
        .select("*")
        .eq("created_by", user.id)
        .order("updated_at", { ascending: false });
      setCandidates(data || []);
    } catch (error) {
      console.error("Error loading candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  const urgentCandidates = useMemo(
    () => candidates.filter((c) => URGENT_STAGES.includes(c.stage)),
    [candidates]
  );

  const followUpCandidates = useMemo(
    () => candidates.filter((c) => FOLLOW_UP_STAGES.includes(c.stage)),
    [candidates]
  );

  const todayUpdated = useMemo(
    () => candidates.filter((c) => isToday(parseISO(c.updated_at))),
    [candidates]
  );

  const staleCount = useMemo(
    () => candidates.filter((c) => {
      const days = differenceInDays(new Date(), parseISO(c.updated_at));
      return days > 7 && !CLOSED_STAGES.includes(c.stage);
    }).length,
    [candidates]
  );

  // Group candidates by pipeline group
  const pipelineGroupData = useMemo(() => {
    return PIPELINE_GROUPS.filter(g => g.label !== "Closed / Dropouts").map((group) => {
      const groupCandidates = candidates.filter((c) => group.stages.includes(c.stage));
      const stageBreakdown: Record<string, Candidate[]> = {};
      group.stages.forEach((stage) => {
        const sc = candidates.filter((c) => c.stage === stage);
        if (sc.length > 0) stageBreakdown[stage] = sc;
      });
      return { ...group, candidates: groupCandidates, stageBreakdown };
    }).filter((g) => g.candidates.length > 0);
  }, [candidates]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const pipelineActive = candidates.filter((c) => !CLOSED_STAGES.includes(c.stage)).length;
  const conversionRate = candidates.length > 0
    ? Math.round((candidates.filter((c) => SUCCESS_STAGES.includes(c.stage)).length / candidates.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Pipeline</p>
                <p className="text-2xl font-bold">{pipelineActive}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Urgent Action</p>
                <p className="text-2xl font-bold">{urgentCandidates.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Flame className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: "hsl(45, 80%, 50%)" }}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Needs Follow-up</p>
                <p className="text-2xl font-bold">{followUpCandidates.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "hsla(45, 80%, 50%, 0.1)" }}>
                <Phone className="h-5 w-5" style={{ color: "hsl(45, 80%, 50%)" }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-muted-foreground">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Stale (&gt;7 days)</p>
                <p className="text-2xl font-bold">{staleCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Rate */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-muted-foreground">Overall Conversion (Hired + Joined + Offer Accepted)</p>
            <span className="text-sm font-bold">{conversionRate}%</span>
          </div>
          <Progress value={conversionRate} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Actions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-destructive" />
              <CardTitle className="text-base">Today's Priority Actions</CardTitle>
            </div>
            <CardDescription>Candidates needing immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              {urgentCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <CheckCircle2 className="h-10 w-10 mb-2 text-primary/40" />
                  <p className="text-sm">No urgent actions — you're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentCandidates.map((c) => {
                    const color = STAGE_COLORS[c.stage] || "hsl(var(--muted-foreground))";
                    const Icon = STAGE_ICONS[c.stage] || AlertCircle;
                    const action = STAGE_ACTIONS[c.stage] || "Review";
                    const daysSinceUpdate = differenceInDays(new Date(), parseISO(c.updated_at));
                    return (
                      <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => openCandidate(c)}>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{c.full_name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: color, color }}>
                              {c.stage}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {action} {c.client_name && `• ${c.client_name}`}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {c.phone && (
                              <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-primary">
                                <Phone className="h-3 w-3" />{c.phone}
                              </a>
                            )}
                            {daysSinceUpdate > 3 && (
                              <span className="flex items-center gap-1 text-destructive">
                                <Clock className="h-3 w-3" />{daysSinceUpdate}d ago
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" style={{ color: "hsl(45, 80%, 50%)" }} />
              <CardTitle className="text-base">Follow-ups Needed</CardTitle>
            </div>
            <CardDescription>Screening, CV Shared, On Hold & Documents pending</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              {followUpCandidates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                  <CheckCircle2 className="h-10 w-10 mb-2 text-primary/40" />
                  <p className="text-sm">No follow-ups pending</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUpCandidates.map((c) => {
                    const color = STAGE_COLORS[c.stage] || "hsl(var(--muted-foreground))";
                    const Icon = STAGE_ICONS[c.stage] || AlertCircle;
                    const action = STAGE_ACTIONS[c.stage] || "Follow up";
                    const daysSinceUpdate = differenceInDays(new Date(), parseISO(c.updated_at));
                    return (
                      <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => openCandidate(c)}>
                        <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm truncate">{c.full_name}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0" style={{ borderColor: color, color }}>
                              {c.stage}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {action} {c.position_name && `• ${c.position_name}`}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {c.email && (
                              <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary">
                                <Mail className="h-3 w-3" />{c.email}
                              </a>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />{daysSinceUpdate}d
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline by Group */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Pipeline Status Board</CardTitle>
          </div>
          <CardDescription>Screening → Interview → Documentation → Offer → Joining</CardDescription>
        </CardHeader>
        <CardContent>
          {pipelineGroupData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p className="text-sm">No candidates yet. Add candidates to see your pipeline.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pipelineGroupData.map((group) => {
                const percentage = candidates.length > 0 ? Math.round((group.candidates.length / candidates.length) * 100) : 0;
                return (
                  <div key={group.label}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{group.emoji}</span>
                        <span className="text-sm font-semibold">{group.label}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{group.candidates.length}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{percentage}%</span>
                    </div>
                    <Progress value={percentage} className="h-1.5 mb-3" />
                    
                    {/* Child stages */}
                    <div className="space-y-2 ml-4">
                      {Object.entries(group.stageBreakdown).map(([stage, items]) => {
                        const stageColor = STAGE_COLORS[stage] || group.color;
                        return (
                          <div key={stage}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stageColor }} />
                                <span className="text-xs font-medium">{stage}</span>
                                <span className="text-[10px] text-muted-foreground">({items.length})</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-4">
                              {items.slice(0, 6).map((c) => (
                                <div key={c.id} className="flex items-center gap-2 p-2 rounded-md border text-sm bg-card hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => openCandidate(c)}>
                                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                                    {c.full_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{c.full_name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {c.client_name || c.position_name || c.city}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              {items.length > 6 && (
                                <div className="flex items-center justify-center p-2 rounded-md border border-dashed text-xs text-muted-foreground">
                                  +{items.length - 6} more
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Today's Activity</CardTitle>
          </div>
          <CardDescription>{todayUpdated.length} candidate(s) updated today</CardDescription>
        </CardHeader>
        <CardContent>
          {todayUpdated.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-muted-foreground">
              <p className="text-sm">No activity today yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayUpdated.slice(0, 10).map((c) => {
                const color = STAGE_COLORS[c.stage] || "hsl(var(--muted-foreground))";
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => openCandidate(c)}>
                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                      <span className="text-[10px] font-bold" style={{ color }}>{c.full_name.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{c.full_name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: color, color }}>
                      {c.stage}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(c.updated_at), "HH:mm")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <CandidateDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedCandidate(null);
        }}
        candidate={selectedCandidate}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
