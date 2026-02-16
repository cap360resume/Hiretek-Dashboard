import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, X, History, ChevronRight, UserCircle, MessageSquare, Trash2 } from "lucide-react";
import { z } from "zod";
import { ALL_STAGES, PIPELINE_GROUPS, STAGE_COLORS } from "@/lib/pipeline-config";
import { format } from "date-fns";

const candidateSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email").max(255, "Email too long"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone too long"),
  gender: z.string().optional(),
  city: z.string().trim().min(1, "City is required").max(100, "City too long"),
  stage: z.string().refine((val) => ALL_STAGES.includes(val), "Invalid stage"),
  notes: z.string().max(1000, "Notes too long").optional(),
  designation: z.string().max(100, "Designation too long").optional(),
  company: z.string().max(100, "Company too long").optional(),
  experience: z.string().max(50, "Experience too long").optional(),
  current_ctc: z.string().max(50, "Current CTC too long").optional(),
  expected_ctc: z.string().max(50, "Expected CTC too long").optional(),
  notice_period: z.string().max(50, "Notice period too long").optional(),
  comment: z.string().max(1000, "Comment too long").optional(),
  position_name: z.string().max(100, "Position name too long").optional(),
  client_name: z.string().max(100, "Client name too long").optional(),
  qualification: z.string().max(100, "Qualification too long").optional(),
  industry: z.string().max(100, "Industry too long").optional(),
});

interface CandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate?: any;
  onSuccess: () => void;
}

