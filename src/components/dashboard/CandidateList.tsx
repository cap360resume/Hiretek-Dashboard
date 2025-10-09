import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Download, Edit, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import CandidateDialog from "./CandidateDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string | null;
  city: string;
  designation: string | null;
  company: string | null;
  experience: string | null;
  current_ctc: string | null;
  expected_ctc: string | null;
  notice_period: string | null;
  date_of_sharing: string | null;
  comment: string | null;
  resume_url: string | null;
  stage: string;
  notes: string | null;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  };
}

interface CandidateListProps {
  isSuperAdmin: boolean;
}

const STAGES = ["Screening", "Interview", "Offer", "Hired", "Rejected", "Backout", "On Hold", "Not Interested", "Duplicate", "Round 1", "Round 2", "Round 3"];

const STAGE_VARIANTS: Record<string, string> = {
  Screening: "bg-screening/10 text-screening border-screening",
  Interview: "bg-interview/10 text-interview border-interview",
  Offer: "bg-offer/10 text-offer border-offer",
  Hired: "bg-hired/10 text-hired border-hired",
  Rejected: "bg-rejected/10 text-rejected border-rejected",
  Backout: "bg-destructive/10 text-destructive border-destructive",
  "On Hold": "bg-warning/10 text-warning border-warning",
  "Not Interested": "bg-muted text-muted-foreground border-muted",
  Duplicate: "bg-muted text-muted-foreground border-muted",
  "Round 1": "bg-primary/10 text-primary border-primary",
  "Round 2": "bg-primary/10 text-primary border-primary",
  "Round 3": "bg-primary/10 text-primary border-primary",
};

export default function CandidateList({ isSuperAdmin }: CandidateListProps) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [subAdmins, setSubAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [selectedResumeUrl, setSelectedResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    loadCandidates();
    if (isSuperAdmin) {
      loadSubAdmins();
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    filterCandidates();
  }, [candidates, searchTerm, stageFilter, adminFilter]);

  const loadCandidates = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from("candidates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isSuperAdmin) {
        query = query.eq("created_by", user.id);
      }

      const { data: candidatesData, error: candidatesError } = await query;

      if (candidatesError) throw candidatesError;

      // Fetch profile data for super admin
      if (isSuperAdmin && candidatesData && candidatesData.length > 0) {
        const creatorIds = [...new Set(candidatesData.map(c => c.created_by))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", creatorIds);

        // Map profiles to candidates
        const candidatesWithProfiles = candidatesData.map(candidate => ({
          ...candidate,
          profiles: profilesData?.find(p => p.id === candidate.created_by) || null
        }));

        setCandidates(candidatesWithProfiles as any);
      } else {
        setCandidates(candidatesData as any || []);
      }
    } catch (error) {
      console.error("Error loading candidates:", error);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const loadSubAdmins = async () => {
    try {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name");

      if (profilesData) {
        setSubAdmins(profilesData.map(p => ({ id: p.id, name: p.full_name })));
      }
    } catch (error) {
      console.error("Error loading sub admins:", error);
    }
  };

  const filterCandidates = () => {
    let filtered = [...candidates];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.full_name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.city.toLowerCase().includes(term)
      );
    }

    if (stageFilter !== "all") {
      filtered = filtered.filter((c) => c.stage === stageFilter);
    }

    if (adminFilter !== "all") {
      filtered = filtered.filter((c) => c.created_by === adminFilter);
    }

    setFilteredCandidates(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this candidate?")) return;

    try {
      const { error } = await supabase.from("candidates").delete().eq("id", id);

      if (error) throw error;

      toast.success("Candidate deleted successfully");
      loadCandidates();
    } catch (error) {
      console.error("Error deleting candidate:", error);
      toast.error("Failed to delete candidate");
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Name", "Email", "Phone", "Gender", "City", "Designation", "Company", 
      "Experience", "Current CTC", "Expected CTC", "Notice Period", 
      "Date of Sharing", "Comment", "Stage", "Created At"
    ];
    
    const rows = filteredCandidates.map((c) => [
      c.full_name,
      c.email,
      c.phone,
      c.gender || "",
      c.city,
      c.designation || "",
      c.company || "",
      c.experience || "",
      c.current_ctc || "",
      c.expected_ctc || "",
      c.notice_period || "",
      c.date_of_sharing ? new Date(c.date_of_sharing).toLocaleDateString() : "",
      c.comment || "",
      c.stage,
      new Date(c.created_at).toLocaleDateString(),
    ]);

    if (isSuperAdmin) {
      headers.push("Added By");
      rows.forEach((row, index) => {
        row.push(filteredCandidates[index].profiles?.full_name || "Unknown");
      });
    }

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `candidates-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Candidates</CardTitle>
            <CardDescription>
              {isSuperAdmin ? "All candidates in the system" : "Your candidate records"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => { setEditingCandidate(null); setDialogOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isSuperAdmin && (
            <Select value={adminFilter} onValueChange={setAdminFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Admins</SelectItem>
                {subAdmins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm || stageFilter !== "all"
              ? "No candidates found matching your filters"
              : "No candidates yet. Add your first candidate to get started."}
          </div>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Current CTC</TableHead>
                  <TableHead>Expected CTC</TableHead>
                  <TableHead>Notice Period</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Date of Sharing</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Stage</TableHead>
                  {isSuperAdmin && <TableHead>Added By</TableHead>}
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium whitespace-nowrap">{candidate.full_name}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <div className="text-sm">
                        <div>{candidate.email}</div>
                        <div className="text-muted-foreground">{candidate.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.designation || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.company || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.experience || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.current_ctc || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.expected_ctc || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.notice_period || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{candidate.city}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {candidate.date_of_sharing 
                        ? new Date(candidate.date_of_sharing).toLocaleDateString() 
                        : "-"}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="text-sm truncate" title={candidate.comment || ""}>
                        {candidate.comment || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STAGE_VARIANTS[candidate.stage]}>
                        {candidate.stage}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm text-muted-foreground">
                          {candidate.profiles?.full_name || "Unknown"}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {candidate.resume_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedResumeUrl(candidate.resume_url);
                              setResumeDialogOpen(true);
                            }}
                            title="View Resume"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingCandidate(candidate); setDialogOpen(true); }}
                        >
                          <Edit className="h-4 w-4" />
                          </Button>
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(candidate.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <CandidateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        candidate={editingCandidate}
        onSuccess={() => {
          loadCandidates();
          setDialogOpen(false);
          setEditingCandidate(null);
        }}
      />

      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Resume Preview</DialogTitle>
            <DialogDescription>
              View or download the candidate's resume
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedResumeUrl && (
              <iframe
                src={selectedResumeUrl}
                className="w-full h-[600px] border rounded"
                title="Resume Preview"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedResumeUrl) {
                  window.open(selectedResumeUrl, "_blank");
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setResumeDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
