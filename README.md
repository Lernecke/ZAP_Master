# ZAP v2 - Zürcher Aufnahmeprüfung Lernplattform

Eine moderne Lernplattform zur Vorbereitung auf die Zürcher Aufnahmeprüfung (ZAP), entwickelt mit Next.js 16 und Supabase.

## Features

- **Prüfungstrainer** - Interaktive Übungen zu verschiedenen Fächern
- **Alte Prüfungen** - Zugriff auf vergangene Prüfungsaufgaben
- **Lernmaterialien** - Strukturierte Lerninhalte nach Themen
- **Aufsätze** - Aufsatzübungen mit Korrektur-Workflow
- **Intensivkurse** - Kursverwaltung für Vorbereitungskurse
- **Mentoring-System** - Peer-to-Peer Lernunterstützung (Götti-System)
  - Marktplatz für Mentor-Angebote
  - Anfrage- und Beziehungsverwaltung
  - Material-Hub für Lernressourcen

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, Radix UI Primitives
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Auth**: NextAuth.js v5 mit Supabase Adapter
- **Forms**: React Hook Form + Zod Validation
- **Math**: KaTeX + react-katex für mathematische Formeln

## Voraussetzungen

- Node.js 20+
- npm oder pnpm
- Supabase Account (oder lokale Instanz)

## Installation

1. **Repository klonen**
   ```bash
   git clone git@github.com:RobinMuehBFH/zap-v2.git
   cd zap-v2
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**
   ```bash
   cp .env.example .env.local
   ```
   
   Folgende Variablen müssen gesetzt werden:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   AUTH_SECRET=your-auth-secret
   ```

4. **Entwicklungsserver starten**
   ```bash
   npm run dev
   ```

5. Browser öffnen: [http://localhost:3000](http://localhost:3000)

## Projektstruktur

```
zap-v2/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth-Routen (Login, Register)
│   ├── (dashboard)/       # Dashboard-Routen
│   ├── (public)/          # Öffentliche Seiten
│   ├── api/               # API Routes
│   └── components/        # App-spezifische Komponenten
├── components/            # Shared Components
│   └── providers/         # Context Providers
├── context/               # React Contexts
├── lib/                   # Utilities & Konfiguration
│   ├── auth/             # Auth Konfiguration
│   ├── supabase/         # Supabase Client & Types
│   └── utils/            # Hilfsfunktionen
├── public/               # Statische Assets
├── scripts/              # Build & Import Scripts
├── supabase/             # Supabase Migrations
└── types/                # TypeScript Types
```

## Scripts

```bash
npm run dev      # Entwicklungsserver starten
npm run build    # Produktions-Build erstellen
npm run start    # Produktionsserver starten
npm run lint     # ESLint ausführen
```

## Supabase Setup

1. Erstelle ein neues Supabase Projekt
2. Führe die Migrations aus `supabase/migrations/` aus
3. Konfiguriere RLS Policies gemäss `supabase/` Dokumentation

## Dokumentation

Weitere Dokumentation findest du im `/docs` Ordner:

- [Intensivwoche Integration](docs/INTENSIVWOCHE_INTEGRATION.md)
- [Supabase Security Roadmap](docs/SUPABASE_SECURITY_ROADMAP.md)
- [Navigation Concepts](NAVIGATION_CONCEPTS.md)

## Entwicklung

### Branches

- `main` - Stabiler Produktionscode
- `develop` - Entwicklungsbranch
- `feature/*` - Feature-Branches

### Commit Convention

Wir verwenden [Conventional Commits](https://conventionalcommits.org/):

```
feat: Add mentorship marketplace
fix: Resolve sidebar hydration issue
docs: Update README
```

## Lizenz

Proprietär - BFH Master DIFA Projekt

## Kontakt

Robin Mühlemann - BFH Master DIFA
