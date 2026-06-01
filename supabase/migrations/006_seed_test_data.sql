-- ======================================
-- SEED TEST DATA
-- Created: 2. März 2026
-- ======================================
-- Passwort für alle Testbenutzer: testtest

-- ======================================
-- 0. CLEANUP (Optional - Auskommentieren wenn nicht gewünscht)
-- ======================================

-- DELETE FROM public.chat_messages;
-- DELETE FROM public.mentorship_materials;
-- DELETE FROM public.mentorship_relations;
-- DELETE FROM public.mentorship_requests;
-- DELETE FROM public.mentorship_listings;
-- DELETE FROM public.mentor_skills;
-- DELETE FROM public.profiles WHERE email LIKE '%@test.zap.ch';
-- DELETE FROM auth.users WHERE email LIKE '%@test.zap.ch';

-- ======================================
-- 1. SUBJECTS (Fallback falls nicht vorhanden)
-- ======================================

INSERT INTO public.subjects (id, name, thumbnail_url) VALUES
  (1, 'Mathematik', NULL),
  (2, 'Deutsch', NULL),
  (3, 'Französisch', NULL),
  (4, 'NMG', NULL)
ON CONFLICT (id) DO NOTHING;

-- ======================================
-- 2. TEST USERS (20 Total: 2 Lehrpersonen, 18 Schüler)
-- ======================================
-- Passwort "testtest" als bcrypt Hash

DO $$
DECLARE
  -- Lehrpersonen UUIDs
  teacher1_id UUID := 'a1111111-1111-1111-1111-111111111111';
  teacher2_id UUID := 'a2222222-2222-2222-2222-222222222222';
  
  -- Schüler UUIDs
  student1_id UUID := 'b1111111-1111-1111-1111-111111111111';
  student2_id UUID := 'b2222222-2222-2222-2222-222222222222';
  student3_id UUID := 'b3333333-3333-3333-3333-333333333333';
  student4_id UUID := 'b4444444-4444-4444-4444-444444444444';
  student5_id UUID := 'b5555555-5555-5555-5555-555555555555';
  student6_id UUID := 'b6666666-6666-6666-6666-666666666666';
  student7_id UUID := 'b7777777-7777-7777-7777-777777777777';
  student8_id UUID := 'b8888888-8888-8888-8888-888888888888';
  student9_id UUID := 'b9999999-9999-9999-9999-999999999999';
  student10_id UUID := 'ba000000-0000-0000-0000-000000000000';
  student11_id UUID := 'bb000000-0000-0000-0000-000000000000';
  student12_id UUID := 'bc000000-0000-0000-0000-000000000000';
  student13_id UUID := 'bd000000-0000-0000-0000-000000000000';
  student14_id UUID := 'be000000-0000-0000-0000-000000000000';
  student15_id UUID := 'bf000000-0000-0000-0000-000000000000';
  student16_id UUID := 'c0000000-0000-0000-0000-000000000000';
  student17_id UUID := 'c1000000-0000-0000-0000-000000000000';
  student18_id UUID := 'c2000000-0000-0000-0000-000000000000';
  
  -- bcrypt hash für "testtest" (cost 10)
  pwd_hash TEXT := '$2a$10$PwPLu5LKGxwxGZJFLsB2qOBHBYSxHZLzJfPLcq5LchQJHLHZl.Tli';
  
