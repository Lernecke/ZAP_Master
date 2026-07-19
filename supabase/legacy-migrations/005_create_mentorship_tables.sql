-- ======================================
-- MENTORSHIP SYSTEM - Phase 1 MVP
-- Created: 2. März 2026
-- ======================================

-- ======================================
-- MENTOR SKILLS (MVP: Selbstdeklaration)
-- ======================================

CREATE TABLE IF NOT EXISTS public.mentor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_levels TEXT[] NOT NULL DEFAULT '{}',
  
  -- Zusatzinfo
  years_experience INTEGER,
  description TEXT,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(mentor_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_skills_mentor ON public.mentor_skills(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_skills_subject ON public.mentor_skills(subject_id);

-- ======================================
-- MENTORSHIP LISTINGS (Inserate)
-- ======================================

CREATE TABLE IF NOT EXISTS public.mentorship_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('OFFER', 'REQUEST')),
  
  -- Content
  title TEXT NOT NULL,
  description TEXT,
  subject_ids UUID[] NOT NULL DEFAULT '{}',
  class_levels TEXT[] NOT NULL DEFAULT '{}',
  
  -- Kapazität (nur für OFFER)
  max_mentees INTEGER,
  current_mentees INTEGER DEFAULT 0,
  availability TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'DRAFT' 
    CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED')),
  is_featured BOOLEAN DEFAULT FALSE,
  
  -- Zeitmanagement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listings_author ON public.mentorship_listings(author_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.mentorship_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_type ON public.mentorship_listings(type);

-- Volltext-Index für Suche
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.mentorship_listings 
  USING gin(to_tsvector('german', title || ' ' || COALESCE(description, '')));

-- ======================================
-- MENTORSHIP REQUESTS (Anfragen)
-- ======================================

CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.mentorship_listings(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Nachricht
  message TEXT,
  response_message TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  responded_at TIMESTAMPTZ,
  
  -- Zeitmanagement
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Verhindert Doppel-Anfragen
  UNIQUE(listing_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_requests_listing ON public.mentorship_requests(listing_id);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON public.mentorship_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_requests_target ON public.mentorship_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.mentorship_requests(status);

-- ======================================
-- MENTORSHIP RELATIONS (Aktive Beziehungen)
-- ======================================

CREATE TABLE IF NOT EXISTS public.mentorship_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Ursprung
  original_request_id UUID REFERENCES public.mentorship_requests(id),
  original_listing_id UUID REFERENCES public.mentorship_listings(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'PAUSED', 'ENDED')),
  ended_reason TEXT,
  
  -- Statistiken (wird durch Trigger aktualisiert)
  materials_submitted INTEGER DEFAULT 0,
  materials_corrected INTEGER DEFAULT 0,
  
  -- Zeitstempel
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  -- Ein Mentee kann nur eine aktive Beziehung pro Mentor haben
  UNIQUE(mentor_id, mentee_id)
);

CREATE INDEX IF NOT EXISTS idx_relations_mentor ON public.mentorship_relations(mentor_id);
CREATE INDEX IF NOT EXISTS idx_relations_mentee ON public.mentorship_relations(mentee_id);
CREATE INDEX IF NOT EXISTS idx_relations_status ON public.mentorship_relations(status);

-- ======================================
-- MENTORSHIP MATERIALS (Material-Hub)
-- ======================================

CREATE TABLE IF NOT EXISTS public.mentorship_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Zuordnung
  relation_id UUID NOT NULL REFERENCES public.mentorship_relations(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Inhalt
  type TEXT NOT NULL DEFAULT 'OTHER'
    CHECK (type IN ('ESSAY', 'WORKSHEET', 'HOMEWORK', 'OTHER')),
  title TEXT NOT NULL,
  description TEXT,
  
  -- Dateien (Supabase Storage)
  file_urls TEXT[] NOT NULL DEFAULT '{}',
  file_types TEXT[] NOT NULL DEFAULT '{}',
  
  -- Workflow-Status
  status TEXT NOT NULL DEFAULT 'SUBMITTED'
    CHECK (status IN ('SUBMITTED', 'IN_REVIEW', 'CORRECTED', 'RETURNED')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  corrected_at TIMESTAMPTZ,
  
  -- Korrektur/Feedback
  feedback TEXT,
  feedback_file_urls TEXT[],
  grade TEXT,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materials_relation ON public.mentorship_materials(relation_id);
CREATE INDEX IF NOT EXISTS idx_materials_uploader ON public.mentorship_materials(uploader_id);
CREATE INDEX IF NOT EXISTS idx_materials_assigned ON public.mentorship_materials(assigned_to);
CREATE INDEX IF NOT EXISTS idx_materials_status ON public.mentorship_materials(status);

-- ======================================
-- CHAT MESSAGES (Real-Time Chat)
-- ======================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Zuordnung
  relation_id UUID NOT NULL REFERENCES public.mentorship_relations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Inhalt
  content TEXT NOT NULL,
  attachment_urls TEXT[],
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chat_relation ON public.chat_messages(relation_id);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_created ON public.chat_messages(created_at DESC);

-- ======================================
-- TRIGGERS
-- ======================================

-- Updated_at Trigger für alle Tabellen
CREATE OR REPLACE FUNCTION update_mentorship_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_mentor_skills_updated_at ON public.mentor_skills;
CREATE TRIGGER update_mentor_skills_updated_at
    BEFORE UPDATE ON public.mentor_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_mentorship_updated_at();

DROP TRIGGER IF EXISTS update_mentorship_listings_updated_at ON public.mentorship_listings;
CREATE TRIGGER update_mentorship_listings_updated_at
    BEFORE UPDATE ON public.mentorship_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_mentorship_updated_at();

DROP TRIGGER IF EXISTS update_mentorship_materials_updated_at ON public.mentorship_materials;
CREATE TRIGGER update_mentorship_materials_updated_at
    BEFORE UPDATE ON public.mentorship_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_mentorship_updated_at();

-- ======================================
-- ROW LEVEL SECURITY
-- ======================================

-- Enable RLS on all tables
ALTER TABLE public.mentor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ======================================
-- MENTOR_SKILLS POLICIES
-- ======================================

-- SELECT: Alle Skills sind sichtbar (MVP: Selbstdeklaration)
CREATE POLICY "mentor_skills_select_all" ON public.mentor_skills
  FOR SELECT
  USING (true);

-- INSERT: Nur für eigenes Profil + role = 'teacher'
CREATE POLICY "mentor_skills_insert_own" ON public.mentor_skills
  FOR INSERT
  WITH CHECK (
    mentor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- UPDATE: Nur eigene Skills
CREATE POLICY "mentor_skills_update_own" ON public.mentor_skills
  FOR UPDATE
  USING (mentor_id = auth.uid())
  WITH CHECK (mentor_id = auth.uid());

-- DELETE: Nur eigene Skills
CREATE POLICY "mentor_skills_delete_own" ON public.mentor_skills
  FOR DELETE
  USING (mentor_id = auth.uid());

-- ======================================
-- MENTORSHIP_LISTINGS POLICIES
-- ======================================

-- SELECT: Aktive Listings öffentlich, Drafts nur für Autor
CREATE POLICY "listings_select_public_or_own" ON public.mentorship_listings
  FOR SELECT
  USING (
    status = 'ACTIVE'
    OR author_id = auth.uid()
  );

-- INSERT: Bidirektional - beide Rollen können Inserate erstellen
CREATE POLICY "listings_insert_own" ON public.mentorship_listings
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('teacher', 'student')
    )
  );

-- UPDATE: Nur eigene Listings
CREATE POLICY "listings_update_own" ON public.mentorship_listings
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: Nur eigene Listings
CREATE POLICY "listings_delete_own" ON public.mentorship_listings
  FOR DELETE
  USING (author_id = auth.uid());

-- ======================================
-- MENTORSHIP_REQUESTS POLICIES
-- ======================================

-- SELECT: Nur Requester oder Target
CREATE POLICY "requests_select_involved" ON public.mentorship_requests
  FOR SELECT
  USING (
    requester_id = auth.uid() 
    OR target_id = auth.uid()
  );

-- INSERT: Nur authentifizierte User als Requester
CREATE POLICY "requests_insert_as_requester" ON public.mentorship_requests
  FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND requester_id != target_id
  );

-- UPDATE: Target kann Status ändern, Requester kann canceln
CREATE POLICY "requests_update_involved" ON public.mentorship_requests
  FOR UPDATE
  USING (
    requester_id = auth.uid() 
    OR target_id = auth.uid()
  );

-- ======================================
-- MENTORSHIP_RELATIONS POLICIES
-- ======================================

-- SELECT: Nur Mentor oder Mentee
CREATE POLICY "relations_select_involved" ON public.mentorship_relations
  FOR SELECT
  USING (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
  );

-- INSERT: Wird via Server Action erstellt (service_role)
-- Fallback für direkte Inserts:
CREATE POLICY "relations_insert_involved" ON public.mentorship_relations
  FOR INSERT
  WITH CHECK (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
  );

-- UPDATE: Beide können Status ändern
CREATE POLICY "relations_update_involved" ON public.mentorship_relations
  FOR UPDATE
  USING (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
  );

-- ======================================
-- MENTORSHIP_MATERIALS POLICIES
-- ======================================

-- SELECT: Nur Uploader oder zugewiesener Mentor
CREATE POLICY "materials_select_involved" ON public.mentorship_materials
  FOR SELECT
  USING (
    uploader_id = auth.uid() 
    OR assigned_to = auth.uid()
  );

-- INSERT: Nur innerhalb einer aktiven Relation
CREATE POLICY "materials_insert_student" ON public.mentorship_materials
  FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = relation_id
      AND (mr.mentee_id = auth.uid() OR mr.mentor_id = auth.uid())
      AND mr.status = 'ACTIVE'
    )
  );

