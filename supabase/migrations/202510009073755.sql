-- First, drop the existing enum constraint
ALTER TABLE candidates ALTER COLUMN stage DROP DEFAULT;
ALTER TABLE candidates ALTER COLUMN stage TYPE text;

-- Drop the old enum type
DROP TYPE IF EXISTS candidate_stage CASCADE;

-- Create the new enum type with all stages
CREATE TYPE candidate_stage AS ENUM (
  'Screening',
  'Interview',
  'Offer',
  'Hired',
  'Rejected',
  'Backout',
  'On Hold',
  'Not Interested',
  'Duplicate',
  'Round 1',
  'Round 2',
  'Round 3'
);

-- Update the column to use the new enum type
ALTER TABLE candidates ALTER COLUMN stage TYPE candidate_stage USING stage::candidate_stage;
ALTER TABLE candidates ALTER COLUMN stage SET DEFAULT 'Screening'::candidate_stage;