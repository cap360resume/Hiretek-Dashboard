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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, Edit, Trash2, FileText, Loader2, Upload, Calendar, Mail, Phone, User, Briefcase, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";
import CandidateDialog from "./CandidateDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  position_name: string | null;
  client_name: string | null;
  qualification: string | null;
  industry: string | null;
  created_at: string;
  created_by: string;
  profiles?: {
    full_name: string;
  };
}

interface CandidateListProps {
  isSuperAdmin: boolean;
}

const STAGES = ["Screening", "Interview", "Offer", "Hired", "Rejected", "Backout", "On Hold", "Not Interested", "Duplicate", "Round 1", "Round 2", "Round 3", "CV Shared", "Joined", "Offer Pending", "CV Not Relevant"];

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
  "CV Shared": "bg-blue-500/10 text-blue-600 border-blue-500",
  "Joined": "bg-hired/10 text-hired border-hired",
  "Offer Pending": "bg-amber-500/10 text-amber-600 border-amber-500",
  "CV Not Relevant": "bg-rejected/10 text-rejected border-rejected",
};

export default function CandidateList({ isSuperAdmin }: CandidateListProps) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [subAdmins, setSubAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [selectedResumeUrl, setSelectedResumeUrl] = useState<string | null>(null);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleDownloadResume = async (url: string, candidateName: string) => {
    setDownloadingResume(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const extension = url.split('.').pop() || 'pdf';
      link.download = `${candidateName.replace(/\s+/g, '_')}_Resume.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Resume downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download resume");
    } finally {
      setDownloadingResume(false);
    }
  };

  useEffect(() => {
    loadCandidates();
    if (isSuperAdmin) {
      loadSubAdmins();
    }
  }, [user, isSuperAdmin]);

  useEffect(() => {
    filterCandidates();
    setCurrentPage(1); // Reset to first page when filters change
  }, [candidates, searchTerm, stageFilter, adminFilter, companyFilter, industryFilter]);

  // Extract unique companies and industries from candidates
  useEffect(() => {
    const uniqueCompanies = [...new Set(candidates.map(c => c.company).filter(Boolean))] as string[];
    const uniqueIndustries = [...new Set(candidates.map(c => c.industry).filter(Boolean))] as string[];
    setCompanies(uniqueCompanies.sort());
    setIndustries(uniqueIndustries.sort());
  }, [candidates]);

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
          c.city.toLowerCase().includes(term) ||
          (c.position_name && c.position_name.toLowerCase().includes(term)) ||
          (c.client_name && c.client_name.toLowerCase().includes(term)) ||
          (c.company && c.company.toLowerCase().includes(term)) ||
          (c.industry && c.industry.toLowerCase().includes(term))
      );
    }

    if (stageFilter !== "all") {
      filtered = filtered.filter((c) => c.stage === stageFilter);
    }

    if (adminFilter !== "all") {
      filtered = filtered.filter((c) => c.created_by === adminFilter);
    }

    if (companyFilter !== "all") {
      filtered = filtered.filter((c) => c.company === companyFilter);
    }

    if (industryFilter !== "all") {
      filtered = filtered.filter((c) => c.industry === industryFilter);
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

  const handleDeleteSelected = async () => {
    if (selectedCandidates.size === 0) {
      toast.error("No candidates selected");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedCandidates.size} candidate(s)?`)) return;

    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .in("id", Array.from(selectedCandidates));

      if (error) throw error;

      toast.success(`Deleted ${selectedCandidates.size} candidate(s) successfully`);
      setSelectedCandidates(new Set());
      loadCandidates();
    } catch (error) {
      console.error("Error deleting candidates:", error);
      toast.error("Failed to delete candidates");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCandidates(new Set(filteredCandidates.map(c => c.id)));
    } else {
      setSelectedCandidates(new Set());
    }
  };

  const handleSelectCandidate = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedCandidates);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedCandidates(newSelected);
  };

  const exportToExcel = () => {
    const candidatesToExport = selectedCandidates.size > 0
      ? filteredCandidates.filter(c => selectedCandidates.has(c.id))
      : filteredCandidates;

    if (candidatesToExport.length === 0) {
      toast.error("No candidates to export");
      return;
    }

    const data = candidatesToExport.map((c) => ({
      "Name": c.full_name,
      "Email": c.email,
      "Phone": c.phone,
      "Gender": c.gender || "",
      "City": c.city,
      "Designation": c.designation || "",
      "Company": c.company || "",
      "Experience": c.experience || "",
      "Current CTC": c.current_ctc || "",
      "Expected CTC": c.expected_ctc || "",
      "Notice Period": c.notice_period || "",
      "Date of Sharing": c.date_of_sharing ? new Date(c.date_of_sharing).toLocaleDateString() : "",
      "Comment": c.comment || "",
      "Notes": c.notes || "",
      "Position Name": c.position_name || "",
      "Client Name": c.client_name || "",
      "Qualification": c.qualification || "",
      "Industry": c.industry || "",
      "Stage": c.stage,
      "Created At": new Date(c.created_at).toLocaleDateString(),
      ...(isSuperAdmin ? { "Added By": c.profiles?.full_name || "Unknown" } : {})
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    XLSX.writeFile(wb, `candidates-${new Date().toISOString().split("T")[0]}.xlsx`);
    
    toast.success(`Exported ${candidatesToExport.length} candidate(s)`);
    setSelectedCandidates(new Set());
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const candidates = jsonData.map((row: any) => ({
        full_name: row["Name"] || "",
        email: row["Email"] || "",
        phone: row["Phone"] || "",
        gender: row["Gender"] || null,
        city: row["City"] || "",
        designation: row["Designation"] || null,
        company: row["Company"] || null,
        experience: row["Experience"] || null,
        current_ctc: row["Current CTC"] || null,
        expected_ctc: row["Expected CTC"] || null,
        notice_period: row["Notice Period"] || null,
        date_of_sharing: row["Date of Sharing"] ? new Date(row["Date of Sharing"]).toISOString().split("T")[0] : null,
        comment: row["Comment"] || null,
        notes: row["Notes"] || null,
        position_name: row["Position Name"] || null,
        client_name: row["Client Name"] || null,
        qualification: row["Qualification"] || null,
        industry: row["Industry"] || null,
        stage: row["Stage"] || "Screening",
        created_by: user.id
      }));

      const { error } = await supabase.from("candidates").insert(candidates);

      if (error) throw error;

      toast.success(`Successfully imported ${candidates.length} candidate(s)`);
      loadCandidates();
      e.target.value = "";
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import candidates. Please check the file format.");
    } finally {
      setImporting(false);
    }
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
            {selectedCandidates.size > 0 && (
              <Button onClick={handleDeleteSelected} variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedCandidates.size})
              </Button>
            )}
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export {selectedCandidates.size > 0 ? `(${selectedCandidates.size})` : "All"}
            </Button>
            <Button variant="outline" size="sm" asChild disabled={importing}>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importing..." : "Import"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </Button>
            <Button onClick={() => { setEditingCandidate(null); setDialogOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, city, position, client, company, or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company} value={company}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
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
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Items per page:</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => { setItemsPerPage(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            Showing {filteredCandidates.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCandidates.length)} of {filteredCandidates.length} candidates
          </div>
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
          <div className="border rounded-xl overflow-x-auto shadow-sm bg-card">
            <Table className="table-enhanced">
              <TableHeader>
                <TableRow className="border-b-2 border-border bg-gradient-to-r from-muted/80 to-muted/40">
                  <TableHead className="w-[50px] sticky left-0 z-20 bg-muted/80">
                    <Checkbox
                      checked={selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0}
                      onCheckedChange={handleSelectAll}
                      className="border-muted-foreground/50"
                    />
                  </TableHead>
                  <TableHead className="sticky left-[50px] z-20 bg-muted/80 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      <span>Date</span>
                    </div>
                  </TableHead>
                  <TableHead className="sticky left-[150px] z-20 bg-muted/80 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span>Name</span>
                    </div>
                  </TableHead>
                  <TableHead className="sticky left-[280px] z-20 bg-muted/80 min-w-[200px] font-semibold sticky-shadow-right">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-primary" />
                      <span>Contact</span>
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Position</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold">Qualification</TableHead>
                  <TableHead className="font-semibold">Industry</TableHead>
                  <TableHead className="font-semibold">Designation</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Exp.</TableHead>
                  <TableHead className="font-semibold">Current CTC</TableHead>
                  <TableHead className="font-semibold">Expected CTC</TableHead>
                  <TableHead className="font-semibold">Notice</TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>City</span>
                    </div>
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold">Comment</TableHead>
                  <TableHead className="min-w-[200px] font-semibold">Notes</TableHead>
                  <TableHead className="font-semibold">Stage</TableHead>
                  {isSuperAdmin && <TableHead className="font-semibold">Added By</TableHead>}
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((candidate) => (
                  <TableRow key={candidate.id} className="group hover:bg-accent/40 transition-colors">
                    <TableCell className="sticky left-0 z-10 bg-card group-hover:bg-accent/40 transition-colors">
                      <Checkbox
                        checked={selectedCandidates.has(candidate.id)}
                        onCheckedChange={(checked) => handleSelectCandidate(candidate.id, checked as boolean)}
                        className="border-muted-foreground/50"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap sticky left-[50px] z-10 bg-card group-hover:bg-accent/40 transition-colors">
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-muted/50">
                        {candidate.date_of_sharing 
                          ? new Date(candidate.date_of_sharing).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium sticky left-[150px] z-10 bg-card group-hover:bg-accent/40 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground whitespace-nowrap">{candidate.full_name}</span>
                        {candidate.gender && (
                          <span className="text-xs text-muted-foreground mt-0.5 capitalize">{candidate.gender}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] sticky left-[280px] z-10 bg-card group-hover:bg-accent/40 transition-colors sticky-shadow-right">
                      <div className="text-sm space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="break-all text-muted-foreground hover:text-foreground transition-colors">{candidate.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">{candidate.phone}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px] max-w-[180px]">
                      <span className="text-sm">{candidate.position_name || <span className="text-muted-foreground/50">—</span>}</span>
                    </TableCell>
                    <TableCell className="min-w-[120px] max-w-[180px]">
                      <span className="text-sm">{candidate.client_name || <span className="text-muted-foreground/50">—</span>}</span>
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[150px]">
                      <span className="text-sm">{candidate.qualification || <span className="text-muted-foreground/50">—</span>}</span>
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[150px]">
                      {candidate.industry ? (
                        <Badge variant="secondary" className="font-normal text-xs">{candidate.industry}</Badge>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[150px]">
                      <span className="text-sm">{candidate.designation || <span className="text-muted-foreground/50">—</span>}</span>
                    </TableCell>
                    <TableCell className="min-w-[100px] max-w-[150px]">
                      {candidate.company ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">{candidate.company}</span>
                        </div>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[100px]">
                      {candidate.experience ? (
                        <Badge variant="outline" className="font-normal text-xs bg-primary/5">{candidate.experience}</Badge>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[120px]">
                      <span className="text-sm font-medium">{candidate.current_ctc || <span className="text-muted-foreground/50 font-normal">—</span>}</span>
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[120px]">
                      <span className="text-sm font-medium text-primary">{candidate.expected_ctc || <span className="text-muted-foreground/50 font-normal">—</span>}</span>
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[120px]">
                      {candidate.notice_period ? (
                        <Badge variant="secondary" className="font-normal text-xs">{candidate.notice_period}</Badge>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="min-w-[80px] max-w-[120px]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{candidate.city}</span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[300px] align-top">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed text-muted-foreground cursor-default">
                              {candidate.comment 
                                ? candidate.comment.length > 100 
                                  ? candidate.comment.substring(0, 100) + "..." 
                                  : candidate.comment 
                                : <span className="text-muted-foreground/50">—</span>}
                            </div>
                          </TooltipTrigger>
                          {candidate.comment && candidate.comment.length > 100 && (
                            <TooltipContent side="top" className="max-w-[300px] whitespace-pre-wrap">
                              {candidate.comment}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="min-w-[200px] max-w-[300px] align-top">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed text-muted-foreground cursor-default">
                              {candidate.notes 
                                ? candidate.notes.length > 100 
                                  ? candidate.notes.substring(0, 100) + "..." 
                                  : candidate.notes 
                                : <span className="text-muted-foreground/50">—</span>}
                            </div>
                          </TooltipTrigger>
                          {candidate.notes && candidate.notes.length > 100 && (
                            <TooltipContent side="top" className="max-w-[300px] whitespace-pre-wrap">
                              {candidate.notes}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${STAGE_VARIANTS[candidate.stage]} font-medium shadow-sm`}>
                        {candidate.stage}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="min-w-[100px] max-w-[150px]">
                        <div className="flex items-center gap-1.5">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {candidate.profiles?.full_name || "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {candidate.resume_url && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => {
                                      setSelectedResumeUrl(candidate.resume_url);
                                      setResumeDialogOpen(true);
                                    }}
                                  >
                                    <FileText className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Resume</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                    onClick={() => handleDownloadResume(candidate.resume_url!, candidate.full_name)}
                                    disabled={downloadingResume}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download Resume</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => { setEditingCandidate(candidate); setDialogOpen(true); }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Candidate</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {isSuperAdmin && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => handleDelete(candidate.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Candidate</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && filteredCandidates.length > 0 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.ceil(filteredCandidates.length / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  if (index > 0 && array[index - 1] !== page - 1) {
                    return (
                      <>
                        <PaginationItem key={`ellipsis-${page}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      </>
                    );
                  }
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}

              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredCandidates.length / itemsPerPage), p + 1))}
                  className={currentPage >= Math.ceil(filteredCandidates.length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download Resume</DialogTitle>
            <DialogDescription>
              Click the button below to download the candidate's resume
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <FileText className="h-16 w-16 text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              {selectedResumeUrl && filteredCandidates.find(c => c.resume_url === selectedResumeUrl)?.full_name}'s Resume
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setResumeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedResumeUrl) {
                  const candidate = filteredCandidates.find(c => c.resume_url === selectedResumeUrl);
                  if (candidate) {
                    handleDownloadResume(selectedResumeUrl, candidate.full_name);
                    setResumeDialogOpen(false);
                  }
                }
              }}
              disabled={downloadingResume}
            >
              {downloadingResume ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Resume
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
