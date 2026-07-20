// Fixtures für das Domänenmodell aus types/marketing.ts (Schritt 5, Teil 1 des
// Ausführungsplans). Beweisen per `satisfies`, dass jede strukturelle Variante aus Abschnitt 2.9
// kompiliert -- Inhalte sind, wo vorhanden, wortgetreu aus den genannten HTML-Referenzdateien unter
// design-reference/ übernommen, nicht erfunden. Keine Verfügbarkeit/Belegung enthalten (die wird
// laut Abschnitt 2.9 immer request-time ergänzt).
//
// TargetedServicePageModel (Lerncoaching/Distance Learning) und TipsPageModel kamen in Schritt 9
// dazu, wörtlich aus Layout_Lerncoaching_Seite.html/Layout_DistanceLearning_Seite.html/
// Layout_Tipps_Uebersichtsseite.html übernommen.
//
// Bewusst weiterhin NICHT abgedeckt: LegalPageModel und ein inhaltlich befüllter
// ContactPageModel-Fixture (im Repo existieren keine echten, verifizierten Kontaktkanäle oder
// Rechtstexte -- ein Fixture dafür würde Daten erfinden müssen, was ausdrücklich nicht erlaubt
// ist; /kontakt, /impressum und /datenschutz definieren ihren ehrlichen Platzhalter-Inhalt
// deshalb lokal in der jeweiligen page.tsx, nicht hier).
//
// SessionDefinition.id: intensivwoche_kurse.id ist laut Abschnitt 2.4 global und darf nie neu
// nummeriert werden. Für diese Kurse existieren noch keine echten DB-Zeilen (das folgt erst mit
// dem additiven Editions-/Sessions-Schema aus Abschnitt 2.12, einer eigenen späteren Runde) --
// die IDs hier sind daher bewusst hohe Platzhalterwerte (9xxx), nicht mit echten Bestandskursen
// zu verwechseln.

import type {
  Audience,
  AudiencePageModel,
  AboutPageModel,
  CourseDetailPageModel,
  CourseOffer,
  ExamSimulationOffer,
  ExamSimulationPageModel,
  SelfStudyOffer,
  SelfStudyPageModel,
  SessionDefinition,
  SubscriptionPageModel,
  SubscriptionPlan,
  TargetedServicePageModel,
  TipsPageModel,
} from './marketing'

// 2.1/2.7/2.8 Audience[], serviceGroups, homePageModel, siteNav, siteFooter,
// marketingLayoutModel -- reale Produktionsdaten, jetzt in app/data/marketing-site.ts gepflegt
// (Schritt 7). Re-exportiert hier, damit die bestehende Struktur-Abdeckung dieser Datei (Schritt
// 6 Smoke-Test etc.) unverändert bleibt, ohne den Inhalt zu duplizieren.
import {
  audiences,
  serviceGroups,
  homePageModel,
  siteNav,
  siteFooter,
  marketingLayoutModel,
} from '@/app/data/marketing-site'

export { audiences, serviceGroups, homePageModel, siteNav, siteFooter, marketingLayoutModel }

const sechsKlasse: Audience = audiences[2]
const bms: Audience = audiences[5]

// ---------------------------------------------------------------------------------------------
// 2.2/2.4 CourseOffer + SessionDefinition -- Layout_6_Klasse_Hauptseite.html +
// Layout_6_Klasse_Intensivkurs_Unterseite.html
// ---------------------------------------------------------------------------------------------

export const sechsKlasseIntensivkursSessions = [
  {
    id: 9001,
    offerId: 'offer-6klasse-intensivkurs-sportferien',
    capacity: 10,
    source: { kind: 'intensivwoche_kurse', kursId: 9001 },
    kurs: 'Kurs B',
    dateLabel: '15.–19. Feb.',
    timeLabel: '09.00–12.15',
    standort: 'Zürich HB',
    deliveryModes: ['onsite'],
    ablauf: {
      kind: 'simple',
      items: [
        { id: 'mo', label: 'Mo, 15. Feb.', value: '09.00–12.15' },
        { id: 'di', label: 'Di, 16. Feb.', value: '09.00–12.15' },
        { id: 'mi', label: 'Mi, 17. Feb.', value: '08.30–12.30', highlight: true },
        { id: 'do', label: 'Do, 18. Feb.', value: '09.00–12.15' },
        { id: 'fr', label: 'Fr, 19. Feb.', value: '09.00–12.15' },
      ],
    },
  },
  {
    id: 9002,
    offerId: 'offer-6klasse-intensivkurs-sportferien',
    capacity: 10,
    source: { kind: 'intensivwoche_kurse', kursId: 9002 },
    kurs: 'Kurs A',
    dateLabel: '08.–12. Feb.',
    timeLabel: '09.00–12.15',
    standort: 'Winterthur',
    deliveryModes: ['onsite'],
    ablauf: {
      kind: 'simple',
      items: [
        { id: 'mo', label: 'Mo, 08. Feb.', value: '09.00–12.15' },
        { id: 'di', label: 'Di, 09. Feb.', value: '09.00–12.15' },
        { id: 'mi', label: 'Mi, 10. Feb.', value: '08.30–12.30', highlight: true },
        { id: 'do', label: 'Do, 11. Feb.', value: '09.00–12.15' },
        { id: 'fr', label: 'Fr, 12. Feb.', value: '09.00–12.15' },
      ],
    },
  },
] satisfies SessionDefinition[]

