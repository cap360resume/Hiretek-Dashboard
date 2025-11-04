-- Add new columns to candidates table
ALTER TABLE public.candidates 
ADD COLUMN position_name text,
ADD COLUMN client_name text,
ADD COLUMN qualification text,
ADD COLUMN industry text;