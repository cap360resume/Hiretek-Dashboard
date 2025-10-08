-- Create trigger for auto-creating profiles on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile for existing user
INSERT INTO public.profiles (id, email, full_name)
VALUES ('3d3c6f6c-1796-4e4f-84ef-b3e6bea7d3e5', 'rakesh.singh@hiretek.in', 'Rakesh')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;

-- Insert super_admin role for existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('3d3c6f6c-1796-4e4f-84ef-b3e6bea7d3e5', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;