export const sechsKlasseIntensivkurs = {
  id: 'offer-6klasse-intensivkurs-sportferien',
  audienceId: '6',
  slug: 'intensivkurs-sportferien',
  href: '/kurse/6-klasse/intensivkurs-sportferien',
  displayName: 'Intensivkurs-Sportferien',
  tagline: 'Intensives Training in den Sportferien',
  lede: 'Möchte sich Ihr Kind explizit auf die Prüfungsaufgaben und Prüfungssituation an der Gymiprüfung vorbereiten? Im Kurs werden typische Aufgaben erklärt und Prüfungen simuliert.',
  description:
    'Ideal für Kinder, die sich intensiv auf die Prüfungsaufgaben und die Prüfungssituation vorbereiten wollen – inklusive praktischer Tipps & Tricks für die Gymiprüfung.',
  categoryLabel: 'Deutsch & Mathematik',
  laufzeit: '5 Kurstage in den Sportferien',
  dateSummary: ['Feb. – März 2027'],
  features: [
    'Prüfungsaufgaben & Prüfungssituation trainieren',
    '5 aufeinanderfolgende Kurstage in einer Schulferienwoche',
    'Kurszeit: 09.00 – 12.15 Uhr oder 13.15 – 16.30 Uhr',
    'Tipps & Tricks zur Prüfung',
  ],
  regularPriceRappen: 119500,
  currency: 'CHF',
  overviewBullets: [
    '5 Kurstage in den Sportferien',
    'Kurszeit: 09.00 – 12.15 Uhr oder 13.15 – 16.30 Uhr',
    'Kleingruppen: 3 bis max. 10 Kinder',
    'Zürich HB · Winterthur',
  ],
  whyUs: [
    {
      id: 'standortbestimmung',
      title: 'Standortbestimmung zu Kursbeginn',
      description:
        'Wir stellen fest, wo Lücken bestehen, bevor wir mit dem Training starten — nicht danach.',
    },
    {
      id: 'pruefungssimulation',
      title: 'Eine echte Prüfungssimulation',
      description:
        'Reale Prüfungsbedingungen, korrigiert und Schritt für Schritt besprochen — einmal reicht, wenn sie gut gemacht ist.',
    },
    {
      id: 'strategien',
      title: 'Praktische Lern- und Prüfungsstrategien',
      description:
        'Von der richtigen Lernumgebung über den Umgang mit Prüfungsangst und Blackouts bis zu Konzentrationsübungen und der Herangehensweise an typische Prüfungsaufgaben.',
    },
    {
      id: 'betreuung',
      title: 'Betreuung auch ausserhalb der Kurszeit',
      description:
        'Eine gute Begleitung endet für uns nicht mit dem Kursende. Unsere Lehrpersonen stehen bei Fragen auch ausserhalb der Kurszeiten jederzeit per Chat zur Verfügung.',
    },
  ],
  testimonials: [
    {
      id: 'testi-1',
      quote:
        'Die Prüfungssimulation hat mir die Nervosität genommen — ich wusste danach, was mich erwartet.',
      author: 'Teilnehmer, Intensivkurs Sportferien',
    },
    {
      id: 'testi-2',
      quote:
        'In fünf Tagen habe ich mehr gelernt als ich erwartet hätte, ohne dass es sich wie Ferien-Stress anfühlte.',
      author: 'Teilnehmerin, Intensivkurs Sportferien',
    },
  ],
  kurstyp: 'intensivkurs',
  flowSteps: [
    {
      id: 'schritt-1',
      title: 'Wissen aneignen',
      body: 'Prüfungsrelevante Grundlagen in Deutsch und Mathematik im Schnelldurchgang repetieren, typische Aufgabentypen kennenlernen.',
    },
    {
      id: 'schritt-2',
      title: 'Wissen umsetzen',
      body: 'Aufgaben im Unterricht und im Selbststudium trainieren, echte Prüfungssimulation durchführen.',
    },
    {
      id: 'schritt-3',
      title: 'Wissen prüfen',
      body: 'Individuelles Feedback zur Simulation, gemeinsame Besprechung — Ihr Kind weiss danach genau, wo noch Übungsbedarf besteht.',
    },
  ],
  contentSections: [],
  booking: {
    anchorId: 'buchung',
    title: 'Termine und Buchung',
    emptyState: 'Aktuell sind keine Termine verfügbar.',
  },
} as const satisfies CourseOffer

export const sechsKlasseHalbjahreskurs = {
  id: 'offer-6klasse-halbjahreskurs',
  audienceId: '6',
  slug: 'halbjahreskurs',
  href: '/kurse/6-klasse/halbjahreskurs',
  displayName: 'Halbjahreskurs',
  tagline: 'Breite Vorbereitung über das ganze Semester',
  lede: 'Umfassende und optimale Vorbereitung auf die Aufnahmeprüfung ins Langzeitgymnasium — gezielte, individuelle Förderung in Deutsch und Mathematik.',
  description:
    'Umfassende und optimale Vorbereitung auf die Aufnahmeprüfung ins Langzeitgymnasium — gezielte, individuelle Förderung in Deutsch und Mathematik.',
  recommended: true,
  laufzeit: 'Sept. 2026 – März 2027',
  dateSummary: ['Sept. 2026 – März 2027'],
  features: [
    'Deutsch (inkl. Aufsatztraining) & Mathematik',
    'Samstag oder Mittwochnachmittag',
    'Standortbestimmung, Lerncoaching & Prüfungssimulation inbegriffen',
    'Betreuung auch ausserhalb der Kurszeiten',
  ],
  regularPriceRappen: 349000,
  earlyBirdPriceRappen: 339000,
  earlyBirdDeadline: '2026-07-31',
  currency: 'CHF',
  overviewBullets: [
    'Deutsch (inkl. Aufsatztraining) & Mathematik',
    'Samstag oder Mittwochnachmittag',
    'Standortbestimmung, Lerncoaching & Prüfungssimulation inbegriffen',
  ],
  whyUs: [],
  kurstyp: 'halbjahreskurs',
  flowSteps: [],
  contentSections: [],
  booking: {
    anchorId: 'buchung',
    title: 'Termine und Buchung',
    emptyState: 'Aktuell sind keine Termine verfügbar.',
  },
} as const satisfies CourseOffer

