# 🚀 ZAP v2.0 Migration Plan - Greenfield Approach

**Ziel:** Neues Next.js 16 Projekt mit Bardhi's moderner Architektur + deine Features mit sauberem Code

**Zeitrahmen:** ~8 Wochen (bis Mitte April 2026)

**Status:** ⏳ Bereit zum Start

---

## 📋 Projekt-Übersicht

### Was wir bauen:
```
ZAP v2.0
├── Modern Stack (Next.js 16, React 19, TypeScript)
├── Bardhi's Prüfungs-System (LLM-generierte Exams)
├── Deine Features (Auth, Dashboard, Progress Tracking)
├── Neue UI (v0-generated Design System)
└── Supabase Backend (bestehende DB erweitert)
```

### Technologie-Entscheidungen:
| Bereich | Technologie | Grund |
|---------|-------------|-------|
| **Framework** | Next.js 16.0.7 | Bardhi's Version, aktuell, Turbopack |
| **React** | 19.2.0 | Neueste Features, Server Components |
| **Language** | TypeScript 5 | Type Safety, bessere DX |
| **Styling** | Tailwind 4 | Modern, performant |
| **Auth** | NextAuth.js v5 (Auth.js) | Upgrade auf neueste Version |
| **Database** | Supabase (bestehend) | Deine DB beibehalten |
| **State** | React Context + Zustand | Leichtgewichtig, flexibel |
| **Forms** | React Hook Form | Performance, validation |
| **Math** | KaTeX + react-markdown | Bardhi's Setup |

---

## 🎯 Phasen-Übersicht

| Phase | Dauer | Deliverable | Status |
|-------|-------|-------------|--------|
| **Phase 0** | 1 Tag | Projekt-Setup & Repository | ⏳ To Do |
| **Phase 1** | 1 Woche | Auth System + Supabase | ⏳ To Do |
| **Phase 2** | 1 Woche | Bardhi's Exam System | ⏳ To Do |
| **Phase 3** | 1 Woche | Dashboard + Progress | ⏳ To Do |
| **Phase 4** | 2 Wochen | Übungen/Prüfungen Migration | ⏳ To Do |
| **Phase 5** | 1 Woche | v0 UI Integration | ⏳ To Do |
| **Phase 6** | 2 Wochen | Polish & RLS | ⏳ To Do |

---

## 📁 Finale Projektstruktur