-- UPDATE: Mentor kann Feedback geben, Uploader kann Metadaten ändern
CREATE POLICY "materials_update_involved" ON public.mentorship_materials
  FOR UPDATE
  USING (
    uploader_id = auth.uid() 
    OR assigned_to = auth.uid()
  );

-- ======================================
-- CHAT_MESSAGES POLICIES
-- ======================================

-- SELECT: Nur Beteiligte der Relation
CREATE POLICY "chat_select_involved" ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = chat_messages.relation_id
      AND (mr.mentor_id = auth.uid() OR mr.mentee_id = auth.uid())
    )
  );

-- INSERT: Nur Beteiligte können Nachrichten senden
CREATE POLICY "chat_insert_involved" ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = relation_id
      AND (mr.mentor_id = auth.uid() OR mr.mentee_id = auth.uid())
      AND mr.status = 'ACTIVE'
    )
  );

-- UPDATE: Empfänger kann is_read setzen
CREATE POLICY "chat_update_read" ON public.chat_messages
  FOR UPDATE
  USING (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = relation_id
      AND (mr.mentor_id = auth.uid() OR mr.mentee_id = auth.uid())
    )
  );

-- ======================================
-- REALTIME PUBLICATION
-- ======================================

-- Enable Realtime für chat_messages (für Live-Chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ======================================
-- HELPER FUNCTIONS
-- ======================================

-- Funktion um Relation bei Accept zu erstellen
CREATE OR REPLACE FUNCTION public.accept_mentorship_request(request_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request RECORD;
  v_relation_id UUID;
  v_mentor_id UUID;
  v_mentee_id UUID;
BEGIN
  -- Request laden
  SELECT * INTO v_request 
  FROM public.mentorship_requests 
  WHERE id = request_id AND status = 'PENDING';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request nicht gefunden oder nicht mehr PENDING';
  END IF;
  
  -- Prüfen ob User der Target ist
  IF v_request.target_id != auth.uid() THEN
    RAISE EXCEPTION 'Nur der Target kann die Anfrage akzeptieren';
  END IF;
  
  -- Mentor/Mentee basierend auf Listing-Typ bestimmen
  SELECT type INTO STRICT v_request 
  FROM public.mentorship_listings 
  WHERE id = v_request.listing_id;
  
  IF v_request.type = 'OFFER' THEN
    -- Listing ist ein Angebot (Lehrer bietet an) → Requester ist Mentee
    v_mentor_id := v_request.target_id;
    v_mentee_id := v_request.requester_id;
  ELSE
    -- Listing ist ein Gesuch (Schüler sucht) → Requester ist Mentor
    v_mentor_id := v_request.requester_id;
    v_mentee_id := v_request.target_id;
  END IF;
  
  -- Relation erstellen
  INSERT INTO public.mentorship_relations (
    mentor_id, mentee_id, original_request_id, original_listing_id
  ) VALUES (
    v_mentor_id, v_mentee_id, request_id, v_request.listing_id
  ) RETURNING id INTO v_relation_id;
  
  -- Request Status updaten
  UPDATE public.mentorship_requests 
  SET status = 'ACCEPTED', responded_at = NOW()
  WHERE id = request_id;
  
  RETURN v_relation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