export const sechsKlasseAudiencePageModel = {
  audience: sechsKlasse,
  hero: {
    title: 'Vorbereitungskurse für Gymiprüfung 2027',
    description:
      'Zwei Wege zur Vorbereitung auf die Aufnahmeprüfung ins Langzeitgymnasium — ganzjährige Begleitung oder intensives Training in den Sportferien.',
  },
  offers: [sechsKlasseHalbjahreskurs, sechsKlasseIntensivkurs],
  addOnOffers: [],
  existingCourses: [],
} as const satisfies AudiencePageModel

export const sechsKlasseIntensivkursDetailPageModel = {
  audience: sechsKlasse,
  offer: sechsKlasseIntensivkurs,
  sessions: sechsKlasseIntensivkursSessions,
} as const satisfies CourseDetailPageModel

// ---------------------------------------------------------------------------------------------
// 2.2/2.8 ExamSimulationOffer -- Layout_6_Klasse_Pruefungssimulation.html (reicheres Timeline-/
// FAQ-Inhalt als die Kurzfassung auf der Hauptseite; derselbe Preis CHF 145 wird dort UND auf der
// BMS-Prüfungssimulationsseite genannt, diese Detailseite zeigt abweichend CHF 125 -- ein
// Preis-Bug analog Abschnitt 2.3, hier bewusst nicht übernommen, CHF 145 als Mehrheitswert
// verwendet).
// ---------------------------------------------------------------------------------------------

export const sechsKlassePruefungssimulation = {
  id: 'offer-6klasse-pruefungssimulation',
  audienceId: '6',
  slug: 'pruefungssimulation',
  href: '/kurse/6-klasse/pruefungssimulation',
  displayName: 'Prüfungssimulation',
  tagline: 'Offen für alle',
  lede: 'Die echte Prüfungssituation kennenlernen, Zeitmanagement trainieren und gezielt erkennen, wo bis zur Gymiprüfung noch Lernbedarf besteht.',
  description:
    'Eine echte Aufnahmeprüfung unter realen Bedingungen — inklusive schriftlicher Bewertung. Auch ohne vorherige Kursteilnahme buchbar.',
  laufzeit: 'Ein Prüfungstermin, halbtags',
  dateSummary: ['Vormittagsprüfung'],
  features: [
    'Prüfungssimulation nach aktuellem Prüfungsformat',
    'Durchführung unter Prüfungsbedingungen',
    'Schriftliche Bewertung des Aufsatzes',
  ],
  regularPriceRappen: 14500,
  currency: 'CHF',
  priceUnit: 'pro Teilnahme',
  overviewBullets: [
    'Echte Zeitvorgaben, ohne Unterbrechung',
    'Aufgabentypen, Umfang und Schwierigkeitsgrad orientieren sich an der Aufnahmeprüfung',
    'Ruhige, kontrollierte Umgebung',
  ],
  whyUs: [
    {
      id: 'zeitvorgaben',
      title: 'Echte Zeitvorgaben',
      description: 'Die Aufgaben werden im vorgesehenen Zeitrahmen und ohne Unterbrechung gelöst.',
    },
    {
      id: 'aufgaben',
      title: 'Aufgaben',
      description:
        'Aufgabentypen, Umfang und Schwierigkeitsgrad orientieren sich an der Aufnahmeprüfung.',
    },
    {
      id: 'umgebung',
      title: 'Ruhige Umgebung',
      description:
        'Eine kontrollierte Durchführung hilft, Nervosität und Konzentration realistisch zu erleben.',
    },
  ],
  kurstyp: 'pruefungssimulation',
  flowSteps: [
    { id: 'einfuehrung', title: 'Einführung', body: 'Ablauf, Regeln und Material werden kurz erklärt.' },
    { id: 'pruefung', title: 'Prüfung', body: 'Deutsch und Mathematik unter echten Zeitvorgaben.' },
    { id: 'korrektur', title: 'Korrektur', body: 'Fachliche Bewertung mit nachvollziehbarer Punktevergabe.' },
    { id: 'auswertung', title: 'Auswertung', body: 'Stärken, Lücken und nächste Lernschritte werden sichtbar.' },
  ],
  examTimeline: [
    { id: 'deutsch-sprache', subject: 'de', label: 'Deutsch Sprachprüfung', minutes: 45 },
    { id: 'pause-1', subject: 'pause', label: 'Pause', minutes: 0 },
    { id: 'mathematik', subject: 'ma', label: 'Mathematik', minutes: 60 },
    { id: 'pause-2', subject: 'pause', label: 'Pause', minutes: 0 },
    { id: 'deutsch-aufsatz', subject: 'de', label: 'Deutsch Aufsatz', minutes: 60 },
  ],
  faq: [
    {
      id: 'faq-aufgaben',
      question: 'Entsprechen die Aufgaben der echten Gymiprüfung?',
      answer:
        'Die Aufgaben orientieren sich an den relevanten Aufgabentypen, Anforderungen und Zeitvorgaben. Es werden keine zukünftigen Originalprüfungen verwendet.',
    },
    {
      id: 'faq-korrektur',
      question: 'Wird die gesamte Prüfung korrigiert?',
      answer:
        'Der Aufsatz wird persönlich durch eine Lehrperson korrigiert und mit schriftlichem Feedback ins Portal geladen. Für Mathematik und Deutsch Sprache stehen detaillierte Lösungen zur Selbstkorrektur bereit.',
    },
    {
      id: 'faq-ohne-kurs',
      question: 'Kann man auch ohne laufenden Vorbereitungskurs teilnehmen?',
      answer: 'Ja. Die Prüfungssimulation eignet sich auch als unabhängige Standortbestimmung.',
    },
  ],
  booking: {
    anchorId: 'buchung',
    title: 'Termine und Buchung',
    emptyState: 'Aktuell sind keine Termine verfügbar.',
  },
} as const satisfies ExamSimulationOffer