```
zap-v2/
├── .env.local                          # Environment Variables
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── README.md
│
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root Layout mit Providers
│   ├── page.tsx                        # Landing Page (public)
│   ├── globals.css                     # Global Styles
│   │
│   ├── (auth)/                         # Auth Route Group
│   │   ├── login/
│   │   │   └── page.tsx                # Login Page
│   │   └── register/
│   │       └── page.tsx                # Register Page
│   │
│   ├── (dashboard)/                    # Protected Route Group
│   │   ├── layout.tsx                  # Dashboard Layout mit Sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx                # Dashboard Home
│   │   ├── trainer/                    # Bardhi's Exam System
│   │   │   ├── page.tsx                # Exam List/Overview
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Exam Detail/Solver
│   │   ├── uebungen/                   # Deine Übungen
│   │   │   ├── page.tsx                # Übungen Overview
│   │   │   ├── mathematik/
│   │   │   │   └── page.tsx
│   │   │   └── deutsch/
│   │   │       └── page.tsx
│   │   ├── pruefung/                   # Deine alte Prüfungen
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── profil/
│   │       └── page.tsx                # User Profile
│   │
│   ├── api/                            # API Routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts            # NextAuth Config
│   │   └── exams/
│   │       └── route.ts                # Exam APIs
│   │
│   └── components/                     # React Components
│       ├── ui/                         # v0-generated UI Components
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── input.tsx
│       │   └── ...
│       ├── layout/                     # Layout Components
│       │   ├── Navbar.tsx
│       │   ├── Sidebar.tsx
│       │   └── Footer.tsx
│       ├── auth/                       # Auth Components
│       │   ├── LoginForm.tsx
│       │   └── RegisterForm.tsx
│       ├── exam/                       # Bardhi's Components (migriert)
│       │   ├── ExamClient.tsx
│       │   ├── ExamHeader.tsx
│       │   ├── QuestionCard.tsx
│       │   ├── TaskInputs.tsx
│       │   ├── TableQuestion.tsx
│       │   ├── TextSidebar.tsx
│       │   └── MarkdownInline.tsx
│       └── dashboard/                  # Dashboard Components
│           ├── StatsCard.tsx
│           └── ProgressChart.tsx
│
├── lib/                                # Utilities & Configs
│   ├── supabase/
│   │   ├── client.ts                   # Supabase Client (Browser)
│   │   ├── server.ts                   # Supabase Server Client
│   │   └── queries.ts                  # DB Queries
│   ├── auth/
│   │   ├── config.ts                   # NextAuth Config
│   │   └── middleware.ts               # Auth Middleware
│   ├── utils/
│   │   ├── examUtils.ts                # Bardhi's Utils
│   │   └── formatters.ts
│   └── constants.ts
│
├── types/                              # TypeScript Types
│   ├── exam.ts                         # Bardhi's Exam Types
│   ├── database.ts                     # Supabase Types (auto-generated)
│   └── user.ts
│
├── context/                            # React Contexts
│   ├── ProgressContext.tsx             # Bardhi's Progress Context
│   └── AuthProvider.tsx                # Auth Context
│
├── hooks/                              # Custom Hooks
│   ├── useExam.ts
│   ├── useProgress.ts
│   └── useSupabase.ts
│
├── data/                               # Static Data
│   ├── exams/                          # Bardhi's Exam JSONs
│   │   ├── german-2023-claude.json
│   │   ├── math-2024-gemini.json
│   │   └── ...
│   └── schema/
│       └── exam-schema.json
│
├── public/                             # Static Assets
│   ├── images/
│   │   ├── german-2023/
│   │   └── math-2024/
│   └── ...
│
└── supabase/                           # Supabase Migrations
    ├── migrations/
    │   ├── 001_create_trainer_tables.sql
    │   ├── 002_create_rls_policies.sql
    │   └── ...
    └── seed.sql
```

---

## 🔧 Phase 0: Projekt-Setup (Tag 1)

### Schritt 1: Neues Next.js Projekt erstellen

```bash
# In /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/
cd /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/

# Neues Projekt erstellen
npx create-next-app@latest zap-v2 --typescript --tailwind --app --use-npm

# Optionen auswählen:
# ✔ Would you like to use TypeScript? … Yes
# ✔ Would you like to use ESLint? … Yes
# ✔ Would you like to use Tailwind CSS? … Yes
# ✔ Would you like your code inside a `src/` directory? … No
# ✔ Would you like to use App Router? … Yes
# ✔ Would you like to use Turbopack for `next dev`? … Yes
# ✔ Would you like to customize the import alias? … No

cd zap-v2
```

### Schritt 2: Dependencies installieren

```bash
# Core Dependencies (von Bardhi)
npm install katex@^0.16.27
npm install lucide-react@^0.556.0
npm install react-markdown@^10.1.0
npm install rehype-katex@^7.0.1
npm install remark-gfm@^4.0.1
npm install remark-math@^6.0.0

# Supabase
npm install @supabase/supabase-js@latest
npm install @supabase/ssr@latest

# NextAuth v5 (neueste Version)
npm install next-auth@beta
npm install @auth/core

# State Management
npm install zustand

# Forms & Validation
npm install react-hook-form
npm install zod
npm install @hookform/resolvers

# Utils
npm install clsx
npm install tailwind-merge
npm install date-fns

# Dev Dependencies
npm install -D @types/node
npm install -D @types/react
npm install -D @types/react-dom
```

### Schritt 3: Environment Variables

