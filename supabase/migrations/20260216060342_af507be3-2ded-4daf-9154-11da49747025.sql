-- Allow super admins to delete stage history
CREATE POLICY "Super admins can delete stage history"
ON public.stage_history
FOR DELETE
USING (is_super_admin(auth.uid()));

-- Allow sub admins to delete their own candidates' stage history
CREATE POLICY "Sub admins can delete their candidates stage history"
ON public.stage_history
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM candidates
  WHERE candidates.id = stage_history.candidate_id
  AND candidates.created_by = auth.uid()
));