export const sechsKlassePruefungssimulationSessions = [
  {
    id: 9101,
    offerId: 'offer-6klasse-pruefungssimulation',
    capacity: 20,
    source: { kind: 'intensivwoche_kurse', kursId: 9101 },
    kurs: 'Dienstag, 16. Februar',
    dateLabel: 'Dienstag, 16. Februar',
    timeLabel: '08.00–11.45',
    standort: 'Zürich HB',
    deliveryModes: ['onsite'],
    ablauf: { kind: 'simple', items: [] },
  },
  {
    id: 9102,
    offerId: 'offer-6klasse-pruefungssimulation',
    capacity: 20,
    source: { kind: 'intensivwoche_kurse', kursId: 9102 },
    kurs: 'Donnerstag, 18. Februar',
    dateLabel: 'Donnerstag, 18. Februar',
    timeLabel: '08.00–11.45',
    standort: 'Winterthur',
    deliveryModes: ['onsite'],
    ablauf: { kind: 'simple', items: [] },
  },
] satisfies SessionDefinition[]

export const sechsKlassePruefungssimulationPageModel = {
  audience: sechsKlasse,
  offer: sechsKlassePruefungssimulation,
  sessions: sechsKlassePruefungssimulationSessions,
} as const satisfies ExamSimulationPageModel

// ---------------------------------------------------------------------------------------------
// 2.2/2.8 SelfStudyOffer -- Layout_BMS_Selbststudium_Unterseite.html
// ---------------------------------------------------------------------------------------------

export const bmsSelbststudium = {
  id: 'offer-bms-selbststudium',
  audienceId: 'bms',
  slug: 'selbststudium',
  href: '/kurse/bms/selbststudium',
  displayName: 'Selbststudium',
  tagline: 'Selbststudium · BMS',
  lede: 'Eigenständig für die BMS-Aufnahmeprüfung trainieren',
  description:
    'Übungsaufgaben für Deutsch und Mathematik, bisherige BMS-Aufnahmeprüfungen mit Lösungen und persönliches Feedback zu eigenen Aufsätzen — flexibel und im eigenen Tempo.',
  laufzeit: 'Zugang bis zur Prüfung im März 2027',
  dateSummary: ['Einmalig · Zugang bis März 2027'],
  features: [
    'Prüfungsnahe Übungen in Deutsch & Mathematik',
    'Bisherige BMS-Aufnahmeprüfungen mit vollständigen Lösungswegen',
    'Bis zu drei eigene Aufsätze einreichen und Feedback erhalten',
  ],
  regularPriceRappen: 19000,
  currency: 'CHF',
  priceUnit: 'Zugang bis März 2027',
  overviewBullets: [
    'Deutsch & Mathematik: prüfungsnahe Übungen',
    'Prüfungsarchiv mit vollständigen Lösungen',
    'Persönliches Aufsatz-Feedback (bis zu 3 Aufsätze)',
  ],
  whyUs: [
    {
      id: 'uebungen',
      title: 'Prüfungsnahe Übungen',
      description:
        'Aufgaben zu Sprachkompetenz, Textverständnis und Aufsatz sowie zu Arithmetik, Algebra, Geometrie und Sachaufgaben.',
    },
    {
      id: 'archiv',
      title: 'Bisherige Prüfungen & Lösungen',
      description:
        'Ausgewählte BMS-Aufnahmeprüfungen mit vollständigen Lösungswegen für eine realistische Standortbestimmung.',
    },
    {
      id: 'feedback',
      title: 'Persönliches Aufsatz-Feedback',
      description:
        'Bis zu drei eigene Aufsätze einreichen und konkrete Hinweise zu Aufbau, Sprache, Argumentation und Ausdruck erhalten.',
    },
  ],
  kurstyp: 'selbststudium',
  materialAreaId: 'bms',
  access: {
    title: 'Zugang bis zur BMS-Aufnahmeprüfung',
    description:
      'Die Materialplattform bleibt bis zur Prüfung im März 2027 freigeschaltet und wird danach automatisch deaktiviert.',
  },
} as const satisfies SelfStudyOffer

export const bmsSelbststudiumPageModel = {
  audience: bms,
  hero: {
    eyebrow: 'Selbststudium · BMS',
    title: 'Eigenständig für die BMS-Aufnahmeprüfung trainieren',
    description:
      'Übungsaufgaben für Deutsch und Mathematik, bisherige BMS-Aufnahmeprüfungen mit Lösungen und persönliches Feedback zu eigenen Aufsätzen — flexibel und im eigenen Tempo.',
  },
  offer: bmsSelbststudium,
  accessAction: { kind: 'disabled', label: 'Zugang erhalten', disabledReason: 'Buchung folgt in einer späteren Ausbaustufe' },
} as const satisfies SelfStudyPageModel

// ---------------------------------------------------------------------------------------------
// 2.6 SubscriptionPlan -- Layout_Nachhilfe_Seite.html
// ---------------------------------------------------------------------------------------------

export const nachhilfeZehnerAbo = {
  id: 'nachhilfe-10er',
  title: '10er Abo',
  description: '10 Lektionen à 45 Minuten',
  lessons: 10,
  lessonMinutes: 45,
  pricePerLessonRappen: 9500,
  currency: 'CHF',
  features: [
    'Frei einteilbar über das Semester',
    'Individuelle Terminvereinbarung',
    'Deutsch, Mathematik und Französisch',
  ],
  // Abschnitt 9.1: kein realer Checkout vorhanden -- "Abo buchen" bleibt disabled statt auf einen
  // toten #buchung-Anker zu verlinken (Schritt 9, Korrektur beim Verdrahten von /nachhilfe).
  cta: { kind: 'disabled', label: 'Abo buchen', disabledReason: 'Checkout folgt in einer späteren Ausbaustufe' },
} as const satisfies SubscriptionPlan