```bash
# .env.local erstellen
cat > .env.local << EOF
# Supabase (deine bestehende DB)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

### Schritt 4: Git Setup

```bash
git init
git add .
git commit -m "feat: initial setup - Next.js 16 + TypeScript"

# Optional: Remote Repository
git remote add origin your_github_repo_url
```

### ✅ Deliverable Phase 0:
- [ ] Neues Next.js 16 Projekt läuft auf `localhost:3000`
- [ ] Alle Dependencies installiert
- [ ] Git Repository initialisiert
- [ ] Environment Variables gesetzt

---

## 🔐 Phase 1: Authentication System (Woche 1)

### Tag 1-2: Supabase Integration

#### 1.1 Supabase Client Setup

**Datei: `lib/supabase/client.ts`**
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Datei: `lib/supabase/server.ts`**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

#### 1.2 Supabase Types generieren

```bash
# Installiere Supabase CLI
npm install -D supabase

# Generiere TypeScript Types aus deiner DB
npx supabase gen types typescript --project-id "your_project_id" > types/database.ts
```

#### 1.3 Database Migration - Neue Tabellen

**Datei: `supabase/migrations/001_create_trainer_tables.sql`**

```sql
-- ======================================
-- TRAINER EXAMS (Bardhi's System)
-- ======================================

-- Exams Tabelle für Bardhi's JSON-Schema
CREATE TABLE IF NOT EXISTS public.trainer_exams (
  id TEXT PRIMARY KEY,                    -- z.B. "math-2023-claude"
  title TEXT NOT NULL,                    -- "Mathematik 2023 (Claude Opus 4.5)"
  subject TEXT NOT NULL CHECK (subject IN ('Math', 'German')),
  year INTEGER NOT NULL,
  generated_by TEXT,                      -- "Claude-Opus-4.5", "Gemini-Pro-3"
  data JSONB NOT NULL,                    -- Komplettes Bardhi JSON
  text_lines TEXT[],                      -- Nur für Deutsch: Array von Zeilen
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnellere Queries
CREATE INDEX idx_trainer_exams_subject_year ON public.trainer_exams(subject, year);
CREATE INDEX idx_trainer_exams_generated_by ON public.trainer_exams(generated_by);

-- ======================================
-- USER PROGRESS (Bardhi's System)
-- ======================================

-- Fortschritt pro User pro Exam
CREATE TABLE IF NOT EXISTS public.trainer_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT NOT NULL REFERENCES public.trainer_exams(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,      -- { "q1-a": "42", "q2-b": "answer" }
  completed_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exam_id)                -- Ein Progress pro User pro Exam
);

CREATE INDEX idx_trainer_progress_user ON public.trainer_progress(user_id);
CREATE INDEX idx_trainer_progress_exam ON public.trainer_progress(exam_id);

-- ======================================
-- PROFILES ERWEITERN (falls nötig)
-- ======================================

-- Falls profiles nicht alle Felder hat
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ======================================
-- FUNCTIONS & TRIGGERS
-- ======================================

-- Updated_at Trigger für trainer_exams
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trainer_exams_updated_at
    BEFORE UPDATE ON public.trainer_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für neuen User
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Ausführen:**
```bash
# Manuell in Supabase Dashboard SQL Editor
# Oder mit Supabase CLI:
npx supabase db push
```

### Tag 3-4: NextAuth v5 Setup

**Datei: `lib/auth/config.ts`**

```typescript
import { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { createClient } from "@/lib/supabase/client"

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const supabase = createClient()
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })

        if (error || !data.user) {
          return null
        }

        return {
          id: data.user.id,
          email: data.user.email,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
}
```

**Datei: `app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from "next-auth"
import { authConfig } from "@/lib/auth/config"

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }
```

**Datei: `middleware.ts`** (Root-Level)

```typescript
import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/trainer/:path*",
    "/uebungen/:path*",
    "/pruefung/:path*",
    "/profil/:path*",
  ],
}
```

### Tag 5-7: Auth UI Components

**Datei: `app/(auth)/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Login fehlgeschlagen. Prüfe deine Anmeldedaten.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Login</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Wird geladen...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Datei: `app/(auth)/register/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Update profile
    if (data.user) {
      await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
        })
        .eq('id', data.user.id)
    }

    router.push('/login?registered=true')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">Registrieren</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Vorname</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Nachname</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Passwort</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {loading ? 'Wird erstellt...' : 'Registrieren'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### ✅ Deliverable Phase 1:
