-- Drop the existing policy for users viewing their own roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create a more permissive policy that allows any authenticated user to view their own role
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);