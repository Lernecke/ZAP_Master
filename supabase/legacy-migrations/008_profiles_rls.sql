-- Migration 008: Row Level Security für profiles
-- Aktiviert RLS und definiert Policies für Self-Access und Admin-Zugriff.
-- INSERT und DELETE werden nicht via RLS abgesichert (beides läuft über den
-- Service-Role-Key in der Register-Action bzw. dem Admin-Panel).

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Eigenes Profil lesen
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Eigenes Profil aktualisieren
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins können alle Profile lesen
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins können alle Profile aktualisieren (z.B. Rollenänderung)
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
