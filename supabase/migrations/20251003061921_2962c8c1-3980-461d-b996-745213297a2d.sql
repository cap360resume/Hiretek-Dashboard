-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'sub_admin');

-- Create user roles table for role management
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create candidate stage enum
CREATE TYPE public.candidate_stage AS ENUM ('Screening', 'Interview', 'Offer', 'Hired', 'Rejected');

-- Create candidates table
CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  gender text,
  city text NOT NULL,
  resume_url text,
  stage candidate_stage NOT NULL DEFAULT 'Screening',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'super_admin')
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Super admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for candidates
CREATE POLICY "Sub admins can view their own candidates"
  ON public.candidates FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Super admins can view all candidates"
  ON public.candidates FOR SELECT
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Sub admins can insert their own candidates"
  ON public.candidates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Sub admins can update their own candidates"
  ON public.candidates FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Super admins can update all candidates"
  ON public.candidates FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete candidates"
  ON public.candidates FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false);

-- Storage policies for resumes
CREATE POLICY "Authenticated users can upload resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Super admins can view all resumes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes' AND public.is_super_admin(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_candidates_created_by ON public.candidates(created_by);
CREATE INDEX idx_candidates_stage ON public.candidates(stage);
CREATE INDEX idx_candidates_created_at ON public.candidates(created_at);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);