- [ ] Supabase Client funktioniert
- [ ] Neue Tabellen erstellt (`trainer_exams`, `trainer_progress`)
- [ ] Login/Register funktioniert
- [ ] NextAuth Session läuft
- [ ] Middleware schützt Protected Routes

---

## 📝 Phase 2: Bardhi's Exam System (Woche 2)

### Tag 1-2: Types & Data Migration

**Datei: `types/exam.ts`** (von Bardhi kopieren und anpassen)

```typescript
export type QuestionType = 'input' | 'multiple-choice' | 'true-false' | 'table-select' | 'text-area';

export interface ExamMeta {
    maxPoints: number;
    time?: string;
    hints: string[];
}

export interface SubTask {
    id: string;
    label: string;
    prompt: string;
    suffix?: string;
    correctAnswer?: string | number;
    modelAnswer?: string;
    imageUrl?: string;
    options?: string[];
}

export interface TableRow {
    id: string;
    text: string;
}

export interface TableColumn {
    id: string;
    label: string;
}

export interface Question {
    id: string;
    number: number;
    type: QuestionType;
    prompt: string;
    context?: string;
    imageUrl?: string;
    subTasks?: SubTask[];
    rows?: TableRow[];
    columns?: TableColumn[];
    options?: string[]
    correctTableAnswers?: Record<string, string>;
}

export interface Exam {
    id: string;
    meta?: ExamMeta;
    title: string;
    subject: 'Math' | 'German';
    year: number;
    textLines?: string[];
    questions: Question[];
    generatedBy?: string;
}
```

**Migration Script: `scripts/migrate-exams-to-db.ts`**

```typescript
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateExams() {
  const dataDir = path.join(process.cwd(), 'data/exams')
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const filePath = path.join(dataDir, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const exam = JSON.parse(content)

    const { error } = await supabase
      .from('trainer_exams')
      .upsert({
        id: exam.id,
        title: exam.title,
        subject: exam.subject,
        year: exam.year,
        generated_by: exam.generatedBy,
        data: exam,
        text_lines: exam.textLines || null,
      })

    if (error) {
      console.error(`Error migrating ${file}:`, error)
    } else {
      console.log(`✓ Migrated ${file}`)
    }
  }
}

migrateExams()
```

**Exams von Bardhi kopieren:**

```bash
# Von deinem Terminal
cp -r /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/bahrdi-projekt/app/data/json \
     /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/zap-v2/data/exams

# Images kopieren
cp -r /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/bahrdi-projekt/public/images \
     /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/zap-v2/public/images
```

### Tag 3-4: Bardhi's Components migrieren

**Kopiere diese Komponenten von Bardhi:**

```bash
# In zap-v2/
mkdir -p app/components/exam

# Kopiere alle Komponenten
cp ../bahrdi-projekt/app/components/ExamClient.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/ExamHeader.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/QuestionCard.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/TaskInputs.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/TableQuestion.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/TextSidebar.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/MarkdownInline.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/MetaInfo.tsx app/components/exam/
cp ../bahrdi-projekt/app/components/ExamGroupCard.tsx app/components/exam/
```

**Datei: `context/ProgressContext.tsx`** (von Bardhi kopieren)