export const nachhilfeZwanzigerAbo = {
  id: 'nachhilfe-20er',
  title: '20er Abo',
  description: '20 Lektionen à 45 Minuten',
  lessons: 20,
  lessonMinutes: 45,
  pricePerLessonRappen: 9500,
  discountPercent: 10,
  currency: 'CHF',
  features: [
    'Frei einteilbar über das Semester',
    'Individuelle Terminvereinbarung',
    'Deutsch, Mathematik und Französisch',
  ],
  recommended: true,
  // Abschnitt 9.1: kein realer Checkout vorhanden -- "Abo buchen" bleibt disabled statt auf einen
  // toten #buchung-Anker zu verlinken (Schritt 9, Korrektur beim Verdrahten von /nachhilfe).
  cta: { kind: 'disabled', label: 'Abo buchen', disabledReason: 'Checkout folgt in einer späteren Ausbaustufe' },
} as const satisfies SubscriptionPlan

export const nachhilfePageModel = {
  hero: {
    eyebrow: 'Zusatzangebot · Für alle Klassenstufen',
    title: 'Nachhilfe-Abo',
    description:
      'Gezielte 1:1-Unterstützung in Deutsch, Mathematik oder Französisch — unabhängig davon, ob Ihr Kind sonst einen Kurs bei uns besucht. Buchbar als Lektionen-Abo, einlösbar über das ganze Semester.',
  },
  plans: [nachhilfeZehnerAbo, nachhilfeZwanzigerAbo],
} as const satisfies SubscriptionPageModel

// ---------------------------------------------------------------------------------------------
// 2.8 AboutPageModel -- Layout_UeberUns_Seite.html
// ---------------------------------------------------------------------------------------------

export const aboutPageModel = {
  hero: {
    title: 'Gymivorbereitung mit Herz und System',
    description:
      'Wir begleiten Kinder von der 4. Klasse bis zur 2./3. Sek auf dem Weg zur Aufnahmeprüfung — mit individueller Förderung in Kleingruppen statt Frontalunterricht.',
  },
  storySections: [
    {
      id: 'warum-wir-das-tun',
      title: 'Warum wir das tun',
      groups: [
        {
          id: 'motivation',
          items: [
            'Die Aufnahmeprüfung ins Gymnasium ist für viele Kinder der erste grosse Prüfungsmoment ihres Lebens — und für Eltern oft eine Zeit voller offener Fragen: Wo steht mein Kind wirklich? Welcher Weg passt? Wie viel Vorbereitung braucht es wirklich?',
            'Genau hier setzen wir an. Statt Frontalunterricht für alle gleich zu gestalten, beginnen wir mit einer ehrlichen Standortbestimmung und passen die Förderung an die tatsächlichen Lücken an — in Kleingruppen, mit persönlicher Betreuung auch ausserhalb der Kurszeiten.',
          ],
        },
      ],
    },
    {
      id: 'unser-anspruch',
      title: 'Unser Anspruch',
      groups: [
        {
          id: 'anspruch',
          items: [
            'Wir wollen nicht einfach auf eine Prüfung trainieren, sondern Kinder in ihrer Selbstständigkeit stärken — mit Strategien, die auch nach der Prüfung noch tragen.',
            'Dazu gehört für uns eine enge Zusammenarbeit mit den Eltern, transparente Rückmeldungen zum Lernfortschritt und Kursleitende, die den aktuellen Prüfungsstoff aus erster Hand kennen.',
          ],
        },
      ],
    },
  ],
  principles: [
    {
      id: 'naehe-zur-pruefung',
      title: 'Nähe zur Prüfung',
      description:
        'Unsere Kursinhalte orientieren sich direkt am aktuellen Prüfungsformat — keine generischen Übungen von der Stange.',
    },
    {
      id: 'transparenz',
      title: 'Transparenz',
      description:
        'Eltern erhalten regelmässig eine ehrliche Einschätzung des Lernstands — auch wenn sie unbequem ist.',
    },
    {
      id: 'langfristige-begleitung',
      title: 'Langfristige Begleitung',
      description:
        'Wir denken über die einzelne Kurslektion hinaus und begleiten Kinder bis zum Prüfungstag — und darüber hinaus.',
    },
  ],
  teamGroups: [
    {
      id: 'lehrpersonen',
      title: 'Lehrpersonen',
      description:
        'ETH-, Uni- oder PH-Studierende, die sich sowohl durch gute Fachkenntnisse als auch durch gute Umgangsformen auszeichnen. Sie sorgen für den erfolgreichen Unterricht.',
    },
    {
      id: 'expertinnen',
      title: 'Expert:innen',
      description:
        'Führungskräfte entweder aus der Wirtschaft oder aus der Wissenschaft, die sich den Anforderungen moderner Gesellschaften bewusst sind. Sie sind an der Erstellung passender Lernmaterialien mitbeteiligt.',
    },
  ],
  // /kontakt existiert seit Schritt 9 -- ein reales, erreichbares Ziel (Abschnitt 2.8: "nur setzen,
  // wenn ein reales Beratungs-/Kontaktziel existiert").
  cta: { label: 'Kontakt aufnehmen', href: '/kontakt' },
} as const satisfies AboutPageModel

// ---------------------------------------------------------------------------------------------
// 2.8 TargetedServicePageModel -- Layout_Lerncoaching_Seite.html
// ---------------------------------------------------------------------------------------------

