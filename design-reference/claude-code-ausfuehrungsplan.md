# Claude-Code-Ausführungsplan: Kursseiten- und Startseiten-Migration

> **Migrations-Readiness-Abgleich 16.07.2026:** Dieser Plan berücksichtigt jetzt alle 37
> HTML-Referenzen. BMS, Matura und das vorhandene Über-uns-Mockup sind verbindlicher Scope.
> Siebzehn eindeutig auflösbare interne Dateilinks/Platzhalter wurden in den Referenzen korrigiert.
> Für BMS ist `Layout_BMS_Intensivkurs_Unterseite.html` die verbindliche Kurs-Unterseite. Die
> BMS-Selbststudium-Seite liegt inzwischen als BMS-spezifisch angepasste Referenz vor. Alle
> dynamischen Kursrouten verwenden das Zielgruppenmodell `Audience` aus dem
> Architektur-Briefing und nicht mehr die unvollständige Annahme von nur fünf Klassenstufen.

> **Änderungshinweis (dieser Abgleich):** Die vollständigen Light-/Dark-Mode-Tokens des neuen
> Navy-/Sage-/Gold-Designs wurden in Schritt 4 und der Verifikation ergänzt. Fachfarben werden
> über CSS-Variablen je Theme aufgelöst; Komponenten erhalten keinen eigenen Theme-State.
> Die Caching-Anweisungen wurden an `cacheComponents: true` in Next.js 16 angepasst: stabile Daten
> nutzen `use cache`, volatile Verfügbarkeit bleibt über `connection()` request-time, und
> Server Actions aktualisieren deterministisch über `updateTag()` bzw. `refresh()`.
> Das Datenmodell deckt nun alle geplanten Komponenten über benannte Domain-, Inhalts- und
> Page-Models vollständig ab; discriminated unions und kompilierende Fixtures machen fehlende
> Pflichtdaten bereits vor dem Komponentenbau sichtbar.
> Die sechs lokalen Beispielkurse sowie mögliche Remote-Bestandskurse und alle daran gebundenen
> Anmeldungen werden nun über ein verbindliches Inventar-, Mapping-, Backfill- und
> Vorher-Nachher-Gate berücksichtigt; IDs/FKs bleiben unverändert und Französisch/NMG werden nicht
> ausgefiltert.
> Schritt 12 enthält nun ein verbindliches, fehlerschließendes Gate für TypeScript, ESLint,
> Produktions-Build, lokale Supabase-Migrationen/RLS sowie automatisierte Redirect-, Routen- und
> Linktests; eine rein manuelle Sichtprüfung reicht nicht mehr aus.
> Die `SiteNav` wurde eindeutig dem öffentlichen `app/[locale]/(marketing)/layout.tsx` zugeordnet;
> das globale `app/layout.tsx` und einzelne Seiten dürfen sie nicht rendern.
> Schritt 4 und die Verifikation wurden ausserdem auf den tatsächlichen
> Tailwind-CSS-4-/shadcn/ui-Stand ausgerichtet: CSS-first-Konfiguration in `app/globals.css`, kein
> neues `tailwind.config.js`, kanonischer Komponentenpfad `app/components/ui` und eine passende
> `components.json` für die CLI. Schritt 3 wurde auf eine klar abgegrenzte Public-only-i18n-
> Strategie korrigiert: Nur die neuen Marketing-/Kursseiten liegen unter `app/[locale]/`, während
> Auth, Dashboard, Übungen, Prüfungen, Aufsätze, Intensivkurse, Materialien und API ausserhalb der
> i18n-Verschiebung und ohne Locale-Präfix bleiben. Die fachliche Erweiterung von Login und
> Materialien ist separat in Abschnitt 2.11/Schritt 11a definiert. Der
> bestehende Auth-Proxy wird erweitert, nicht ersetzt. Der Launch ist verbindlich Deutsch-only;
> Englisch bleibt bis zu vollständigen Übersetzungen und korrektem Dokument-`lang` inaktiv. Schritt 9 um einen
> Hinweis zur Distance-Learning-Dateiduplikat ergänzt. Schritt 10 um den korrekten Dateinamen der
> 1.-Sek-Vorkurs-Unterseite sowie eine explizite Anweisung ergänzt, widersprüchliche Mockup-Preise
> nicht zu veröffentlichen. Sämtliche Dateiverweise wurden an die
> tatsächlich flache Struktur von `design-reference/` angepasst; frühere `mockups/...`-Pfade und
> der Hinweis auf ein nicht vorhandenes Distance-Learning-Duplikat wurden entfernt.

**Verbindlicher Bestandssnapshot (geprüft am 15.07.2026):** Next.js `16.1.6` App Router,
React `19.2.3`, Tailwind CSS 4, NextAuth 5 Beta und Supabase sind eingerichtet. Die aktuelle
Startseite liegt in `app/page.tsx`, ihre mobile Navigation in `app/components/zap/navbar.tsx`.
Die öffentliche Route `/kurse` besitzt bereits Supabase-Datenabruf und Anmeldung. i18n,
`app/[locale]`, ein Marketing-Layout und `components.json` fehlen. Details und Tabellenbestand
stehen im Repository-Snapshot am Anfang des Architektur-Briefings. Schritt 1 prüft künftig nur
noch, ob dieser Snapshot seit dem 15.07.2026 abgewichen ist.

Voraussetzung: `design-reference/` liegt bereits im Projekt-Root. Das Verzeichnis enthält das
Briefing, `SessionTable.jsx`, `Startseite.html` und sämtliche weiteren HTML-Mockups direkt auf
derselben Ebene — es gibt keine `mockups/`-Unterordner. Die Dateinamen werden in den folgenden
Prompts deshalb immer relativ zu `design-reference/` angegeben.

Jeder Schritt ist ein eigener Prompt. Bei den mit **Plan Mode** markierten Schritten: erst
Shift+Tab (zweimal), Vorschlag prüfen, dann freigeben.

