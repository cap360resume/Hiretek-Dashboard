
-- Add new candidate stage values for the grouped pipeline
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'CV On Hold';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Interview Scheduled';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Selected';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Documents Requested';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Documents Shared';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Documents Verified';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Offer Discussion';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Offer Pending Approval';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Offer Released';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Offer Accepted';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Offer Rejected';
ALTER TYPE public.candidate_stage ADD VALUE IF NOT EXISTS 'Joining Pending';