export const lerncoachingPageModel = {
  id: 'lerncoaching',
  hero: {
    eyebrow: 'Zusatzangebot · Für alle Klassenstufen',
    title: 'Lerncoaching',
    description:
      'Gute Vorbereitung ist mehr als Fachwissen. Wir stärken, wie Ihr Kind lernt — Struktur, Konzentration und Motivation — und begleiten es damit über die Gymiprüfung hinaus.',
  },
  eligibleAudiences: audiences.filter((audience) => audience.kind === 'gymipruefung'),
  flowSteps: [
    {
      id: 'fachlich-praezise',
      title: 'Fachlich präzise',
      body: 'Deutsch und Mathematik so vermittelt, dass Kinder das Prinzip dahinter verstehen — nicht nur ein Ergebnis auswendig lernen.',
    },
    {
      id: 'wissenschaftlich-abgestuetzt',
      title: 'Wissenschaftlich abgestützt',
      body: 'Unsere Lernstrategien beruhen auf anerkannten Erkenntnissen der Lernpsychologie und wirken über die Prüfung hinaus.',
    },
    {
      id: 'auf-das-kind-zugeschnitten',
      title: 'Auf das Kind zugeschnitten',
      body: 'Jedes Kind bringt andere Voraussetzungen mit — die Begleitung richtet sich danach, statt ein Standardprogramm durchzuziehen.',
    },
  ],
  features: [
    {
      id: 'selbstorganisation',
      title: 'Selbstorganisation',
      description: 'Ein klarer Lernplan und feste Routinen, statt Lernen nach Zufall.',
    },
    {
      id: 'lernstrategien-motivation',
      title: 'Lernstrategien & Motivation',
      description:
        'Konkrete Methoden fürs Behalten und Anwenden — sowie ein gesunder Umgang mit Prüfungsdruck.',
    },
    {
      id: 'individuelle-foerderbedarfe',
      title: 'Individuelle Förderbedarfe',
      description: 'Gezielte Unterstützung bei ADHS, LRS oder Dyskalkulie, bei Bedarf mit Lernstandsanalyse.',
    },
  ],
  contentSections: [
    {
      id: 'einordnung',
      title: 'Lerncoaching einordnen',
      groups: [
        {
          id: 'bereits-inbegriffen',
          subhead: 'Bereits inbegriffen',
          items: [
            'Lerncoaching ist fester Bestandteil unserer Vor- und Halbjahreskurse — ohne Aufpreis, in regelmässigen Zusatzlektionen.',
          ],
        },
        {
          id: 'nachhilfe-gesucht',
          subhead: 'Gezielte Nachhilfe gesucht?',
          items: [
            'Nachhilfe ≠ Lerncoaching: Für konkreten Fachstoff in Deutsch, Mathematik oder Französisch gibt es unser eigenständiges Nachhilfe-Abo (10er/20er).',
          ],
        },
        {
          id: 'beratung',
          subhead: 'Nicht sicher, was zu Ihrem Kind passt?',
          items: [
            'Wir beraten Sie unverbindlich, ob Kurs, Lerncoaching oder Nachhilfe-Abo die passende Wahl ist.',
          ],
        },
      ],
    },
  ],
  faq: [
    {
      id: 'unterschied-nachhilfe',
      question: 'Was unterscheidet Lerncoaching von Nachhilfe?',
      answer:
        'Lerncoaching stärkt, wie Ihr Kind lernt — Struktur, Strategie, Motivation. Nachhilfe vertieft konkreten Fachstoff in Deutsch, Mathematik oder Französisch. Beides ergänzt sich gut.',
    },
    {
      id: 'zusatzkosten',
      question: 'Kostet Lerncoaching zusätzlich zum Kurs?',
      answer: 'Nein — Lerncoaching ist fester Bestandteil unserer Vor- und Halbjahreskurse, ohne Aufpreis.',
    },
  ],
  relatedActions: [
    { label: 'Zu unseren Kursen', href: '/' },
    { label: 'Zum Nachhilfe-Abo', href: '/nachhilfe' },
    { label: 'Beratungsgespräch vereinbaren', href: '/kontakt' },
  ],
} as const satisfies TargetedServicePageModel

// ---------------------------------------------------------------------------------------------
// 2.8 TargetedServicePageModel -- Layout_DistanceLearning_Seite.html
// ---------------------------------------------------------------------------------------------

export const distanceLearningPageModel = {
  id: 'distance-learning',
  hero: {
    eyebrow: 'Zusatzoption · Nur Intensivkurs Sportferien',
    title: 'Distance Learning',
    description:
      'Der Intensivkurs in den Sportferien lässt sich auch von zu Hause oder vom Ferienort aus per Video-Unterricht besuchen — mit denselben Inhalten wie vor Ort.',
  },
  eligibleAudiences: audiences.filter((audience) => audience.id === '6' || audience.id === '2-3-sek'),
  flowSteps: [
    {
      id: 'live-per-video',
      title: 'Live per Video',
      body: 'Teilnahme in Echtzeit am selben Unterricht wie die Kinder vor Ort — keine Aufzeichnung, kein Nacharbeiten im Nachhinein.',
    },
    {
      id: 'gleiche-inhalte',
      title: 'Gleiche Inhalte',
      body: 'Derselbe Ablauf, dieselben Übungen und Materialien wie im Präsenzunterricht am Kursstandort.',
    },
    {
      id: 'keine-zusatzkosten',
      title: 'Keine Zusatzkosten',
      body: 'Distance Learning ist eine Teilnahmeform des Intensivkurses, kein separat zu buchendes Angebot.',
    },
  ],
  features: [],
  contentSections: [
    {
      id: 'fuer-wen',
      title: 'Für wen es ist',
      groups: [
        {
          id: 'verfuegbarkeit',
          items: ['Verfügbar für den Intensivkurs Sportferien von zwei Prüfungsjahren.'],
        },
        {
          id: 'ausschluss',
          items: [
            'Bei allen anderen Kursen (Wochenkurse, Halbjahreskurse, Lerncamp der 4./5. Klasse und 1. Sek) ist Distance Learning aktuell nicht verfügbar — dort findet der Unterricht ausschliesslich vor Ort statt.',
          ],
        },
      ],
    },
  ],
  faq: [
    {
      id: 'extra-kosten',
      question: 'Kostet die Teilnahme per Distance Learning extra?',
      answer: 'Nein — es ist dieselbe Kursbuchung wie vor Ort, nur die Teilnahmeform ändert sich.',
    },
    {
      id: 'wechsel',
      question: 'Kann ich zwischen den Kurstagen wechseln — mal vor Ort, mal online?',
      answer:
        'Die Teilnahmeform wird bei der Anmeldung festgelegt; ein spontaner Wechsel während des Kurses ist nicht vorgesehen.',
    },
    {
      id: 'warum-nicht-ueberall',
      question: 'Warum gibt es Distance Learning nicht bei allen Kursen?',
      answer:
        'Der Intensivkurs in den Sportferien fällt oft mit Familienferien zusammen — deshalb bieten wir hier gezielt die Möglichkeit, von unterwegs teilzunehmen. Bei den länger laufenden Wochen- und Halbjahreskursen ist die Präsenz vor Ort Teil des Konzepts.',
    },
  ],
} as const satisfies TargetedServicePageModel

