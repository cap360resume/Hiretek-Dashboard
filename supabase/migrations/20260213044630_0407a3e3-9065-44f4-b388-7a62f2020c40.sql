
-- Create stage_history table to track who changed stages and when
CREATE TABLE public.stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  old_stage TEXT NOT NULL,
  new_stage TEXT NOT NULL,
  changed_by UUID NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all history
CREATE POLICY "Super admins can view all stage history"
ON public.stage_history FOR SELECT
USING (is_super_admin(auth.uid()));

-- Sub admins can view history for their own candidates
CREATE POLICY "Sub admins can view their candidates stage history"
ON public.stage_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidates
    WHERE candidates.id = stage_history.candidate_id
    AND candidates.created_by = auth.uid()
  )
);

-- Super admins can insert history
CREATE POLICY "Super admins can insert stage history"
ON public.stage_history FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

-- Sub admins can insert history for their own candidates
CREATE POLICY "Sub admins can insert stage history"
ON public.stage_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.candidates
    WHERE candidates.id = stage_history.candidate_id
    AND candidates.created_by = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX idx_stage_history_candidate_id ON public.stage_history(candidate_id);
CREATE INDEX idx_stage_history_created_at ON public.stage_history(created_at DESC);
