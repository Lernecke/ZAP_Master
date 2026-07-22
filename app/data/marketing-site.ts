// Reale, aus den HTML-Referenzen extrahierte Inhalte für SiteNav/SiteFooter/Startseite (Schritt 5
// Abschnitt 2.1 Routing-Tabelle, Schritt 7 Startseite.html). Produktive Datenquelle -- im
// Unterschied zu types/marketing.fixtures.ts, das denselben Inhalt nur re-exportiert, um die
// Schritt-6-Struktur-Abdeckung nicht zu duplizieren. Einzige Stelle, an der diese Werte gepflegt
// werden.

import type {
  Audience,
  HomePageModel,
  MarketingLayoutModel,
  ServiceSubgroupModel,
  SiteFooterModel,
  SiteNavModel,
} from '@/types/marketing'

export const audiences = [
  {
    id: '4',
    slug: '4-klasse',
    displayLabel: '4. Klasse',
    navLabel: '4.Kl',
    href: '/kurse/4-klasse',
    kind: 'gymipruefung',
    kategorie: 'primar',
    zielPruefung: 'Aufnahmeprüfung Langzeitgymnasium (ZAP1)',
    placements: ['nav', 'heroPicker'],
    capabilities: { examSimulation: false, selfStudy: false, distanceLearning: false },
  },
  {
    id: '5',
    slug: '5-klasse',
    displayLabel: '5. Klasse',
    navLabel: '5.Kl',
    href: '/kurse/5-klasse',
    kind: 'gymipruefung',
    kategorie: 'primar',
    zielPruefung: 'Aufnahmeprüfung Langzeitgymnasium (ZAP1)',
    placements: ['nav', 'heroPicker'],
    capabilities: { examSimulation: false, selfStudy: false, distanceLearning: false },
  },
  {
    id: '6',
    slug: '6-klasse',
    displayLabel: '6. Klasse',
    navLabel: '6.Kl',
    href: '/kurse/6-klasse',
    kind: 'gymipruefung',
    kategorie: 'primar',
    zielPruefung: 'Aufnahmeprüfung Langzeitgymnasium (ZAP1)',
    placements: ['nav', 'heroPicker'],
    capabilities: { examSimulation: true, selfStudy: true, distanceLearning: true },
  },
  {
    id: '1-sek',
    slug: '1-sek',
    displayLabel: '1. Sek',
    navLabel: '1.Sek',
    href: '/kurse/1-sek',
    kind: 'gymipruefung',
    kategorie: 'sek',
    zielPruefung: 'Aufnahmeprüfung Kurzzeitgymnasium (ZAP2)',
    placements: ['nav', 'heroPicker'],
    capabilities: { examSimulation: false, selfStudy: false, distanceLearning: false },
  },
  {
    id: '2-3-sek',
    slug: '2-3-sek',
    displayLabel: '2./3. Sek',
    navLabel: '2./3.Sek',
    href: '/kurse/2-3-sek',
    kind: 'gymipruefung',
    kategorie: 'sek',
    zielPruefung: 'Aufnahmeprüfung Kurzzeitgymnasium (ZAP2)',
    placements: ['nav', 'heroPicker'],
    capabilities: { examSimulation: true, selfStudy: true, distanceLearning: true },
  },
  {
    id: 'bms',
    slug: 'bms',
    displayLabel: 'BMS-Aufnahmeprüfung',
    navLabel: 'BMS',
    href: '/kurse/bms',
    kind: 'bms',
    kategorie: 'weiterfuehrend',
    zielPruefung: 'BMS-Aufnahmeprüfung',
    placements: ['nav', 'serviceGrid'],
    capabilities: { examSimulation: true, selfStudy: true, distanceLearning: false },
  },
  {
    id: 'matura',
    slug: 'matura',
    displayLabel: 'Maturaprüfung',
    navLabel: 'Matura',
    href: '/kurse/matura',
    kind: 'matura',
    kategorie: 'weiterfuehrend',
    zielPruefung: 'Maturaprüfung',
    placements: ['nav', 'serviceGrid'],
    capabilities: { examSimulation: false, selfStudy: false, distanceLearning: false },
  },
] satisfies Audience[]

