# Intensivwoche Anmeldung – Integrations-Checkliste

## ✅ Erstellte Dateien

| Datei | Status | Beschreibung |
|-------|--------|--------------|
| `supabase/migrations/002_create_intensivwoche_anmeldungen.sql` | ✅ | Tabelle + RLS-Policies |
| `types/intensivwoche.ts` | ✅ | Zod-Schema + TypeScript-Types |
| `app/(public)/anmeldung/actions.ts` | ✅ | Server Action für Form-Submit |
| `app/(public)/anmeldung/page.tsx` | ✅ | Formular-Komponente |

---

## ⚠️ Manuelle Schritte vor Deployment

### 1. Datenbank-Migration ausführen

```bash
# Lokal (Supabase CLI)
cd zap-v2
supabase db push

# Oder auf Remote-Projekt
supabase db push --project-ref <project-id>
```

### 2. `types/database.ts` aktualisieren

Nach der Migration müssen die TypeScript-Types für Supabase neu generiert werden:

```bash
supabase gen types typescript --project-id <project-id> > types/database.ts
```

Alternativ manuell die neue Tabelle hinzufügen:

```typescript
// In types/database.ts → Tables hinzufügen:
intensivwoche_anmeldungen: {
  Row: {
    id: string
    kurs_id: string
    child_firstname: string
    child_lastname: string
    child_class_level: string
    child_gender: 'm' | 'w' | 'd'
    parent_email: string
    parent_phone: string
    notes: string | null
    status: 'pending' | 'confirmed' | 'cancelled'
    created_at: string
    paid_at: string | null
  }
  Insert: { ... }
  Update: { ... }
}
```

### 3. Kurse aus Datenbank laden (optional)

Die `page.tsx` verwendet aktuell Mock-Daten für die Kursauswahl. Für die Produktionsversion:

```typescript
// Option A: Server Component mit direktem DB-Zugriff
import { createServerClient } from '@/lib/supabase/server'

export default async function AnmeldungPage() {
  const supabase = await createServerClient()
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name')
    .eq('is_active', true)
  
  return <AnmeldungForm courses={courses ?? []} />
}

// Option B: API Route + Client-Side Fetch
// GET /api/public/courses
```

---

## 📁 Route-Struktur

```
app/
├── (auth)/           # Login, Register (mit Auth-Layout)
├── (dashboard)/      # Geschützter Bereich
└── (public)/         # Öffentlich zugänglich
    └── anmeldung/
        ├── page.tsx      # Formular-UI
        └── actions.ts    # Server Action
```

**Hinweis:** Die Route `(public)` hat kein eigenes Layout, da sie direkt das Root-Layout nutzt.

---

## 🔐 Sicherheits-Konfiguration

### Row Level Security (RLS)

| Policy | Berechtigung | Zielgruppe |
|--------|--------------|------------|
| `Öffentliche Anmeldung erlauben` | `INSERT` | `anon` (nicht authentifiziert) |
| `Admins haben vollen Zugriff` | `ALL` | `authenticated` |

**Wichtig:** Anonyme Benutzer können nur neue Anmeldungen erstellen, aber keine lesen, bearbeiten oder löschen.

---

## 🧪 Testen

### 1. Formular-Route aufrufen

```
http://localhost:3000/anmeldung
```

### 2. Validierung testen

- Pflichtfelder leer lassen → Fehler erscheinen
- Ungültige E-Mail → Fehler
- Ungültige Telefonnummer → Fehler

### 3. Erfolgreiche Submission

- Alle Felder korrekt ausfüllen
- Submit → Erfolgs-Screen erscheint
- Prüfen: Eintrag in `intensivwoche_anmeldungen` vorhanden

### 4. RLS testen (Supabase SQL Editor)

```sql
-- Als anonymer User (sollte 0 Rows zurückgeben)
SELECT * FROM intensivwoche_anmeldungen;

-- Als authenticated User (sollte alle Rows zeigen)
-- Eingeloggt im Supabase Dashboard
SELECT * FROM intensivwoche_anmeldungen;
```

---

## 📧 Nächste Schritte (optional)

1. **E-Mail-Benachrichtigung**: Trigger bei INSERT → E-Mail an Admins
2. **Bestätigungs-E-Mail**: E-Mail an Eltern mit Zusammenfassung
3. **Admin-Dashboard**: Ansicht aller Anmeldungen in `/dashboard/anmeldungen`
4. **Zahlungs-Integration**: Stripe Checkout nach erfolgreicher Anmeldung
5. **Kapazitätsprüfung**: Max. Teilnehmer pro Kurs prüfen
