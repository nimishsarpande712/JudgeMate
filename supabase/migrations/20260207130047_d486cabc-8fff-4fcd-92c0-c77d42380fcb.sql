
-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'judge');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles: users can read their own roles, admins can manage all
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-assign 'judge' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'judge');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'General',
  github_url TEXT,
  description TEXT,
  screenshot_urls TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read teams" ON public.teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert teams" ON public.teams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update teams" ON public.teams
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teams" ON public.teams
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Scores table
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  judge_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  innovation SMALLINT CHECK (innovation BETWEEN 1 AND 10),
  technical_feasibility SMALLINT CHECK (technical_feasibility BETWEEN 1 AND 10),
  impact SMALLINT CHECK (impact BETWEEN 1 AND 10),
  mvp_completeness SMALLINT CHECK (mvp_completeness BETWEEN 1 AND 10),
  presentation SMALLINT CHECK (presentation BETWEEN 1 AND 10),
  tech_stack SMALLINT CHECK (tech_stack BETWEEN 1 AND 10),
  team_collaboration SMALLINT CHECK (team_collaboration BETWEEN 1 AND 10),
  originality SMALLINT CHECK (originality BETWEEN 1 AND 10),
  weighted_total NUMERIC(5,2) GENERATED ALWAYS AS (
    innovation * 0.30 +
    technical_feasibility * 0.20 +
    impact * 0.20 +
    mvp_completeness * 0.10 +
    presentation * 0.05 +
    tech_stack * 0.05 +
    team_collaboration * 0.05 +
    originality * 0.05
  ) STORED,
  ai_explanations JSONB DEFAULT '{}',
  is_ai_generated BOOLEAN DEFAULT false,
  judge_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, judge_id)
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scores" ON public.scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Judges can insert own scores" ON public.scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = judge_id);

CREATE POLICY "Judges can update own scores" ON public.scores
  FOR UPDATE TO authenticated USING (auth.uid() = judge_id);

CREATE POLICY "Admins can manage all scores" ON public.scores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for scores and teams
ALTER PUBLICATION supabase_realtime ADD TABLE public.scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