export const serviceGroups = [
  {
    id: 'core',
    label: 'Ergänzend zu unseren Kursen',
    cards: [
      {
        id: 'lerncoaching',
        title: 'Lerncoaching',
        description:
          'Rüstzeug für strukturiertes, konzentriertes und nachhaltiges Lernen — unabhängig davon, welchen Kurs Ihr Kind sonst besucht.',
        action: { label: 'Mehr über Lerncoaching erfahren', href: '/lerncoaching' },
      },
      {
        id: 'nachhilfe',
        title: 'Nachhilfe-Abo',
        description:
          'Gezielte 1:1-Unterstützung in Deutsch, Mathematik oder Französisch als 10er- oder 20er-Lektionen-Abo — unabhängig von einer Kursteilnahme.',
        action: { label: 'Mehr über das Nachhilfe-Abo erfahren', href: '/nachhilfe' },
      },
    ],
  },
  {
    id: 'examprep',
    label: 'Nur 6. Klasse & 2./3. Sek',
    eligibleFor: ['6', '2-3-sek'],
    cards: [
      {
        id: 'distance-learning',
        title: 'Distance Learning',
        description:
          'Der Intensivkurs-Sportferien lässt sich auch von zu Hause oder vom Ferienort aus per Video-Unterricht besuchen.',
        action: { label: 'Mehr über Distance Learning erfahren', href: '/distance-learning' },
        eligibleFor: ['6', '2-3-sek'],
      },
      {
        id: 'simulationspruefung',
        title: 'Simulationsprüfung',
        description:
          'Ohne Kursverpflichtung buchbar: eine realistische Prüfungssimulation statt eines ganzen Kurses — inkl. Auswertung und individuellem Feedback.',
        action: { label: 'Mehr über die Simulationsprüfung erfahren', href: '/pruefungssimulation' },
        eligibleFor: ['6', '2-3-sek'],
      },
    ],
  },
  {
    id: 'tertiary',
    label: 'Berufsmatura & Gymnasium',
    eligibleFor: ['bms', 'matura'],
    cards: [
      {
        id: 'bms-aufnahmepruefung',
        title: 'BMS-Aufnahmeprüfung',
        description:
          'Vorbereitung auf die Aufnahmeprüfung an die Berufsmaturitätsschule — für den Weg über eine Lehre mit Berufsmatura.',
        action: { label: 'Mehr über die BMS-Aufnahmeprüfung erfahren', href: '/kurse/bms' },
        eligibleFor: ['bms'],
      },
      {
        id: 'maturapruefung',
        title: 'Maturaprüfung',
        description:
          'Fokussierte Vorbereitung auf die Maturaprüfung am Gymnasium oder an der Berufsmaturitätsschule.',
        action: { label: 'Mehr über die Maturaprüfungsvorbereitung erfahren', href: '/kurse/matura' },
        eligibleFor: ['matura'],
      },
    ],
  },
] satisfies ServiceSubgroupModel[]

export const homePageModel = {
  hero: {
    eyebrow: 'Kompetenzzentrum Gymivorbereitung Zürich',
    title: 'Der richtige Weg zur Gymiprüfung — für jede Klassenstufe.',
    description:
      'Individuelle Förderung in Kleingruppen, von der 4. Klasse bis zur 2./3. Sek. Sagen Sie uns, wo Ihr Kind steht — wir zeigen Ihnen den passenden Kurs.',
  },
  audiences,
  serviceGroups,
  featuredTestimonial: {
    id: 'testi-adina',
    quote:
      'Ich war mir nicht sicher, ob ich die Prüfung schaffe und ins Gymi soll. Dank Ihnen habe ich nun die Prüfung bestanden und freue mich aufs Gymnasium.',
    author: 'Adina, 13 Jahre',
    role: 'Langzeitgymnasium, Intensivkurs Sportferien',
  },
} satisfies HomePageModel

export const siteNav = {
  home: { label: 'Startseite', href: '/' },
  audiences,
  primaryItems: [
    { id: 'nachhilfe', label: 'Nachhilfe', href: '/nachhilfe' },
    { id: 'ueber-uns', label: 'Über uns', href: '/ueber-uns' },
    { id: 'kontakt', label: 'Kontakt', href: '/kontakt' },
  ],
  login: { label: 'Login', href: '/login' },
} satisfies SiteNavModel

export const siteFooter = {
  brand: 'Lernecke',
  // Zwei Spalten im Footer (SiteFooter-Komponente): `navigation` sind allgemeine Seiten-Links,
  // `legal` bleiben laut Typ-Kommentar "nur reale Ziele" -- beide Listen zeigen ausschliesslich
  // bereits existierende Routen, kein "AGB"/"Standorte" ohne zugehörige Seite mehr.
  navigation: [
    { id: 'ueber-uns', label: 'Über uns', href: '/ueber-uns' },
    { id: 'kontakt', label: 'Kontakt', href: '/kontakt' },
    { id: 'standorte', label: 'Standorte', href: '/standorte' },
  ],
  legal: [
    { label: 'Impressum', href: '/impressum' },
    { label: 'AGB', href: '/agb' },
    { label: 'Datenschutzerklärung', href: '/datenschutz' },
  ],
  copyright: '© 2026 Lernecke',
} satisfies SiteFooterModel

export const marketingLayoutModel = {
  nav: siteNav,
  footer: siteFooter,
} satisfies MarketingLayoutModel