export default function CandidateDialog({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: CandidateDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [stageHistory, setStageHistory] = useState<Array<{
    id: string;
    old_stage: string;
    new_stage: string;
    changed_by: string;
    comment: string | null;
    created_at: string;
    changer_name?: string;
  }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    gender: "",
    city: "",
    stage: "Screening" as const,
    notes: "",
    designation: "",
    company: "",
    experience: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period: "",
    comment: "",
    position_name: "",
    client_name: "",
    qualification: "",
    industry: "",
  });
  const [dateOfSharing, setDateOfSharing] = useState<string>("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const DRAFT_KEY = "candidate_form_draft";

  // Load draft from localStorage
  useEffect(() => {
    if (open && !candidate) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        try {
          const parsedDraft = JSON.parse(draft);
          setFormData(parsedDraft.formData);
          setDateOfSharing(parsedDraft.dateOfSharing || "");
          toast.info("Draft loaded");
          setHasUnsavedChanges(true);
        } catch (e) {
          console.error("Failed to load draft:", e);
        }
      }
    }
  }, [open, candidate]);

  // Load stage history when editing a candidate
  useEffect(() => {
    if (open && candidate?.id) {
      loadStageHistory(candidate.id);
    } else {
      setStageHistory([]);
    }
  }, [open, candidate?.id]);

  const loadStageHistory = async (candidateId: string) => {
    setHistoryLoading(true);
    try {
      const { data: history } = await supabase
        .from("stage_history")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (history && history.length > 0) {
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
      console.error("Error loading stage history:", error);
      setStageHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (historyId: string) => {
    try {
      const { error } = await supabase.from("stage_history").delete().eq("id", historyId);
      if (error) throw error;
      setStageHistory((prev) => prev.filter((h) => h.id !== historyId));
      toast.success("History entry deleted");
    } catch (error) {
      console.error("Error deleting history:", error);
      toast.error("Failed to delete");
    }
  };

  useEffect(() => {
    if (candidate) {
      setFormData({
        full_name: candidate.full_name || "",
        email: candidate.email || "",
        phone: candidate.phone || "",
        gender: candidate.gender || "",
        city: candidate.city || "",
        stage: candidate.stage || "Screening",
        notes: candidate.notes || "",
        designation: candidate.designation || "",
        company: candidate.company || "",
        experience: candidate.experience || "",
        current_ctc: candidate.current_ctc || "",
        expected_ctc: candidate.expected_ctc || "",
        notice_period: candidate.notice_period || "",
        comment: candidate.comment || "",
        position_name: candidate.position_name || "",
        client_name: candidate.client_name || "",
        qualification: candidate.qualification || "",
        industry: candidate.industry || "",
      });
      setDateOfSharing(candidate.date_of_sharing || "");
      setHasUnsavedChanges(false);
    } else if (!open) {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        gender: "",
        city: "",
        stage: "Screening",
        notes: "",
        designation: "",
        company: "",
        experience: "",
        current_ctc: "",
        expected_ctc: "",
        notice_period: "",
        comment: "",
        position_name: "",
        client_name: "",
        qualification: "",
        industry: "",
      });
      setDateOfSharing("");
      setHasUnsavedChanges(false);
    }
    setResumeFile(null);
  }, [candidate, open]);

  // Save draft to localStorage whenever form data changes
  useEffect(() => {
    if (open && !candidate && formData.full_name) {
      const draft = {
        formData,
        dateOfSharing,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setHasUnsavedChanges(true);
    }
  }, [formData, dateOfSharing, open, candidate]);

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges && !candidate) {
      setShowCloseConfirm(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmClose = (saveData: boolean) => {
    if (!saveData) {
      localStorage.removeItem(DRAFT_KEY);
      setHasUnsavedChanges(false);
    }
    setShowCloseConfirm(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const validatedData = candidateSchema.parse(formData);

      let resumeUrl = candidate?.resume_url || null;

      // Upload resume if provided
      if (resumeFile) {
        const fileExt = resumeFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(fileName, resumeFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("resumes")
          .getPublicUrl(fileName);

        resumeUrl = urlData.publicUrl;
        
        // Check for duplicate resume
        const { data: existingCandidates, error: checkError } = await supabase
          .from("candidates")
          .select("id, full_name, email")
          .eq("resume_url", resumeUrl)
          .neq("id", candidate?.id || "");
        
        if (checkError) {
          console.error("Error checking for duplicates:", checkError);
        }
        
        if (existingCandidates && existingCandidates.length > 0) {
          const duplicate = existingCandidates[0];
          toast.warning(`Resume already exists for candidate: ${duplicate.full_name} (${duplicate.email})`);
        }
      }

      // Check for duplicate email - only for new candidates or when email is changed
      console.log("Candidate ID for duplicate check:", candidate?.id, "Full candidate:", candidate);
      
      let emailQuery = supabase
        .from("candidates")
        .select("id, full_name, email")
        .eq("email", validatedData.email);
      
      if (candidate?.id) {
        console.log("Excluding candidate ID from duplicate check:", candidate.id);
        emailQuery = emailQuery.neq("id", candidate.id);
      }
      
      const { data: emailDuplicates } = await emailQuery;
      console.log("Email duplicates found:", emailDuplicates);
      
      if (emailDuplicates && emailDuplicates.length > 0) {
        const duplicate = emailDuplicates[0];
        toast.error(`Email already exists for candidate: ${duplicate.full_name} (${duplicate.email})`);
        setLoading(false);
        return;
      }

      // Check for duplicate phone - only for new candidates or when phone is changed
      let phoneQuery = supabase
        .from("candidates")
        .select("id, full_name, phone")
        .eq("phone", validatedData.phone);
      
      if (candidate?.id) {
        phoneQuery = phoneQuery.neq("id", candidate.id);
      }
      
      const { data: phoneDuplicates } = await phoneQuery;
      
      if (phoneDuplicates && phoneDuplicates.length > 0) {
        const duplicate = phoneDuplicates[0];
        toast.error(`Phone number already exists for candidate: ${duplicate.full_name} (${duplicate.phone})`);
        setLoading(false);
        return;
      }

      const candidateData = {
        full_name: validatedData.full_name,
        email: validatedData.email,
        phone: validatedData.phone,
        gender: validatedData.gender,
        city: validatedData.city,
        stage: validatedData.stage as any,
        notes: validatedData.notes,
        designation: validatedData.designation,
        company: validatedData.company,
        experience: validatedData.experience,
        current_ctc: validatedData.current_ctc,
        expected_ctc: validatedData.expected_ctc,
        notice_period: validatedData.notice_period,
        comment: validatedData.comment,
        position_name: validatedData.position_name,
        client_name: validatedData.client_name,
        qualification: validatedData.qualification,
        industry: validatedData.industry,
        date_of_sharing: dateOfSharing || null,
        resume_url: resumeUrl,
        created_by: user.id,
      };

      if (candidate) {
        const oldStage = candidate.stage;
        const { error } = await supabase
          .from("candidates")
          .update(candidateData)
          .eq("id", candidate.id);

        if (error) throw error;

        // Log stage change if stage was modified
        if (oldStage !== validatedData.stage) {
          await supabase.from("stage_history").insert({
            candidate_id: candidate.id,
            old_stage: oldStage,
            new_stage: validatedData.stage,
            changed_by: user.id,
            comment: validatedData.comment || null,
          });
        }

        toast.success("Candidate updated successfully");
      } else {
        const { error } = await supabase.from("candidates").insert([candidateData]);

        if (error) throw error;
        toast.success("Candidate added successfully");
        // Clear draft after successful submission
        localStorage.removeItem(DRAFT_KEY);
        setHasUnsavedChanges(false);
      }

      onSuccess();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error saving candidate:", error);
        toast.error("Failed to save candidate");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent 
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => {
            e.preventDefault();
            handleCloseAttempt();
          }}
        >
        <DialogHeader>
          <DialogTitle>{candidate ? "Edit Candidate" : "Add New Candidate"}</DialogTitle>
          <DialogDescription>
            {candidate ? "Update candidate information" : "Enter candidate details below"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Stage *</Label>
              <Select value={formData.stage} onValueChange={(value: any) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger id="stage">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_name">Position Name</Label>
              <Input
                id="position_name"
                value={formData.position_name}
                onChange={(e) => setFormData({ ...formData, position_name: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Qualification</Label>
              <Input
                id="qualification"
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g., B.Tech, MBA"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., IT, Finance"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                placeholder="e.g., 5 years"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_ctc">Current CTC</Label>
              <Input
                id="current_ctc"
                value={formData.current_ctc}
                onChange={(e) => setFormData({ ...formData, current_ctc: e.target.value })}
                placeholder="e.g., 10 LPA"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_ctc">Expected CTC</Label>
              <Input
                id="expected_ctc"
                value={formData.expected_ctc}
                onChange={(e) => setFormData({ ...formData, expected_ctc: e.target.value })}
                placeholder="e.g., 15 LPA"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice_period">Notice Period</Label>
              <Input
                id="notice_period"
                value={formData.notice_period}
                onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                placeholder="e.g., 30 days"
                maxLength={50}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_sharing">Date of Sharing</Label>
            <Input
              id="date_of_sharing"
              type="date"
              value={dateOfSharing}
              onChange={(e) => setDateOfSharing(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resume">Resume (PDF/DOC)</Label>
            <div className="flex gap-2">
              <Input
                id="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="flex-1"
              />
              {resumeFile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setResumeFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {candidate?.resume_url && !resumeFile && (
              <p className="text-xs text-muted-foreground">Current resume uploaded</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Stage History */}
          {candidate && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Stage Change History</Label>
              </div>
              {historyLoading ? (
                <p className="text-xs text-muted-foreground text-center py-3">Loading history...</p>
              ) : stageHistory.length > 0 ? (
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2 pr-2">
                    {stageHistory.map((entry) => (
                      <div key={entry.id} className="p-3 rounded-lg border bg-muted/30 text-sm space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entry.old_stage !== entry.new_stage ? (
                              <>
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
                              </>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">💬 Comment added</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.created_at), "MMM dd, hh:mm a")}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteHistory(entry.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
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
                <p className="text-xs text-muted-foreground text-center py-3">No stage changes recorded yet</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseAttempt}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {candidate ? "Update" : "Add"} Candidate
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Would you like to save them as a draft or discard them?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleConfirmClose(false)}>
            Discard
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => handleConfirmClose(true)}>
            Save Draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
