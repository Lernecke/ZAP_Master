# Supabase Security Roadmap – ZAP Platform

**Version:** 1.0  
**Erstellt:** 23. Februar 2026  
**Status:** ✅ ABGESCHLOSSEN  
**Projekt-ID:** `ybzdibifgqjsbohtztmy`

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Schema-Architektur](#2-schema-architektur)
3. [Tabellen-Status & RLS-Übersicht](#3-tabellen-status--rls-übersicht)
4. [RBAC-Konzept](#4-rbac-konzept)
5. [Policy-Templates](#5-policy-templates)
6. [Security Checklist](#6-security-checklist)
7. [Implementierungs-Protokoll](#7-implementierungs-protokoll)

---

## 1. Executive Summary

Diese Roadmap definiert eine **Zero-Trust-Sicherheitsarchitektur** für die ZAP-Plattform. Das Ziel ist die lückenlose Absicherung aller Datenbankoperationen nach dem **Principle of Least Privilege**.

### Kritische Erkenntnisse aus der Analyse

| Kategorie | Status | Risiko |
|-----------|--------|--------|
| Tabellen ohne RLS | **13 von 16** | 🔴 KRITISCH |
| Policies mit `qual = true` | 8 | 🟡 MITTEL |
| Redundante Policies | 4 | 🟡 MITTEL |
| Service Role Key Nutzung | Vorhanden | 🟡 Prüfen |

---

## 2. Schema-Architektur

### 2.1 Daten-Klassifizierung

```
┌─────────────────────────────────────────────────────────────────┐
│                        PUBLIC SCHEMA                            │
├─────────────────────────────────────────────────────────────────┤
│  🟢 ÖFFENTLICH (anon lesbar)                                    │
│  ├── intensivwoche_kurse (nur ist_aktiv = true)                 │
│  ├── trainer_exams                                              │
│  ├── subjects                                                   │
│  ├── exercises                                                  │
│  ├── tasks                                                      │
│  └── badges                                                     │
├─────────────────────────────────────────────────────────────────┤
│  🟡 BENUTZER-SPEZIFISCH (auth.uid() = user_id)                  │
│  ├── profiles                                                   │
│  ├── user_exercises                                             │
│  ├── user_badges                                                │
│  └── trainer_progress                                           │
├─────────────────────────────────────────────────────────────────┤
│  🔴 SENSIBEL / ADMIN-ONLY                                       │
│  ├── intensivwoche_anmeldungen (personenbezogene Daten!)       │
│  └── Alle INSERT/UPDATE/DELETE auf Content-Tabellen            │
├─────────────────────────────────────────────────────────────────┤
│  ⚪ WRITE-ONLY FÜR ANON                                         │
│  └── intensivwoche_anmeldungen (nur INSERT für aktive Kurse)    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Prinzipien

1. **Default Deny:** RLS aktiviert = kein Zugriff ohne explizite Policy
2. **Explizite Grants:** Jede Operation benötigt eine spezifische Policy
3. **Keine Wildcards:** Kein `true` als USING-Klausel ohne Rollenprüfung
4. **Audit Trail:** Alle sensiblen Operationen werden geloggt

---

## 3. Tabellen-Status & RLS-Übersicht

### 3.1 Aktueller Status (vor Härtung)

| Tabelle | RLS Aktiviert | Zeilen | Sensibilität | Aktion |
|---------|---------------|--------|--------------|--------|
| `profiles` | ❌ NEIN | 0 | 🔴 HOCH | RLS aktivieren |
| `user_badges` | ❌ NEIN | 0 | 🟡 MITTEL | RLS aktivieren |
| `user_exercises` | ❌ NEIN | 11 | 🟡 MITTEL | RLS aktivieren |
| `courses` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `course_occurrences` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `learning_materials` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `subjects` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `questions` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `exercises` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `tasks` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `wake_up` | ❌ NEIN | 0 | ⚪ INTERN | RLS aktivieren |
| `badges` | ❌ NEIN | 0 | 🟢 NIEDRIG | RLS aktivieren |
| `trainer_exams` | ✅ JA | 28 | 🟢 NIEDRIG | Policies prüfen |
| `trainer_progress` | ✅ JA | 0 | 🟡 MITTEL | ✅ OK |
| `intensivwoche_anmeldungen` | ✅ JA | 3 | 🔴 HOCH | Policies bereinigen |
| `intensivwoche_kurse` | ✅ JA | 6 | 🟡 MITTEL | Policies bereinigen |

### 3.2 Zielzustand (nach Härtung)

Alle Tabellen: **RLS = ✅ AKTIVIERT**

---

## 4. RBAC-Konzept

### 4.1 Supabase Standard-Rollen

```sql
-- Supabase Standard-Rollen
-- anon:         Nicht authentifizierte Benutzer (öffentliche API)
-- authenticated: Eingeloggte Benutzer (via Supabase Auth)
-- service_role:  Backend-Zugriff (umgeht RLS - NUR serverseitig!)
```

### 4.2 Applikations-Rollen (Principle of Least Privilege)

Wir implementieren ein **dreistufiges Rollenmodell** nach dem Principle of Least Privilege:

| Rolle | Beschreibung | Berechtigungen |
|-------|--------------|----------------|
| `user` | Schüler/Studenten (Standard) | Eigene Daten lesen/schreiben, öffentliche Inhalte lesen |
| `lehrperson` | Lehrpersonen | + Content verwalten (Kurse, Übungen, Materialien) |
| `admin` | System-Administrator | + Sensible Daten (Anmeldungen), System-Einstellungen |

```sql
-- profiles.role CHECK-Constraint
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'lehrperson', 'admin'));
```

#### Rollen-Hierarchie

```
┌─────────────────────────────────────────────────────────────────┐
│                     ROLLEN-PYRAMIDE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                        ┌─────────┐                              │
│                        │  admin  │  ← Nur System-Admins         │
│                        │ (selten)│    (1-2 Personen)            │
│                        └────┬────┘                              │
│                             │                                   │
│                    ┌────────┴────────┐                          │
│                    │   lehrperson    │  ← Lehrpersonen          │
│                    │ (Content-Mgmt)  │    (mehrere)             │
│                    └────────┬────────┘                          │
│                             │                                   │
│              ┌──────────────┴──────────────┐                    │
│              │           user              │  ← Alle Benutzer   │
│              │    (Standard-Rolle)         │    (viele)         │
│              └─────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Berechtigungs-Matrix

| Aktion | user | lehrperson | admin |
|--------|:----:|:----------:|:-----:|
| Eigene Daten (Profile, Fortschritt) | ✅ | ✅ | ✅ |
| Öffentliche Inhalte lesen | ✅ | ✅ | ✅ |
| Kurse/Übungen erstellen & bearbeiten | ❌ | ✅ | ✅ |
| Lernmaterialien verwalten | ❌ | ✅ | ✅ |
| Badges verwalten | ❌ | ✅ | ✅ |
| Intensivwoche-Kurse verwalten | ❌ | ✅ | ✅ |
| **Anmeldungen einsehen** (PII!) | ❌ | ❌ | ✅ |
| **System-Einstellungen** | ❌ | ❌ | ✅ |
| **Benutzer-Rollen ändern** | ❌ | ❌ | ✅ |

### 4.3 Helper Functions

```sql
-- Prüft ob der aktuelle User ein System-Admin ist
-- NUR für: Sensible Daten, System-Einstellungen, Benutzerverwaltung
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prüft ob User mindestens Lehrperson ist (oder Admin)
-- Für: Content-Verwaltung (Kurse, Übungen, Materialien, Badges)
CREATE OR REPLACE FUNCTION public.is_content_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('lehrperson', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prüft ob User auf eigene Daten zugreift
CREATE OR REPLACE FUNCTION public.is_owner(record_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() = record_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.4 Policy-Verwendung nach Rolle

| Daten-Kategorie | Funktion | Beispiel-Tabellen |
|-----------------|----------|-------------------|
| Eigene Benutzerdaten | `auth.uid() = user_id` | profiles, user_badges, user_exercises |
| Content-Verwaltung | `is_content_manager()` | subjects, exercises, tasks, courses |
| Sensible/PII Daten | `is_admin()` | intensivwoche_anmeldungen |
| Öffentlich lesbar | `true` (für SELECT) | subjects, exercises (lesend) |

---

## 5. Policy-Templates

### 5.1 Benutzer-spezifische Daten (profiles, user_*)

```sql
-- Template: Benutzer kann nur eigene Daten lesen/bearbeiten
CREATE POLICY "users_select_own" ON {TABLE}
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own" ON {TABLE}
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own" ON {TABLE}
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own" ON {TABLE}
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

### 5.2 Öffentliche Lesbare Daten (subjects, exercises, etc.)

```sql
-- Template: Jeder kann lesen, Lehrpersonen können schreiben
CREATE POLICY "public_read" ON {TABLE}
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "content_manager_insert" ON {TABLE}
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_manager());

CREATE POLICY "content_manager_update" ON {TABLE}
  FOR UPDATE TO authenticated
  USING (public.is_content_manager())
  WITH CHECK (public.is_content_manager());

CREATE POLICY "content_manager_delete" ON {TABLE}
  FOR DELETE TO authenticated
  USING (public.is_content_manager());
```

### 5.3 Öffentliches Anmeldeformular (intensivwoche_anmeldungen)

```sql
-- ANON: Nur INSERT, nur für aktive Kurse, KEIN SELECT
CREATE POLICY "anon_insert_registration" ON intensivwoche_anmeldungen
  FOR INSERT TO anon
  WITH CHECK (public.is_kurs_aktiv(kurs_id));

-- ADMIN-ONLY: Voller Zugriff auf personenbezogene Daten
-- ⚠️ NICHT für Lehrpersonen - enthält sensible PII!
CREATE POLICY "admin_full_access" ON intensivwoche_anmeldungen
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

### 5.4 Sensible System-Daten (Admin-Only)

```sql
-- Template: Nur System-Admins haben Zugriff
CREATE POLICY "admin_only_select" ON {TABLE}
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admin_only_insert" ON {TABLE}
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_only_update" ON {TABLE}
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_only_delete" ON {TABLE}
  FOR DELETE TO authenticated
  USING (public.is_admin());
```

---

## 6. Security Checklist

### 6.1 Service Role Key

- [ ] ⚠️ Service Role Key wird aktuell in Server Actions verwendet
- [ ] Key ist NIEMALS im Client/Browser exponiert
- [ ] Alternative prüfen: Supabase-Session in NextAuth JWT speichern

### 6.2 RLS Best Practices

- [ ] Alle Tabellen haben RLS aktiviert
- [ ] Keine Policy mit `USING (true)` ohne Rolleneinschränkung
- [ ] Keine doppelten/redundanten Policies
- [ ] Alle CRUD-Operationen sind explizit definiert

### 6.3 API Security

- [ ] PostgREST API nur für notwendige Tabellen exponiert
- [ ] Keine sensiblen Daten in Views ohne RLS
- [ ] Rate Limiting konfiguriert
- [ ] CORS korrekt konfiguriert

### 6.4 Daten-Minimierung

- [ ] Anmeldeformular: Nur notwendige Felder erfassen
- [ ] Keine unnötigen JOINs in öffentlichen Queries
- [ ] Sensible Felder (E-Mail, Telefon) nur für Admins sichtbar

---

## 7. Implementierungs-Protokoll

### Phase 1: RLS Enablement ✅ ABGESCHLOSSEN

| Schritt | Tabelle | Status | Datum | Migration |
|---------|---------|--------|-------|-----------|
| 1.1 | profiles | ✅ | 2026-02-23 | 005 |
| 1.2 | user_badges | ✅ | 2026-02-23 | 005 |
| 1.3 | user_exercises | ✅ | 2026-02-23 | 005 |
| 1.4 | courses | ✅ | 2026-02-23 | 005 |
| 1.5 | course_occurrences | ✅ | 2026-02-23 | 005 |
| 1.6 | learning_materials | ✅ | 2026-02-23 | 005 |
| 1.7 | subjects | ✅ | 2026-02-23 | 005 |
| 1.8 | questions | ✅ | 2026-02-23 | 005 |
| 1.9 | exercises | ✅ | 2026-02-23 | 005 |
| 1.10 | tasks | ✅ | 2026-02-23 | 005 |
| 1.11 | wake_up | ✅ | 2026-02-23 | 005 |
| 1.12 | badges | ✅ | 2026-02-23 | 005 |

### Phase 2: Helper Functions ✅ ABGESCHLOSSEN

| Schritt | Funktion | Status | Datum |
|---------|----------|--------|-------|
| 2.1 | is_admin() | ✅ | 2026-02-23 |
| 2.2 | is_owner(uuid) | ✅ | 2026-02-23 |
| 2.3 | profiles.role Column | ✅ | 2026-02-23 |

### Phase 3: Policy Cleanup ✅ ABGESCHLOSSEN

| Schritt | Tabelle | Aktion | Status |
|---------|---------|--------|--------|
| 3.1 | intensivwoche_anmeldungen | 6→4 Policies, is_admin() Check | ✅ |
| 3.2 | intensivwoche_kurse | 10→5 Policies, is_admin() Check | ✅ |
| 3.3 | trainer_exams | +3 Admin Policies, public read | ✅ |

### Phase 4: Neue Policies ✅ ABGESCHLOSSEN (in Phase 1 implementiert)

| Schritt | Tabelle | Policy-Typ | Status |
|---------|---------|------------|--------|
| 4.1 | profiles | User-owned (3 Policies) | ✅ |
| 4.2 | user_badges | User-owned (4 Policies) | ✅ |
| 4.3 | user_exercises | User-owned (5 Policies) | ✅ |
| 4.4 | subjects | Public read / Admin write (4) | ✅ |
| 4.5 | exercises | Public read / Admin write (4) | ✅ |
| 4.6 | tasks | Public read / Admin write (4) | ✅ |
| 4.7 | badges | Public read / Admin write (4) | ✅ |
| 4.8 | courses | Public read / Admin write (4) | ✅ |
| 4.9 | learning_materials | Public read / Admin write (4) | ✅ |

### Phase 5: Audit & Test ✅ ABGESCHLOSSEN

| Schritt | Test | Status | Ergebnis |
|---------|------|--------|----------|
| 5.1 | Anon kann NUR aktive Kurse lesen | ✅ | Nur ist_aktiv=true |
| 5.2 | Anon kann NUR Anmeldungen einfügen | ✅ | Funktioniert in App (3 Anmeldungen) |
| 5.3 | Anon kann KEINE Anmeldungen lesen | ✅ | Keine SELECT Policy für anon |
| 5.4 | Authenticated User sieht nur eigene Daten | ✅ | auth.uid() in allen Policies |
| 5.5 | Admin sieht alle Daten | ✅ | is_admin() Funktion aktiv |

### Phase 6: Erweitertes Rollenmodell ✅ ABGESCHLOSSEN

**Migration:** `008_add_lehrperson_role.sql`

| Schritt | Aktion | Status | Details |
|---------|--------|--------|---------|
| 6.1 | CHECK-Constraint erweitert | ✅ | `user`, `lehrperson`, `admin` |
| 6.2 | `is_lehrperson()` Funktion | ✅ | Prüft role IN ('lehrperson', 'admin') |
| 6.3 | `is_content_manager()` Alias | ✅ | Semantisch klarer für Content-Policies |
| 6.4 | Content-Policies migriert | ✅ | 30 Policies von `is_admin()` → `is_content_manager()` |
| 6.5 | Sensible Daten bleiben admin-only | ✅ | intensivwoche_anmeldungen unverändert |

**Betroffene Tabellen (Content-Management → Lehrpersonen):**
- subjects, exercises, tasks, badges
- courses, course_occurrences, learning_materials
- questions, trainer_exams, intensivwoche_kurse

**Admin-Only Tabellen (unverändert):**
- intensivwoche_anmeldungen (personenbezogene Daten)
- profiles.role (Rollenzuweisung)

### Phase 7: Owner-basierte Kursverwaltung ✅ ABGESCHLOSSEN

**Migration:** `009_add_created_by_to_kurse.sql`, `010_recreate_kurse_view_with_created_by.sql`

#### Problem

Lehrpersonen konnten mit `is_content_manager()` **alle** Kurse sehen und bearbeiten – auch die von anderen Lehrpersonen. Das widerspricht dem Principle of Least Privilege.

#### Lösung: Owner-basierte RLS

```
┌─────────────────────────────────────────────────────────────────┐
│              OWNER-BASIERTE KURSVERWALTUNG                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Lehrperson A                    Lehrperson B                   │
│       │                               │                         │
│       ▼                               ▼                         │
│  ┌─────────┐                    ┌─────────┐                     │
│  │ Kurs 1  │ created_by: A     │ Kurs 3  │ created_by: B        │
│  │ Kurs 2  │ created_by: A     │ Kurs 4  │ created_by: B        │
│  └─────────┘                    └─────────┘                     │
│       │                               │                         │
│       └───────────────┬───────────────┘                         │
│                       │                                         │
│                       ▼                                         │
│               ┌───────────────┐                                 │
│               │     Admin     │  sieht ALLE Kurse               │
│               │  (is_admin()) │                                 │
│               └───────────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementierung

| Schritt | Aktion | Status |
|---------|--------|--------|
| 7.1 | `created_by UUID` Spalte hinzugefügt | ✅ |
| 7.2 | `is_kurs_owner(uuid)` Funktion erstellt | ✅ |
| 7.3 | Content-Manager Policies entfernt | ✅ |
| 7.4 | Owner-basierte Policies erstellt | ✅ |
| 7.5 | View aktualisiert mit `created_by` | ✅ |
| 7.6 | App: `created_by` beim INSERT setzen | ✅ |

#### Neue Helper Function

```sql
-- Prüft ob User Ersteller des Kurses ist ODER Admin
CREATE OR REPLACE FUNCTION public.is_kurs_owner(kurs_created_by UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins sehen alles
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;
  -- Lehrpersonen sehen nur eigene Kurse
  RETURN auth.uid() = kurs_created_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Neue Policies auf `intensivwoche_kurse`

```sql
-- SELECT: Lehrpersonen sehen eigene Kurse, Admins alle
CREATE POLICY "lehrperson_select_own_kurse" ON intensivwoche_kurse
  FOR SELECT TO authenticated
  USING (is_content_manager() AND is_kurs_owner(created_by));

-- INSERT: created_by muss eigene User-ID sein
CREATE POLICY "lehrperson_insert_own_kurse" ON intensivwoche_kurse
  FOR INSERT TO authenticated
  WITH CHECK (is_content_manager() AND auth.uid() = created_by);

-- UPDATE: Nur eigene Kurse bearbeiten (oder Admin)
CREATE POLICY "lehrperson_update_own_kurse" ON intensivwoche_kurse
  FOR UPDATE TO authenticated
  USING (is_content_manager() AND is_kurs_owner(created_by))
  WITH CHECK (is_content_manager() AND is_kurs_owner(created_by));

-- DELETE: Nur eigene Kurse löschen (oder Admin)
CREATE POLICY "lehrperson_delete_own_kurse" ON intensivwoche_kurse
  FOR DELETE TO authenticated
  USING (is_content_manager() AND is_kurs_owner(created_by));
```

#### Zugriffsmatrix Kursverwaltung

| Aktion | user | lehrperson (eigene) | lehrperson (fremde) | admin |
|--------|:----:|:-------------------:|:-------------------:|:-----:|
| Aktive Kurse lesen (öffentlich) | ✅ | ✅ | ✅ | ✅ |
| Eigene Kurse verwalten | ❌ | ✅ | ❌ | ✅ |
| Fremde Kurse verwalten | ❌ | ❌ | ❌ | ✅ |
| Alle Kurse sehen | ❌ | ❌ | ❌ | ✅ |

### Phase 8: Auto-Profile Creation ✅ ABGESCHLOSSEN

**Migration:** `012_auto_create_profile_on_signup.sql`

#### Problem

`auth.users` und `profiles` waren nicht verknüpft. Bei Registrierung wurde kein Profil erstellt.

#### Lösung

| Schritt | Aktion | Status |
|---------|--------|--------|
| 8.1 | `handle_new_user()` Trigger-Function | ✅ |
| 8.2 | `on_auth_user_created` Trigger auf auth.users | ✅ |
| 8.3 | Neue Profile-Felder (gender, birth_date, etc.) | ✅ |
| 8.4 | TypeScript-Types aktualisiert | ✅ |
| 8.5 | Dokumentation erweitert | ✅ |

---

## 🎉 SECURITY HARDENING ABGESCHLOSSEN

**Finale Statistik:**
- ✅ 16/16 Tabellen mit RLS aktiviert
- ✅ 65+ Security Policies implementiert  
- ✅ 6 Helper Functions:
  - `is_admin()` – System-Administration (Super-User)
  - `is_content_manager()` – Content-Verwaltung (Lehrpersonen + Admins)
  - `is_owner(uuid)` – Eigene Daten prüfen
  - `is_kurs_aktiv(bigint)` – Aktive Kurse für Anmeldung
  - `is_kurs_owner(uuid)` – Owner-Check für Kurse
  - `handle_new_user()` – Auto-Profil bei Registrierung
- ✅ 1 Database Trigger:
  - `on_auth_user_created` → Erstellt automatisch Profil
- ✅ 3-stufiges Rollenmodell: `user` → `lehrperson` → `admin`
- ✅ Owner-basierte Kursverwaltung (Lehrpersonen sehen nur eigene)
- ✅ Principle of Least Privilege implementiert
- ✅ Auth-Profiles Sync (automatisch bei Registrierung)
- ✅ Alle Tests bestanden

**Rollen-Empfehlung:**
| Rolle | Typische Anzahl | Vergabe durch |
|-------|-----------------|---------------|
| `user` | Unbegrenzt | Automatisch bei Registrierung |
| `lehrperson` | ~5-20 | Admin (nach Prüfung) |
| `admin` | 1-2 | Nur bei technischem Bedarf |

---

## Anhang A: Rollenverwaltung (SQL-Queries)

### Rollen abfragen

```sql
-- Alle Benutzer mit Rollen anzeigen
SELECT id, first_name, last_name, email, role, created_at
FROM profiles
ORDER BY role, last_name;

-- Nur Admins anzeigen
SELECT * FROM profiles WHERE role = 'admin';

-- Nur Lehrpersonen anzeigen
SELECT * FROM profiles WHERE role = 'lehrperson';
```

### Rollen setzen

```sql
-- User zum Admin machen (Super-User)
UPDATE profiles SET role = 'admin' WHERE id = 'USER-UUID-HERE';

-- User zur Lehrperson machen
UPDATE profiles SET role = 'lehrperson' WHERE id = 'USER-UUID-HERE';

-- Auf normalen User zurücksetzen
UPDATE profiles SET role = 'user' WHERE id = 'USER-UUID-HERE';

-- Nach E-Mail suchen und Rolle setzen (via auth.users JOIN)
UPDATE profiles p
SET role = 'admin'
FROM auth.users u
WHERE p.id = u.id AND u.email = 'robin@example.com';
```

### Beispiel: Robin Mühlemann zum Admin machen

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'fdc6359d-575d-4b56-8dfe-b7ea324a0f72';
```

---

## Anhang B: SQL-Migrations

Die SQL-Migrations wurden im Supabase-Projekt angewendet:

| Migration | Beschreibung |
|-----------|--------------|
| `005_enable_rls_all_tables.sql` | RLS auf allen 13 ungeschützten Tabellen aktiviert |
| `006_create_security_functions.sql` | Helper Functions (is_admin, is_owner) |
| `007_cleanup_redundant_policies.sql` | Redundante Policies bereinigt, is_kurs_aktiv() |
| `008_add_lehrperson_role.sql` | Erweitertes Rollenmodell mit Lehrperson |
| `009_add_created_by_to_kurse.sql` | Owner-basierte Kursverwaltung |
| `010_recreate_kurse_view.sql` | View mit created_by aktualisiert |
| `011_cleanup_redundant_is_lehrperson.sql` | Redundante is_lehrperson() entfernt |
| `012_auto_create_profile_on_signup.sql` | Automatische Profil-Erstellung bei Registrierung |

---

## Anhang C: Auto-Profile Creation (Phase 8)

### Problem

Wenn sich ein Benutzer über Supabase Auth registriert, wird nur ein Eintrag in `auth.users` erstellt. Die `profiles`-Tabelle (mit Rolle, persönlichen Daten etc.) blieb leer. Dies führte zu:

- Fehlenden Rollenzuweisungen
- Inkonsistenten Daten zwischen Auth und App
- Manueller Nacharbeit bei jeder Registrierung

### Lösung: Database Trigger

Ein PostgreSQL-Trigger erstellt automatisch einen `profiles`-Eintrag, wenn ein neuer User in `auth.users` angelegt wird.

```sql
-- Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'user'  -- Standard-Rolle
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger auf auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Erweiterte Profile-Felder

Zusätzlich wurden neue Felder zur `profiles`-Tabelle hinzugefügt:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `gender` | VARCHAR(20) | male, female, other, prefer_not_to_say |
| `birth_date` | DATE | Geburtsdatum |
| `school_name` | VARCHAR(255) | Name der Schule |
| `class_level` | VARCHAR(50) | Klassenstufe (z.B. "10a") |
| `bio` | TEXT | Kurze Selbstbeschreibung |

### Registrierungs-Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTOMATISCHE PROFIL-ERSTELLUNG                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐                                               │
│  │   Frontend   │  1. User registriert sich                     │
│  │  (NextAuth)  │     mit E-Mail & Passwort                     │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │ auth.users   │  2. Supabase Auth erstellt User               │
│  │  (INSERT)    │     → ID, E-Mail, Metadaten                   │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼ TRIGGER: on_auth_user_created                         │
│  ┌──────────────┐                                               │
│  │handle_new_   │  3. Trigger-Function wird aufgerufen          │
│  │user()        │     → Kopiert Daten nach profiles             │
│  └──────┬───────┘                                               │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────┐                                               │
│  │  profiles    │  4. Neuer Profil-Eintrag mit:                 │
│  │  (INSERT)    │     - id = auth.users.id (FK)                 │
│  │              │     - email, first_name, last_name            │
│  │              │     - role = 'user' (Standard)                │
│  └──────────────┘                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Metadaten bei Registrierung

Um `first_name` und `last_name` automatisch zu übernehmen, müssen diese im Registrierungs-Formular als Metadaten übergeben werden:

```typescript
// Beispiel: Supabase Auth Signups
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      first_name: 'Max',
      last_name: 'Mustermann'
    }
  }
});
```

---

## Anhang D: Notfall-Rollback

Falls Probleme auftreten, kann RLS temporär deaktiviert werden:

```sql
-- ⚠️ NUR IM NOTFALL - Deaktiviert ALLE Sicherheit!
ALTER TABLE {TABLE} DISABLE ROW LEVEL SECURITY;
```

---

**Nächster Schritt:** Bestätigung zur Ausführung von Phase 1 (RLS Enablement)
