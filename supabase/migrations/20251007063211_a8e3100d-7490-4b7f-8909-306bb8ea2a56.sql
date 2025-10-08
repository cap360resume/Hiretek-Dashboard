-- Add new fields to candidates table
ALTER TABLE public.candidates
ADD COLUMN designation text,
ADD COLUMN company text,
ADD COLUMN experience text,
ADD COLUMN current_ctc text,
ADD COLUMN expected_ctc text,
ADD COLUMN notice_period text,
ADD COLUMN comment text,
ADD COLUMN date_of_sharing date;