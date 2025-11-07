-- Add new stages to candidate_stage enum
ALTER TYPE candidate_stage ADD VALUE IF NOT EXISTS 'CV Shared';
ALTER TYPE candidate_stage ADD VALUE IF NOT EXISTS 'Joined';
ALTER TYPE candidate_stage ADD VALUE IF NOT EXISTS 'Offer Pending';
ALTER TYPE candidate_stage ADD VALUE IF NOT EXISTS 'CV Not Relevant';