```typescript
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSession } from 'next-auth/react'

type ProgressContextType = {
  getAnswer: (examId: string, key: string) => any
  updateAnswer: (examId: string, key: string, value: any) => void
  resetExam: (examId: string) => void
  saveToDatabase: (examId: string) => Promise<void>
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined)

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [progress, setProgress] = useState<Record<string, Record<string, any>>>({})
  const supabase = createClient()

  // Load progress from DB on mount
  useEffect(() => {
    if (session?.user?.id) {
      loadProgressFromDB()
    }
  }, [session?.user?.id])

  const loadProgressFromDB = async () => {
    if (!session?.user?.id) return

    const { data } = await supabase
      .from('trainer_progress')
      .select('exam_id, answers')
      .eq('user_id', session.user.id)

    if (data) {
      const loadedProgress: Record<string, Record<string, any>> = {}
      data.forEach((row) => {
        loadedProgress[row.exam_id] = row.answers || {}
      })
      setProgress(loadedProgress)
    }
  }

  const getAnswer = (examId: string, key: string) => {
    return progress[examId]?.[key]
  }

  const updateAnswer = (examId: string, key: string, value: any) => {
    setProgress((prev) => ({
      ...prev,
      [examId]: {
        ...prev[examId],
        [key]: value,
      },
    }))

    // Auto-save to DB (debounced in production)
    if (session?.user?.id) {
      saveToDatabase(examId)
    }
  }

  const resetExam = (examId: string) => {
    setProgress((prev) => ({
      ...prev,
      [examId]: {},
    }))

    if (session?.user?.id) {
      supabase
        .from('trainer_progress')
        .delete()
        .eq('user_id', session.user.id)
        .eq('exam_id', examId)
    }
  }

  const saveToDatabase = async (examId: string) => {
    if (!session?.user?.id) return

    await supabase.from('trainer_progress').upsert({
      user_id: session.user.id,
      exam_id: examId,
      answers: progress[examId] || {},
      last_updated: new Date().toISOString(),
    })
  }

  return (
    <ProgressContext.Provider value={{ getAnswer, updateAnswer, resetExam, saveToDatabase }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context) {
    throw new Error('useProgress must be used within ProgressProvider')
  }
  return context
}
```

### Tag 5-7: Exam Routes erstellen

**Datei: `app/(dashboard)/trainer/page.tsx`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Exam } from '@/types/exam'
import ExamGroupCard from '@/app/components/exam/ExamGroupCard'

type ExamGroup = {
  id: string
  year: number
  subject: 'Math' | 'German'
  variants: Exam[]
}

export default async function TrainerPage() {
  const supabase = await createServerSupabaseClient()
  
  const { data: exams } = await supabase
    .from('trainer_exams')
    .select('*')
    .order('year', { ascending: false })

  const allExams: Exam[] = exams?.map(row => ({
    ...row.data,
    id: row.id,
  })) || []

  const groupExams = (exams: Exam[]): ExamGroup[] => {
    const groups: Record<string, ExamGroup> = {}
    
    exams.forEach((exam) => {
      const key = `${exam.subject}-${exam.year}`
      if (!groups[key]) {
        groups[key] = {
          id: key,
          year: exam.year,
          subject: exam.subject,
          variants: []
        }
      }
      groups[key].variants.push(exam)
    })
    
    return Object.values(groups).sort((a, b) => b.year - a.year)
  }

  const germanGroups = groupExams(allExams.filter(e => e.subject === 'German'))
  const mathGroups = groupExams(allExams.filter(e => e.subject === 'Math'))

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight">ZAP Trainer</h1>
          <p className="text-lg text-gray-600">LLM-generierte Prüfungen</p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">📚 Deutsch</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {germanGroups.map((group) => (
              <ExamGroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">🔢 Mathematik</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mathGroups.map((group) => (
              <ExamGroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
```

**Datei: `app/(dashboard)/trainer/[id]/page.tsx`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ExamClient from '@/app/components/exam/ExamClient'

export default async function ExamPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient()
  
  const { data: examRow } = await supabase
    .from('trainer_exams')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!examRow) {
    notFound()
  }

  const exam = {
    ...examRow.data,
    id: examRow.id,
  }

  return <ExamClient exam={exam} />
}
```

### ✅ Deliverable Phase 2:
- [ ] Alle Bardhi-Komponenten kopiert und funktionsfähig
- [ ] Exams in Supabase gespeichert
- [ ] `/trainer` zeigt alle Prüfungen
- [ ] `/trainer/[id]` rendert einzelne Prüfung
- [ ] Progress-Tracking funktioniert mit DB

---

## 📊 Phase 3: Dashboard & Basic UI (Woche 3)

### Tag 1-3: Dashboard Layout

**Datei: `app/(dashboard)/layout.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import Navbar from '@/app/components/layout/Navbar'
import Sidebar from '@/app/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authConfig)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={session.user} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Datei: `app/components/layout/Sidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ClipboardList, BarChart3, User } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Trainer', href: '/trainer', icon: BookOpen },
  { name: 'Übungen', href: '/uebungen', icon: ClipboardList },
  { name: 'Profil', href: '/profil', icon: User },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <nav className="space-y-2">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Datei: `app/(dashboard)/dashboard/page.tsx`**

