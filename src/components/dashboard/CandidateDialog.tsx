import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { z } from "zod";

const STAGES = ["Screening", "Interview", "Offer", "Hired", "Rejected", "Backout", "On Hold", "Not Interested", "Duplicate", "Round 1", "Round 2", "Round 3"];

const candidateSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email").max(255, "Email too long"),
  phone: z.string().trim().min(1, "Phone is required").max(20, "Phone too long"),
  gender: z.string().optional(),
  city: z.string().trim().min(1, "City is required").max(100, "City too long"),
  stage: z.enum(["Screening", "Interview", "Offer", "Hired", "Rejected", "Backout", "On Hold", "Not Interested", "Duplicate", "Round 1", "Round 2", "Round 3"]),
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
    } else {
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
    }
    setResumeFile(null);
  }, [candidate, open]);

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
      }

      const candidateData = {
        full_name: validatedData.full_name,
        email: validatedData.email,
        phone: validatedData.phone,
        gender: validatedData.gender,
        city: validatedData.city,
        stage: validatedData.stage,
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
        const { error } = await supabase
          .from("candidates")
          .update(candidateData)
          .eq("id", candidate.id);

        if (error) throw error;
        toast.success("Candidate updated successfully");
      } else {
        const { error } = await supabase.from("candidates").insert([candidateData]);

        if (error) throw error;
        toast.success("Candidate added successfully");
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  {STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
  );
}