// ---------------------------------------------------------------------------------------------
// 2.8 TipsPageModel -- Layout_Tipps_Uebersichtsseite.html
// ---------------------------------------------------------------------------------------------

export const tipsPageModel = {
  hero: {
    eyebrow: 'Wissen & Orientierung',
    title: 'Tipps rund um die Gymivorbereitung',
    description:
      'Kurze, konkrete Einblicke aus unserer Praxis — zur Prüfungsplanung, zum Lernen zu Hause, zu Deutsch und Mathematik sowie zu besonderen Förderbedarfen. Für Eltern, die sich einen Überblick verschaffen möchten, bevor sie ins Detail gehen.',
  },
  categories: [
    {
      id: 'pruefung-planung',
      title: 'Prüfung & Planung',
      tips: [
        {
          id: 'langzeit-kurzzeit',
          title: 'Langzeit- oder Kurzzeitgymnasium — welcher Weg passt?',
          excerpt:
            'Beide Wege führen ans Gymnasium, unterscheiden sich aber deutlich in Tempo, Einstiegsalter und Anforderungsprofil. Eine Übersicht der wichtigsten Unterschiede, damit die Entscheidung leichter fällt.',
        },
        {
          id: 'wann-beginnen',
          title: 'Wann sollte die Vorbereitung beginnen?',
          excerpt:
            'Ein früher Einstieg schon in der 5. Klasse gibt vielen Kindern Sicherheit und Zeit, Lücken in Ruhe zu schliessen — muss aber nicht für jedes Kind der richtige Zeitpunkt sein.',
        },
        {
          id: 'pruefungsformat-aenderungen',
          title: 'Was sich am Prüfungsformat zuletzt geändert hat',
          excerpt:
            'Prüfungsreglemente werden periodisch angepasst. Die wichtigsten Änderungen im Überblick, damit Sie mit aktuellem Wissen planen.',
        },
      ],
    },
    {
      id: 'lernen-motivation',
      title: 'Lernen & Motivation',
      tips: [
        {
          id: 'lernen-zuhause-kraftakt',
          title: 'Wenn Lernen zu Hause zum Kraftakt wird',
          excerpt:
            'Streit ums Üben ist oft ein Beziehungsthema, kein Fleissproblem. Warum Struktur und ein klar getrennter Rahmen zwischen Eltern- und Lernrolle hier oft mehr bewirken als zusätzlicher Druck.',
        },
        {
          id: 'struktur-die-hilft',
          title: 'Struktur, die wirklich hilft',
          excerpt:
            'Ein realistischer Wochenplan mit festen Lernblöcken schafft Verlässlichkeit — für Kinder wie für Eltern. Konkrete Ansätze für den Alltag zu Hause.',
        },
        {
          id: 'mental-stark',
          title: 'Mental stark in die Prüfung',
          excerpt:
            'Nervosität vor der Prüfung ist normal — entscheidend ist, wie gut ein Kind lernt, damit umzugehen. Einfache Techniken, die sich in den Alltag einbauen lassen.',
        },
      ],
    },
    {
      id: 'deutsch-aufsatz',
      title: 'Deutsch & Aufsatz',
      tips: [
        {
          id: 'guter-aufsatz',
          title: 'Was einen guten Aufsatz ausmacht',
          excerpt:
            'Nicht Perfektion zählt, sondern ein klarer roter Faden, eigene Sprache und ein glaubwürdiger Inhalt. Worauf es bei der Bewertung wirklich ankommt.',
        },
        {
          id: 'kommasetzung',
          title: 'Kommasetzung ohne Grammatikstress',
          excerpt:
            'Mit einem einfachen Bild statt trockener Regeln verstehen viele Kinder Satzgrenzen deutlich schneller. Ein praktischer Ansatz fürs Üben zu Hause.',
        },
        {
          id: 'rechtschreibung-verstehen',
          title: 'Rechtschreibung verstehen statt auswendig lernen',
          excerpt: 'Wer die Logik hinter Regeln erkennt, muss weniger pauken. Wie Kinder ein echtes Gefühl für Rechtschreibung entwickeln.',
        },
      ],
    },
    {
      id: 'mathematik',
      title: 'Mathematik',
      tips: [
        {
          id: 'loesungsweg-zaehlt',
          title: 'Der Lösungsweg zählt so viel wie das Resultat',
          excerpt:
            'Ein richtiges Ergebnis allein reicht an der Prüfung oft nicht — die Nachvollziehbarkeit des Rechenwegs bringt zusätzliche Punkte. Was das für die Vorbereitung bedeutet.',
        },
        {
          id: 'textaufgaben-meistern',
          title: 'Textaufgaben Schritt für Schritt meistern',
          excerpt:
            'Die grösste Hürde ist oft nicht das Rechnen, sondern das Verstehen der Aufgabenstellung. Eine Herangehensweise, die Kindern hier Sicherheit gibt.',
        },
      ],
    },
    {
      id: 'foerderbedarfe',
      title: 'Besondere Förderbedarfe',
      tips: [
        {
          id: 'konzentration-schwerfaellt',
          title: 'Wenn Konzentration besonders schwerfällt',
          excerpt:
            'Manche Kinder brauchen mehr Struktur und kürzere Lerneinheiten, um ihr Potenzial zu zeigen. Was in der Vorbereitung dann besonders hilft.',
        },
        {
          id: 'nachteilsausgleich',
          title: 'Nachteilsausgleich — was Eltern wissen sollten',
          excerpt:
            'Bei bestimmten Diagnosen können Anpassungen bei der Prüfung beantragt werden. Ein Überblick, was dafür nötig ist und wie der Ablauf funktioniert.',
        },
      ],
    },
  ],
  faq: [
    {
      id: 'kurs-noetig',
      question: 'Muss ich zuerst einen Kurs buchen, um diese Tipps zu nutzen?',
      answer: 'Nein — die Tipps stehen allen Eltern offen, unabhängig davon, ob Ihr Kind bereits einen Kurs bei uns besucht.',
    },
    {
      id: 'klassenstufen',
      question: 'Für welche Klassenstufen sind die Tipps relevant?',
      answer:
        'Die meisten Beiträge sind für alle Stufen zwischen 4. Klasse und 2./3. Sek hilfreich; einzelne Themen (z. B. Prüfungsformat-Änderungen) sind spezifisch für das jeweilige Prüfungsjahr gekennzeichnet.',
    },
    {
      id: 'neue-beitraege',
      question: 'Wie oft kommen neue Beiträge dazu?',
      answer: 'Wir ergänzen die Sammlung laufend um neue Themen aus unserer Beratungs- und Kurspraxis.',
    },
  ],
} as const satisfies TipsPageModel