BEGIN
  -- ======================================
  -- 2.1 auth.users (Supabase Auth Tabelle)
  -- ======================================
  
  -- Lehrpersonen
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (teacher1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'maria.schneider@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (teacher2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'thomas.mueller@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;
  
  -- Schüler
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  VALUES
    (student1_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'anna.weber@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lukas.meier@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student3_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emma.huber@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student4_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'noah.keller@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student5_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mia.fischer@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student6_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leon.schmid@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student7_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sofia.bauer@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student8_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ben.gerber@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student9_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'lena.wolf@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student10_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tim.steiner@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student11_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'laura.brunner@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student12_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jan.moser@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student13_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nina.frei@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student14_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'david.roth@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student15_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'julia.graf@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student16_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'felix.baumann@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student17_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.zimmermann@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', ''),
    (student18_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'max.kunz@test.zap.ch', pwd_hash, NOW(), NOW(), NOW(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING;

  -- ======================================
  -- 2.2 profiles (Anwendungs-Profile)
  -- ======================================
  
  -- Lehrpersonen Profile
  INSERT INTO public.profiles (id, email, first_name, last_name, role, class_level, created_at)
  VALUES
    (teacher1_id, 'maria.schneider@test.zap.ch', 'Maria', 'Schneider', 'lehrperson', NULL, NOW()),
    (teacher2_id, 'thomas.mueller@test.zap.ch', 'Thomas', 'Müller', 'lehrperson', NULL, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role;
  
  -- Schüler Profile
  INSERT INTO public.profiles (id, email, first_name, last_name, role, class_level, created_at)
  VALUES
    (student1_id, 'anna.weber@test.zap.ch', 'Anna', 'Weber', 'user', '6. Klasse', NOW()),
    (student2_id, 'lukas.meier@test.zap.ch', 'Lukas', 'Meier', 'user', '6. Klasse', NOW()),
    (student3_id, 'emma.huber@test.zap.ch', 'Emma', 'Huber', 'user', '5. Klasse', NOW()),
    (student4_id, 'noah.keller@test.zap.ch', 'Noah', 'Keller', 'user', '6. Klasse', NOW()),
    (student5_id, 'mia.fischer@test.zap.ch', 'Mia', 'Fischer', 'user', '5. Klasse', NOW()),
    (student6_id, 'leon.schmid@test.zap.ch', 'Leon', 'Schmid', 'user', '6. Klasse', NOW()),
    (student7_id, 'sofia.bauer@test.zap.ch', 'Sofia', 'Bauer', 'user', '5. Klasse', NOW()),
    (student8_id, 'ben.gerber@test.zap.ch', 'Ben', 'Gerber', 'user', '6. Klasse', NOW()),
    (student9_id, 'lena.wolf@test.zap.ch', 'Lena', 'Wolf', 'user', '5. Klasse', NOW()),
    (student10_id, 'tim.steiner@test.zap.ch', 'Tim', 'Steiner', 'user', '6. Klasse', NOW()),
    (student11_id, 'laura.brunner@test.zap.ch', 'Laura', 'Brunner', 'user', '5. Klasse', NOW()),
    (student12_id, 'jan.moser@test.zap.ch', 'Jan', 'Moser', 'user', '6. Klasse', NOW()),
    (student13_id, 'nina.frei@test.zap.ch', 'Nina', 'Frei', 'user', '5. Klasse', NOW()),
    (student14_id, 'david.roth@test.zap.ch', 'David', 'Roth', 'user', '6. Klasse', NOW()),
    (student15_id, 'julia.graf@test.zap.ch', 'Julia', 'Graf', 'user', '5. Klasse', NOW()),
    (student16_id, 'felix.baumann@test.zap.ch', 'Felix', 'Baumann', 'user', '6. Klasse', NOW()),
    (student17_id, 'sarah.zimmermann@test.zap.ch', 'Sarah', 'Zimmermann', 'user', '5. Klasse', NOW()),
    (student18_id, 'max.kunz@test.zap.ch', 'Max', 'Kunz', 'user', '6. Klasse', NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    class_level = EXCLUDED.class_level;

END $$;

-- ======================================
-- 3. INTENSIVKURSE - Lehrer zuordnen
-- ======================================
-- Update bestehende Kurse mit Lehrer-Namen (Falls Kurse schon vorhanden)

UPDATE public.intensivwoche_kurse SET lehrer = 'Maria Schneider' WHERE fach = 'mathematik';
UPDATE public.intensivwoche_kurse SET lehrer = 'Thomas Müller' WHERE fach IN ('deutsch', 'franzoesisch');

-- ======================================
-- 4. MENTORSHIP LISTINGS (Inserate)
-- ======================================

-- 4.1 OFFER Listings (Lehrpersonen bieten Mentoring an)
-- Hinweis: subject_ids wird leer gelassen, da Fach im Titel/Beschreibung steht
INSERT INTO public.mentorship_listings (
  id, author_id, type, title, description, subject_ids, class_levels, 
  max_mentees, current_mentees, availability, status, created_at
) VALUES
-- Maria Schneider bietet Mathe-Mentoring
(
  'd1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- teacher1
  'OFFER',
  'Mathematik-Mentoring für ZAP-Vorbereitung',
  'Ich biete individuelle Unterstützung in Mathematik an. Schwerpunkte: Algebra, Geometrie und Textaufgaben. Wöchentliche Treffen mit Hausaufgaben-Check und Prüfungsvorbereitung.',
  ARRAY[]::UUID[],
  ARRAY['5. Klasse', '6. Klasse'],
  3, 1, 'Montag und Mittwoch, 16-18 Uhr',
  'ACTIVE', NOW() - INTERVAL '5 days'
),
-- Thomas Müller bietet Deutsch-Mentoring
(
  'd2222222-2222-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222', -- teacher2
  'OFFER',
  'Deutsch-Coaching: Aufsätze & Grammatik',
  'Professionelle Hilfe beim Schreiben von Aufsätzen, Grammatik und Rechtschreibung. Texte werden korrigiert und besprochen.',
  ARRAY[]::UUID[],
  ARRAY['6. Klasse'],
  4, 2, 'Dienstag und Donnerstag, 15-17 Uhr',
  'ACTIVE', NOW() - INTERVAL '7 days'
);

-- 4.2 REQUEST Listings (Schüler suchen Mentor)
INSERT INTO public.mentorship_listings (
  id, author_id, type, title, description, subject_ids, class_levels,
  status, created_at
) VALUES
-- Anna sucht Mathe-Hilfe
(
  'd3333333-3333-3333-3333-333333333333',
  'b1111111-1111-1111-1111-111111111111', -- student1
  'REQUEST',
  'Suche Hilfe in Mathematik 📐',
  'Ich habe Schwierigkeiten mit Bruchrechnen und Prozenten. Suche jemanden, der mir das geduldig erklären kann.',
  ARRAY[]::UUID[],
  ARRAY['6. Klasse'],
  'ACTIVE', NOW() - INTERVAL '3 days'
),
-- Lukas sucht Deutsch-Hilfe
(
  'd4444444-4444-4444-4444-444444444444',
  'b2222222-2222-2222-2222-222222222222', -- student2
  'REQUEST',
  'Brauche Unterstützung bei Aufsätzen',
  'Mir fällt es schwer, strukturierte Aufsätze zu schreiben. Wäre dankbar für Tipps und Korrekturen!',
  ARRAY[]::UUID[],
  ARRAY['6. Klasse'],
  'ACTIVE', NOW() - INTERVAL '2 days'
),
-- Emma sucht NMG-Hilfe  
(
  'd5555555-5555-5555-5555-555555555555',
  'b3333333-3333-3333-3333-333333333333', -- student3
  'REQUEST',
  'NMG: Wer kann mir helfen?',
  'Geschichte und Geografie sind nicht meine Stärke. Suche jemanden zum gemeinsamen Lernen.',
  ARRAY[]::UUID[],
  ARRAY['5. Klasse'],
  'ACTIVE', NOW() - INTERVAL '1 day'
);

-- ======================================
-- 5. MENTORSHIP REQUESTS (Anfragen)
-- ======================================

-- 5.1 Pending Requests (Offene Anfragen)
INSERT INTO public.mentorship_requests (
  id, listing_id, requester_id, target_id, message, status, created_at
) VALUES
-- Noah fragt bei Maria (Mathe-Offer) an
(
  'e1111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111', -- Marias Mathe-Offer
  'b4444444-4444-4444-4444-444444444444', -- Noah
  'a1111111-1111-1111-1111-111111111111', -- Maria
  'Hallo Frau Schneider, ich würde gerne bei Ihnen Mathe-Unterstützung bekommen. Ich habe besonders Mühe mit Geometrie.',
  'PENDING',
  NOW() - INTERVAL '1 day'
),
-- Mia fragt bei Annas Gesuch an (als potentieller Peer-Mentor)
(
  'e2222222-2222-2222-2222-222222222222',
  'd3333333-3333-3333-3333-333333333333', -- Annas Mathe-Request
  'b5555555-5555-5555-5555-555555555555', -- Mia
  'b1111111-1111-1111-1111-111111111111', -- Anna
  'Hey Anna! Ich bin auch in der 5. Klasse und könnte dir vielleicht helfen. Bruchrechnen kann ich gut!',
  'PENDING',
  NOW() - INTERVAL '12 hours'
),
-- Leon fragt bei Thomas (Deutsch-Offer) an
(
  'e3333333-3333-3333-3333-333333333333',
  'd2222222-2222-2222-2222-222222222222', -- Thomas Deutsch-Offer
  'b6666666-6666-6666-6666-666666666666', -- Leon
  'a2222222-2222-2222-2222-222222222222', -- Thomas
  'Guten Tag Herr Müller, ich möchte meine Aufsätze verbessern. Können Sie mir helfen?',
  'PENDING',
  NOW() - INTERVAL '6 hours'
);

-- ======================================
-- 6. MENTORSHIP RELATIONS (Aktive Beziehungen)
-- ======================================

-- Bereits verbundene Mentor-Mentee Paare
INSERT INTO public.mentorship_relations (
  id, mentor_id, mentee_id, original_listing_id, status, started_at
) VALUES
-- Maria mentort Sofia (aus ihrem Mathe-Offer)
(
  'f1111111-1111-1111-1111-111111111111',
  'a1111111-1111-1111-1111-111111111111', -- Maria (Mentor)
  'b7777777-7777-7777-7777-777777777777', -- Sofia (Mentee)
  'd1111111-1111-1111-1111-111111111111', -- Ursprüngliches Listing
  'ACTIVE',
  NOW() - INTERVAL '14 days'
),
-- Thomas mentort Ben (aus seinem Deutsch-Offer)
(
  'f2222222-2222-2222-2222-222222222222',
  'a2222222-2222-2222-2222-222222222222', -- Thomas (Mentor)
  'b8888888-8888-8888-8888-888888888888', -- Ben (Mentee)
  'd2222222-2222-2222-2222-222222222222', -- Ursprüngliches Listing
  'ACTIVE',
  NOW() - INTERVAL '10 days'
),
-- Thomas mentort Lena (aus seinem Deutsch-Offer)
(
  'f3333333-3333-3333-3333-333333333333',
  'a2222222-2222-2222-2222-222222222222', -- Thomas (Mentor)
  'b9999999-9999-9999-9999-999999999999', -- Lena (Mentee)
  'd2222222-2222-2222-2222-222222222222', -- Ursprüngliches Listing
  'ACTIVE',
  NOW() - INTERVAL '8 days'
);

-- ======================================
-- 7. MENTOR SKILLS (Lehrerkompetenzen)
-- ======================================
-- Hinweis: mentor_skills.subject_id erwartet UUID, aber subjects.id ist bigint
-- Diese Tabelle kann erst befüllt werden, wenn das Schema konsistent ist.
-- Alternativ kann subjects auf UUID umgestellt werden.

-- Auskommentiert wegen Typ-Inkompatibilität:
-- INSERT INTO public.mentor_skills (mentor_id, subject_id, class_levels, years_experience, description) ...

-- ======================================
-- 8. VERIFICATION
-- ======================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SEED DATA VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Users created: %', (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@test.zap.ch');
  RAISE NOTICE 'Profiles created: %', (SELECT COUNT(*) FROM public.profiles WHERE email LIKE '%@test.zap.ch');
  RAISE NOTICE 'Lehrpersonen: %', (SELECT COUNT(*) FROM public.profiles WHERE role = 'lehrperson' AND email LIKE '%@test.zap.ch');
  RAISE NOTICE 'Schüler: %', (SELECT COUNT(*) FROM public.profiles WHERE role = 'user' AND email LIKE '%@test.zap.ch');
  RAISE NOTICE 'Mentorship Listings: %', (SELECT COUNT(*) FROM public.mentorship_listings);
  RAISE NOTICE 'Mentorship Requests: %', (SELECT COUNT(*) FROM public.mentorship_requests);
  RAISE NOTICE 'Mentorship Relations: %', (SELECT COUNT(*) FROM public.mentorship_relations);
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Login-Daten:';
  RAISE NOTICE 'Email: maria.schneider@test.zap.ch (Lehrperson)';
  RAISE NOTICE 'Email: thomas.mueller@test.zap.ch (Lehrperson)';
  RAISE NOTICE 'Email: anna.weber@test.zap.ch (Schüler)';
  RAISE NOTICE 'Email: lukas.meier@test.zap.ch (Schüler)';
  RAISE NOTICE 'Passwort für alle: testtest';
  RAISE NOTICE '========================================';
END $$;
