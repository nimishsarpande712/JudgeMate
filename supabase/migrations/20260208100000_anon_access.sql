-- Allow anonymous (anon key) read/write access to teams and scores.
-- The app uses localStorage-based auth, not Supabase Auth, so the
-- supabase-js client operates as the `anon` role — not `authenticated`.

-- Teams: anon can SELECT and INSERT
CREATE POLICY "Anon can read teams"
  ON public.teams FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can insert teams"
  ON public.teams FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can update teams"
  ON public.teams FOR UPDATE TO anon USING (true);

-- Scores: anon can read (AI scores stored via edge function / dashboard)
CREATE POLICY "Anon can read scores"
  ON public.scores FOR SELECT TO anon USING (true);