**Wichtig zur Nutzung dieser Datei:** Nicht die ganze Datei auf einmal als einen Prompt geben.
Mehrere Schritte enthalten bewusst Kontrollpunkte („Zeig mir vorher deinen Plan, bevor du
Ordner verschiebst") — die funktionieren nur, wenn jeder Schritt einzeln gesendet und geprüft
wird, bevor der nächste startet. Ein Schritt = eine Nachricht. Neue Session lohnt sich bei den
grösseren Brüchen (nach Schritt 1, vor Schritt 3, vor Schritt 6). Damit Claude Code trotzdem
den Gesamtzusammenhang kennt, wird diese Datei selbst in `CLAUDE.md` referenziert (siehe
Schritt 2) — das ersetzt aber nicht die schrittweise, von euch gesteuerte Ausführung.

---

## Schritt 1 — Bestandsaufnahme (Plan Mode)

```
Validiere den datierten Repository-Bestand am Anfang von
@design-reference/architektur-briefing-kursseiten.md gegen den aktuellen Code. Prüfe mindestens:

1. Versionen und App Router (`package.json`, `app/`). Prüfe insbesondere den aktuellen Drift
   `next@16.1.6` vs. `@next/bundle-analyzer@^16.2.2`; gleiche sie vor dem ersten Build auf eine
   bewusst freigegebene Version ab, ohne im Zuge der Migration still Next.js zu aktualisieren.
2. Bestehende Startseite und `app/components/zap/navbar.tsx`: Mobile-Menü und Login-CTA sind
   vorhanden. Vergleiche sie mit der aktualisierten Referenz `Startseite.html`: verbindlich sind
   sieben flache Zielgruppen-Direktlinks mit kompakten Labels, Nachhilfe, Über uns, EN, Kontakt
   und Login — kein Angebot-Dropdown.
3. Tailwind-4-CSS-first-Setup und alle Dateien unter `app/components/ui`; `components.json` und
   die fünf im Briefing genannten Primitives fehlen laut Snapshot.
4. i18n ist noch nicht installiert; `app/[locale]`, `i18n/` und `messages/` fehlen.
5. Supabase ist bereits im Code verdrahtet: prüfe `intensivwoche_kurse`,
   `intensivwoche_anmeldungen`, die View, RLS, `/kurse`, Modal, Zod-Schema und Server Action.
   Klassifiziere zusätzlich die sechs durch Migration 003 angelegten Beispielkurszeilen anhand
   ihrer Referenzen als Bestand oder lokale Demo. Inventarisiere alle aktuellen Kurs-/Anmeldungs-
   IDs und Counts, die vier Bestandsfächer, Klassenstufenwerte sowie den Drift um
   `created_by` (im Code/DB-Typ vorhanden, im eingecheckten Migrationsverlauf nicht angelegt).
   Vergleiche auch `types/database.ts` mit der derzeit ungenutzten zweiten Generierung
   `lib/supabase/database.types.ts`; dokumentiere Drift und bestimme `types/database.ts` als
   kanonische Importquelle.
   Prüfe die doppelte Migrationsversion `002` und den ungültigen initialen FK
   `intensivwoche_anmeldungen.kurs_id -> public.courses(id)`; `public.courses` wird im lokalen
   Verlauf nicht angelegt. Prüfe ausserdem, dass `profiles` und `subjects` vor ihrer ersten
   Verwendung angelegt werden, dass `subject_id` exakt denselben Typ wie `subjects.id` besitzt und
   dass `006_seed_test_data.sql` keine Test-/Auth-Daten in eine deploybare Migration einschleust.
6. Auth: prüfe sowohl die Matcher/Redirects in `proxy.ts` als auch den zusätzlichen Guard in
   `app/(dashboard)/layout.tsx` und inventarisiere sämtliche geschützten Route-Group-Seiten.
   Prüfe zusätzlich `/materialien`, `learning_materials`, Storage-URLs, Material-Upload,
   `profiles.class_level` und den Login-Redirect. Erwarteter Ist-Stand: Login leitet immer nach
   `/dashboard`; die Materialseite lädt alle `is_public`-Zeilen ohne Einschreibungsrecht;
   `class_levels` ist nur ein Clientfilter und kennt im Upload nur 5./6. Klasse; eine kanonische
   eingecheckte `learning_materials`-Baseline/RLS-Migration fehlt.
7. Referenzbestand: 37 HTML-Dateien, zwei Markdown-Dateien und `SessionTable.jsx`; alle HTML-
   Dateien besitzen Navigation, acht öffentliche Seiten zusätzlich Header/Footer. Die Admin-
   Die vier `Layout_Admin_*.html`-Referenzen besitzen Dashboard-Header ohne Marketing-
   Footer. Prüfe ausserdem alle relativen
   `.html`-Links und Anker. Erwarteter Restbestand: keine fehlenden Datei-/Ankerziele und 80
   `href="#"`-Platzhalter in 23 Dateien; jede Abweichung ist zu melden.
   Der Abgleich umfasst ausdrücklich auch die in späteren Glob-Mustern nur implizit erfassten
   Dateien `Layout_1_Sek_Hauptseite.html`, `Layout_1_Sek_Intensivkurs_Unterseite.html`,
   `Layout_2_Sek__Hauptseite.html`, `Layout_5_Klasse_Hauptseite.html`,
   `Layout_5_Klasse_Halbjahreskurs_Unterseite.html`,
   `Layout_5_Klasse_Intensivkurs_Unterseite.html`, `Layout_6_Klasse_Halbjahreskurs_Unterseite.html`
   und `Layout_6_Klasse_Intensivkurs_Unterseite.html`.

Melde nur Abweichungen vom Snapshot mit Dateipfad und Auswirkung. Wenn nichts abweicht, bestätige
den Snapshot ausdrücklich. Keine Code-Änderungen.
```

## Schritt 2 — `CLAUDE.md` erzeugen und Kontext verankern

```
/init
```

Danach folgenden Prompt senden, damit Claude Code die Ergänzung selbst einfügt
(nicht mehr manuell im Editor eintragen):

```
Füge folgenden Abschnitt am Ende von CLAUDE.md ein, unverändert:

## Kursseiten- und Startseiten-Migration
Architektur-Vorgaben, Datenmodell, Komponentenschnitt, Routentabelle:
@design-reference/architektur-briefing-kursseiten.md
Referenz-Prototyp Buchungstabelle: @design-reference/SessionTable.jsx
Die Startseite in design-reference/Startseite.html ERSETZT die
bestehende Startseite vollständig, sie wird nicht ergänzt.

## Prinzipien (gelten sessionübergreifend, unabhängig vom aktuellen Schritt)
- Wiederkehrende UI-Elemente (Cards, Buttons, Badges, Tabellen, Nav) werden IMMER
  als zentrale Komponente unter app/components/ gebaut, nie pro Seite/Klassenstufe
  dupliziert oder kopiert.
- Vor dem Anlegen einer neuen Komponente: app/components/ durchsuchen, ob eine
  bestehende erweitert werden kann, statt eine neue mit ähnlichem Markup zu bauen.
- Unterschiede zwischen Klassenstufen werden ausschliesslich über Props/Daten
  gelöst, nie über Code-Verzweigungen, Copy-Paste oder seiten-spezifische Varianten.

## Ausführungsplan
Vollständiger Schritt-für-Schritt-Plan für diese Migration:
@design-reference/claude-code-ausfuehrungsplan.md
Nur den jeweils angeforderten Schritt ausführen, nicht vorgreifen.
```

**Warum das hier und nicht nur im Briefing steht:** `CLAUDE.md` wird bei jeder neuen
Session automatisch geladen — das Briefing nur, wenn es explizit per `@`-Referenz
genannt wird. Diese drei Regeln sollen unabhängig davon greifen, welcher der
folgenden Schritte gerade läuft oder ob zwischendurch eine neue Session gestartet wird.

## Schritt 3 — Internationalisierung nur für öffentliche Marketingseiten

**Verbindliche Entscheidung:** Diese Migration startet Deutsch-only. `en` darf vorbereitet, aber
weder geroutet noch im Sprachumschalter angeboten werden. Die Aktivierung von Englisch ist ein
separates Gate gemäss Abschnitt 8 des Architektur-Briefings.

```
Lies Abschnitt 8 (Internationalisierung) aus
@design-reference/architektur-briefing-kursseiten.md und prüfe die bestehende `proxy.ts` sowie
`app/(dashboard)/layout.tsx` vollständig. Laut Bestand fehlt next-intl; bestätige das unmittelbar
vor der Änderung und installiere/konfiguriere es ausschliesslich für die neuen öffentlichen
Marketing-/Kursseiten:

- `app/[locale]/(marketing)/...` für Startseite, Kurse, Lerncoaching, Nachhilfe, Tipps,
  Distance Learning, Prüfungssimulation, Kontakt und Über uns
- `i18n/routing.ts` mit `locales: ['de']`, `defaultLocale: 'de'` und
  `localePrefix: 'always'`
- `i18n/request.ts`, `i18n/navigation.ts`, `messages/de.json`
- `next.config.ts`, umschlossen mit `createNextIntlPlugin('./i18n/request.ts')`

WICHTIG: `app/(auth)`, `app/(dashboard)`, `app/api` und die bestehenden Routen `/login`,
`/register`, `/dashboard`, `/uebungen`, `/pruefung`, `/profil`, `/trainer`, `/aufsaetze`,
`/intensivkurse`, `/materialien` sowie ihre Unterrouten bleiben an ihrem aktuellen Ort und erhalten
KEIN Locale-Präfix. Auch `app/(public)/kurse` bleibt zunächst als `/kurse` bestehen. Bestehende
Links, Redirects, NextAuth-Callbacks, Proxy-Matcher und Layout-Guards nicht stillschweigend
umschreiben.

Es darf nur eine `proxy.ts` geben: Ersetze oder überschreibe die vorhandene Auth-Proxy-Logik nicht.
Erweitere dieselbe Datei so, dass sie zuerst zwischen öffentlichen lokalisierten Marketingpfaden
und den bestehenden Auth-/Protected-Pfaden unterscheidet. Nur Marketingpfade werden an den
next-intl-Handler übergeben; Auth-/Protected-Pfade laufen unverändert durch die bestehende
Token-/Redirect-Logik. `/api`, `/_next` und Dateien mit Erweiterung werden vom i18n-Matcher
ausgeschlossen. Der unlokalisierte Login bleibt `/login`.

Validiere `params.locale`, rufe in jedem relevanten Marketing-Layout und jeder statisch
gerenderten Marketing-Page vor Übersetzungszugriffen `setRequestLocale(locale)` auf und liefere
für ungültige Locales `notFound()`. Lege `generateStaticParams()` für die aktive Locale an.
Das globale `<html lang="de">` bleibt für den Deutsch-only-Launch korrekt. Aktiviere `en` nicht,
bevor der in Abschnitt 8 geforderte locale-abhängige Dokument-Sprachwert implementiert und
getestet ist.

Lege nur das Grundgerüst und den kombinierten Proxy an; verschiebe in diesem Schritt noch keine
Seiteninhalte. Zeig mir vorher deinen Plan sowie die vorgesehene Proxy-Verzweigung, bevor du Dateien
änderst.
```

## Schritt 4 — Grundlage einrichten (Tokens + shadcn-Primitives, einmalig, Plan Mode)

```
Lies @design-reference/architektur-briefing-kursseiten.md, Abschnitt 1, 1a, 1b und 1c.
Richte auf Basis davon die Grundlage ein, bevor wir einzelne Kursseiten bauen:

1. Bewahre die vorhandene Tailwind-4-Basis in `app/globals.css`: `@import "tailwindcss"`,
   `@import "tw-animate-css"`, das Typography-Plugin, `@custom-variant dark`, die vorhandenen
   Token-Namen in `:root`/`.dark` und den bestehenden `@theme inline`-Block. Übernimm die
   vollständigen Light-/Dark-Werte aus Abschnitt 1, ohne Sidebar-/Chart-Tokens zu löschen.
   Lege keine `tailwind.config.js` an.
2. Lege im Projekt-Root die in Abschnitt 1a definierte `components.json` an bzw. validiere sie:
   `tailwind.config` bleibt leer, CSS zeigt auf `app/globals.css`, `ui` auf
   `@/app/components/ui`, `components` auf `@/app/components` und `utils` auf
   `@/lib/utils`. Nimm `shadcn` exakt versioniert als Dev-Dependency auf und führe danach
   `npm exec -- shadcn info` aus.
3. Überschreibe keine vorhandenen shadcn-Komponenten. Ergänze nur die fehlenden Primitives
   `table`, `collapsible`, `toggle-group`, `sheet` und `tooltip` mit
   `npm exec -- shadcn add ...` ohne `--overwrite`. Prüfe den Diff, insbesondere Änderungen an
   `app/globals.css`, `package.json` und Lockfile, bevor du sie übernimmst.
4. Ergänze Fachfarben für Deutsch, Mathematik sowie die Bestandsfächer Französisch und NMG als
   Variablen in `:root` und `.dark` und mappe sie im vorhandenen
   `@theme inline`-Block über `var(...)`; keine festen Fachfarben direkt im Theme-Mapping und
   keine komponenteneigenen Dark-Mode-Paletten. Lade Fraunces, Inter und IBM Plex Mono über
   `next/font/google` nur im Marketing-Layout; die bestehende Geist-Typografie anderer
   App-Bereiche bleibt unverändert.
5. Baue `PageContainer`, `PageIntro`, `Section`, `SectionHeading` und `ResponsiveGrid` unter
   `app/components/layout`. Alle shadcn-Imports verwenden ausschliesslich
   `@/app/components/ui/*`; es darf kein zweiter Ordner `components/ui` entstehen.

Noch keine Kurs-Inhalte, keine Datenanbindung — nur die Grundlage.
Zeig mir vorher den Plan inklusive der erwarteten Dateidiffs, bevor du Dateien änderst.
```

## Schritt 5 — Datenmodell / Typen + Supabase-Schema (VOR den Komponenten)

```
Lies Abschnitt 2 und den Repository-Bestand aus
@design-reference/architektur-briefing-kursseiten.md. Prüfe zuerst die vorhandenen Typen
`types/kurs.ts`, `types/kurs-form.ts`, `types/intensivwoche.ts`, `types/database.ts`,
`lib/supabase/database.types.ts`, die Supabase-
Migrationen für `intensivwoche_kurse`/`intensivwoche_anmeldungen` sowie alle Zugriffe aus
`app/(public)/kurse`, `app/(dashboard)/dashboard/kurse` und `app/(dashboard)/intensivkurse`.

Implementiere vor jedem Komponentenbau sämtliche Typen aus Abschnitt 2.1–2.12 in einem gemeinsamen
Domain-/Marketing-Modul:

- Kerndaten: `KlassenstufeId`, `AudienceId`, `AudienceCapabilities`, `Audience`, die verengte
  `Klassenstufe`, `Kurstyp`, `OfferBase` und die discriminated union
  `Offer` aus `CourseOffer`, `ExamSimulationOffer`, `SelfStudyOffer`
- Termine/Buchung: `Ablauf`, stabile/cachebare `SessionDefinition`, request-time `SessionRow`, `SessionAvailability`, `AvailabilityStatus`,
  `BookingAction`, `BookingCopy`, `SessionSource`, `WeekOption`, `SessionColumn`
- Inhalte: `AudienceHeroContent`, `FlowStep`, `ContentSection`, `ContentGroup`, `Feature`,
  `Testimonial`, `FaqItem`, `ExamTimelineSegment`, `Subject`
- Navigation/Startseite: `LinkAction`, `NavItem`, `SiteNavModel`, `SiteFooterModel`, `ServiceCardModel`,
  `ServiceSubgroupModel`, `TeamGroup`
- Seitenmodelle: `MarketingLayoutModel`, `HomePageModel`, `AudiencePageModel`,
  `CourseDetailPageModel`, `TargetedServicePageModel`, `ExamSimulationPageModel`,
  `SelfStudyPageModel`, `SubscriptionPageModel`, `TipsPageModel`, `AboutPageModel`, `PlaceholderPageModel`
- Redaktion: `TipCategory`, `TipPreview`
- Nachhilfe: `SubscriptionPlan`
- Bestandskurse: `ExistingCourseCardModel`; `Subject` muss `de`, `ma`, `fr`, `nmg` und `mixed`
  abdecken
- Materialzugriff: `MaterialAreaId` (`langzeitgymi`, `kurzgymi`, `bms`, `matura`),
  `MaterialAccessGrant`, Grant-Status/Quelle und eine explizite Audience-zu-Bereich-Zuordnung;
  Profil-Klassenstufe und sichtbare Labels sind keine Autorisierungskeys
- Jahresverwaltung: `OfferEditionStatus`, `OfferEdition`, `CourseSessionDefinition` und das
  Admin-Formularmodell; Preise bleiben Zahlen und Session-/Edition-IDs stabil

Erstelle TypeScript-Fixtures mit `satisfies` für alle sieben Zielgruppen (fünf Klassenstufen,
BMS, Matura), einen
Halbjahreskurs, einen Intensivkurs ohne und einen mit `WeekOption`, eine Prüfungssimulation,
Selbststudium für ZAP und BMS, beide Nachhilfe-Pläne, die Startseite, beide zielgruppenspezifischen Service-Seiten,
die Über-uns-Seite
(Prüfungssimulation und Distance Learning), Lerncoaching, die Tipps-Seite, je eine Selbststudium-
und Platzhalterseite sowie das Marketing-Layout. Die Fixtures müssen
beweisen, dass alle Pflichtfelder der Komponentenmatrix aus Abschnitt 2.9 vorhanden sind; keine
`as any`-/Doppel-Casts und keine rohen HTML-Strings.

Erstelle zusätzlich Mapper-Fixtures für alle vier vorhandenen DB-Fachwerte sowie bekannte und
nicht bekannte Klassenstufenwerte. Ein Bestandskurs-Mapper muss die echte numerische Kurs-ID in
`ExistingCourseCardModel.sourceKursId` und `SessionDefinition.source` erhalten; Französisch/NMG dürfen
nicht herausgefiltert werden, unbekannte Klassenlabels werden als `needs_review` gemeldet.

Erstelle Zod-/DB-Mapper für jede persistierte Union-Variante und danach eine additive SQL-
Migration, die das bestehende Kurs-/Anmeldemodell nachvollziehbar erweitert oder migriert. Kein
paralleles, unverbundenes zweites Kurssystem und keine bestehende Tabelle löschen. Dokumentiere für
jedes View-Model-Feld: DB-Spalte/JSONB-Quelle, abgeleiteter Wert oder request-time Quelle. Halte das
Mapping von `intensivwoche_kurse.preis` zu `regularPrice`/`earlyBirdPrice`, die Kompatibilität der
bestehenden `/kurse`-Server-Actions und den Rollback-Pfad fest. Preise bleiben Zahlenfelder plus
`currency`; Verfügbarkeit wird nicht in `Offer`, `SessionDefinition` oder einem cachebaren
Page-Model gespeichert. `SessionRow` wird erst request-time zusammengesetzt. Aktualisiere bzw.
regeneriere anschließend die Supabase-Datenbanktypen und führe `npm run typecheck` aus.
Regeneriere nur die kanonische Datei `types/database.ts`; entferne oder aliasiere die ungenutzte
zweite Generierung, damit sie nicht erneut vom realen Schema abweicht.

Abschnitt 2.10 ist dabei ein verbindliches Datenerhaltungs-Gate: Erzeuge vor der Änderung einen
anonymisierten Inventarbericht (Counts, IDs, Status je Kurs), repariere zuerst den fehlenden
`created_by`-Migrationsschritt und die Owner-RLS/View-Sicherheit, und backfille danach nur additiv.
`intensivwoche_kurse` bleibt die Buchungs-/Durchführungstabelle,
`intensivwoche_anmeldungen.kurs_id` und sämtliche bestehenden IDs bleiben unverändert. Führe kein
Remote-`db push` aus. Zeige vor dem Schreiben der SQL-Migration den Feldmapping-, Backfill- und
Rollback-Plan; ohne nachgewiesene Gleichheit der IDs/Counts vor und nach der lokalen Migration ist
Schritt 5 nicht abgeschlossen.

Setze zusätzlich das Fundament aus Abschnitt 2.11 additiv um: `self_study_enrollments`, die
Lookup-Tabelle `material_areas`, den eindeutigen FK `learning_materials.area_id`,
`material_access_grants`, Indizes, RLS und private Storage-Auslieferung. Jedes Material gehört
genau einem der vier Bereiche; keine Join-Tabelle und keine Mehrfachzuordnung einführen.
Inventarisiere die vorhandenen `learning_materials`; ordne nur eindeutig passende 6.-Klasse-Zeilen
`langzeitgymi` zu und protokolliere alte 5./6.-Kombinationen oder unbekannte Labels als
`needs_review`. Lege keine Materialkopien an. Kurzgymi, BMS und Matura dürfen zunächst leere
Bereiche sein. Erzeuge Grants nur aus bestätigter/bezahlter Selbststudium-Einschreibung oder
auditierbarer Admin-Freigabe, nie aus `profiles.class_level`, Namens- oder E-Mail-Abgleich.

Ergänze gemäss Abschnitt 2.12 `offers`, `offer_editions` und `course_sessions` beziehungsweise
mappe sie additiv auf die kanonischen Bestandsstrukturen. Eine veröffentlichte Vorjahresedition
wird nie überschrieben: „Vorjahr duplizieren“ erzeugt eine neue `draft`-Edition. Ergänze
Optimistic Concurrency (`version`), Audit-Log, zulässige Statusübergänge und unveränderliche
`booked_price`-/`currency`-Snapshots an Buchungen. Preis, Termin und Publikationsstatus dürfen
keine parallelen JSON-/Mockup-Datenquellen erhalten.

Berücksichtige beim Schema-/Typenentwurf bereits die Abschnitte 2.13–2.15: `course_days` und
Tagesfreigaben referenzieren Edition/Session/Inhalte; Arbeitszeiten referenzieren kanonische
Lehrpersonen, Sessions und Aufsatzabgaben; Finanzereignisse referenzieren Buchungs-, Zahlungs-,
Kosten- und Payroll-Quellen idempotent. Lege die fachlichen Tabellen erst nach Inventar der
tatsächlichen Quellstrukturen an, aber vermeide Typ-/ID-Entscheidungen in Schritt 5, die später
polymorphe IDs, Materialkopien, Dezimalstunden oder Gleitkomma-Geldbeträge erzwingen würden.
Minuten und Rappen sind Ganzzahlen; finanzielle und Payroll-Snapshots sind append-only.

Bevor du eine neue fachliche Migration anlegst, repariere die lokale Baseline so, dass jede
Migrationsversion eindeutig ist, `profiles` vor dem ersten `ALTER TABLE profiles`, `subjects` vor
Mentorship mit exakt passendem PK-/FK-Typ und die Anmeldetabelle zunächst ohne den falschen
`public.courses`-FK angelegt wird; danach folgen `intensivwoche_kurse` und der korrekte FK.
Verschiebe reine Demozeilen und sämtliche Test-/Auth-Benutzer aus deploybaren Migrationen nach
`supabase/seed.sql`; `006_seed_test_data.sql` darf nicht remote ausgerollt werden. Klassifiziere
die sechs Beispielkurse anhand Remote-Inventar und vorhandener Referenzen, statt sie pauschal als
Geschäftsbestand oder als löschbaren Seed anzunehmen.
Inventarisiere vor jeder Anpassung die entfernte Migrationshistorie read-only und stoppe bei
Abweichungen; kein `migration repair`, Umbenennen remote registrierter Versionen oder `db push`
ohne separate Freigabe.

Entferne dabei die abweichende Belegungsberechnung aus `app/(dashboard)/intensivkurse/page.tsx`:
stornierte Anmeldungen zählen nirgends, `wenige` bedeutet überall 1–2 Restplätze und `voll` 0.
Öffentliche Seite, geschützte Intensivkursseite, Dashboard-Verwaltung und neue Marketingseiten
verwenden dieselbe RLS-sichere View bzw. denselben Availability-Mapper.

Vereinheitliche Policies auf die tatsächlich verwendeten Rollen `lehrperson`, `admin`, `user`;
entferne widersprüchliche `teacher`-/`student`-Policies. Implementiere eine einzige atomare
Buchungs-RPC gemäss Abschnitt 2.10: Kurszeile sperren, Aktivität/Kapazität/nicht stornierte
Anmeldungen/Duplikat prüfen und dann einfügen. Ergänze die partielle Eindeutigkeit für aktive
`(kurs_id, lower(email))`-Anmeldungen, minimale Grants und einen Parallelitätstest auf den letzten
Platz. Beide bisherigen und neuen Anmeldewege verwenden diese RPC statt direkter Inserts.
```

## Schritt 6 — Referenzkomponenten für Kursseiten bauen (der wichtigste Schritt)

Nicht nur 4. Klasse, sondern die Fälle, die zusammen alle strukturellen Varianten
abdecken — sonst fehlen dem Component-Bau die phasenbasierte Ablauf-Variante und
die Zusatzangebote.

```
Lies @design-reference/architektur-briefing-kursseiten.md komplett, insbesondere
Abschnitt 2 (Datenmodell, jetzt als types/-Modul vorhanden) und 3 (Komponentenliste).
Referenz-Prototyp für die Terminliste: @design-reference/SessionTable.jsx.
Der Prototyp ist nur Struktur-/Accessibility-Referenz: `row.status`, `row.href ?? "#"` und das
flache `row.ablauf` sind veraltet. Implementiere stattdessen exakt `SessionRow.availability`,
`bookingAction` und die `Ablauf`-Union aus Abschnitt 2.4; kein `#`-Fallback im Produktionscode.

Sieh dir zusätzlich diese Mockups an, die zusammen ALLE strukturellen Varianten
zeigen (nicht nur eine Klassenstufe):
- @design-reference/Layout_4_Klasse_Hauptseite.html,
  @design-reference/Layout_4_Klasse_Halbjahreskurs_Unterseite.html und
  @design-reference/Layout_4_Klasse_Intensivkurs_Unterseite.html
  (Basisfall: einfaches Ablauf-Popover)
- @design-reference/Layout_2_Sek_Halbjahreskurs_Unterseite.html
  (phasenbasiertes Ablauf-Popover, Ablauf-Typ "phased")
- @design-reference/Layout_2_Sek_Intensivkurs_Unterseite.html
  (Wochenfilter)
- @design-reference/Layout_6_Klasse_Hauptseite.html
  (Zusatzangebote-Grid AddOnCourses)
- @design-reference/Layout_BMS_Hauptseite.html,
  @design-reference/Layout_BMS_Intensivkurs_Unterseite.html und
  @design-reference/Layout_BMS_Pruefungssimulation_Seite.html
  (BMS als eigene Audience; Zusatzangebote nicht aus `istPruefungsjahr` ableiten)
- @design-reference/Layout_Maturapruefung_Seite.html,
  @design-reference/Layout_Matura_Halbjahreskurs_Unterseite.html und
  @design-reference/Layout_Matura_Intensivwoche_Unterseite.html
  (Matura-Audience und Anzeigename/Route „Intensivwoche")

Baue jetzt die zentralen Komponenten aus Abschnitt 3 für die Kursseiten:
AudienceHero, CourseCardGrid, CourseCard, AddOnCourses, ExistingCourseSection,
ExistingCourseCard, CourseHero, CourseFlow,
CourseContent, BookingSection, SessionTable, SessionDetails, WeekFilter,
BookingButton, StatusBadge, CategoryBadge, WhyUsGrid, Testimonials — als generische,
datengetriebene Komponenten gemäss den benannten Typen und Page-Models aus Schritt 5. Sie müssen
alle sieben `Audience`-Varianten abdecken. Komponenten
definieren keine parallelen lokalen Content-Typen und akzeptieren keine untypisierten Teilobjekte. Keine
Klassenstufen-spezifische Logik im Code — alles über Props/Daten steuerbar.
Zeig mir zuerst deinen Plan.
```

## Schritt 7 — Startseite bauen (ersetzt die bestehende komplett)

Fehlte bisher komplett im Ablauf — eigener Schritt, weil andere Komponenten
(`SiteNav`, `SiteFooter`, `KlassenPicker`, `ServiceCard`, `FeaturedTestimonial`) nötig sind.

```
Lies @design-reference/Startseite.html und Abschnitt 1c/3 aus
@design-reference/architektur-briefing-kursseiten.md (Zeilen zu SiteNav,
KlassenPicker, ServiceCard, FeaturedTestimonial).

WICHTIG: Der statische HTML-Prototyp ist inzwischen über relative Dateilinks
vollständig zwischen Startseite, Klassenübersichten und vorhandenen Detailseiten
verdrahtet. Diese Links dienen nur der klickbaren Design-Prüfung. Verwende für die
Next.js-Implementierung trotzdem NICHT die Dateinamen oder einen Text-Abgleich,
sondern exakt die Routing-Tabelle aus Abschnitt 2.1 als zentrale `Audience[]`-Daten. Der
Hero-Picker filtert daraus die fünf Einträge mit Placement `heroPicker`; Nav und Service-Grid
verwenden dieselbe Quelle auch für BMS und Matura.

Baue:
1. SiteNav — flache Flex-Navigation mit direkten Links ab md:, darunter shadcn Sheet
   (Hamburger-Drawer) für Mobile; beide werden aus derselben Audience[]-Liste (types/-Modul aus
   Schritt 5). Ersetzt die bestehende Navigationskomponente vollständig. Ergänze in beiden
   Varianten exakt die kompakten Zielgruppenlabels `4.Kl`, `5.Kl`, `6.Kl`, `1.Sek`,
   `2./3.Sek`, `BMS`, `Matura` sowie `Nachhilfe` und `Über uns`; kein Dropdown bauen. Ergänze in
   beiden Varianten einen deutlich als Button gestalteten Link „Login" auf die bereits bestehende Route
   `/login` (Next `Link` + shadcn `Button` mit `asChild`). Der Button ist kein neues Auth-Feature,
   sondern der Einstieg zu den bereits vorhandenen Übungen und Prüfungen. Auf Mobile muss er im
   Sheet ebenfalls ohne Scrollen auffindbar und mindestens 44px hoch sein. Keine zweite Login-Seite
   und keinen neuen Auth-Flow anlegen.
   Rendere `SiteNav` genau einmal in `app/[locale]/(marketing)/layout.tsx`, oberhalb von
   `{children}`. Importiere sie weder im globalen `app/layout.tsx` noch in einer `page.tsx`.
   Das öffentliche Layout umfasst nur Marketing-, Kurs- und Zusatzangebotsseiten; Auth,
   Dashboard, Übungen, Prüfungen, Profil und Trainer bleiben ausserhalb.
2. SiteFooter — rendert genau einmal nach `{children}` im selben Marketing-Layout, übernimmt das
   gemeinsame Footer-Muster der vollständigen Referenzseiten und enthält ausschliesslich reale,
   durch Linktests geprüfte Ziele. Kein Footer-Markup in einzelnen Pages.
3. KlassenPicker (5er-Grid im Hero), filtert `placements.includes('heroPicker')` aus derselben
   `Audience[]`-Liste wie SiteNav — keine zweite Datenquelle.
4. ServiceCard-Grid für Lerncoaching, Nachhilfe, Distance Learning, Simulationsprüfung, BMS und
   Matura. BMS/Matura-Ziele stammen aus `Audience[]`, nicht aus hart codierten Links. Sektions-Überschrift
   „Ergänzend zu unseren Kursen" statt „Ergänzend zu jeder Klassenstufe" (stimmt sonst nicht für
   Simulationsprüfung). Simulationsprüfung-Karte bekommt zusätzlich einen Hinweis „Verfügbar für
   6. Klasse & 2./3. Sek" (Prop `eligibleFor`, Abschnitt 3) und verlinkt auf eine noch zu
   bauende Landingpage (siehe Schritt 11), nicht direkt auf eine Klassenstufen-Route.
5. FeaturedTestimonial (einzelnes grosses Zitat, andere Darstellung als die
   Testimonials-Komponente aus Schritt 6).
6. Setze `KlassenPicker`, ServiceCard-Grid und `FeaturedTestimonial` in
   `app/[locale]/(marketing)/page.tsx` zusammen — das ERSETZT die bestehende Startseite
   vollständig, nicht ergänzend. `SiteNav` ist kein Bestandteil dieser Page, sondern kommt über
   das öffentliche Layout.

Reduziere das bisherige `app/page.tsx` auf den kanonischen, getesteten Redirect nach `/de` oder
entferne es, wenn die kombinierte `proxy.ts` diesen Redirect übernimmt. Es dürfen nicht zwei
unterschiedliche Startseiten parallel erreichbar bleiben.

Verwende dafür ausschliesslich `MarketingLayoutModel`, `HomePageModel`, `SiteNavModel`, `SiteFooterModel`,
`ServiceCardModel`, `ServiceSubgroupModel`, `Testimonial`, `Audience` und `Klassenstufe` aus Schritt 5.
Keine lokal neu definierten Startseiten-/Nav-Objekttypen und keine doppelte Klassenstufenliste.

Zeig mir vorher deinen Plan, insbesondere was mit der bestehenden Nav-Logik
aus Schritt 1 passiert (verworfen vs. übernommen).
```

## Schritt 8 — Routing für Kursseiten + Rendering-Strategie

```
Lies Abschnitt 6 aus @design-reference/architektur-briefing-kursseiten.md.
Richte die dynamischen Routen `app/[locale]/(marketing)/kurse/[audience]/page.tsx` und
`app/[locale]/(marketing)/kurse/[audience]/[angebot]/page.tsx` ein, die die in Schritt 6 gebauten
Komponenten mit Beispiel-/Platzhalterdaten befüllen. Keine 17 einzelnen
Page-Dateien.

Lies zusätzlich Abschnitt 7 (Rendering-Strategie) aus demselben Dokument. Beachte, dass
`next.config.ts` bereits `cacheComponents: true` setzt:

1. Verwende auf den neuen Marketingrouten keine Route-Segment-Exporte `revalidate`, `dynamic`
   oder `fetchCache` und übernimm nicht `unstable_cache` aus der bestehenden `/kurse`-Route.
2. Cache stabile Kurs-/Angebotsdaten mit `'use cache'`,
   `cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })` und den Tags aus Abschnitt 7.
3. Lade Verfügbarkeit/Teilnehmerzahl in einer getrennten Server Component nach
   `await connection()`, ohne `'use cache'`, und rendere sie unter einer `Suspense`-Grenze.
4. Rufe nach Kurs-/Preisänderungen in Server Actions `updateTag()` für Katalog- und Detail-Tag
   auf. Nach einer erfolgreichen Anmeldung aktualisiere die ungecachete Anzeige mit `refresh()`
   bzw. `router.refresh()`; sie darf nicht bis zu 300 Sekunden veraltet bleiben.
5. Trenne bei einer späteren Integration der Bestandsroute `/kurse` deren gecachte Katalogdaten
   von der ungecacheten Teilnehmerzahl. Entferne den bisherigen gemischten `unstable_cache` erst,
   wenn die neue Abfrage und ihre Regressionstests stehen.
6. Richte `generateStaticParams()` für Locale × Audience × veröffentlichbares Angebot ein; es definiert bekannte
   Pfade, nicht die Cache-Lebensdauer. Default bleiben Server Components, nur interaktive
   Bausteine wie `WeekFilter` sind Client Components.
7. Validiere `[audience]` und `[angebot]` gegen die zentrale Angebotsmatrix. Unbekannte Werte sowie
   fachlich ungültige Kombinationen rufen `notFound()` auf und werden in Routentests als 404
   geprüft; kein Fallback auf die erste Stufe oder den ersten Kurstyp.

Verdrahte in der in Schritt 7 gebauten SiteNav die Links zu allen 7 Zielgruppen-Hauptseiten
(`/kurse/4-klasse`, `/kurse/5-klasse`, `/kurse/6-klasse`, `/kurse/1-sek`,
`/kurse/2-3-sek`, `/kurse/bms`, `/kurse/matura`) über die `Audience[]`-Liste.

Ab diesem Schritt sind Routen ohne vorangestelltes Locale nur logische Kurzformen in den Prompts:
`/kurse/4-klasse` bedeutet in der Anwendung `/de/kurse/4-klasse`. Englisch ist in dieser Migration
nicht aktiv. Die bestehende unlokalisierte Route `/kurse` bleibt unangetastet, bis
ihre spätere Integration ausdrücklich entschieden wird.
```

## Schritt 9 — Zusatzseiten und verbleibender Kontakt-Platzhalter

```
Lies Abschnitt 6 aus @design-reference/architektur-briefing-kursseiten.md. Baue nur `/kontakt`
als einfachen Platzhalter aus PageContainer + PageIntro (Abschnitt 1a) — kein eigenes Layout.

Alle diese Seiten liegen unter `app/[locale]/(marketing)/`; die oben genannten Pfade sind logische
Kurzformen und werden für jedes in Schritt 3 aktivierte Locale erzeugt.

Kontakt erhält `PlaceholderPageModel`. Für den BMS-Kurs wird ausschliesslich
`Layout_BMS_Intensivkurs_Unterseite.html` unter `/kurse/bms/intensivkurs` verwendet; keine
zusätzliche Wochenkurs-/Halbjahreskurs-Route erfinden.

Baue zusätzlich `/tipps`, `/lerncoaching`, `/nachhilfe`, `/distance-learning` und `/ueber-uns`
NICHT als Platzhalter, sondern aus den echten Mockups
@design-reference/Layout_Tipps_Uebersichtsseite.html,
@design-reference/Layout_Lerncoaching_Seite.html,
@design-reference/Layout_Nachhilfe_Seite.html,
@design-reference/Layout_DistanceLearning_Seite.html und
@design-reference/Layout_UeberUns_Seite.html — alle fünf nutzen bereits
eure etablierten Bausteine, können also direkt übernommen werden. Für Distance Learning existiert
genau diese eine Referenzdatei; es gibt kein Dateiduplikat. Die Mock-Navigation wird ohnehin durch
die zentrale `SiteNav` aus Schritt 7 ersetzt. Für /nachhilfe
zusätzlich: Verwende den in Schritt 5 implementierten `SubscriptionPlan`-Typ und die
`SubscriptionCard`-Komponente aus Abschnitt 2.6/3 (10er/20er, Rabatt wird
berechnet, nicht als Text gepflegt). /lerncoaching und /nachhilfe sind bewusst
zwei getrennte Routen mit eigenen Nav-Einträgen (unterschiedliche Produkte,
unterschiedliches Datenmodell) — nicht als eine Seite zusammenfassen. Ergänze
in SiteNav (Nachhilfe + Über uns sowie die sieben Audience-Ziele, NICHT Lerncoaching,
Tipps, Distance Learning oder Simulationsprüfung)
und auf der Startseite (jetzt 6 ServiceCards inklusive BMS und Matura) entsprechend. Achtung bei Distance Learning:
Die Startseiten-Kachel braucht ein korrigiertes `eligibleFor` (nur 6. Klasse &
2./3. Sek) UND ein separates `distanceLearningAvailable`-Flag auf dem jeweiligen
Intensivkurs-`Offer` (nicht auf deren Halbjahreskurs) — siehe Abschnitt 3.

`SubscriptionPlan` wird in diesem Schritt nicht neu definiert; die Seite erhält ein
`SubscriptionPageModel`. Service-Karten und Gruppen verwenden ausschliesslich
`ServiceCardModel`/`ServiceSubgroupModel`. Lerncoaching, Distance Learning und die
Prüfungssimulations-Landingpage verwenden `TargetedServicePageModel`; `/tipps` erhält
`TipsPageModel` und rendert Kategorien/Vorschauen über `TipCategorySection`/`TipCard`. Keine dieser
Seiten definiert lokale Paralleltypen für Inhalte, Links, FAQ oder Zielgruppen.
`/ueber-uns` erhält das gemeinsame `AboutPageModel`; der Beratungs-CTA bleibt ohne Link, solange
kein reales Kontakt-/Buchungsziel existiert, statt `href="#"` zu übernehmen.

Baue die drei vorhandenen Selbststudium-Seiten aus
@design-reference/Layout_6_Klasse_Selbststudium_Unterseite.html und
@design-reference/Layout_2_Sek_Selbststudium_Unterseite.html sowie die BMS-Seite aus
@design-reference/Layout_BMS_Selbststudium_Unterseite.html als echte `SelfStudyPageModel`-Seiten.
Übernimm bei allen drei zugehörigen Hauptseiten die Leistung
`2×30 Min. persönliches Zeitguthaben für Rückfragen` und die Preisnotiz
`inkl. 2×30 Min. Zeitguthaben` aus den Referenzkarten; nicht zielgruppenspezifisch weglassen.
Sie sind keine Platzhalter. Ihre CTAs dürfen erst auf einen Checkout/Zugang führen,
wenn ein reales und getestetes Ziel existiert.
Solange keine Tipp-Artikelseite existiert, bleibt `TipPreview.action` leer und `TipCard` rendert
keinen Link bzw. CTA. Keine `#`-, erfundene oder auf 404 führende Ersatzroute anlegen.
```

## Schritt 10 — Pro Zielgruppe wiederholen (nur noch Daten, kein neuer Code)

Sieben Durchläufe — für jede Audience derselbe Prompt, nur Pfad/Route angepasst.
Prüfe bei 4. Klasse zuerst, ob aus Schritt 6 bereits vollständige Daten vorliegen,
oder ob nur die Struktur referenziert wurde.

```
Extrahiere die Kursdaten aus @design-reference/Layout_4_Klasse_*.html in das
in Schritt 5 angelegten `AudiencePageModel`-/`CourseDetailPageModel`-Formate einschließlich
`CourseOffer` und `SessionDefinition` und befülle damit die
  Route /kurse/4-klasse samt `/halbjahreskurs` und `/lerncamp-sportferien`. Falls in Schritt 6 bereits Daten aus diesen Mockups
übernommen wurden: nur prüfen und vervollständigen, nicht doppelt anlegen.
Baue KEINE neuen Komponenten — nutze ausschliesslich die bestehenden aus
Schritt 6. Übernimm Strukturen und Terminzahlen aus den Mockups, aber keine widersprüchlichen
Preise als Produktionswahrheit. Lege pro Angebot genau einen zentralen numerischen Preisdatensatz
mit Quellenhinweis und `approved`-Status an. Bei einer Abweichung zwischen Haupt-/Unterseite oder
fehlender fachlicher Freigabe bleibt das Angebot sichtbar als Vorschau, aber nicht buchbar; kein
Mapper, Seed oder UI darf einen zweiten Preiswert führen. Frühbucherwerte werden berechnet.
Melde dich, falls die Daten eine Struktur zeigen, die die bestehenden Typen nicht abdecken.

Lade zusätzlich die aktiven Bestandszeilen aus `intensivwoche_kurse` über den Mapper aus Schritt 5.
Ordne bekannte `klassenstufen`-Werte der jeweiligen Klassenübersicht zu und fülle
`AudiencePageModel.existingCourses`; dieselbe Bestandszeile darf bei mehreren gültigen
Klassenstufen erscheinen, behält aber überall dieselbe `sourceKursId`. Französisch/NMG werden wie
Deutsch/Mathematik angezeigt. Nicht eindeutig zuordenbare Klassenlabels bleiben auf `/kurse`
sichtbar und werden im `needs_review`-Bericht protokolliert. Mockup-Daten niemals anhand von Name,
Preis oder Datum mit Bestandszeilen zusammenführen.
```

Danach identisch wiederholen mit:
- `@design-reference/Layout_5_Klasse_*.html` → `/kurse/5-klasse`
- `@design-reference/Layout_6_Klasse_*.html` → `/kurse/6-klasse`; die Datei
  `Layout_6_Klasse_Pruefungssimulation.html` folgt gesondert in Schritt 11.
- `@design-reference/Layout_1_Sek_*.html` → `/kurse/1-sek` — **Achtung Dateiname:** Die Vorkurs-Unterseite heisst
  tatsächlich `Layout_1_Sek_Halbjahesrkurs_Unterseite.html` (Tippfehler im Originaldateinamen),
  nicht `Layout_1_Sek_Vorkurs_Unterseite.html`. Den tatsächlichen Namen verwenden bzw. konsistent
  umbenennen, aber nicht stillschweigend erwarten, dass eine Datei mit dem alten Namen existiert.
- `@design-reference/Layout_2_Sek_*.html` (ausser
  `Layout_2_Sek_Pruefungssimulation.html`, siehe Schritt 11) → `/kurse/2-3-sek`
- `@design-reference/Layout_BMS_*.html` → `/kurse/bms`; die verbindliche Kurs-Unterseite ist
  `Layout_BMS_Intensivkurs_Unterseite.html`. Prüfungssimulation aus der vorhandenen Quelle
  und Selbststudium aus den vorhandenen Quellen übernehmen.
- `@design-reference/Layout_Matura*.html` → `/kurse/matura`; Hauptseite,
  Halbjahreskurs und Intensivwoche vollständig aus den drei vorhandenen Dateien übernehmen.

Bei allen sieben Durchläufen ist `Audience.id` der Join-Key. Dateiname, H1 und sichtbarer
Kacheltitel sind keine Typquelle: Im aktuellen Referenzstand wurden mehrere sichtbare Titel
vereinheitlicht und können vom strukturellen Dateityp abweichen. Solche Abweichungen werden als
redaktioneller Befund protokolliert; intern entscheidet allein die Angebotsmatrix.

## Schritt 10a — Admin-Maske für Jahresdurchführungen

```
Lies Abschnitt 2.12/3/6 aus @design-reference/architektur-briefing-kursseiten.md und verwende
@design-reference/Layout_Admin_Kursangebot_Maske.html als verbindliche UX-Referenz. Erweitere die
bereits vorhandene Verwaltung unter `app/(dashboard)/dashboard/kurse`; baue kein zweites
Admin-System und keine lokalisierte Dashboard-Route.

Implementiere `OfferEditionForm`, `SessionEditor`, `EditionPreview` und
`PublicationChecklist` zielgruppenunabhängig für alle sieben Zielgruppen sowie Halbjahreskurs,
Intensivkurs/Lerncamp, Prüfungssimulation und Selbststudium. Die Maske trägt den neutralen Titel
„Kursangebot verwalten“; 6. Klasse darf nur eine auswählbare Beispieldurchführung sein, keine
eigene Seitenvariante. Die Maske trennt
das stabile Offer von der jährlich veränderlichen `OfferEdition` und gliedert sich in Grundlagen,
Preise, Termine/Kapazität und Veröffentlichung. „Vorjahr duplizieren“ erzeugt eine neue
Draft-Edition mit neuen IDs; veröffentlichte oder archivierte Vorjahresdaten bleiben unverändert.
Der obere Block bleibt als Bearbeitungskontext aus Kursangebot, Prüfungsjahr und Durchführung
sichtbar. Entferne die redundanten Zielgruppen-/Angebotstyp-Selects aus „Grundlagen“: Beide Werte
werden aus dem stabilen Offer abgeleitet und dort nur schreibgeschützt angezeigt. Neue Identitäten
entstehen über einen getrennten „Neues Kursangebot“-Flow. Ein Kontextwechsel lädt die vollständige
Edition und warnt vor ungespeicherten Änderungen; UI-Zustände dürfen nie gleichzeitig z. B.
„5. Klasse · Halbjahreskurs“ oben und „6. Klasse · Intensivkurs“ unten zeigen.
Der `SessionEditor` bietet einen aus den vorhandenen Session-Standorten dynamisch erzeugten Filter
mit Trefferzahlen. Filtern verändert oder löscht keine Sessions; neue beziehungsweise umbenannte
Standorte aktualisieren die Optionen, und „Alle Standorte“ bleibt der sichere Ausgangszustand.
Abschnitt „Preise“ enthält eine Option „Frühbucherpreis aktivieren“. Neue Halbjahreskurse und
Intensivkurse/Lerncamps erhalten `true` als Voreinstellung, Prüfungssimulationen und Selbststudium
`false`; bestehende Editionen laden ihren gespeicherten Wert. Nur bei aktiver Option werden Betrag
und Stichtag eingeblendet und als Pflichtfelder validiert. Der Frühbucherpreis muss unter dem
regulären Preis liegen. Bei Deaktivierung persistiert die Server Action beide Detailwerte als
`null`; öffentliche Verbraucher zeigen dann keinen Frühbucherhinweis.

Alle Mutationen laufen über typisierte, Zod-validierte Server Actions mit `requireAdmin()` für
Preisänderung, Publizieren und Archivieren. Nutze Optimistic Concurrency über `version`; ein
veralteter Formularstand darf neuere Änderungen nicht überschreiben. Publizieren geschieht
transaktional und nur, wenn Pflichtfelder, numerische Preise, Fristen sowie mindestens ein
buchbarer Termin für terminbasierte Angebote valide sind. Danach invalidiert die Action die
zentralen Offer-/Audience-Cache-Tags, damit Hauptseite, Detailseite, Terminliste und Buchungsdialog
dieselbe Edition anzeigen.

Bestehende Buchungen speichern `edition_id`, `session_id`, `booked_price` und `currency` als
Snapshot. Preisänderungen verändern keine historischen Buchungen. Sessions mit Anmeldungen werden
nicht gelöscht; Absage/Änderung wird auditierbar markiert. Schreibe für Create, Update,
Duplicate, Publish, Archive und Cancel ein Audit-Event mit Benutzer, Entity, Aktion und
Vorher-/Nachher-Diff ohne personenbezogene Buchungsdaten.

Die HTML-Demo enthält nur Referenzinteraktionen. Übernimm weder Inline-JavaScript noch lokale
Formzustände als Persistenz; verwende die gemeinsamen Domain-Typen und Server Actions aus
Schritt 5.
```

## Schritt 10b — Tagesfreigaben für Intensivkurse

```
Lies Abschnitt 2.13/3/6 aus @design-reference/architektur-briefing-kursseiten.md und verwende
@design-reference/Layout_Admin_Tagesfreigaben.html als verbindliche UX-Referenz. Implementiere
die Seite innerhalb der vorhandenen unlokalisierten Kursverwaltung unter
`/dashboard/kurse/[offerId]/durchfuehrungen/[editionId]/tagesfreigaben`; kein zweites Admin-System.

Inventarisiere zuerst die vorhandenen Tabellen, Routen und Rechte für Übungen, Prüfungen,
Intensivkurs-Durchführungen, Kursgruppen und Anmeldungen. Lege einen referenziell sicheren
kanonischen Content-Key fest, bevor `course_days`, `daily_releases` und `daily_release_items`
additiv migriert werden. Keine polymorphen Fremdschlüssel ohne Integritätsprüfung und keine
Duplikate vorhandener Materialien erzeugen.

Implementiere `DailyReleaseManager`, `CourseDayPicker`, `ReleaseMaterialSelector` und
`StudentReleasePreview`. Freigeben, zeitlich planen, zurückziehen und die kursgruppenbezogene
Notfallsperre laufen ausschliesslich über Zod-validierte, transaktionale Server Actions mit
`requireAdmin()`, Versionsvergleich, Audit-Log und Cache-Invalidierung. Speichere Zeitpunkte als
`timestamptz`, zeige sie in `Europe/Zurich` und bestimme den effektiven Zugriff serverseitig aus
Datenbankzeit; kein Browser-Timer oder Cronjob ist die Autorisierungsquelle.

RLS erlaubt einem Lernenden ein Release-Item nur bei aktiver, nicht stornierter Anmeldung für
exakt dieselbe `course_session` und innerhalb des offenen Freigabefensters. Self-Study-Grants,
`profiles.class_level`, versteckte Tabs und Clientfilter verleihen keinen Intensivkurszugriff.
Private Dateien werden erst nach derselben Prüfung per kurzlebiger Signed URL ausgeliefert.
Teste mindestens: falsche Kursgruppe 403, noch nicht geöffnet 403, nach Ablauf 403, aktive
Freigabe 200, Zurückziehen beendet Zugriff sofort, leere Auswahl abgelehnt, ungültiges Zeitfenster
abgelehnt, konkurrierendes veraltetes Admin-Formular abgelehnt und Notfallsperre betrifft nur die
gewählte Kursgruppe. Inline-JavaScript der HTML-Referenz nicht übernehmen.
```

## Schritt 10c — Arbeitszeiten und Lohnvorbereitung

```
Lies Abschnitt 2.14/3/6 aus @design-reference/architektur-briefing-kursseiten.md und verwende
@design-reference/Layout_Admin_Zeiterfassung.html als verbindliche UX-Referenz für
`/dashboard/arbeitszeiten`. Ergänze im bestehenden Lernpersonen-Dashboard die unlokalisierte
Route `/arbeitszeiten` über denselben Domainservice; kein separates Zeitsystem.

Inventarisiere Rollen, Lehrperson-IDs, Kurszuweisungen, Sessions, Aufsatzkorrekturen und bestehende
Zeit-/Lohndaten. Migriere additiv `teacher_assignments`, `work_entries`,
`teacher_rate_agreements`, `payroll_periods`, `payroll_snapshots` und Snapshot-Zeilen mit
Check-Constraints, FKs und Indizes. Dauer wird in ganzen Minuten, Geld in ganzen Rappen gespeichert.
Geplante Sessiondauer erzeugt nur einen idempotenten Vorschlag und niemals eine automatisch
genehmigte Lohnposition.

Der Administrator erfasst den mit jeder Lernperson vereinbarten Stundensatz samt `valid_from` und
optionalem `valid_until`. Nur `requireAdmin()` darf Vereinbarungen anlegen oder ändern; Änderungen
erzeugen neue, nicht überlappende Gültigkeitszeiträume und überschreiben keine Historie. Das
Lernpersonen-Dashboard enthält keine Lohnsatz-Mutation.

Implementiere `TeacherWorkEntryForm`, `WorkTimeOverview` und `PayrollReviewPanel`. Lernpersonen
dürfen per RLS nur eigene offene Einträge bearbeiten/einreichen. Admins dürfen alle sehen,
genehmigen, begründet zurückweisen und vollständig geprüfte Monate transaktional abschliessen.
Der Abschluss sperrt die Periode und erzeugt unveränderliche Snapshots mit dem am Leistungsdatum
gültigen, vom Administrator eingegebenen Stundensatz und dessen Vereinbarungs-ID. Berechne jede
Zeile auf ganze Rappen mit `round(duration_minutes * hourly_rate_rappen / 60)`. Nachträgliche
Änderungen erfolgen nur als auditierte Korrekturbuchungen.
Alle Actions nutzen Zod, kanonische Rollenprüfung, Optimistic Concurrency und Audit-Log.

Teste mindestens: Fremdzugriff einer Lernperson 403, Schüler/Eltern 403, negative oder null Minuten
abgelehnt, überlappender Unterricht markiert/abgelehnt, eingereichte Einträge nicht editierbar,
Rückweisung wieder editierbar, Abschluss mit offenen Einträgen blockiert, korrekter historischer
Stundensatz im Snapshot, überlappende Lohnvereinbarung abgelehnt, Lohnsatz-Mutation durch
Lernperson 403 und unveränderlicher abgeschlossener Monat. Exportiere stabile Quell-IDs
und geprüfte Summen; implementiere keine eigene vollständige Lohnbuchhaltung.
```

## Schritt 10d — Jährliches Finanz-Cockpit

```
Lies Abschnitt 2.15/3/6 aus @design-reference/architektur-briefing-kursseiten.md und verwende
@design-reference/Layout_Admin_Finanzcockpit.html als verbindliche UX-Referenz für die
unlokalisierte Admin-only-Route `/dashboard/finanzen`.

Inventarisiere vor jeder Migration Buchungen, Payment-Provider-Ereignisse, Rückerstattungen,
gebuchte Preissnapshots, Sessions/Kapazitäten, abgeschlossene Payroll-Snapshots und vorhandene
Kostenquellen. Migriere additiv einen idempotenten append-only `financial_events`-Ledger,
`expense_entries`, `financial_periods`, `budgets` und auditierte `financial_adjustments`.
Beträge werden in ganzen Rappen gespeichert; `gebucht`, `bezahlt` und `periodengerecht verdient`
bleiben drei explizite Sichten. Keine bestehende Buchung oder Zahlung duplizieren.

Implementiere `FinancialCockpit`, `OfferProfitabilityTable` und `RevenueCostChart` auf
RLS-sicheren serverseitigen Reporting-Views beziehungsweise materialisierten Monats- und
Angebotsaggregaten. Pro OfferEdition zeigt die Tabelle aktive, nicht stornierte Teilnehmer,
Kursgruppen, Kursauslastung, Umsatz der gewählten Sicht, genehmigte Arbeitsstunden, daraus
berechnete direkte Kosten, Durchschnittsumsatz pro Teilnehmer, Deckungsbeitrag und Marge.
Warteliste und Storno zählen nicht. Reguläre Kursgruppen erhalten beim Anlegen als Referenz zehn
Plätze; die Auswertung verwendet die Summe der tatsächlich gespeicherten Sessionkapazitäten.
Für Prüfungssimulationen wird keine Auslastung berechnet oder dargestellt. Direkte Kosten stammen
ausschliesslich aus zugeordneten abgeschlossenen Payroll-Snapshot-Zeilen; Raum-, Material-,
Marketing- und Betriebskosten bleiben separat. Das Cockpit übernimmt den abgeschlossenen
Snapshot-Betrag und besitzt kein editierbares Lohnkosten-/Stundensatzfeld. Der Client summiert
keine finanziellen Rohdaten.

Die Kachel `Bruttogewinn nach Zielgruppen` summiert je Zielgruppe ausschliesslich die
Deckungsbeiträge ihrer Angebote (Umsatz der gewählten Sicht minus direkte Lohnkosten und
Rückerstattungen), niemals Umsatz. Zielgruppenübergreifende Angebote bleiben separat ausgewiesen.

Nur Administratoren dürfen Cockpit, Einzelwerte, Kostenbelege und Exporte lesen. Periodenabschluss
und manuelle Anpassungen benötigen Zod, `requireAdmin()`, Audit-Log und unveränderliche
Korrekturereignisse. Teste mindestens: Nicht-Admin 403, stornierte Anmeldung nicht gezählt,
Rückerstattung korrekt abgezogen, gebucht/bezahlt/verdient liefern unterschiedliche erwartete
Werte, Payroll nur aus abgeschlossenem Snapshot, Angebot ohne Teilnehmer ohne Division durch null,
negative Marge sichtbar, Summen der Angebotszeilen mit Gesamtansicht abgestimmt sowie idempotente
Wiederverarbeitung desselben Provider-Events. Der Export enthält Definitionen, Filter, Zeitpunkt,
Quellstand und Kontrollsummen; implementiere keine vollständige Finanzbuchhaltung.
```

## Schritt 11 — Prüfungssimulation gesondert

```
Lies Abschnitt 4 aus @design-reference/architektur-briefing-kursseiten.md.
Baue die Prüfungssimulations-Seite aus den Inhalten der Datei mit dem exakten Pfad
`design-reference/Layout_6_Klasse_Pruefungssimulation.html`
NEU mit unseren eigenen Komponenten (CourseFlow, ExamSimTimeline, WhyUsGrid,
SessionTable mit reduzierten Spalten, FaqAccordion) — nicht das fremde
Design-System aus der Quelldatei übernehmen. Parametrisiere sie so, dass
dieselbe Komponente auch die Inhalte aus
@design-reference/Layout_2_Sek_Pruefungssimulation.html
abdeckt, und befülle beide Routen (/kurse/6-klasse/pruefungssimulation,
/kurse/2-3-sek/pruefungssimulation).

Binde zusätzlich @design-reference/Layout_BMS_Pruefungssimulation_Seite.html unter
`/kurse/bms/pruefungssimulation` über dasselbe `ExamSimulationPageModel` an. Diese dritte Quelle
ist bereits im gemeinsamen Design-System und wird nicht wie die beiden fremden ZAP-Exports
rekonstruiert; Domainmodell, SessionTable und Buchungslogik bleiben dennoch gemeinsam.

Die parametrisierte Vorlage erhält `ExamSimulationPageModel`; ihr `offer` ist zwingend ein
`ExamSimulationOffer`, sodass Timeline, Flow, WhyUs, FAQ und Sessions typseitig vollständig sind.
Keine zweite lokale Timeline-/FAQ-Struktur definieren.

Baue zusätzlich die Landingpage /pruefungssimulation, auf die der ServiceCard-Link von
der Startseite zeigt, aus dem Mockup
@design-reference/Layout_Pruefungssimulation_Landingpage.html — dieses Mockup nutzt
bereits eure etablierten Bausteine (aufbau/phase, features, Picker-Muster mit 2 statt
5 Optionen, natives <details>-FAQ), kann also direkt 1:1 übernommen werden, anders als
die beiden fremden Pruefungssimulation-Quelldateien oben. Die 2 Optionen verzweigen auf
die beiden Routen oben. Die Landingpage erhält `TargetedServicePageModel` und verwendet
`TargetedAudiencePicker` sowie `FaqAccordion`; keine separaten lokalen Landingpage-Typen.
```

## Schritt 11a — Vier geschützte Materialbereiche aktivieren

```
Lies Abschnitt 2.11 aus @design-reference/architektur-briefing-kursseiten.md und prüfe den in
Schritt 5 angelegten lokalen Schema-/RLS-Stand. Implementiere die vier unlokalisierten,
login-geschützten Bereiche `/materialien/langzeitgymi`, `/materialien/kurzgymi`,
`/materialien/bms` und `/materialien/matura` innerhalb des bestehenden Dashboard-Layouts.

Die bestehende Route `/materialien` zeigt nur Bereiche mit aktivem Grant. Sie darf nicht mehr alle
`learning_materials where is_public = true` laden. Jede Bereichsroute prüft serverseitig und per
RLS einen aktiven, zeitlich gültigen `material_access_grants`-Datensatz und lädt nur Materialien,
deren `learning_materials.area_id` exakt dem Grant entspricht. Dateien kommen aus einem privaten Bucket über
kurzlebige Signed URLs. Keine Autorisierung über Clientfilter, URL-Verstecken,
`profiles.class_level`, Namen oder E-Mail-Ähnlichkeit.

Verbinde die Selbststudium-Angebote wie folgt: 6. Klasse → `langzeitgymi`, 2./3. Sek →
`kurzgymi`, BMS → `bms`. Der vierte Bereich `matura` wird im selben Modell vollständig unterstützt,
auch wenn seine redaktionelle Befüllung bzw. sein Verkaufsangebot später aktiviert wird. Eine
bestätigte/bezahlte Einschreibung erzeugt idempotent einen Grant; Storno, Rückerstattung oder Ablauf
deaktiviert ihn. Elternkäufe ohne bestehendes Schülerkonto verwenden einen einmaligen
Einladungs-/Claim-Flow und werden nicht automatisch anhand der E-Mail einem beliebigen Konto
zugeordnet.

Erweitere den bestehenden Login so, dass ein validierter interner `callbackUrl` nach erfolgreichem
Login verwendet wird. Ohne Login führt eine Bereichs- oder Selbststudium-Aktion nach
`/login?callbackUrl=/materialien/{area}`; ohne Grant zeigt die Zielroute eine klare
Zugangsfehlermeldung. Verhindere externe Callback-URLs/Open Redirects.

Migriere vorhandene Langzeitgymi-Materialien additiv und ohne Datei-/Zeilenduplikate. Nicht
eindeutige alte 5./6.-Klasse-Zuordnungen bleiben `needs_review`. Kurzgymi, BMS und Matura erhalten
bis zur Befüllung einen korrekten Empty State. Aktiviere einen produktiven Selbststudium-CTA erst,
wenn Zahlung/Einschreibung → Grant → Login-Rückleitung → Materialzugriff sowie
Storno/Rückerstattung → Entzug automatisiert getestet sind.
```

## Schritt 12 — Verifikation

```
Lies zuerst Abschnitt 10 (Verbindliches Verifikations-Gate) aus
@design-reference/architektur-briefing-kursseiten.md. Lege die dort geforderte Infrastruktur an,
falls sie noch fehlt: package-Scripts für `typecheck`, `test:routes`, `test:links`, Playwright-
Konfiguration und Tests sowie lokale Supabase-Konfiguration und pgTAP-/RLS-Tests. Nimm
`@playwright/test` und `supabase` exakt versioniert als Dev-Dependencies auf. Implementiere
`build:test`, `start:test` und `test:data-migration` sowie den Local-only-Wrapper aus Abschnitt 10;
er muss Remote-Supabase-URLs vor Build oder Test hart ablehnen. Ein Docker-kompatibler Runtime
ist Voraussetzung.

Führe danach diese Befehle einzeln und in dieser Reihenfolge aus:

1. `npm ci`
2. `npm exec -- supabase start`
3. `npm exec -- supabase db reset --local`
4. `npm exec -- supabase db lint --local --fail-on error`
5. `npm exec -- supabase test db --local`
6. `npm run test:data-migration`
7. `npm run typecheck`
8. `npm run lint`
9. `npm run build:test`
10. `npm exec -- playwright install chromium`
11. `npm run test:routes`
12. `npm run test:links`

Jeder Befehl muss mit Exit-Code 0 enden. Beim ersten Fehler abbrechen, Ursache beheben und danach
die vollständige Sequenz wieder ab Schritt 1 ausführen. Kein `|| true`, keine deaktivierten
Prüfungen, kein `typescript.ignoreBuildErrors`, kein `--linked` und kein `supabase db push`.
`build:test`, der Playwright-Webserver und alle Datenmutationen verwenden ausschliesslich die
explizit injizierte lokale Supabase-Instanz; `.env.local` mit Remote-Werten darf dabei nicht
durchschlagen.

Die automatisierten Routentests müssen mindestens prüfen:
- alle aktivierten öffentlichen Locale-Routen und die bestehende Route `/kurse`
- anonyme Redirects aller geschützten Routen inklusive exakt erhaltenem `callbackUrl`
- Rollen-/Redirectschutz für `/arbeitszeiten`, `/dashboard/arbeitszeiten` und
  `/dashboard/finanzen`; Nicht-Admins erhalten keinen Zugriff auf Lohn- oder Finanzdaten
- authentifizierte Redirects von `/login` und `/register` ohne Rücksprungziel nach `/dashboard`;
  ein gültiger interner `callbackUrl` auf `/login` hat Vorrang und wird exakt übernommen
- keine Lokalisierung von Auth-/Dashboard-/API-/`_next`-Pfaden
- `SiteNav`-Login immer `/login` und genau eine öffentliche Navigation pro Marketingseite
- genau ein `SiteFooter` pro Marketingseite und kein Marketing-Footer auf Auth-/Dashboardseiten
- Root `/` hat genau einen definierten Redirect auf `/de`; unbekannte Locales, Stufen und ungültige
  Stufe/Kurstyp-Kombinationen liefern die erwartete 404
- Kurs-/Preisänderungen sind unmittelbar nach `updateTag()` sichtbar; Teilnehmerzahl und
  Verfügbarkeit sind unmittelbar nach Testanmeldung und `refresh()` aktuell — ohne 300-Sekunden-
  Wartezeit oder manuellen Browser-Reload
- ein aktiver eindeutig gemappter Bestandskurs erscheint sowohl auf `/kurse` als auch in der
  `ExistingCourseSection` der passenden Locale-/Klassenroute; beide Anmeldewege senden exakt
  dieselbe numerische `kurs_id`

Die Linktests crawlen sämtliche öffentlichen Seiten in Desktop und Mobile. Sie schlagen bei
internen 4xx/5xx-Zielen, `href="#"`, `.html`-Links, falschen Locale-Präfixen und unbeabsichtigt
lokalisierten Auth-Links fehl. Die Datenbanktests müssen alle Migrationen auf einer leeren lokalen
Datenbank sowie die in Abschnitt 10 definierte RLS-Matrix prüfen.
Sie müssen zusätzlich die korrekt als Demo oder Bestand klassifizierten lokalen Kurse, alle vier Fach-Mappings,
unveränderte Kurs-/Anmeldungs-IDs und FKs, `needs_review` für unbekannte Klassenlabels sowie die
Owner-/Admin-Regeln nachweisen. Ein Status-Test deckt freie, zwei verbleibende, einen verbleibenden
und null verbleibende Plätze sowie eine stornierte Anmeldung ab und erwartet auf allen Datenpfaden
dieselben Counts/Statuswerte.
Die Suite prüft zusätzlich die Rollen `lehrperson`, `admin`, `user`, verbietet veraltete
`teacher`-/`student`-Policy-Pfade und führt zwei parallele Buchungen auf den letzten Platz aus:
exakt eine Buchung darf erfolgreich sein. `npm run test:data-migration` muss den unmittelbaren
Vorgängerzustand mit Sentinel-Daten herstellen und erst danach nur die neue Migration anwenden.

Erst wenn dieses automatisierte Gate vollständig grün ist, führe den folgenden visuellen und
inhaltlichen Vergleich durch:

Vergleiche die gerenderten Seiten `/de/kurse/4-klasse`, `/de/kurse/5-klasse`,
`/de/kurse/6-klasse`, `/de/kurse/1-sek` und `/de/kurse/2-3-sek` gegen die Original-Mockups direkt
in @design-reference/. Vergleiche zusätzlich `/de/kurse/bms` und `/de/kurse/matura` samt allen
vorhandenen Detailreferenzen sowie die Startseite
gegen @design-reference/Startseite.html. Prüfe insbesondere:

- Intensivkurs-Kacheln auf 6. Klasse, 2./3. Sek und BMS enthalten exakt `5 aufeinanderfolgende
  Kurstage in einer Schulferienwoche`; ihre Beschreibung endet mit `– inklusive praktischer Tipps
  & Tricks für die Gymiprüfung.`
- Touch-Targets ≥44px, Tastatur-Fokus sichtbar
- Tabellen auf Mobile als Kartenliste ohne data-label-Trick
- Frühbucherrabatt wird aus earlyBirdPrice berechnet statt als Text gepflegt,
  und erscheint auf Haupt- UND Unterseite identisch
- Beide Ablauf-Varianten funktionieren (simple bei 4./5./6. Klasse/1. Sek,
  phased bei 2./3. Sek Halbjahreskurs)
- WeekFilter funktioniert bei 2./3. Sek Intensivkurs
- SiteNav: flache Zielgruppen-Direktlinks ab md:, Sheet-Hamburger-Menü darunter; beide Varianten
  enthalten dieselben sieben `Audience`-Ziele sowie Nachhilfe und Über uns
- SiteNav: Login-Button ist auf Desktop und Mobile sichtbar, hat ein Touch-Ziel ≥44px und führt
  auf die bestehende Route `/login`; es existiert keine duplizierte Login-Seite
- SiteNav wird genau einmal durch `app/[locale]/(marketing)/layout.tsx` gerendert; weder
  `app/layout.tsx` noch eine `page.tsx` importiert oder rendert sie
- SiteNav erscheint auf allen öffentlichen Marketing-, Kurs- und Zusatzangebotsseiten, aber nicht
  auf `/login`, `/register`, Dashboard, Übungen, Prüfungen, Profil, Trainer, Aufsätzen,
  Intensivkurs-Verwaltung oder Materialien
- Für den Deutsch-only-Launch wird kein Sprachumschalter gerendert; vorbereiteter EN-Code ist
  weder erreichbar noch sichtbar. Ein späterer Aktivierungstest gehört nicht in dieses Gate.
- Auth-/Dashboard-Routen bleiben unlokalisiert: Login führt auf `/login`, geschützte Navigation
  weiterhin auf `/dashboard`, `/uebungen`, `/pruefung`, `/profil`, `/trainer`, `/aufsaetze`,
  `/intensivkurse` und `/materialien`
- Die kombinierte `proxy.ts` erhält die bestehende Auth-Logik und wendet next-intl nur auf die
  öffentlichen Marketingpfade an; `/api` und `/_next` werden nicht lokalisiert
- Kontakt ist erreichbar und korrekt verlinkt. Die vorhandenen Selbststudium-Referenzen für
  6. Klasse, 2./3. Sek und BMS sind als echte Seiten umgesetzt. Ein Checkout-Link wird nur mit
  einem realen, getesteten Ziel gerendert.
- Materialzugriff: Die vier Keys `langzeitgymi`, `kurzgymi`, `bms`, `matura` sind vorhanden;
  Grants erlauben exakt die zugeordneten Bereiche. 6. Klasse erhält Langzeitgymi, 2./3. Sek
  Kurzgymi und BMS den BMS-Bereich; kein Grant liefert 403/„Kein Zugang" statt fremder Inhalte.
- Jedes geschützte Material besitzt genau eine gültige `area_id`; es gibt keine Mehrfachzuordnung
  und keine Materialzeile, die in zwei Bereichen erscheint.
- Admin-Jahresverwaltung: Nur Administratoren können Preise ändern, Editionen publizieren oder
  archivieren; direkte Requests ohne Rolle werden serverseitig abgelehnt.
- „Vorjahr duplizieren“ erzeugt eine neue Draft-Edition und neue Sessions, ohne IDs, Preise,
  Status oder Termine der veröffentlichten Vorjahresedition zu verändern.
- Veröffentlichung ist atomar: Ungültige Preise/Fristen, fehlende Pflichtfelder oder keine
  buchbare Session verhindern den gesamten Statuswechsel. Nach Erfolg zeigen Hauptseite,
  Detailseite, Terminliste und Buchungsdialog dieselbe Edition.
- Buchungen behalten `booked_price`, `currency`, `edition_id` und `session_id` nach späteren
  Admin-Änderungen unverändert. Ein Concurrency-Test lehnt das Speichern einer veralteten
  `version` ab; Audit-Events decken Erstellen, Ändern, Duplizieren, Publizieren, Archivieren und
  Absagen ab.
- Arbeitszeiten: Lernpersonen sehen und ändern nur eigene offene Einträge; Dauer ist eine ganze
  positive Minutenzahl. Eingereichte Einträge sind gesperrt, Rückweisung macht sie erneut
  bearbeitbar, und ein Monatsabschluss mit offenen Einträgen wird vollständig abgelehnt.
- Payroll-Snapshot: Der Abschluss verwendet den am Leistungsdatum gültigen Stundensatz in ganzen
  Rappen aus der vom Administrator gepflegten, nicht überlappenden Vereinbarung, ist danach
  unveränderlich und fliesst genau einmal als Lohnkostenquelle in den
  Finanz-Ledger. Korrekturen erzeugen neue auditierte Ereignisse statt Überschreibungen.
- Lernpersonen können Lohnsätze weder über UI noch direkte Requests ändern; das Finanz-Cockpit
  übernimmt Payroll-Snapshot-Beträge und bietet keine zweite manuelle Lohneingabe.
- Finanz-Cockpit: `gebucht`, `bezahlt` und `periodengerecht verdient` sind getrennt testbar;
  stornierte Anmeldungen/Wartelisten zählen nicht als Teilnehmer, Rückerstattungen werden
  abgezogen und dasselbe Provider-Event wird idempotent nur einmal verarbeitet.
- Die Angebotsauswertung stimmt rechnerisch mit der Jahresansicht überein: Teilnehmer,
  Sessionkapazität (Referenz zehn je regulärer Kursgruppe), Umsatz, genehmigte Stunden,
  Payroll-Direktkosten, Deckungsbeitrag und Marge stammen aus denselben
  kanonischen Quellen. Angebot ohne Umsatz erzeugt keine Division durch null; negative Marge und
  nicht zugeordnete Kosten bleiben sichtbar.
- Prüfungssimulationen zeigen keine Auslastungs-KPI; weder UI noch Export erfinden dafür eine
  prozentuale Kapazitätsauswertung.
- RLS-Tests beweisen Zugriff, Ablauf, Widerruf und Bereichstrennung. Ein angemeldeter Nutzer kann
  weder per direkter Supabase-Abfrage noch über eine bekannte Storage-URL Materialien eines
  fremden Bereichs lesen. Admin-/Lehrpersonenfälle sind separat getestet.
- Login übernimmt nur interne validierte `callbackUrl`-Pfade; Selbststudium-Login kehrt zum
  richtigen Materialbereich zurück, externe Callback-URLs werden verworfen.
- Der Backfill dupliziert oder löscht keine vorhandenen Materialien/Dateien; nicht eindeutige
  5./6.-Klasse-Zeilen erscheinen im `needs_review`-Bericht. Leere neue Bereiche rendern einen
  stabilen Empty State.
- Die bestehende unlokalisierte Route `/kurse`, ihre öffentliche Supabase-Abfrage und der
  Anmelde-Server-Action-Flow funktionieren bis zu einer ausdrücklich beschlossenen Ablösung weiter
- Auf den neuen Marketingrouten gibt es keine Route-Segment-Exporte `revalidate`, `dynamic` oder
  `fetchCache`; stabile Daten verwenden `use cache`/`cacheLife`/`cacheTag`, Verfügbarkeit verwendet
  `connection()` unter `Suspense`
- Nach Server-Action-Mutationen beweisen die Routentests die unmittelbare Sichtbarkeit von
  Katalogänderungen (`updateTag`) und Belegungsänderungen (`refresh`) ohne 300-Sekunden-Wartezeit
- Es existiert kein paralleles zweites Kurssystem; neue Tabellen/Felder haben ein dokumentiertes
  Mapping zu `intensivwoche_kurse`, `intensivwoche_anmeldungen` und deren bestehendem Code
- Vorher-/Nachher-Inventar stimmt für Kurs-IDs, Anmeldungs-IDs, `kurs_id`, Status und Counts exakt
  überein; bestehende aktive Kurse bleiben auf `/kurse` sichtbar und eindeutig gemappte zusätzlich
  auf den neuen Klassenübersichten
- Jede fachliche Komponente aus Abschnitt 3 importiert ihre benannten Props-/Domain-Typen aus dem
  gemeinsamen Modul; es gibt keine lokalen Doppeldefinitionen von Offer-, Session-, Service-,
  Testimonial-, FAQ-, Timeline-, Nav- oder Subscription-Strukturen
- TypeScript-Fixtures mit `satisfies` decken alle sieben Audiences und sämtliche Union-Varianten
  (`CourseOffer`, `ExamSimulationOffer`, `SelfStudyOffer`) sowie Home-, Layout-, Kursdetail-,
  zielgruppenspezifische Service-, Selbststudium-, Tipps-, Platzhalter-, Abo- und Session-Modelle
  sowie `ExistingCourseCardModel`/`SessionSource` für Deutsch, Mathematik, Französisch und NMG ab;
  `npm run typecheck` lehnt fehlende Pflichtfelder ab
- Für jedes Feld der Page-Models ist DB-/JSONB-Quelle, Ableitung oder request-time Quelle
  dokumentiert; `SessionAvailability` bleibt ausserhalb von `Offer`, `SessionDefinition`,
  `CourseDetailPageModel`, `ExamSimulationPageModel` und `ExistingCourseCardModel`
- Tailwind CSS 4 bleibt CSS-first: kein neu angelegtes `tailwind.config.*`; die bestehenden
  Direktiven, `:root`, `.dark` und `@theme inline` in `app/globals.css` sind erhalten
- Prüfe alle neuen Marketingseiten im Light und Dark Mode: Hintergrund, Cards, Popovers,
  Formfelder, Fokus-Ringe, Default-/Secondary-/Destructive-Buttons sowie Deutsch-/Mathematik-/
  Französisch-/NMG-Badges verwenden die semantischen Tokens und bleiben gut lesbar
- Fach-Badges auf `subject-*-pale` verwenden für Text das jeweilige
  `subject-*-foreground`-Token; Farbe ist nie das einzige Status- oder Fachmerkmal
- Keine hart codierten Ersatzfarben in Komponenten und kein eigener Theme-State; Umschaltung
  erfolgt ausschliesslich über die bestehende `.dark`-Klasse. Sidebar-/Chart-Tokens bleiben intakt
- `components.json` hat ein leeres `tailwind.config` und verweist auf `app/globals.css`,
  `@/app/components/ui`, `@/app/components` und `@/lib/utils`
- Es gibt keine Imports aus `@/components/ui/*` und keinen parallelen Ordner `components/ui`;
  alle benötigten shadcn-Primitives liegen unter `app/components/ui`
- Alle zwölf Befehle des Gates laufen erfolgreich; protokolliere je Befehl Exit-Code sowie die
  Anzahl ausgeführter Datenbank-, Routen- und Linktests

Durchsuche zusätzlich den Code nach wiederholten Card-/Button-/Table-/Badge-
Markup-Mustern über mehrere Dateien hinweg (z. B. per grep nach ähnlichen
className-Kombinationen in mehreren page.tsx-Dateien). Melde jede Stelle, an
der eine der zentralen Komponenten aus Abschnitt 3 nicht genutzt, sondern
eigenes Markup dupliziert wurde.

Der Abschlussbericht endet mit `VERIFIKATION BESTANDEN` nur wenn alle Befehle und Prüfungen grün
sind. Andernfalls endet er mit `VERIFIKATION NICHT BESTANDEN`, nennt den ersten fehlgeschlagenen
Befehl und darf die Migration nicht als abgeschlossen bezeichnen.
```
