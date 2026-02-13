// Centralized recruitment pipeline configuration with parent-child stage grouping
// Flow: Screening → Interview → Documentation → Offer → Joining → Closed/Dropouts

export interface StageConfig {
  label: string;
  color: string;
  parentGroup: string;
}

export interface PipelineGroup {
  label: string;
  emoji: string;
  color: string;
  stages: string[];
}

// Pipeline groups in flow order
export const PIPELINE_GROUPS: PipelineGroup[] = [
  {
    label: "Screening",
    emoji: "🟦",
    color: "hsl(200, 70%, 50%)",
    stages: ["Screening", "CV On Hold", "CV Shared", "CV Not Relevant", "Duplicate", "Not Interested"],
  },
  {
    label: "Interview",
    emoji: "🟨",
    color: "hsl(45, 80%, 50%)",
    stages: ["Interview Scheduled", "Interview", "Round 1", "Round 2", "Round 3", "Selected", "Rejected", "Backout", "On Hold"],
  },
  {
    label: "Documentation",
    emoji: "🟧",
    color: "hsl(25, 85%, 55%)",
    stages: ["Documents Requested", "Documents Shared", "Documents Verified"],
  },
  {
    label: "Offer",
    emoji: "🟩",
    color: "hsl(140, 60%, 45%)",
    stages: ["Offer Discussion", "Offer Pending Approval", "Offer Pending", "Offer Released", "Offer", "Offer Accepted", "Offer Rejected"],
  },
  {
    label: "Joining",
    emoji: "🟪",
    color: "hsl(270, 60%, 55%)",
    stages: ["Joining Pending", "Joined"],
  },
  {
    label: "Closed / Dropouts",
    emoji: "⛔",
    color: "hsl(0, 50%, 50%)",
    stages: ["Rejected", "Backout", "Not Interested"],
  },
];

// Flat list of ALL stages in pipeline order (unique)
export const ALL_STAGES: string[] = (() => {
  const seen = new Set<string>();
  const result: string[] = [];
  PIPELINE_GROUPS.forEach((group) => {
    group.stages.forEach((stage) => {
      if (!seen.has(stage)) {
        seen.add(stage);
        result.push(stage);
      }
    });
  });
  return result;
})();

// Stage to parent group mapping (first occurrence wins)
export const STAGE_TO_GROUP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  PIPELINE_GROUPS.forEach((group) => {
    group.stages.forEach((stage) => {
      if (!map[stage]) {
        map[stage] = group.label;
      }
    });
  });
  return map;
})();

// Color mapping for each individual stage
export const STAGE_COLORS: Record<string, string> = {
  // Screening group
  Screening: "hsl(200, 70%, 50%)",
  "CV On Hold": "hsl(200, 50%, 60%)",
  "CV Shared": "hsl(174, 72%, 46%)",
  "CV Not Relevant": "hsl(0, 30%, 60%)",
  Duplicate: "hsl(0, 0%, 55%)",
  "Not Interested": "hsl(0, 0%, 55%)",

  // Interview group
  "Interview Scheduled": "hsl(45, 80%, 50%)",
  Interview: "hsl(280, 60%, 55%)",
  "Round 1": "hsl(45, 93%, 47%)",
  "Round 2": "hsl(120, 60%, 50%)",
  "Round 3": "hsl(180, 60%, 45%)",
  Selected: "hsl(142, 70%, 45%)",
  Rejected: "hsl(0, 70%, 50%)",
  Backout: "hsl(30, 80%, 50%)",
  "On Hold": "hsl(45, 80%, 50%)",

  // Documentation group
  "Documents Requested": "hsl(25, 75%, 55%)",
  "Documents Shared": "hsl(25, 85%, 50%)",
  "Documents Verified": "hsl(25, 90%, 45%)",

  // Offer group
  "Offer Discussion": "hsl(140, 50%, 50%)",
  "Offer Pending Approval": "hsl(25, 95%, 53%)",
  "Offer Pending": "hsl(25, 95%, 53%)",
  "Offer Released": "hsl(140, 55%, 45%)",
  Offer: "hsl(140, 60%, 45%)",
  "Offer Accepted": "hsl(142, 70%, 40%)",
  "Offer Rejected": "hsl(0, 60%, 50%)",

  // Joining group
  "Joining Pending": "hsl(270, 50%, 55%)",
  Joined: "hsl(150, 70%, 40%)",

  // Legacy
  Hired: "hsl(160, 70%, 40%)",
};