```typescript
import { getServerSession } from 'next-auth'
import { authConfig } from '@/lib/auth/config'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const session = await getServerSession(authConfig)
  const supabase = await createServerSupabaseClient()

  // Stats holen
  const { data: progressData } = await supabase
    .from('trainer_progress')
    .select('*')
    .eq('user_id', session?.user?.id)

  const { data: examsData } = await supabase
    .from('trainer_exams')
    .select('id')

  const completedExams = progressData?.filter(p => p.completed_at).length || 0
  const totalExams = examsData?.length || 0

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Absolvierte Prüfungen</h3>
          <p className="text-3xl font-bold mt-2">{completedExams}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Verfügbare Prüfungen</h3>
          <p className="text-3xl font-bold mt-2">{totalExams}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm font-medium">Fortschritt</h3>
          <p className="text-3xl font-bold mt-2">
            {totalExams > 0 ? Math.round((completedExams / totalExams) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Letzte Aktivitäten</h2>
        {/* TODO: Activity Feed */}
        <p className="text-gray-500">Keine aktuellen Aktivitäten</p>
      </div>
    </div>
  )
}
```

### Tag 4-7: Alte Features migrieren (Basic)

**Einfache Migration deiner Übungen:**

```typescript
// app/(dashboard)/uebungen/page.tsx
export default function UebungenPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Übungen</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
          <h2 className="text-2xl font-bold mb-4">📐 Mathematik</h2>
          <p className="text-gray-600 mb-4">Übe Mathematik-Aufgaben</p>
          {/* TODO: Link zu deinen alten Übungen */}
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition">
          <h2 className="text-2xl font-bold mb-4">📚 Deutsch</h2>
          <p className="text-gray-600 mb-4">Übe Deutsch-Aufgaben</p>
          {/* TODO: Link zu deinen alten Übungen */}
        </div>
      </div>
    </div>
  )
}
```

### ✅ Deliverable Phase 3:
- [ ] Dashboard Layout mit Sidebar
- [ ] Basic Dashboard mit Stats
- [ ] Navigation funktioniert
- [ ] Placeholder für alte Features

---

## 🔄 Phase 4-6: Details im nächsten Teil

**Das wären die nächsten Schritte:**

- **Phase 4:** Migration deiner alten Übungen/Prüfungen (mit Refactoring)
- **Phase 5:** v0 UI Integration (sobald du das Design hast)
- **Phase 6:** Polish, RLS Policies, Testing

---

## 🎯 Quick Start Guide

### Um JETZT zu starten:

```bash
# 1. Neues Projekt erstellen
cd /Users/robinmuhlemann/Documents/BFH/Master/DIFA/ZAP/
npx create-next-app@latest zap-v2 --typescript --tailwind --app

# 2. Wechsle ins Projekt
cd zap-v2

# 3. Dependencies installieren (siehe Phase 0)
npm install [alle Dependencies]

# 4. Environment Variables setzen
# Kopiere deine Supabase Credentials in .env.local

# 5. Dev Server starten
npm run dev
```

