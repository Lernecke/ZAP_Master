# Mentorship System (Götti-Modell) – Architekturplan

**Version:** 1.1  
**Erstellt:** 2. März 2026  
**Letzte Aktualisierung:** 2. März 2026  
**Status:** 🟢 SPEZIFIKATION ABGESCHLOSSEN  
**Autor:** System-Architekt

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Systemübersicht](#2-systemübersicht)
3. [Inserate (Listings)](#3-inserate-listings)
4. [Skill-Validierung & Lehrpersonen-Bewerbung](#4-skill-validierung--lehrpersonen-bewerbung)
5. [Matchmaking-Workflow](#5-matchmaking-workflow)
6. [Material-Hub (Austauschseite)](#6-material-hub-austauschseite)
7. [Real-Time Chat](#7-real-time-chat)
8. [Datenmodell](#8-datenmodell)
9. [RLS-Policies (Row Level Security)](#9-rls-policies)
10. [Roadmap & Priorisierung](#10-roadmap--priorisierung)

---

## 1. Executive Summary

Das Mentorship-System ermöglicht es, Lehrpersonen (Mentoren/Göttis) und Schüler (Mentees) über ein **Inserat-basiertes Marktplatz-Modell** zusammenzubringen. 

### Kernfunktionen

| Feature | Beschreibung | Priorität |
|---------|--------------|----------|
| **Inserate (Listings)** | Lehrpersonen bieten Skills an, Schüler suchen Unterstützung – **bidirektional** | 🔴 P0 |
| **Skill-Deklaration** | Selbstdeklaration für MVP, Bewerbungssystem später | 🟡 P1 |
| **Matchmaking** | Antragssystem für formale Mentor-Beziehungen | 🔴 P0 |
| **Material-Hub** | Generische Austauschseite für Aufsätze, Mathe-Blätter etc. | 🔴 P0 |
| **Real-Time Chat** | In-App Kommunikation zwischen Mentor und Mentee | 🟡 P1 |

### Design-Prinzipien

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZERO-TRUST ARCHITEKTUR                       │
├─────────────────────────────────────────────────────────────────┤
│  • Principle of Least Privilege                                 │
│  • Explizite Grants statt Default-Allow                         │
│  • Alle sensiblen Daten RLS-geschützt                           │
│  • Audit-Trail für alle Änderungen                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Systemübersicht

### 2.1 Benutzerrollen

| Rolle | Kann anbieten | Kann nachfragen | Besonderheiten |
|-------|---------------|-----------------|----------------|
| **Lehrperson** | ✅ Hilfe anbieten | ✅ Auf Schüler-Gesuche reagieren | Skills via Selbstdeklaration (später: Bewerbung) |
| **Schüler** | ✅ Hilfe suchen | ✅ Mentor kontaktieren | Kann aktive Angebote UND Gesuche durchsuchen |
| **Moderator** | - | - | Zukünftig: Lehrpersonen mit erweiterten Rechten |

> 📝 **Entscheidung:** Bidirektionale Anfragen – beide Parteien können Anfragen initiieren.

### 2.2 High-Level Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  LEHRPERSON │     │   SCHÜLER   │     │   ADMIN     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   │                   │
  ┌─────────┐              │                   │
  │ Profil  │              │                   │
  │ Skills  │◄─────────────┼───────────────────┤ Validiert Skills
  │ anlegen │              │                   │
  └────┬────┘              │                   │
       │                   │                   │
       ▼                   │                   │
  ┌─────────┐              │                   │
  │ Inserat │              │                   │
  │ "Biete  │              │                   │
  │  Hilfe" │              │                   │
  └────┬────┘              │                   │
       │                   │                   │
       │    ┌──────────────┴──────────────┐    │
       │    │      DISCOVERY              │    │
       │    │  Schüler sucht/filtert      │    │
       │    │  passende Angebote          │    │
       │    └──────────────┬──────────────┘    │
       │                   │                   │
       │                   ▼                   │
       │             ┌─────────┐               │
       │             │ Anfrage │               │
       │             │ stellen │               │
       │             └────┬────┘               │
       │                  │                    │
       ▼                  ▼                    │
  ┌─────────────────────────────┐              │
  │     MATCHMAKING             │              │
  │  Lehrperson akzeptiert/     │              │
  │  lehnt Anfrage ab           │              │
  └──────────────┬──────────────┘              │
                 │                             │
                 ▼                             │
  ┌─────────────────────────────┐              │
  │   AKTIVE BEZIEHUNG          │              │
  │  • Aufsätze einreichen      │              │
  │  • Korrekturen erhalten     │              │
  │  • Kommunikation            │              │
  └─────────────────────────────┘              │
```

---

## 3. Inserate (Listings)

### 3.1 Listing-Typen

| Typ | Ersteller | Zweck | Sichtbarkeit |
|-----|-----------|-------|--------------|
| `OFFER` | Lehrperson | "Ich biete Hilfe in Mathematik für 5./6. Klasse" | Öffentlich für Schüler |
| `REQUEST` | Schüler | "Ich suche Hilfe in Deutsch (Aufsätze)" | Nur für validierte Mentoren |

### 3.2 Struktur eines Inserats

```typescript
interface MentorshipListing {
  id: UUID
  type: 'OFFER' | 'REQUEST'
  author_id: UUID              // Referenz auf profiles.id
  title: string                // "Mathematik-Nachhilfe 5. Klasse"
  description: string          // Freitext-Beschreibung
  
  // Kategorisierung
  subject_ids: UUID[]          // Verknüpfung zu subjects-Tabelle
  class_levels: string[]       // ["5. Klasse", "6. Klasse"]
  
  // Kapazität & Verfügbarkeit
  max_mentees?: number         // Nur für OFFER: Wie viele Schüler max?
  availability?: string        // "Mo-Fr nachmittags"
  
  // Status
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED'
  is_featured: boolean         // Admin kann hervorheben
  
  // Zeitstempel
  created_at: timestamp
  updated_at: timestamp
  expires_at?: timestamp       // Optional: Automatisches Ablaufdatum
}
```

### 3.3 Filterbare Kriterien

| Kriterium | Filter-Logik |
|-----------|--------------|
| `subject_ids` | ARRAY-Überlappung (`&&` Operator) |
| `class_levels` | ARRAY-Überlappung |
| `status` | Exakte Gleichheit |
| `Volltext` | `tsvector` Suche in title + description |

---

## 4. Skill-Validierung & Lehrpersonen-Bewerbung

### 4.1 MVP: Selbstdeklaration

Für den MVP wird ein einfaches **Selbstdeklarations-Modell** verwendet:

```
┌─────────────────────────────────────────────────────────────────┐
│                    MVP: SELBSTDEKLARATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Lehrperson registriert sich mit role = 'teacher'            │
│                                                                 │
│  2. Lehrperson deklariert Skills                                │
│     └── Fach, Klassenstufen, Erfahrung (optional)               │
│                                                                 │
│  3. Skills sind sofort aktiv                                    │
│     └── Status: ACTIVE (nicht PENDING)                          │
│                                                                 │
│  4. Lehrperson kann Inserate erstellen                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 🔮 ZUKÜNFTIG: Bewerbungssystem für Lehrpersonen

> ⚠️ **Nicht im MVP-Scope** – für spätere Iteration vorgesehen.

Ein formalisiertes Bewerbungssystem für erhöhte Qualitätssicherung:

```
┌─────────────────────────────────────────────────────────────────┐
│               FUTURE: LEHRPERSONEN-BEWERBUNG                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Person registriert sich (role = 'pending_teacher')          │
│                                                                 │
│  2. Bewerbungsformular ausfüllen                                │
│     ├── Qualifikationen / Diplome                               │
│     ├── Motivation / Erfahrung                                  │
│     └── Optional: Dokumente hochladen                           │
│                                                                 │
│  3. Moderator (= ausgewählte Lehrperson) reviewed               │
│     └── Prüft Bewerbung auf Plausibilität                       │
│                                                                 │
│  4. Entscheidung                                                │
│     ├── APPROVED → role wird 'teacher'                          │
│     └── REJECTED → Feedback + erneute Bewerbung möglich         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Moderatoren-Konzept:** Ausgewählte, vertrauenswürdige Lehrpersonen erhalten erweiterte Rechte zur Moderation (Bewerbungen prüfen, Inhalte melden, etc.).

### 4.3 Skill-Datenstruktur (MVP)

```typescript
interface MentorSkill {
  id: UUID
  mentor_id: UUID              // profiles.id (role = 'teacher')
  subject_id: UUID             // subjects.id
  class_levels: string[]       // Für welche Stufen?
  
  // MVP: Kein Validierungsstatus nötig
  // FUTURE: status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  
  // Zusatzinfo
  years_experience?: number
  description?: string         // "10 Jahre Erfahrung als Primarlehrer"
  
  created_at: timestamp
  updated_at: timestamp
}
```

### 4.4 🔮 ZUKÜNFTIG: Teacher Application (Bewerbungstabelle)

```typescript
// Für späteres Bewerbungssystem
interface TeacherApplication {
  id: UUID
  applicant_id: UUID           // profiles.id (role = 'pending_teacher')
  
  // Bewerbungsdaten
  motivation: string
  qualifications: string
  experience_years?: number
  document_urls?: string[]     // Supabase Storage URLs
  
  // Review-Prozess
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewed_by?: UUID           // Moderator
  reviewed_at?: timestamp
  rejection_reason?: string
  
  created_at: timestamp
}
```

---

## 5. Matchmaking-Workflow

### 5.1 Request-States

```
                    ┌─────────┐
                    │ PENDING │ ◄── Anfrage gestellt
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ ACCEPTED │   │ REJECTED │   │ EXPIRED  │
    └────┬─────┘   └──────────┘   └──────────┘
         │                              ▲
         │                              │
         │         (nach X Tagen ohne Reaktion)
         │
         ▼
    ┌──────────┐
    │ RELATION │ ──► Aktive Mentor-Mentee-Beziehung
    │ CREATED  │
    └──────────┘
```

### 5.2 Request-Datenstruktur

```typescript
interface MentorshipRequest {
  id: UUID
  
  // Beteiligte
  listing_id: UUID             // Auf welches Inserat bezogen?
  requester_id: UUID           // Wer fragt an? (meist Schüler)
  target_id: UUID              // Wer wird angefragt? (Autor des Inserats)
  
  // Anfrage-Details
  message?: string             // "Ich brauche Hilfe bei Aufsätzen..."
  
  // Status
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED'
  response_message?: string    // Antwort des Mentors
  responded_at?: timestamp
  
  // Zeitmanagement
  created_at: timestamp
  expires_at: timestamp        // Z.B. 7 Tage nach Erstellung
}
```

### 5.3 Aktive Beziehung (Relation)

```typescript
interface MentorshipRelation {
  id: UUID
  
  // Beteiligte
  mentor_id: UUID              // Lehrperson
  mentee_id: UUID              // Schüler
  
  // Kontext
  original_request_id: UUID    // Wie kam es zustande?
  original_listing_id: UUID
  
  // Status
  status: 'ACTIVE' | 'PAUSED' | 'ENDED'
  ended_reason?: string        // "completed" | "mentor_request" | "mentee_request" | "admin"
  
  // Statistiken
  essays_submitted: number     // Zähler für eingereichte Aufsätze
  essays_corrected: number     // Zähler für korrigierte Aufsätze
  
  // Zeitstempel
  started_at: timestamp
  ended_at?: timestamp
}
```

---

## 6. Material-Hub (Austauschseite)

### 6.1 Konzept

Der Material-Hub ist eine **generische Austauschplattform** für alle Arten von Lernmaterialien – nicht nur Aufsätze. Schüler können Dokumente zur Korrektur hochladen und auswählen, welchem Mentor sie diese zuweisen.

> 📝 **Entscheidung:** Der Material-Hub ersetzt das bisherige Aufsatz-System und erweitert es um beliebige Materialtypen.

### 6.2 Kernprinzipien

```
┌─────────────────────────────────────────────────────────────────┐
│                    SICHTBARKEITS-REGELN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔐 SCHÜLER sieht:                                              │
│     └── Nur eigene hochgeladene Materialien                     │
│                                                                 │
│  🔐 LEHRPERSON sieht:                                           │
│     └── NUR Materialien von eigenen "Götti-Kindern"            │
│     └── NICHT mehr alle Materialien aller Schüler               │
│                                                                 │
│  📤 BEIM HOCHLADEN:                                             │
│     └── Schüler wählt Mentor aus aktiven Beziehungen            │
│     └── Material wird diesem Mentor zugewiesen                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Material-Typen

| Typ | Beschreibung | Beispiele |
|-----|--------------|-----------|
| `ESSAY` | Textaufsätze | Erörterung, Beschreibung, Brief |
| `WORKSHEET` | Arbeitsblätter | Mathe-Übungen, Lückentexte |
| `HOMEWORK` | Hausaufgaben | Allgemeine Aufgaben |
| `OTHER` | Sonstiges | Projektarbeiten, Präsentationen |

### 6.4 Material-Datenstruktur

```typescript
interface MentorshipMaterial {
  id: UUID
  
  // Zuordnung
  relation_id: UUID            // mentorship_relations.id
  uploader_id: UUID            // Schüler (profiles.id)
  assigned_to: UUID            // Mentor (profiles.id)
  
  // Inhalt
  type: 'ESSAY' | 'WORKSHEET' | 'HOMEWORK' | 'OTHER'
  title: string                // "Aufsatz: Mein Lieblingsort"
  description?: string
  
  // Dateien
  file_urls: string[]          // Supabase Storage URLs
  file_types: string[]         // ['pdf', 'docx', 'jpg']
  
  // Workflow-Status
  status: 'SUBMITTED' | 'IN_REVIEW' | 'CORRECTED' | 'RETURNED'
  submitted_at: timestamp
  corrected_at?: timestamp
  
  // Korrektur/Feedback
  feedback?: string            // Freitext-Feedback vom Mentor
  feedback_file_urls?: string[] // Korrigierte Dateien
  grade?: string               // Optional: Note/Bewertung
  
  // Meta
  created_at: timestamp
  updated_at: timestamp
}
```

### 6.5 Upload-Workflow

```
┌─────────────┐                              ┌─────────────┐
│   SCHÜLER   │                              │   MENTOR    │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       ▼                                            │
  ┌─────────────────┐                               │
  │ Material        │                               │
  │ hochladen       │                               │
  │ + Mentor wählen │                               │
  └────────┬────────┘                               │
           │                                        │
           ▼                                        │
      ┌────────────┐                                │
      │ SUBMITTED  │────────────────────────────────┤
      └────────────┘                                ▼
                                          ┌─────────────────┐
                                          │ Benachrichtigung│
                                          │ "Neues Material"│
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ IN_REVIEW       │
                                          │ (Mentor liest)  │
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ CORRECTED       │
                                          │ + Feedback      │
                                          └────────┬────────┘
           ┌───────────────────────────────────────┘
           │
           ▼
  ┌─────────────────┐
  │ Benachrichtigung│
  │ "Feedback da!"  │
  └────────┬────────┘
           │
           ▼
      ┌────────────┐
      │ RETURNED   │
      └────────────┘
```

---

## 7. Real-Time Chat

### 7.1 Konzept

Ein **In-App-Messaging-System** für die direkte Kommunikation zwischen Mentor und Mentee. Der Chat ist auf aktive `mentorship_relations` beschränkt.

### 7.2 Features (MVP)

| Feature | Beschreibung | Priorität |
|---------|--------------|-----------|
| **1:1 Chat** | Direkte Nachrichten zwischen Mentor & Mentee | 🔴 P0 |
| **Real-Time** | Supabase Realtime für sofortige Zustellung | 🔴 P0 |
| **Unread Counter** | Anzahl ungelesener Nachrichten | 🟡 P1 |
| **Typing Indicator** | "schreibt gerade..." Anzeige | 🟢 P2 |
| **File Sharing** | Dateien im Chat teilen | 🟢 P2 |

### 7.3 Chat-Datenstruktur

```typescript
interface ChatMessage {
  id: UUID
  
  // Zuordnung
  relation_id: UUID            // mentorship_relations.id
  sender_id: UUID              // profiles.id
  
  // Inhalt
  content: string              // Nachrichtentext
  attachment_urls?: string[]   // Optional: Datei-Anhänge
  
  // Status
  is_read: boolean
  read_at?: timestamp
  
  // Meta
  created_at: timestamp
  edited_at?: timestamp        // Falls Bearbeitung erlaubt
}
```

### 7.4 Supabase Realtime Integration

```typescript
// Client-seitige Subscription
const channel = supabase
  .channel(`chat:${relationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `relation_id=eq.${relationId}`
    },
    (payload) => {
      // Neue Nachricht hinzufügen
      addMessage(payload.new)
    }
  )
  .subscribe()
```

### 7.5 RLS für Chat

```sql
-- Nur Beteiligte der Relation können Nachrichten lesen
CREATE POLICY "chat_messages_select_involved" ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = chat_messages.relation_id
      AND (mr.mentor_id = auth.uid() OR mr.mentee_id = auth.uid())
      AND mr.status = 'ACTIVE'
    )
  );

-- Nur Beteiligte können Nachrichten senden
CREATE POLICY "chat_messages_insert_involved" ON public.chat_messages
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
```

---

## 8. Datenmodell

### 8.1 Entity-Relationship-Diagramm (Erweitert)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │    subjects     │       │  mentor_skills  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ role            │       │ name            │       │ mentor_id (FK)  │──┐
│ first_name      │       │ slug            │       │ subject_id (FK) │──┼──► subjects
│ last_name       │       └────────┬────────┘       │ class_levels[]  │  │
│ class_level     │                │                │ description     │  │
│ ...             │                │                └─────────────────┘  │
└────────┬────────┘                │                                     │
         │     ┌───────────────────┴─────────────────────────────────────┘
         │     │
         ▼     ▼
┌────────────────────────┐
│  mentorship_listings   │
├────────────────────────┤
│ id (PK)                │
│ author_id (FK)         │─────────────────► profiles
│ type (OFFER/REQUEST)   │
│ title, description     │
│ subject_ids[] (FK)     │─────────────────► subjects
│ class_levels[], status │
└────────────┬───────────┘
             │ 1:N
             ▼
┌────────────────────────┐
│  mentorship_requests   │
├────────────────────────┤
│ id (PK)                │
│ listing_id (FK)        │─────────────────► mentorship_listings
│ requester_id (FK)      │─────────────────► profiles
│ target_id (FK)         │─────────────────► profiles
│ status, message        │
└────────────┬───────────┘
             │ 1:1 (bei ACCEPTED)
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    mentorship_relations                         │
├─────────────────────────────────────────────────────────────────┤
│ id (PK) │ mentor_id (FK) │ mentee_id (FK) │ status              │
└────────────────────┬────────────────────────┬───────────────────┘
                     │ 1:N                    │ 1:N
                     ▼                        ▼
┌────────────────────────┐      ┌────────────────────────┐
│ mentorship_materials   │      │    chat_messages       │
├────────────────────────┤      ├────────────────────────┤
│ id (PK)                │      │ id (PK)                │
│ relation_id (FK)       │      │ relation_id (FK)       │
│ uploader_id (FK)       │      │ sender_id (FK)         │
│ assigned_to (FK)       │      │ content                │
│ type, title, status    │      │ is_read, created_at    │
│ file_urls[], feedback  │      │ attachment_urls[]      │
└────────────────────────┘      └────────────────────────┘
```

### 8.2 SQL-Schema

```sql
-- ======================================
-- MENTOR SKILLS (MVP: Selbstdeklaration)
-- ======================================

CREATE TABLE public.mentor_skills (
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

-- ======================================
-- MENTORSHIP LISTINGS (Inserate)
-- ======================================

CREATE TABLE public.mentorship_listings (
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

-- Volltext-Index für Suche
CREATE INDEX idx_listings_search ON public.mentorship_listings 
  USING gin(to_tsvector('german', title || ' ' || COALESCE(description, '')));

-- ======================================
-- MENTORSHIP REQUESTS (Anfragen)
-- ======================================

CREATE TABLE public.mentorship_requests (
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

-- ======================================
-- MENTORSHIP RELATIONS (Aktive Beziehungen)
-- ======================================

CREATE TABLE public.mentorship_relations (
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

-- ======================================
-- MENTORSHIP MATERIALS (Material-Hub)
-- ======================================

CREATE TABLE public.mentorship_materials (
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

CREATE INDEX idx_materials_relation ON public.mentorship_materials(relation_id);
CREATE INDEX idx_materials_uploader ON public.mentorship_materials(uploader_id);
CREATE INDEX idx_materials_assigned ON public.mentorship_materials(assigned_to);

-- ======================================
-- CHAT MESSAGES (Real-Time Chat)
-- ======================================

CREATE TABLE public.chat_messages (
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

CREATE INDEX idx_chat_relation ON public.chat_messages(relation_id);
CREATE INDEX idx_chat_created ON public.chat_messages(created_at DESC);

-- Enable Realtime für chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
```

---

## 9. RLS-Policies (Row Level Security)

### 9.1 Sicherheitsklassifizierung

| Tabelle | Sensibilität | Lesezugriff | Schreibzugriff |
|---------|--------------|-------------|----------------|
| `mentor_skills` | � NIEDRIG | Alle Skills sichtbar (MVP) | Nur Besitzer |
| `mentorship_listings` | 🟢 NIEDRIG | Aktive öffentlich | Nur Autor |
| `mentorship_requests` | 🔴 HOCH | Nur Beteiligte | Nur Beteiligte |
| `mentorship_relations` | 🔴 HOCH | Nur Beteiligte | System/Beteiligte |
| `mentorship_materials` | 🔴 HOCH | Nur Uploader + Assigned Mentor | Uploader (Submit), Mentor (Feedback) |
| `chat_messages` | 🔴 HOCH | Nur Beteiligte der Relation | Nur Sender |

### 9.2 Policy-Definitionen

```sql
-- ======================================
-- MENTOR_SKILLS POLICIES
-- ======================================

ALTER TABLE public.mentor_skills ENABLE ROW LEVEL SECURITY;

-- SELECT: Alle Skills sind sichtbar (MVP: Selbstdeklaration)
CREATE POLICY "mentor_skills_select_all" ON public.mentor_skills
  FOR SELECT
  USING (true);  -- MVP: Keine Validierung, alle sichtbar

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

-- UPDATE: Nur eigene Skills (aber nicht status!)
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

ALTER TABLE public.mentorship_listings ENABLE ROW LEVEL SECURITY;

-- SELECT: Aktive Listings öffentlich, Drafts nur für Autor
CREATE POLICY "listings_select_public_or_own" ON public.mentorship_listings
  FOR SELECT
  USING (
    status = 'ACTIVE'
    OR author_id = auth.uid()
  );

-- INSERT: Bidirektional - beide Rollen können beide Typen erstellen
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

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

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
    AND requester_id != target_id  -- Keine Selbst-Anfragen
  );

-- UPDATE: Target kann Status ändern, Requester kann canceln
CREATE POLICY "requests_update_involved" ON public.mentorship_requests
  FOR UPDATE
  USING (
    requester_id = auth.uid() 
    OR target_id = auth.uid()
  )
  WITH CHECK (
    -- Requester kann nur CANCELLED setzen
    (requester_id = auth.uid() AND status = 'CANCELLED')
    OR
    -- Target kann ACCEPTED/REJECTED setzen
    target_id = auth.uid()
  );

-- ======================================
-- MENTORSHIP_RELATIONS POLICIES
-- ======================================

ALTER TABLE public.mentorship_relations ENABLE ROW LEVEL SECURITY;

-- SELECT: Nur Mentor oder Mentee
CREATE POLICY "relations_select_involved" ON public.mentorship_relations
  FOR SELECT
  USING (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
  );

-- INSERT: Nur via Server Action / Function (nicht direkt)
-- Wird durch Edge Function oder Trigger beim Request-Accept erstellt

-- UPDATE: Beide können Status ändern (PAUSED/ENDED)
CREATE POLICY "relations_update_involved" ON public.mentorship_relations
  FOR UPDATE
  USING (
    mentor_id = auth.uid() 
    OR mentee_id = auth.uid()
  );

-- ======================================
-- MENTORSHIP_MATERIALS POLICIES
-- ======================================

ALTER TABLE public.mentorship_materials ENABLE ROW LEVEL SECURITY;

-- SELECT: Nur Uploader oder zugewiesener Mentor
CREATE POLICY "materials_select_involved" ON public.mentorship_materials
  FOR SELECT
  USING (
    uploader_id = auth.uid() 
    OR assigned_to = auth.uid()
  );

-- INSERT: Nur Schüler (Uploader) innerhalb einer aktiven Relation
CREATE POLICY "materials_insert_student" ON public.mentorship_materials
  FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = relation_id
      AND mr.mentee_id = auth.uid()
      AND mr.status = 'ACTIVE'
    )
  );

-- UPDATE: Mentor kann Feedback geben, Schüler kann Metadaten ändern
CREATE POLICY "materials_update_involved" ON public.mentorship_materials
  FOR UPDATE
  USING (
    uploader_id = auth.uid() 
    OR assigned_to = auth.uid()
  );

-- ======================================
-- CHAT_MESSAGES POLICIES
-- ======================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

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

-- UPDATE: Nur Empfänger kann is_read setzen
CREATE POLICY "chat_update_read" ON public.chat_messages
  FOR UPDATE
  USING (
    sender_id != auth.uid()  -- Nicht der Sender
    AND EXISTS (
      SELECT 1 FROM public.mentorship_relations mr
      WHERE mr.id = relation_id
      AND (mr.mentor_id = auth.uid() OR mr.mentee_id = auth.uid())
    )
  );
```

### 9.3 Moderator-Policies (Zukünftig)

```sql
-- Admin-Rolle Hilfs-Funktion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin kann Skills verifizieren
CREATE POLICY "mentor_skills_admin_update" ON public.mentor_skills
  FOR UPDATE
  USING (public.is_admin());

-- Admin kann alle Listings sehen/moderieren
CREATE POLICY "listings_admin_all" ON public.mentorship_listings
  FOR ALL
  USING (public.is_admin());
```

---

## 10. Roadmap & Priorisierung

### 10.1 Geklärte Entscheidungen

| # | Frage | Entscheidung | Status |
|---|-------|--------------|--------|
| 1 | Vergütung/Bezahlung | **TBD** – Noch nicht geklärt, für späteren Zeitpunkt | 🟡 OFFEN |
| 2 | Bidirektionalität | **JA** – Beide Parteien können Anfragen initiieren | ✅ GEKLÄRT |
| 3 | Kapazitätsgrenzen | **NEIN** – Aktuell keine Limits, für später vorgesehen | ✅ GEKLÄRT |
| 4 | Skill-Validierung | **Selbstdeklaration** für MVP, Bewerbungssystem später | ✅ GEKLÄRT |
| 5 | Validierungs-Verantwortung | **Moderatoren** (Lehrpersonen mit erweiterten Rechten) | ✅ GEKLÄRT |
| 6 | Material-Austausch | **Ja** – Generischer Material-Hub, nicht nur Aufsätze | ✅ GEKLÄRT |
| 7 | Kommunikation | **In-App Real-Time Chat** via Supabase Realtime | ✅ GEKLÄRT |

### 10.2 Implementierungs-Phasen

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: MVP (Priorität 🔴)                  │
├─────────────────────────────────────────────────────────────────┤
│  • mentorship_listings (bidirektional)                          │
│  • mentorship_requests                                          │
│  • mentorship_relations                                         │
│  • mentorship_materials (Material-Hub)                          │
│  • Selbstdeklaration für Teacher-Skills                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2: Chat (Priorität 🟡)                 │
├─────────────────────────────────────────────────────────────────┤
│  • chat_messages Tabelle                                        │
│  • Supabase Realtime Integration                                │
│  • Unread Counter                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: Qualität (Priorität 🟢)             │
├─────────────────────────────────────────────────────────────────┤
│  • teacher_applications (Bewerbungssystem)                      │
│  • Moderatoren-Dashboard                                        │
│  • Kapazitätsgrenzen pro Mentor                                 │
│  • Rating-System (optional)                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 10.3 Nächste Schritte (Phase 1)

- [ ] Datenbank-Migration erstellen (`XXX_create_mentorship_tables.sql`)
- [ ] TypeScript Types generieren/erweitern
- [ ] Server Actions implementieren
- [ ] UI-Komponenten designen:
  - [ ] Inserate-Liste (Marktplatz)
  - [ ] Inserat erstellen/bearbeiten
  - [ ] Anfrage-Management
  - [ ] Material-Hub (Upload + Übersicht)
- [ ] RLS-Policies aktivieren & testen

### 10.4 Offene Punkte für spätere Klärung

| Thema | Beschreibung |
|-------|--------------|
| **Vergütung** | Soll es ein Bezahlmodell geben? Credits, Abo, Einmalzahlung? |
| **Bewertungen** | Soll nach Ende einer Beziehung ein Rating-System existieren? |
| **Melde-System** | Wie werden unangemessene Inhalte gemeldet und behandelt? |
| **Benachrichtigungen** | E-Mail-Notifications bei neuen Anfragen/Materialien? |

---

*Dokumentversion: 1.1 – Spezifikation abgeschlossen*
