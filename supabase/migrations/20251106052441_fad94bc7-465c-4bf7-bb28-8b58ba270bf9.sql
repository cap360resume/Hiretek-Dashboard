-- Add DELETE policy for sub admins to delete their own candidates
CREATE POLICY "Sub admins can delete their own candidates"
ON public.candidates
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);