---

## 📞 Nächste Schritte

**Bereit anzufangen?** 

Sag mir:
1. ✅ "Los geht's mit Phase 0" - dann helfe ich dir beim Setup
2. ❓ "Ich habe noch Fragen zu [X]" - dann klären wir das zuerst
3. 📝 "Zeig mir mehr Details zu Phase [X]" - dann detailliere ich die aus

**Mein Versprechen:** Ich begleite dich durch JEDEN Schritt! 🚀

---

## 📄 Bardhi's LLM-Extraktion Workflow (Recherche-Ergebnis)

### Status der PDF→JSON Konvertierung

**Wichtig:** Im Bardhi-Projekt gibt es **keine automatische Upload-Funktionalität** im Code. Die Extraktion erfolgte **manuell** über LLM-Chats.

### Aktueller Workflow (manuell):

```
PDF-Dateien (pdf-exams/) 
       ↓
   LLM Chat (manuell: Claude/Gemini/Qwen)
       ↓
   JSON Output (data/json/)
       ↓
   Manuelle Validierung
```

### Was Bardhi gemacht hat:

1. **PDFs hochgeladen zu LLMs** (Claude, Gemini, Qwen) - manuell in Chat-Interfaces
2. **Prompts verwendet** (siehe `DIFA_Bardhi_Jusufi.md` Anhang):
   - Deutsch-Prompt: Extrahiert Textlinien, Aufgaben, Lösungen
   - Mathe-Prompt: LaTeX-Formatierung, Bild-Hierarchie, atomare Subtasks
3. **JSON validiert** gegen Schema (`app/data/schema/exam_schema.json`)
4. **Bilder manuell extrahiert** und in `public/images/` gespeichert

### Vorhandene Ressourcen in `bahrdi-projekt/`:

| Ressource | Pfad | Beschreibung |
|-----------|------|--------------|
| **Original PDFs** | `pdf-exams/` | 20 PDF-Dateien (2022-2025, Mathe+Deutsch) |
| **JSON Schema** | `app/data/schema/exam_schema.json` | Zielformat für Extraktion |
| **Schema Docs** | `app/data/schema/exam_schema.txt` | Detaillierte Schemabeschreibung |
| **Generierte JSONs** | `app/data/json/` | 28 JSON-Dateien (verschiedene LLM-Varianten) |
| **Extrahierte Bilder** | `public/images/` | Nach Jahr/Modell organisiert |
| **Prompts** | `DIFA_Bardhi_Jusufi.md` (Anhang) | Deutsch- und Mathe-Prompts |

### Zukunfts-Idee: Automatisierte Pipeline

Laut Bardhi's Dokumentation (Reflexion und Ausblick):

> *"Ein zentraler technischer Fokus für die Weiterentwicklung liegt in der Automatisierung der Extraktionspipeline. Orchestrierungs-Frameworks wie beispielsweise LangGraph könnten genutzt werden, um den Prozess in einen vollständig autonomen Workflow zu überführen."*

**Mögliche zukünftige Features:**
- PDF-Upload im Admin-Bereich
- Automatische LLM-Extraktion via API (Claude/GPT/Gemini)
- Validierung gegen Schema
- Review-Interface für manuelle Korrekturen
- Automatische Bild-Extraktion (Vision-Komponente)

### Für ZAP v2.0:

Die **28 bereits generierten JSON-Dateien** sind in Supabase importiert. Falls du neue Prüfungen hinzufügen willst:

1. **Option A (Schnell):** Manuell wie Bardhi - PDF + Prompt an LLM → JSON → Import via Script
2. **Option B (Aufwändig):** Automatisierte Pipeline bauen (Phase 7+)

**Empfehlung:** Für die Masterarbeit erstmal Option A nutzen, Pipeline als "Future Work" dokumentieren.