// Badge variant classes for each stage
export const STAGE_VARIANTS: Record<string, string> = {
  // Screening group
  Screening: "bg-blue-500/10 text-blue-600 border-blue-500",
  "CV On Hold": "bg-blue-400/10 text-blue-500 border-blue-400",
  "CV Shared": "bg-teal-500/10 text-teal-600 border-teal-500",
  "CV Not Relevant": "bg-red-300/10 text-red-400 border-red-300",
  Duplicate: "bg-muted text-muted-foreground border-muted",
  "Not Interested": "bg-muted text-muted-foreground border-muted",

  // Interview group
  "Interview Scheduled": "bg-yellow-500/10 text-yellow-600 border-yellow-500",
  Interview: "bg-purple-500/10 text-purple-600 border-purple-500",
  "Round 1": "bg-yellow-500/10 text-yellow-600 border-yellow-500",
  "Round 2": "bg-green-500/10 text-green-600 border-green-500",
  "Round 3": "bg-teal-500/10 text-teal-600 border-teal-500",
  Selected: "bg-emerald-500/10 text-emerald-600 border-emerald-500",
  Rejected: "bg-red-500/10 text-red-600 border-red-500",
  Backout: "bg-orange-500/10 text-orange-600 border-orange-500",
  "On Hold": "bg-amber-500/10 text-amber-600 border-amber-500",

  // Documentation group
  "Documents Requested": "bg-orange-400/10 text-orange-500 border-orange-400",
  "Documents Shared": "bg-orange-500/10 text-orange-600 border-orange-500",
  "Documents Verified": "bg-orange-600/10 text-orange-700 border-orange-600",

  // Offer group
  "Offer Discussion": "bg-green-500/10 text-green-600 border-green-500",
  "Offer Pending Approval": "bg-amber-500/10 text-amber-600 border-amber-500",
  "Offer Pending": "bg-amber-500/10 text-amber-600 border-amber-500",
  "Offer Released": "bg-green-600/10 text-green-700 border-green-600",
  Offer: "bg-green-500/10 text-green-600 border-green-500",
  "Offer Accepted": "bg-emerald-600/10 text-emerald-700 border-emerald-600",
  "Offer Rejected": "bg-red-500/10 text-red-600 border-red-500",

  // Joining group
  "Joining Pending": "bg-purple-500/10 text-purple-600 border-purple-500",
  Joined: "bg-emerald-600/10 text-emerald-700 border-emerald-600",

  // Legacy
  Hired: "bg-emerald-500/10 text-emerald-600 border-emerald-500",
};

// Stages considered "active pipeline" (not closed/terminal)
export const ACTIVE_PIPELINE_STAGES = [
  "Screening", "CV On Hold", "CV Shared",
  "Interview Scheduled", "Interview", "Round 1", "Round 2", "Round 3", "Selected",
  "Documents Requested", "Documents Shared", "Documents Verified",
  "Offer Discussion", "Offer Pending Approval", "Offer Pending", "Offer Released", "Offer", "Offer Accepted",
  "Joining Pending",
];

// Terminal/closed stages
export const CLOSED_STAGES = ["Hired", "Joined", "Rejected", "Backout", "Not Interested", "Duplicate", "CV Not Relevant", "Offer Rejected"];

// Stages that need urgent attention
export const URGENT_STAGES = ["Interview Scheduled", "Interview", "Round 1", "Round 2", "Round 3", "Offer Pending", "Offer Pending Approval", "Offer Discussion", "Offer"];

// Stages that need follow-up
export const FOLLOW_UP_STAGES = ["CV Shared", "Screening", "On Hold", "Documents Requested", "CV On Hold", "Joining Pending"];

// Action suggestions per stage for day planner
export const STAGE_ACTIONS: Record<string, string> = {
  Screening: "Review profile & schedule call",
  "CV On Hold": "Review CV status & decide",
  "CV Shared": "Follow up with client",
  "CV Not Relevant": "Archive",
  Duplicate: "Review & merge",
  "Not Interested": "Archive",
  "Interview Scheduled": "Confirm interview details",
  Interview: "Prepare & follow up",
  "Round 1": "Check feedback & schedule R2",
  "Round 2": "Follow up on results",
  "Round 3": "Await final decision",
  Selected: "Initiate documentation",
  Rejected: "Archive",
  Backout: "Find replacement",
  "On Hold": "Re-engage when ready",
  "Documents Requested": "Follow up on documents",
  "Documents Shared": "Verify documents",
  "Documents Verified": "Move to offer stage",
  "Offer Discussion": "Negotiate terms",
  "Offer Pending Approval": "Chase offer approval",
  "Offer Pending": "Chase offer letter",
  "Offer Released": "Follow up on acceptance",
  Offer: "Negotiate & close",
  "Offer Accepted": "Schedule joining date",
  "Offer Rejected": "Re-negotiate or close",
  "Joining Pending": "Confirm joining date",
  Joined: "Confirm joining",
  Hired: "Onboarding follow-up",
};

// Success stages for conversion rate
export const SUCCESS_STAGES = ["Hired", "Joined", "Offer Accepted"];