// ---------------------------------------------------------------------------------------------
// 2.8 TargetedServicePageModel -- Layout_Pruefungssimulation_Landingpage.html
// ---------------------------------------------------------------------------------------------

export const pruefungssimulationPageModel = {
  id: 'pruefungssimulation',
  hero: {
    eyebrow: 'Zusatzangebot · Ohne Kursverpflichtung',
    title: 'Prüfungssimulation',
    description:
      'Eine echte Aufnahmeprüfung unter realen Bedingungen — inklusive schriftlicher Bewertung und individuellem Feedback. Auch ohne vorherige Kursteilnahme buchbar.',
  },
  eligibleAudiences: audiences.filter((audience) => audience.id === '6' || audience.id === '2-3-sek'),
  flowSteps: [
    {
      id: 'anmeldung',
      title: 'Anmeldung',
      body: 'Buchung eines einzelnen Prüfungstermins — unabhängig davon, ob Ihr Kind sonst einen Kurs bei uns besucht.',
    },
    {
      id: 'durchfuehrung',
      title: 'Durchführung',
      body: 'Die vollständige Aufnahmeprüfung nach aktuellem Prüfungsformat, unter denselben zeitlichen und organisatorischen Bedingungen wie am echten Prüfungstag.',
    },
    {
      id: 'auswertung-feedback',
      title: 'Auswertung & Feedback',
      body: 'Schriftliche Korrektur aller Teile, eine Einschätzung des aktuellen Leistungsstands und konkrete Hinweise, woran Ihr Kind bis zur echten Prüfung noch arbeiten kann.',
    },
  ],
  features: [
    {
      id: 'pruefungsnahe-bedingungen',
      title: 'Prüfungsnahe Bedingungen',
      description: 'Gleicher Zeitrahmen, gleiches Format und gleiche Aufgabentypen wie an der echten Aufnahmeprüfung.',
    },
    {
      id: 'schriftliche-bewertung',
      title: 'Schriftliche Bewertung',
      description: 'Detaillierte Korrektur inkl. Aufsatz, mit Einschätzung des aktuellen Leistungsstands.',
    },
    {
      id: 'offen-fuer-alle',
      title: 'Offen für alle',
      description: 'Keine vorherige Kursteilnahme nötig — buchbar für jedes Kind der passenden Klassenstufe.',
    },
  ],
  contentSections: [
    {
      id: 'fuer-wen',
      title: 'Für wen es ist',
      groups: [
        {
          id: 'zwei-pruefungsjahre',
          items: ['Die Prüfungssimulation richtet sich an zwei Prüfungsjahre.'],
        },
        {
          id: 'ausschluss',
          items: [
            'Für alle anderen Klassenstufen (4./5. Klasse, 1. Sek) ist dieses Angebot noch nicht relevant — die jeweilige Aufnahmeprüfung findet erst nach 6. Klasse bzw. 2./3. Sek statt.',
          ],
        },
      ],
    },
  ],
  faq: [
    {
      id: 'vorheriger-kurs',
      question: 'Muss mein Kind vorher einen Kurs bei Ihnen besucht haben?',
      answer: 'Nein. Die Prüfungssimulation ist ein eigenständiges Angebot und unabhängig von einer Kursteilnahme buchbar.',
    },
    {
      id: 'klassenstufen',
      question: 'Für welche Klassenstufen gibt es die Prüfungssimulation?',
      answer:
        'Nur für 6. Klasse (Vorbereitung Langzeitgymnasium, ZAP1) und 2./3. Sek (Vorbereitung Kurzzeitgymnasium, ZAP2) — da nur in diesen beiden Jahren die jeweilige Aufnahmeprüfung stattfindet.',
    },
    {
      id: 'auswertung-tempo',
      question: 'Wie schnell erhalten wir die Auswertung?',
      answer: 'Die schriftliche Bewertung inkl. Einschätzung des Leistungsstands erhalten Sie zeitnah nach der Simulation.',
    },
  ],
} as const satisfies TargetedServicePageModel
