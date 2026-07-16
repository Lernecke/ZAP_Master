# Architektur-Briefing: Marketing- und Kursseiten-Migration nach Next.js

> **Migrations-Readiness-Abgleich 16.07.2026:** Der Referenzbestand wurde erneut vollständig
> inventarisiert. Er umfasst jetzt 37 HTML-Dateien (nicht 23): Startseite, sieben Angebots-
> Hauptseiten, 13 reguläre Kursdetailseiten, drei Selbststudium-Seiten, drei
> Prüfungssimulations-Seiten, sechs weitere Marketingseiten und vier Admin-Referenzen:
> `Layout_Admin_Kursangebot_Maske.html`, `Layout_Admin_Tagesfreigaben.html`,
> `Layout_Admin_Zeiterfassung.html` und `Layout_Admin_Finanzcockpit.html`. Neu gegenüber dem früheren
> Briefing sind BMS, Matura und die vorhandene Über-uns-Seite. Siebzehn veraltete oder als `#`
> hinterlegte, aber eindeutig auflösbare interne HTML-Links wurden korrigiert. Für BMS ist
> `Layout_BMS_Intensivkurs_Unterseite.html` die verbindliche Kurs-Unterseite. Die zuvor fehlende
> `Layout_BMS_Selbststudium_Unterseite.html` wurde auf Basis der 6.-Klasse-Vorlage mit
> BMS-spezifischen Inhalten ergänzt. Abschnitt 2 und 6 behandeln BMS/Matura als eigene Zielgruppen.
> `href="#"` bleibt in 23 Dateien an 80 Stellen vorhanden und
> darf nie in produktives Next.js-Markup übernommen werden; Abschnitt 6 ordnet diese Platzhalter
> realen Aktionen oder bewusst nicht klickbaren Elementen zu.

> **Änderungshinweis (Bestandsabgleich 15.07.2026):** Sämtliche Aussagen zum vorhandenen
> Repository wurden erneut gegen Code, Konfiguration, Supabase-Migrationen und Referenzdateien
> geprüft. Insbesondere sind die bereits vorhandene öffentliche `/kurse`-Seite samt Anmeldung,
> das bestehende Supabase-Kursmodell, der fehlende i18n-Stand und alle geschützten Route-Groups
> nun ausdrücklich dokumentiert. Gegenüber einer früheren Fassung ebenfalls korrigiert:
> Abschnitt 7 verwendet wegen `cacheComponents: true` verbindlich das Next.js-16-Modell mit
> `use cache`, `cacheLife`, `cacheTag`, `updateTag` und `connection()` statt Route-Level-
> `revalidate`, pauschalem `force-dynamic` oder unbestimmten ISR-Anweisungen.
> Abschnitt 2/3 deckt nun jede geplante fachliche Komponente durch ein benanntes View-Model ab:
> vollständige Offer-Varianten, Seitenmodelle, Navigation, Startseiten-Services, Buchungsstatus,
> Prüfungssimulation, zielgruppenspezifische Service-Seiten und Nachhilfe-Abos. Abschnitt 2.9
> macht die Zuordnung zu Persistenz, Mappern und TypeScript-Fixtures verbindlich.
> Abschnitt 2.10 berücksichtigt nun die vorhandenen Intensivkurs- und Anmeldedaten vollständig:
> unveränderte IDs/FKs, vier Bestandsfächer, Anzeige auf alten und neuen Seiten, additive
> Backfills, `created_by`-Schema-Drift, Owner-RLS, RLS-sichere View und automatischer
> Vorher-Nachher-Nachweis sind verbindlich.
> Abschnitt 1a (SessionTable.jsx nutzt bereits shadcn `Badge`), Abschnitt 2.3 (Frühbucherrabatt-Bug
> im Mockup behoben, neuer 5.-Klasse-Wochenkurs-Preisbug ergänzt), Abschnitt 6 (Phasenzahl
> durchgängig 3 statt 4 bei Halbjahreskurs/Vorkurs, 8 statt 7 Terminzeilen bei 6. Klasse
> Intensivkurs und korrigierter Dateiname 1. Sek), Abschnitt 6 zusätzlich an die tatsächlich
> flache Dateistruktur angepasst und den früheren Hinweis auf ein nicht vorhandenes
> Distance-Learning-Duplikat korrigiert. Abschnitt 9 legt Preise, sieben Zielgruppen und
> Deutsch-only-Launch nun verbindlich fest; es verbleibt kein stillschweigendes Ausführungsgate.
> Inhaltlich unveränderte Abschnitte sind nicht gekennzeichnet.

**Grundlage:** 37 HTML-Referenzdateien: fünf schulische Klassenstufengruppen, BMS und Matura mit
ihren vorhandenen Haupt-/Detailseiten, **plus die neue Startseite** (`Startseite.html`) und die
eigenständigen Mockups für Prüfungssimulation-Landingpage, Lerncoaching, Nachhilfe, Distance
Learning, Tipps und Über uns sowie die Admin-Masken für Jahresdurchführungen, Tagesfreigaben,
Arbeitszeiten/Lohnvorbereitung und Finanzen. Nur Kontakt besitzt noch kein eigenes Mockup. Ziel: React-Komponenten mit
Tailwind CSS + shadcn/ui und Daten aus der bereits angebundenen zentralen Quelle Supabase.

Dieses Dokument ist der Arbeitsauftrag für die Implementierung — es legt Komponentenschnitt,
Props/Typen und Datenmodell fest. Die Detailumsetzung (Dateistruktur, State-Management,
Anbindung ans bestehende Repo) entscheidet die Umsetzung im Projektkontext.

### Verbindlicher Repository-Bestand (geprüft am 15.07.2026)

- **Framework:** Next.js `16.1.6` mit App Router, React/React DOM `19.2.3`, TypeScript 5.
- **Versionsdrift:** `@next/bundle-analyzer` steht in `devDependencies` auf `^16.2.2`, während
  `next` exakt `16.1.6` ist. Vor dem ersten reproduzierbaren `npm ci`/Build müssen beide auf eine
  kompatible, bewusst freigegebene Next-Version ausgerichtet und im Lockfile fixiert werden;
  kein stilles Framework-Upgrade während der Seitenmigration.
- **Startseite:** `app/page.tsx` rendert Komponenten aus `app/components/zap`, darunter die
  Client-Komponente `app/components/zap/navbar.tsx`. Dieser App-Bestand besitzt bereits ein mobiles
  Aufklappmenü und einen Login-CTA („Jetzt starten"), wird aber durch die neue lokalisierte
  Marketing-Startseite ersetzt. Die aktualisierte Referenz `Startseite.html` ist dafür verbindlich:
  flache Direktnavigation zu allen sieben Zielgruppen, kompakte Nav-Labels, Nachhilfe, Über uns,
  EN, Kontakt und Login — ohne Angebot-Dropdown.
- **Öffentliche Kursseite:** `/kurse` existiert unter `app/(public)/kurse`. Sie liest aktive Kurse
  über `getPublicKurse()` aus der Supabase-View `intensivwoche_kurse_mit_anmeldungen`, cached sie
  derzeit 300 Sekunden und besitzt bereits Modal, Zod-Validierung und Server Action für
  Anmeldungen in `intensivwoche_anmeldungen`.
- **Datenbank:** Supabase ist mit `@supabase/ssr` und `@supabase/supabase-js` angebunden. Vorhanden
  sind unter anderem `intensivwoche_kurse`, `intensivwoche_anmeldungen` und die genannte View samt
  RLS-Migrationen. Das neue Angebotsmodell muss diese Struktur prüfen und migrieren/erweitern;
  ein unverbundenes zweites Kurssystem ist nicht zulässig. Migration 003 fügt sechs als Beispiel
  bezeichnete Kurse in vier Fächern ein; Migration 006 referenziert sie mit lokalen Testdaten,
  während Nutzung und Inhalt im entfernten Projekt unbekannt sind. Der lokale Verlauf ist nicht
  leer-datenbankfähig: doppelte Version `002`, falscher `public.courses`-FK, vorausgesetzte aber
  nicht angelegte `profiles`/`subjects` sowie ein UUID/numerisch-Konflikt bei `subject_id`.
  Migration 006 enthält zudem Auth-Testnutzer und muss aus der deploybaren Kette entfernt werden.
  Zusätzlich besteht Schema-Drift: Dashboard-Code und generierte DB-Typen verwenden `created_by`,
  die eingecheckten Migrationen legen die Spalte jedoch nicht an.
- **Auth und geschützte Bereiche:** NextAuth 5 Beta und Supabase-Tokens sind integriert.
  `proxy.ts` schützt aktuell explizit `/dashboard`, `/trainer`, `/uebungen`, `/pruefung`, `/profil`
  sowie `/login` und `/register`; `app/(dashboard)/layout.tsx` schützt zusätzlich sämtliche Seiten
  seiner Route Group, darunter `/aufsaetze`, `/intensivkurse` und `/materialien`.
- **i18n:** `next-intl`, `i18n/`, `messages/` und `app/[locale]/` sind noch nicht vorhanden.
- **Tailwind/shadcn:** Tailwind CSS 4 ist CSS-first eingerichtet. Die 18 vorhandenen UI-Dateien
  liegen unter `app/components/ui` und verwenden den Alias `@/app/components/ui/*`.
  `components.json` fehlt. Ebenfalls fehlen weiterhin `table`, `collapsible`, `toggle-group`,
  `sheet` und `tooltip`. Der vorhandene Quellcode entspricht den
  `new-york`-/`data-slot`-Konventionen; ohne `components.json` ist der Stil noch nicht CLI-seitig
  festgeschrieben.
- **Layouts:** `app/layout.tsx` enthält globale Provider, Geist-Fonts, Toaster und globale Styles.
  `app/(dashboard)/layout.tsx` besitzt Dashboard-Navigation und Auth-Guard. Ein öffentliches
  Marketing-Layout existiert noch nicht und wird als `app/[locale]/(marketing)/layout.tsx` neu
  angelegt; nur dort wird die neue `SiteNav` gerendert.
- **Materialzugriff:** `/materialien` ist login-geschützt, lädt derzeit aber sämtliche
  `learning_materials` mit `is_public = true`; es gibt keine Einschreibungs-/Berechtigungsprüfung.
  `class_levels` ist nur ein frei filterbares Textarray, das Upload-UI kennt ausschliesslich
  `5. Klasse` und `6. Klasse`, und das veränderbare Profilfeld `class_level` darf keine
  Autorisierungsquelle werden. Auch der Login ignoriert aktuell `callbackUrl` und leitet immer
  nach `/dashboard`. Die generierten DB-Typen enthalten `learning_materials`, im eingecheckten
  lokalen Migrationsverlauf fehlt jedoch ihre kanonische `CREATE TABLE`-/RLS-Baseline.
- **Referenzbestand:** `design-reference/` ist flach und enthält 37 HTML-Dateien, zwei Markdown-
  Dokumente und `SessionTable.jsx`. Alle 37 HTML-Dateien enthalten ein `<nav>`; acht vollständige
  öffentliche Seiten enthalten zusätzlich `<header>` und `<footer>`. Die vier Admin-Referenzen
  besitzen eigene Dashboard-Header ohne Marketing-Footer. Dieses
  Prototyp-Markup ist keine Quelle für das künftige Layout und wird nicht seitenweise übernommen.

---

## 1. Design-Tokens → Tailwind CSS 4 + shadcn/ui in `app/globals.css`

Über alle 37 HTML-Referenzdateien (inkl. Startseite und Admin-Masken) hinweg konsistent genug — ein einziges Theme
reicht. Die zwei exportierten Prüfungssimulationsdateien bleiben die in Abschnitt 4 beschriebenen
visuellen Ausreisser.

**Verbindlicher Projektstand:** Das Projekt nutzt Tailwind CSS 4 und React 19. Die vorhandenen
shadcn/ui-Quelldateien folgen dem Stil `new-york`; die CLI-Konfiguration fehlt noch. Die
CSS-Einstiegspunkte sind bereits korrekt eingerichtet:

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";
@custom-variant dark (&:is(.dark *));
```

Tailwind 4 wird **CSS-first** konfiguriert. Für diese Migration wird keine `tailwind.config.js`
angelegt und keine JavaScript-`theme.extend`-Konfiguration ergänzt. Semantische shadcn-Tokens
bleiben in `:root` und `.dark`; Tailwind-Utilities werden über das vorhandene `@theme inline` in
`app/globals.css` erzeugt.

**Entscheidung:** Statt Marken-Farben nur als eigene Tailwind-Farbnamen (`sage`, `gold`, `ink`)
zu registrieren, auf die **semantischen shadcn/ui-Slots** mappen. Grund: Die UI-Primitives aus
Abschnitt 1a (`Button`, `Badge`, `Card` …) greifen automatisch auf `--primary`, `--accent`,
`--destructive` etc. zu — wird nur `sage`/`gold` als Farbname registriert, müsste jede
Button-/Badge-Instanz die Marke manuell nachtragen, statt sie einmal zentral zu setzen.

```css
/* app/globals.css — Light Mode */
:root {
  --background: #F5F6F1;        /* paper */
  --foreground: #16233F;        /* ink */
  --card: #FFFFFE;
  --card-foreground: #16233F;
  --popover: #FFFFFE;
  --popover-foreground: #16233F;
  --border: #DBDDD2;            /* line */
  --input: #DBDDD2;
  --primary: #16233F;           /* ink — Original-CTAs (.btn/.row-btn) sind navy, NICHT sage */
  --primary-foreground: #FFFFFF;
  --secondary: #4E6E54;         /* sage-deep — Hover-Zustand der CTAs, "freie Plätze", Fach Deutsch */
  --secondary-foreground: #FFFFFF;
  --muted: #EAEAE4;             /* leicht abgesetzter Hintergrund */
  --muted-foreground: #3C4A68;  /* ink-soft */
  --accent: #C89B3C;            /* gold — Fach Mathematik, Karte "b"-Variante, Preis-Akzente */
  --accent-foreground: #16233F;
  --destructive: #B23A3A;       /* "ausgebucht"/voll */
  --destructive-foreground: #FFFFFF;
  --ring: #4E6E54;

  --subject-de: #6B8F71;
  --subject-de-pale: #E4EBE3;
  --subject-de-foreground: #35523B;
  --subject-ma: #C89B3C;
  --subject-ma-pale: #F3E8D2;
  --subject-ma-foreground: #67480D;
  --subject-fr: #B5676F;
  --subject-fr-pale: #F3E1E4;
  --subject-fr-foreground: #6F3039;
  --subject-nmg: #5C7A9E;
  --subject-nmg-pale: #E1E8F0;
  --subject-nmg-foreground: #304A69;
  --rust: #B5674D;
  --steel: #5C7A9E;
  --brand-on-dark: #8CB392;
  --ink-pale: #E4E6ED;
  --tertiary: #2F5D8A;
  --tertiary-pale: #E1EAF2;
}

/* Dark Mode — dunkle Variante desselben Markenbilds, keine alte blaue Standardpalette */
.dark {
  --background: #101827;
  --foreground: #F3F4ED;
  --card: #172238;
  --card-foreground: #F3F4ED;
  --popover: #172238;
  --popover-foreground: #F3F4ED;
  --border: #34425A;
  --input: #34425A;
  --primary: #F2F3EA;
  --primary-foreground: #16233F;
  --secondary: #8EAD92;
  --secondary-foreground: #102019;
  --muted: #222E43;
  --muted-foreground: #B8C1D0;
  --accent: #E0B85B;
  --accent-foreground: #241A07;
  --destructive: #E47777;
  --destructive-foreground: #260808;
  --ring: #9BBCA0;

  --subject-de: #8EAD92;
  --subject-de-pale: #24372C;
  --subject-de-foreground: #BBD0BE;
  --subject-ma: #E0B85B;
  --subject-ma-pale: #3B301B;
  --subject-ma-foreground: #F0D28D;
  --subject-fr: #D9919A;
  --subject-fr-pale: #42272C;
  --subject-fr-foreground: #F0BBC1;
  --subject-nmg: #86A3C8;
  --subject-nmg-pale: #263548;
  --subject-nmg-foreground: #BDD0E7;
  --rust: #D99176;
  --steel: #86A3C8;
  --brand-on-dark: #A7C7AB;
  --ink-pale: #34425A;
  --tertiary: #86A3C8;
  --tertiary-pale: #263548;
}
```

Die Dark-Mode-Werte sind keine automatische Invertierung: Navy bleibt die Grundstimmung,
Sage kennzeichnet weiterhin Deutsch/Erfolg, Gold Mathematik/Preise, Rosé Französisch und Steel
NMG. Helle
Vordergrundfarben auf dunklen Flächen sowie dunkle Vordergrundfarben auf den aufgehellten
Sage-/Gold-Akzenten sichern die Lesbarkeit. Status darf nie nur über Farbe vermittelt werden;
Badges behalten immer einen Text bzw. ein verständliches Icon. Auf den blassen Fachflächen ist
für Text jeweils `subject-*-foreground` zu verwenden, nicht die reine Akzentfarbe.

**Korrektur gegenüber der ersten Fassung:** Beim genauen Abgleich mit dem Original-CSS
(`.btn{background:var(--ink)}`, `.btn:hover{background:var(--sage-deep)}`) zeigt sich: Die
tatsächliche CTA-Farbe ist **ink** (dunkles Navy), nicht Sage — Sage ist der Hover-/Erfolgs-Akzent
(„freie Plätze", Fach Deutsch). `--primary` muss also auf `ink` zeigen, `--secondary` auf
`sage-deep`. Sonst würden alle Buttons in der Migration in der falschen Farbe erscheinen.

```css
/* app/globals.css — bestehendes @theme inline erweitern, keinen zweiten Block anlegen */
@theme inline {
  /* vorhandene shadcn-Mappings --color-background, --color-primary usw. bleiben erhalten */

  /* Fachfarben mit fester Bedeutung */
  --color-subject-de: var(--subject-de);
  --color-subject-de-pale: var(--subject-de-pale);
  --color-subject-de-foreground: var(--subject-de-foreground);
  --color-subject-ma: var(--subject-ma);
  --color-subject-ma-pale: var(--subject-ma-pale);
  --color-subject-ma-foreground: var(--subject-ma-foreground);
  --color-subject-fr: var(--subject-fr);
  --color-subject-fr-pale: var(--subject-fr-pale);
  --color-subject-fr-foreground: var(--subject-fr-foreground);
  --color-subject-nmg: var(--subject-nmg);
  --color-subject-nmg-pale: var(--subject-nmg-pale);
  --color-subject-nmg-foreground: var(--subject-nmg-foreground);
  --color-rust: var(--rust);
  --color-steel: var(--steel);
  --color-brand-on-dark: var(--brand-on-dark);
  --color-ink-pale: var(--ink-pale);
  --color-tertiary: var(--tertiary);
  --color-tertiary-pale: var(--tertiary-pale);

  /* next/font stellt diese Variablen im Marketing-Layout bereit */
  --font-serif: var(--font-fraunces), serif;
  --font-sans: var(--font-inter), sans-serif;
  --font-mono: var(--font-ibm-plex-mono), monospace;
}
```

Google Fonts über `next/font/google` laden, nicht per `<link>` (kein Layout-Shift, kein
Render-Blocking). Die bestehenden Geist-Fonts und Dashboard-Styles nicht blind entfernen: Die
neuen Font-Variablen werden zunächst im lokalisierten `(marketing)`-Layout gesetzt. Eine globale
Umstellung der restlichen Lernplattform ist nicht Teil dieser Migration.

Die vorhandenen Token-Namen in `:root` und `.dark` bleiben vollständig erhalten; ihre Farbwerte
werden für das neue Design paarweise aktualisiert. Sidebar- und Chart-Tokens, die nicht zum
Marketing-Redesign gehören, werden nicht gelöscht oder ungeprüft überschrieben. Der Dark Mode
wird über die bestehende `.dark`-Klasse und `@custom-variant dark` aktiviert — Komponenten dürfen
keinen eigenen Theme-State und keine hart codierten `dark:bg-*`-Ersatzpaletten einführen.

Die aktualisierte Startseite ergänzt `brand-on-dark` für den helleren Logo-Schriftzug auf Navy,
`ink-pale` für gedämpfte Flächen sowie `tertiary`/`tertiary-pale` für die blau codierten BMS- und
Matura-Servicekarten. Diese Farben werden als globale Tokens übernommen und nicht als lokale
Hex-Werte in einzelnen Komponenten dupliziert.

**Farbcodierung als festes System behandeln**, nicht pro Seite neu definieren:
`subject-de` (Sage) = Deutsch, `subject-ma` (Gold) = Mathematik, `subject-fr` (Rust/Rosé) =
Französisch und `subject-nmg` (Steel) = Natur, Mensch, Gesellschaft. Französisch/NMG sind wegen
der vorhandenen Datensätze in `intensivwoche_kurse` Teil des Systems, auch wenn die neuen
Marketing-Mockups primär Deutsch/Mathematik zeigen.

---

## 1a. UI-Primitives (shadcn/ui-Basis)

### Bestehende shadcn-Struktur — verbindlich beibehalten

Die vorhandenen Komponenten liegen unter `app/components/ui` und werden im Projekt bereits über
`@/app/components/ui/...` importiert. Dieser Pfad ist die **einzige** UI-Quelle. Es darf kein
zweiter Ordner `components/ui` entstehen. Der Referenzprototyp `SessionTable.jsx` verwendet
ebenfalls diesen Alias.

Vorhanden sind unter anderem `Button`, `Badge`, `Card`, `Dialog`, `Separator`, `Tabs`, `Sonner`
und weitere Form-Primitives. Für die Migration fehlen derzeit nur die benötigten Dateien
`table.tsx`, `collapsible.tsx`, `toggle-group.tsx`, `sheet.tsx` und `tooltip.tsx`.

Da die shadcn-CLI für das Hinzufügen neuer Komponenten eine Konfiguration benötigt, wird im
Projekt-Root eine `components.json` angelegt, die den **bestehenden** Aufbau beschreibt:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/app/components",
    "ui": "@/app/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks",
    "utils": "@/lib/utils"
  }
}
```

Bei Tailwind 4 bleibt `tailwind.config` ausdrücklich leer. Ein exakt versioniertes `shadcn`-CLI-
Paket wird als Dev-Dependency aufgenommen. `npm exec -- shadcn init` darf nicht
unbeaufsichtigt über das bestehende Projekt laufen, weil es `globals.css`, Abhängigkeiten und
vorhandene Komponenten verändern kann. Zuerst `components.json` gegen den Ist-Stand prüfen und
`npm exec -- shadcn info` ausführen. Danach nur die fünf fehlenden Komponenten mit
`npm exec -- shadcn add table collapsible toggle-group sheet tooltip` hinzufügen —
ohne `--overwrite`. Änderungen an `app/globals.css`, `package.json`, Lockfile und bestehenden
UI-Dateien anschließend einzeln prüfen.

Grundlage für alle Layout- und Interaktionsbausteine, die sich unabhängig vom Kurs-Inhalt
über die 13 regulären Kursdetailseiten sowie die weiteren Marketingseiten wiederholen; die zwei
exportierten ZAP-Prüfungssimulationsdateien sind die Ausreisser aus Abschnitt 4. Die Grundlage gilt
**ebenso für Startseite und Platzhalterseiten**
(Abschnitt 6). Diese Ebene liegt **unter** den domänenspezifischen Komponenten aus Abschnitt 3
— `CourseCard`, `AddOnCourses` und `SessionTable` etc. sollten aus diesen Primitives zusammengesetzt
werden, nicht eigenes Card-/Button-Markup duplizieren.

**Wichtig, unabhängig von dieser Tabelle:** Alle 37 HTML-Referenzen enthalten eigenes
`<nav>`-Markup; acht vollständige öffentliche Seiten enthalten zusätzlich `<header>` und
`<footer>`. Bei der Migration wird dieses wiederholte Layout-Markup bewusst verworfen. `SiteNav`
und `SiteFooter` gehören zentral ins neue öffentliche Marketing-Layout, nicht in einzelne
Seiten und nicht in das globale Root-Layout.

| Zentrales Element | Gemeinsame Funktion | shadcn/Radix-Basis | Zentralisierung |
|---|---|---|---|
| `PageContainer` | einheitliche Maximalbreite, Seitenabstand und responsive Innenabstände | keine fertige Komponente; Tailwind-Layout | einmal unter `app/components/layout/page-container.tsx` |
| `PageIntro` | Seitentitel plus optionaler Eyebrow-/Einleitungstext | semantische Typografie, optional `Badge` | gemeinsame API für Haupt- und Detailseiten; visuelle Varianten über `variant` |
| `Section` | vertikaler Abstand, Hintergrundvariante und Inhaltsbreite | Tailwind + `Separator` bei Bedarf | keine individuellen Wrapper-/Spacing-Regeln pro Datei |
| `SectionHeading` | konsistente H2/H3-Hierarchie und Beschreibung | keine fertige Komponente | `title`, `description`, `align`, `size` |
| `ActionButton` | sämtliche CTAs wie „Termine ansehen", „Anmelden", „Termin wählen" | shadcn `Button`, bei Links mit `asChild` + Next `Link` | Varianten `default`, `secondary`, `outline`; keine eigenen `.btn`/`.row-btn`-Klassen |
| `ContentCard` | umrandete bzw. farbige Inhaltsflächen mit Radius und Schatten | shadcn `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Basis für Kurs-, Feature-, Ablauf- und Zusatzkarten |
| `StatusBadge` | kurze Kennzeichnungen wie empfohlen, freie Plätze, ausgebucht und Fach-Tags | shadcn `Badge` | Status→Farbe zentral über `class-variance-authority` abbilden |
| `ResponsiveGrid` | wiederkehrende ein-/mehrspaltige Anordnung | Tailwind CSS Grid | `columns`/Breakpoints kontrolliert zentral statt je HTML-Datei |
| Design-Tokens | Farben, Radius, Schatten, Schrift, Abstände und Fokuszustände | shadcn CSS-Variablen in `globals.css` | bestehende CSS-Werte in semantische Tokens wie `--primary`, `--accent`, `--muted`, `--destructive` überführen (siehe Abschnitt 1) |

**Konkrete Anschlussstellen an Abschnitt 3:**

- `CourseCard` (Hauptkurs-Kacheln) und `AddOnCourses` (Zusatzangebote) = `ContentCard` + `StatusBadge`/`CategoryBadge` (Fach-Tags, "empfohlen") + `ActionButton`
- `SessionTable`-Zeilen = zentraler `StatusBadge` für „freie Plätze"/„wenige Plätze"/„keine
  Plätze". Der Prototyp `SessionTable.jsx` nutzt zwar bereits shadcn `Badge`, definiert aber **keine**
  eigenständige `StatusBadge`-Komponente und kennt nur `frei/voll`. Für die Migration wird die
  Darstellung extrahiert und um `wenige` ergänzt; die Inline-Logik wird nicht unverändert kopiert.
- `WhyUsGrid`/Feature-Grid = `ResponsiveGrid` + `ContentCard`

---

## 1b. HTML-Muster → shadcn/Radix-Zuordnung (detailliert)

Verfeinerung von Abschnitt 1a: welches Radix-Primitive hinter welchem wiederkehrenden
HTML-Muster steckt, und wo eine Client Component nötig ist vs. natives HTML reicht.

| Vorhandenes HTML-Muster | Zentrale React-Komponente | shadcn/Radix | Hinweis |
|---|---|---|---|
| `.card`, `.feature`, `.flow-step`, `.testi` | spezialisierte Komponenten auf `ContentCard` | `Card` | nicht vier unabhängige Card-Implementierungen erstellen |
| `.btn`, `.row-btn` und CTA-Links | `ActionButton` (Karten-CTAs) / `BookingButton` (Terminzeilen-CTA, = `RowAction` im ersten Prototyp) | `Button` mit `asChild` | Next.js-Links bleiben semantisch Links |
| `.fit-tag`, `.free`, `.full`, `.recommended`, Fachlabels | `StatusBadge` (frei/voll/empfohlen) **und** `CategoryBadge` (Fach-Tags/Fit-Tags) — zwei getrennte Varianten, keine Überladung einer einzigen Badge | `Badge` | Farben über Variant-Namen, nicht über verstreute Klassen |
| Termin-Tabellen | `SessionTable` *(= „SessionTable" — Name aus dem bereits gelieferten Prototyp übernommen)* | `Table` | Header und Zellen semantisch erhalten; Mobile-Layout separat definieren (siehe Abschnitt 5) |
| `<details class="daydetails">` | `SessionDetails` *(= „SessionDetails")* | `Collapsible` | **bereits so entschieden:** nur als Client Component, wenn gesteuerter Zustand nötig ist; sonst natives `<details>` bevorzugen — im Prototyp bereits so umgesetzt |
| Wochenfilter (2./3. Sek Intensivkurs) | `WeekFilter` | `ToggleGroup` oder `Tabs` | URL-Search-Param sinnvoll, wenn Filterzustand teilbar sein soll — ergänzt den in Abschnitt 6 notierten State-Bedarf um die konkrete Radix-Wahl |
| Testimonials | `TestimonialCard` (Unterkomponente von `WhyUsGrid`) | `Card` | kein Carousel erforderlich, solange alle drei Stimmen gleichzeitig sichtbar bleiben |
| Trennlinien/Abschnittsgrenzen | Bestandteil von `Section` | `Separator` | sparsam und konsistent einsetzen |
| ausgebuchte Aktion | `ActionButton` mit `disabled` | `Button` + optional `Tooltip` | Tooltip nur für zusätzliche Erklärung, **nicht als einzige Statusanzeige** — der `StatusBadge` in der Zeile bleibt die primäre Kennzeichnung |

**Bestand und Abgrenzung:** `DropdownMenu` und `Form` sind als shadcn-Dateien bereits vorhanden;
ein Carousel wird für die Vorlagen weiterhin nicht benötigt. Für Buchungen existiert auf `/kurse`
bereits `anmeldung-modal.tsx` mit Zod-Validierung und Supabase Server Action. Dieser Flow ist vor
einer neuen `BookingButton`-Anbindung zu prüfen und nach Möglichkeit zu erweitern. Es wird keine
zweite, unabhängige Buchungsmodalität nur für die neuen Marketingseiten gebaut. Die `#`-Links in
den HTML-Referenzen bilden den realen Repository-Bestand nicht ab.

**Revidiert durch die aktualisierte Startseite:** Die Hauptnavigation ist eine flache Reihe
direkter Links und besitzt kein „Angebot"-Dropdown mehr. Für Desktop genügt deshalb semantisches
Nav-Markup mit Next-`Link` und einem responsiven Flex-Layout; Radix `NavigationMenu` oder
`DropdownMenu` wird für `SiteNav` nicht benötigt. Die sieben Zielgruppen verwenden die kompakten
Labels `4.Kl`, `5.Kl`, `6.Kl`, `1.Sek`, `2./3.Sek`, `BMS` und `Matura`.

**Mobile Navigation (löst Offene Frage 8):** Die aktualisierte HTML-Referenz verwendet unter
820px einen CSS-Checkbox-Hamburger. In Next.js wird dasselbe Verhalten zugänglich mit shadcn
`Sheet` (Slide-in-Drawer, basiert auf Radix `Dialog`) umgesetzt. Desktop-Links und mobiles Sheet
lesen aus derselben `Audience[]`-Datenquelle wie `KlassenPicker` und Service-Grid (Abschnitt 2.1) —
keine weitere Stelle, an der die sieben Zielgruppenziele gepflegt werden.

**Login als fester Navigations-CTA:** `SiteNav` zeigt auf Desktop und im mobilen `Sheet` einen
deutlich als Button gestalteten Link „Login" zur bereits vorhandenen Route `/login`. Er erschliesst
den bestehenden geschützten Bereich mit Übungen und Prüfungen; im Rahmen dieser Migration wird
weder eine zweite Login-Seite noch ein neuer Authentifizierungsablauf gebaut. Umsetzung mit Next
`Link` als Child des zentralen `ActionButton`/shadcn `Button`, Touch-Ziel mindestens 44px. Die
statischen HTML-Prototypen verwenden dafür bewusst den anwendungsbezogenen Root-Pfad `/login`.

**Layout-Grenze — verbindlich:** `SiteNav` wird genau einmal in
`app/[locale]/(marketing)/layout.tsx` gerendert. Sie gehört weder in `app/layout.tsx` noch direkt in
`app/[locale]/(marketing)/page.tsx`. Dadurch erhalten Startseite, Kursseiten und öffentliche
Zusatzangebote dieselbe Navigation, während `/login`, `/register`, Dashboard, Übungen, Prüfungen,
Profil, Trainer- und API-Bereiche vollständig davon getrennt bleiben. Das globale Root-Layout
enthält nur app-weite Infrastruktur wie `<html>`, `<body>`, Provider und globale Styles.

---

## 1c. Wiederkehrende Elemente nach Seitenfamilie

Ergänzt 1a/1b um die Vorkommen-Spalte (wo genau taucht welches Element auf) und die
empfohlenen Props/Daten je Komponente. Namen hier sind **verbindlich** — sie ersetzen frühere
Bezeichnungen in diesem Dokument (`OfferCard`→`CourseCard`/`AddOnCourses`, `CourseFlow` hiess
zuvor `ProcessSteps`, `CourseContent` hiess `ContentAccordion`, `WhyUsGrid` hiess `WhyWeSection`,
`SessionTable`/`SessionDetails`/`BookingButton` hiessen im ersten Prototyp `BookingTable`/
`SessionDetails`/`RowAction`). Abschnitt 3 ist bereits entsprechend aktualisiert.

| Element / Komponente | Verwendet auf | Aufgabe | Empfohlene Props / Daten |
|---|---|---|---|
| `AudienceHero` | alle 7 Hauptseiten | Zielgruppe, Prüfung bzw. Nutzenversprechen | `content: AudienceHeroContent` |
| `CourseCardGrid` | alle Hauptseiten | responsives Raster der regulären Angebote | `offers: CourseOffer[]` |
| `CourseCard` | alle Hauptseiten | Kurstyp, Zeitraum, Nutzen, Leistungen, Preis und CTA | `offer: CourseOffer` |
| `AddOnCourses` | 2./3. Sek und 6. Klasse | Prüfungssimulation und Selbststudium | `offers: (ExamSimulationOffer \| SelfStudyOffer)[]` aus `AudiencePageModel.addOnOffers` |
| `ExistingCourseSection` / `ExistingCourseCard` | Klassenübersichten mit eindeutigem Bestandsmapping | vorhandene Supabase-Kurse zusätzlich anzeigen und mit unveränderter Kurs-ID buchbar halten | `courses: ExistingCourseCardModel[]` aus `AudiencePageModel.existingCourses` |
| `CourseHero` | alle 13 vorhandenen regulären Detailseiten | Kurstitel, Kurzbeschreibung und Preis | `offer: CourseOffer` |
| `CourseFlow` | alle 13 vorhandenen regulären Detailseiten | datengetriebener Kursablauf | `steps: FlowStep[]`; Pfeile nur visuell |
| `CourseContent` | Wochen-/Halbjahreskurse | detaillierte Deutsch-, Mathematik-, Coaching- und Prüfungsinhalte | `sections: ContentSection[]` statt HTML-Strings |
| `WhyUsGrid` | alle 13 regulären Detailseiten | Abschnitt „4 Gründe, die zählen" | `features: Feature[]` |
| `Testimonials` | alle 13 regulären Detailseiten | Kundenstimmen | `testimonials: Testimonial[]` |
| `BookingSection` | alle 13 regulären Detailseiten | Sprungziel, Preis-/Hinweistexte und Termine | `offer: CourseOffer`, `sessions: SessionRow[]` |
| `SessionTable` | alle 13 regulären Detailseiten | Termin, Zeit/Ablauf, Standort, Status, Anmeldung | `columns: SessionColumn[]`, `rows: SessionRow[]` |
| `SessionDetails` | nahezu alle Terminlisten | aufklappbare Tages- oder Ablaufdetails | `ablauf: Ablauf` |
| `BookingButton` | alle 13 regulären Detailseiten | CTA „Anmelden" | `session: SessionRow`; Verhalten aus `bookingAction` |
| `WeekFilter` | nur Intensivkurs 2./3. Sek | filtert Termine nach Ferienwoche | `weeks: WeekOption[]`; filtert `SessionRow.weekId` |

---

## 2. Datenmodell

Zwölf Teilbereiche decken Klassenstufen, Offer-Varianten, Preise, Buchung/Verfügbarkeit,
Zusatzangebote, Nachhilfe-Abos, gemeinsame Inhaltsmodelle, vollständige Seiten-View-Models sowie
die Zuordnung zu Datenbank/Komponenten und die verlustfreie Übernahme der Bestandskurse ab.

### 2.1 Zielgruppe ist keine 1:1-Beziehung zu einer Klassenstufe

2./3. Sek teilen sich eine Seite; BMS und Matura sind überhaupt keine Klassenstufen. Der frühere
`Klassenstufe`-Typ allein ist deshalb nicht mehr vollständig. Routing, Navigation und Angebote
verwenden `Audience`; `Klassenstufe` bleibt als verengter Typ für die fünf Gymiprüfungsgruppen:

```ts
type KlassenstufeId = "4" | "5" | "6" | "1-sek" | "2-3-sek";
type AudienceId = KlassenstufeId | "bms" | "matura";

type AudienceCapabilities = {
  examSimulation: boolean;
  selfStudy: boolean;
  distanceLearning: boolean;
};

type Audience = {
  id: AudienceId;             // stabiler fachlicher Key, nie aus Anzeigetext ableiten
  slug: string;               // "4-klasse", "2-3-sek", "bms", "matura"
  displayLabel: string;       // reiner Anzeigetext
  navLabel: string;           // kompakt: "4.Kl", "2./3.Sek", "BMS"
  href: string;               // logischer Pfad ohne Locale
  kind: "gymipruefung" | "bms" | "matura";
  kategorie: "primar" | "sek" | "weiterfuehrend";
  zielPruefung: string;
  placements: ("nav" | "heroPicker" | "serviceGrid")[];
  capabilities: AudienceCapabilities;
};

type Klassenstufe = Audience & {
  id: KlassenstufeId;
  kind: "gymipruefung";
};
```

**Wichtig:** `SiteNav`, `KlassenPicker` und die BMS-/Matura-Servicekarten lesen aus **derselben**
`Audience[]`-Quelle. `placements` steuert, wo ein Eintrag erscheint: Die fünf Gymiprüfungsgruppen
stehen in Nav und Hero-Picker; BMS/Matura stehen in Nav und Service-Grid. `navLabel` wird explizit
gepflegt und nie aus `displayLabel` abgeleitet. Es werden keine getrennten
Listen mit duplizierten Slugs oder Labels gepflegt.

**Explizite Routing-Daten statt Text-Abgleich:** Die aktuelle `Startseite.html` enthält für Picker
und Navigation bereits Verweise auf die passenden Referenz-HTML-Dateien; andere Mockup-Aktionen
verwenden weiterhin teilweise `href="#"`. Diese Prototyp-Links sind weder produktive Next.js-
Routen noch eine belastbare fachliche Zuordnung. Claude Code darf die Zielroute deshalb nicht aus
Dateinamen oder sichtbarem Text erraten (riskant, siehe „Vorkurs" vs. „1. Sek" unten in 2.2),
sondern muss diese zentralen Routing-Daten für `Audience[]` exakt übernehmen:

| `id` | `slug` / `href` | `displayLabel` | `navLabel` | `kind` / `kategorie` | Fähigkeiten (`exam/self/distance`) | `placements` | Quelldatei |
|---|---|---|---|---|---|---|---|
| `4` | `4-klasse` / `/kurse/4-klasse` | „4. Klasse" | `4.Kl` | `gymipruefung` / `primar` | `false/false/false` | `nav`, `heroPicker` | `Layout_4_Klasse_Hauptseite.html` |
| `5` | `5-klasse` / `/kurse/5-klasse` | „5. Klasse" | `5.Kl` | `gymipruefung` / `primar` | `false/false/false` | `nav`, `heroPicker` | `Layout_5_Klasse_Hauptseite.html` |
| `6` | `6-klasse` / `/kurse/6-klasse` | „6. Klasse" | `6.Kl` | `gymipruefung` / `primar` | `true/true/true` | `nav`, `heroPicker` | `Layout_6_Klasse_Hauptseite.html` |
| `1-sek` | `1-sek` / `/kurse/1-sek` | „1. Sek" | `1.Sek` | `gymipruefung` / `sek` | `false/false/false` | `nav`, `heroPicker` | `Layout_1_Sek_Hauptseite.html` |
| `2-3-sek` | `2-3-sek` / `/kurse/2-3-sek` | „2./3. Sek" | `2./3.Sek` | `gymipruefung` / `sek` | `true/true/true` | `nav`, `heroPicker` | `Layout_2_Sek__Hauptseite.html` |
| `bms` | `bms` / `/kurse/bms` | „BMS-Aufnahmeprüfung" | `BMS` | `bms` / `weiterfuehrend` | `true/true/false` | `nav`, `serviceGrid` | `Layout_BMS_Hauptseite.html` |
| `matura` | `matura` / `/kurse/matura` | „Maturaprüfung" | `Matura` | `matura` / `weiterfuehrend` | `false/false/false` | `nav`, `serviceGrid` | `Layout_Maturapruefung_Seite.html` |

`zielPruefung` enthält pro Zeile den redaktionellen Langtext (ZAP1, ZAP2, BMS-Aufnahmeprüfung
oder Maturaprüfung). Die Fähigkeitsflags ersetzen die frühere Ableitung allein aus
`istPruefungsjahr`: BMS bietet ebenfalls Prüfungssimulation und Selbststudium, obwohl es keine
Gymiprüfungs-Klassenstufe ist.

### 2.2 Kurstyp: interner Key ≠ Anzeigename ≠ Positionierung

Über die Stufen hinweg wurden drei verschiedene Gründe für Namensabweichungen gefunden:
Rhythmus-Betonung (Wochenkurs), wörtliche Übernahme (Halbjahreskurs) und Marketing-Positionierung
(Vorkurs bei 1. Sek). Das ist **kein Fehler**, sondern zeigt: `displayName` ist immer freier
Text pro Zielgruppe, nie aus dem Key ableitbar.

```ts
type Kurstyp = "halbjahreskurs" | "intensivkurs" | "pruefungssimulation" | "selbststudium";
type Subject = "de" | "ma" | "fr" | "nmg" | "mixed";

type OfferBase = {
  id: string;                        // stabiler DB-/Cache-Key
  audienceId: AudienceId;
  slug: string;                       // stabiler Route-Teil innerhalb der Zielgruppe
  href: string;                       // logischer Pfad ohne Locale
  displayName: string;         // "Wochenkurs" / "Vorkurs" / "Halbjahreskurs" — freier Text
  tagline: string;                    // kurze Card-Zeile
  lede: string;                       // Einleitung im CourseHero
  description: string;                // Card-/Übersichtstext
  subject?: Subject;
  categoryLabel?: string;             // CategoryBadge, z. B. "Deutsch & Mathematik"
  recommended?: boolean;              // StatusBadge "empfohlen"
  rhythmus?: string;           // "wöchentlich"
  laufzeit: string;            // "6 Monate (März–Juli)"
  dateSummary: string[];               // Card-Datumszeilen, kein zusammengesetztes HTML
  features: string[];                  // CourseCard-Aufzählung
  regularPrice: number;        // NIE als Text, immer Zahl — siehe Preis-Bugs unten
  earlyBirdPrice?: number;
  earlyBirdDeadline?: string;          // ISO-Datum YYYY-MM-DD
  currency: "CHF";
  priceUnit?: string;          // "pro Teilnahme", "Zugang bis März 2027" — optional
  overviewBullets: string[];
  whyUs: Feature[];
  testimonials?: Testimonial[];
  booking: BookingCopy;
};

type CourseOffer = OfferBase & {
  kurstyp: "halbjahreskurs" | "intensivkurs";
  flowSteps: FlowStep[];
  contentSections: ContentSection[];
  weekOptions?: WeekOption[];           // nur wenn tatsächlich filterbar
  distanceLearningAvailable?: boolean; // nur geeignete Intensivkurse
  faq?: never;
  examTimeline?: never;
};

type ExamSimulationOffer = OfferBase & {
  kurstyp: "pruefungssimulation";
  flowSteps: FlowStep[];
  examTimeline: ExamTimelineSegment[];
  faq: FaqItem[];
  contentSections?: never;
  weekOptions?: never;
  distanceLearningAvailable?: never;
};

type SelfStudyOffer = OfferBase & {
  kurstyp: "selbststudium";
  flowSteps?: never;
  contentSections?: never;
  examTimeline?: never;
  faq?: never;
  weekOptions?: never;
  distanceLearningAvailable?: never;
};

type Offer = CourseOffer | ExamSimulationOffer | SelfStudyOffer;
```

Preis-Anzeige immer **berechnet**, nie als fertiger Satz gepflegt:

```
{offer.earlyBirdPrice != null && offer.earlyBirdDeadline
  ? `Frühbucherrabatt bis ${offer.earlyBirdDeadline} · regulär ${offer.currency} ${offer.regularPrice}`
  : null}
```

### 2.3 Gefundene Preis-/Text-Bugs in den Mockups (zur Kenntnis, nicht übernehmen)

Diese Inkonsistenzen bestätigen, warum obiges Modell nötig ist — mit dem alten
Copy-Paste-Ansatz sind sie automatisch entstanden. Die Mockup-Preise sind Platzhalter. Im
Repository existiert bereits die Supabase-Spalte `intensivwoche_kurse.preis`; sie bildet jedoch
weder regulären und Frühbucherpreis getrennt noch sämtliche neuen Angebotstypen ab. Die Migration
muss das bestehende Schema erweitern oder nachvollziehbar ablösen, statt eine parallele
unverbundene Preisquelle einzuführen. Die Muster unten bleiben für den Component-Bau relevant:

- **5. Klasse, Lerncamp:** kostet CHF 950 (Hauptseite) vs. CHF 890 (Unterseite) — derselbe Kurs.
- **5. Klasse, Wochenkurs — neu gefunden, war in einer früheren Fassung dieses Dokuments noch
  nicht erfasst:** Hauptseite zeigt CHF 3'190, die zugehörige Unterseite
  (`Layout_5_Klasse_Halbjahreskurs_Unterseite.html`) zeigt CHF 1'980 — für denselben Kurs.
- **1. Sek:** Halbjahreskurs/Vorkurs kostet CHF 990, Preis-Notiz sagt aber „regulär CHF 3'490" (Copy-Rest aus der 6.-Klasse-Vorlage).
- **2./3. Sek:** Halbjahreskurs CHF 3'490, Preis-Notiz „regulär CHF 3'490" — Rabatt = 0, vermutlich sollte der Frühbucherpreis niedriger sein.
- **Frühbucherrabatt auf der Unterseite — ursprünglich als fehlend dokumentiert, im aktuellen
  Mockup-Stand aber bereits korrigiert:** Eine frühere Fassung dieses Dokuments notierte, der
  Hinweis fehle im „Überblick & Preis"-Abschnitt bei 4 von 5 Stufen und die CSS-Regel
  (`.overview .price span`) fehle sogar bei 4. Klasse. Im aktuell hochgeladenen Stand zeigen
  **alle fünf** Halbjahreskurs-/Vorkurs-Unterseiten den Frühbucherhinweis, und die CSS-Regel ist
  überall vorhanden — der Bug ist behoben, unabhängig von diesem Dokument. **Klare Regel fürs neue
  Modell (weiterhin gültig, jetzt als Bestätigung des bereits erreichten Zustands statt als
  Korrektur):** Hauptseite und Unterseite lesen `earlyBirdPrice`/`earlyBirdDeadline` aus demselben
  `Offer`-Datensatz und zeigen den Hinweis **immer**, wenn `earlyBirdPrice` gesetzt ist — kein
  optionaler Textblock, der pro Seite manuell gepflegt wird. Das verhindert auch ein Wiederauftreten
  wie beim neuen 5.-Klasse-Wochenkurs-Bug oben.

### 2.4 Buchungstabelle: Spalten sind stabil, Ablauf-Inhalt ist polymorph

Spalten variieren nur leicht (Intensivkurs: Kurs/Datum/Zeit/Tagesplan/Standort/Status;
Halbjahreskurs: Kurs/Tag&Zeit/Ablauf/Standort/Status) — das ist reine Konfiguration.

**Der Ablauf-Popover-Inhalt ist NICHT immer gleich geformt.** Zwei beobachtete Formen:

```ts
type AblaufSimple = {
  kind: "simple";
  items: { id: string; label: string; value?: string; highlight?: boolean }[];
};

type AblaufPhased = {
  kind: "phased";           // ab 2./3. Sek: Halbjahreskurs mit 3 Phasen à ~10 Terminen
  phases: {
    id: string;
    label: string;          // "Phase 1 — Basis"
    note?: string;          // "Standortbestimmung vor dem ersten Kurstag"
    dates: { id: string; date: string; highlight?: boolean }[]; // highlight = Probeprüfung/Exam-Tag
  }[];
};

type Ablauf = AblaufSimple | AblaufPhased;

type AvailabilityStatus = "frei" | "wenige" | "voll";

type SessionAvailability = {
  status: AvailabilityStatus;
  capacity: number;
  bookedCount: number;
  remainingPlaces: number;
  updatedAt: string;           // ISO-Timestamp; volatile, nicht mit dem Katalog cachen
};

type BookingAction =
  | { kind: "modal"; label: string }
  | { kind: "link"; label: string; href: string }
  | { kind: "disabled"; label: string; disabledReason: string };

type SessionSource =
  | { kind: "intensivwoche_kurse"; kursId: number }
  | { kind: "marketing_session"; sessionId: string };

type SessionDefinition = {
  id: string;               // GLOBALE eindeutige Kurs-ID, nicht pro Stufe neu vergeben
                             // (Buchstaben wie "Kurs I", "Kurs N" laufen stufenübergreifend weiter)
  offerId: string;
  source: SessionSource;     // erhält bei Bestandskursen die echte numerische FK-/Buchungs-ID
  kurs: string;              // Anzeige, z.B. "Kurs A"
  dateLabel: string;         // sichtbare Datumsangabe
  startAt?: string;          // ISO-Timestamp, wenn ein einzelner Startzeitpunkt existiert
  endAt?: string;            // ISO-Timestamp
  timeLabel: string;         // sichtbare Zeit-/Rhythmusangabe
  standort: string;          // freier Text — "Zürich HB", "Stadelhofen", "Winterthur", "online"
  deliveryModes: ("onsite" | "online")[];
  weekId?: string;           // verbindet die Zeile mit WeekFilter/WeekOption
  ablauf: Ablauf;
};

type SessionRow = SessionDefinition & {
  availability: SessionAvailability;
  bookingAction: BookingAction;
};
```

Die `SessionTable`-Komponente entscheidet per `ablauf.kind`, welches Popover-Layout sie rendert.
`SessionDefinition` ist das stabile, cachebare Terminmodell. `SessionRow` entsteht ausschliesslich
request-time durch Verbindung mit `SessionAvailability` und der daraus abgeleiteten
`BookingAction`; es darf niemals aus einer Funktion mit `'use cache'` zurückgegeben werden.
`WeekFilter` filtert über
`weekId`, `BookingButton` rendert ausschliesslich `bookingAction`, und `StatusBadge` erhält
`availability.status`. Der Mapper berechnet `remainingPlaces = max(capacity - bookedCount, 0)` und
leitet daraus `status` ab; diese drei Werte werden nicht unabhängig voneinander redaktionell
gepflegt.

### 2.5 Addon-Angebote nach Zielgruppen-Fähigkeiten

```ts
// AudiencePageModel ist vollständig in Abschnitt 2.8 definiert.
// Der Mapper setzt addOnOffers nur für Prüfungsjahre:
const addOnOffers: AudiencePageModel["addOnOffers"] = audience.capabilities.examSimulation ||
  audience.capabilities.selfStudy
  ? mapAddOnOffers(audience.id, audience.capabilities)
  : [];
```

Rendering rein datengetrieben; der Mapper gibt nur Varianten zurück, deren Capability `true` ist:
`{model.addOnOffers.length > 0 && <AddOnCourses offers={model.addOnOffers} />}`. Der Mapper prüft,
dass `addOnOffers` bei Nicht-Prüfungsjahren leer ist; es gibt keine eingebettete zweite Offer-Liste
im `Audience`-Objekt und keine Sonderfall-Logik pro Zielgruppe im JSX.

### 2.6 Nachhilfe-Abo ist kein `Offer` — eigener Typ nötig

Auf `/nachhilfe` (eigene Route, siehe Entscheidung unten) kommt ein neuer Angebotstyp dazu,
der nicht ins bisherige `Offer`-Schema passt: Ein Lektionen-Abo (10er/20er) ohne
Klassenstufen-Bindung, ohne Termine/`SessionRow`, mit mengenabhängigem Rabatt statt
Frühbucherrabatt.

```ts
type SubscriptionPlan = {
  id: string;              // "nachhilfe-10er", "nachhilfe-20er"
  title: string;
  description: string;
  lessons: number;         // 10, 20
  lessonMinutes: number;   // 45
  pricePerLesson: number;  // Zahlenfeld, wie bei Offer — nie als Text berechnet
  discountPercent?: number; // 10 beim 20er — Rabatt wird ANGEZEIGT, nicht in pricePerLesson einberechnet
  currency: "CHF";
  features: string[];
  recommended?: boolean;
  cta: LinkAction;
};
```

Anzeige-Preis wird berechnet, nicht dupliziert: `pricePerLesson * lessons * (1 - (discountPercent ?? 0) / 100)`
— derselbe Grundsatz wie beim Frühbucherrabatt (Abschnitt 2.3), nur mit anderem Rabatt-Trigger
(Menge statt Datum). Kein `audienceId`, kein `kurstyp` — dieser Typ ist bewusst unabhängig
vom Klassenstufen-Datenmodell, da das Abo für alle Stufen gleich ist.

### 2.7 Gemeinsame Inhalts- und Aktionsmodelle

Die in `Offer` und den Komponenten verwendeten Hilfstypen sind verbindlich benannt. Keine
Komponente definiert dafür ein eigenes, nur lokal gültiges Inline-Objekt:

```ts
type LinkAction = {
  label: string;
  href: string;
  ariaLabel?: string;
  external?: boolean;
};

type AudienceHeroContent = {
  eyebrow?: string;
  title: string;
  description: string;
};

type FlowStep = { id: string; title: string; body: string };

type ContentGroup = {
  id: string;
  subhead?: string;
  items: string[];
};

type ContentSection = {
  id: string;
  title: string;
  lede?: string;
  groups: ContentGroup[];
};

type Feature = {
  id: string;
  title: string;
  description: string;
  icon?: string;              // Key aus zentraler Icon-Map, kein JSX in DB/Seed-Daten
};

type Testimonial = {
  id: string;
  quote: string;
  author: string;
  role?: string;
};

type FaqItem = { id: string; question: string; answer: string };

type ExamTimelineSegment = {
  id: string;
  subject: "de" | "ma" | "pause";
  label: string;
  minutes: number;
};

type WeekOption = {
  id: string;
  label: string;
  startDate?: string;          // ISO-Datum
  endDate?: string;            // ISO-Datum
};

type SessionColumn = {
  key: "kurs" | "date" | "time" | "details" | "location" | "status" | "booking";
  label: string;
  mobileLabel?: string;
};

type BookingCopy = {
  anchorId: "buchung";
  title: string;
  description?: string;
  note?: string;                // Zusatzhinweis, darf keinen zweiten manuell gepflegten Preis enthalten
  emptyState: string;
};

type ServiceCardModel = {
  id: string;
  title: string;
  description: string;
  action: LinkAction;
  eligibleFor?: AudienceId[];
  subject?: Subject;
};

type ServiceSubgroupModel = {
  id: string;
  label: string;
  eligibleFor?: AudienceId[];
  cards: ServiceCardModel[];
};

type TeamGroup = {
  id: string;
  title: string;
  description: string;
};

type NavItem = {
  id: string;
  label: string;
  href: string;
  children?: NavItem[];
};

type SiteNavModel = {
  home: LinkAction;
  audiences: Audience[];
  primaryItems: NavItem[];
  login: LinkAction;           // href bleibt "/login"
  localeSwitch?: { locale: "de" | "en"; label: string; href: string }[];
};

type SiteFooterModel = {
  brand: string;
  navigation: NavItem[];
  legal: LinkAction[];                 // nur reale Ziele; keine #-/Mockup-Links
  copyright: string;
};

type ExistingCourseCardModel = {
  id: string;                         // `bestand-${sourceKursId}`
  sourceKursId: number;               // echte intensivwoche_kurse.id; niemals neu nummerieren
  title: string;
  subject: Exclude<Subject, "mixed">;
  description: string;
  detailDescription?: string;
  classLabels: string[];              // Originalwerte verlustfrei behalten
  teacher: string;
  highlights: string[];
  regularPrice: number;
  currency: "CHF";
  session: SessionDefinition;        // stabil; Availability wird request-time ergänzt
};
```

### 2.8 Vollständige Seiten-View-Models

Die Page-Komponenten erhalten zusammengesetzte View-Models. Damit ist sichtbar, welche Daten vor
dem Rendern vollständig vorliegen müssen und welche Teile – insbesondere Verfügbarkeit – separat
geladen werden:

```ts
type AudiencePageModel = {
  audience: Audience;
  hero: AudienceHeroContent;
  offers: CourseOffer[];
  addOnOffers: (ExamSimulationOffer | SelfStudyOffer)[];
  existingCourses: ExistingCourseCardModel[]; // aktive, zur Stufe gemappte Bestandskurse
};

type CourseDetailPageModel = {
  audience: Audience;
  offer: CourseOffer;
  sessions: SessionDefinition[];     // stabil/cachebar; keine Belegung enthalten
};

type MarketingLayoutModel = {
  nav: SiteNavModel;
  footer: SiteFooterModel;
};

type HomePageModel = {
  hero: AudienceHeroContent;
  audiences: Audience[]; // Platzierung steuert KlassenPicker, Nav und BMS-/Matura-Karten
  serviceGroups: ServiceSubgroupModel[];
  featuredTestimonial: Testimonial;
};

type TargetedServicePageModel = {
  id: string;
  hero: AudienceHeroContent;
  eligibleAudiences: Audience[]; // z. B. 6. Klasse, 2./3. Sek oder BMS
  flowSteps: FlowStep[];
  contentSections: ContentSection[];
  features: Feature[];
  faq?: FaqItem[];
  relatedActions?: LinkAction[];       // z. B. Lerncoaching -> Nachhilfe
};

type ExamSimulationPageModel = {
  audience: Audience;
  offer: ExamSimulationOffer;
  sessions: SessionDefinition[];     // stabil/cachebar; keine Belegung enthalten
};

type SelfStudyPageModel = {
  audience: Audience;
  hero: AudienceHeroContent;
  offer: SelfStudyOffer;
};

type SubscriptionPageModel = {
  hero: AudienceHeroContent;
  plans: SubscriptionPlan[];
};

type TipPreview = {
  id: string;
  title: string;
  excerpt: string;
  action?: LinkAction;                // fehlt, solange keine reale Zielroute existiert
};

type TipCategory = {
  id: string;
  title: string;
  description?: string;
  tips: TipPreview[];
};

type TipsPageModel = {
  hero: AudienceHeroContent;
  categories: TipCategory[];
  faq: FaqItem[];
};

type AboutPageModel = {
  hero: AudienceHeroContent;
  storySections: ContentSection[];
  principles: Feature[];
  teamGroups: TeamGroup[];
  cta: LinkAction; // erst setzen, wenn ein reales Beratungs-/Kontaktziel existiert
};

type PlaceholderPageModel = {
  hero: AudienceHeroContent;
};
```

`MarketingLayoutModel` wird direkt im Marketing-Layout aus der zentralen Navigationsdatenquelle
geladen; Next.js-Layouts erhalten keine frei erfundenen Props aus der Page. `HomePageModel` enthält
deshalb bewusst keine Navigation, und die Startseiten-Page rendert `SiteNav` weiterhin nicht selbst.
Callbacks und UI-State wie `activeWeek`/`onChange` sind Component-State, keine Datenbankfelder.

### 2.9 Abdeckungsregel für Datenbank und Mapper

- Persistierte Tabellen dürfen normalisiert sein; die oben definierten View-Models werden in einer
  zentralen Data-/Mapper-Schicht zusammengesetzt.
- Jedes persistierte Objekt besitzt einen stabilen `id`-Key. Reihenfolge wird bei Bedarf durch ein
  explizites `sortOrder`-Feld in der Persistenz gesichert, nicht durch zufällige Query-Reihenfolge.
- Lokalisierte DB-Inhalte werden vor dem Mapping für das aktive Locale aufgelöst; Komponenten
  erhalten fertige Strings und keine JSONB-Sprachobjekte.
- Geldwerte bleiben numerisch plus `currency`; sichtbare Preis-, Rabatt- und Laufzeittexte werden
  zentral formatiert.
- Weder `Offer`, `SessionDefinition`, `CourseDetailPageModel`, `ExamSimulationPageModel` noch
  `ExistingCourseCardModel` enthalten Teilnehmerzahl oder Status. `SessionAvailability` wird
  gemäss Abschnitt 7 request-time geladen und erst danach zu `SessionRow` verbunden.
- Ein Typ gilt erst als implementiert, wenn Zod-/DB-Mapper ungültige oder unvollständige Datensätze
  ablehnen und TypeScript-Fixtures für alle strukturellen Varianten kompilieren.

| Komponentenfamilie | Vollständige Datenquelle |
|---|---|
| `SiteNav`, `SiteFooter`, `KlassenPicker` | `MarketingLayoutModel`, `SiteNavModel`, `SiteFooterModel`, `Audience`, `Klassenstufe`, `NavItem`, `LinkAction` |
| `AudienceHero`, `CourseCardGrid`, `CourseCard`, `AddOnCourses` | `AudiencePageModel`, `AudienceHeroContent`, `CourseOffer`, `ExamSimulationOffer`, `SelfStudyOffer` |
| `ExistingCourseSection`, `ExistingCourseCard` | `AudiencePageModel.existingCourses`, `ExistingCourseCardModel`, `SessionDefinition`, `SessionSource`; request-time ergänzt um `SessionAvailability`/`BookingAction` |
| `CourseHero`, `CourseFlow`, `CourseContent`, `OverviewPriceBox` | `CourseDetailPageModel`, `CourseOffer`, `FlowStep`, `ContentSection` |
| `BookingSection`, `SessionTable`, `SessionDetails`, `WeekFilter`, `BookingButton`, `StatusBadge` | `SessionDefinition` plus request-time `SessionRow`, `SessionAvailability`, `BookingAction`, `Ablauf`, `WeekOption`, `SessionColumn` |
| `CategoryBadge`, `WhyUsGrid`, `Testimonials` | `Subject`, `Feature`, `Testimonial` |
| `ExamSimTimeline`, `FaqAccordion` | `ExamSimulationPageModel`, `ExamSimulationOffer`, `ExamTimelineSegment`, `FaqItem` |
| `ServiceCard`, `ServiceSubgroup`, `FeaturedTestimonial` | `HomePageModel`, `ServiceCardModel`, `ServiceSubgroupModel`, `Testimonial` |
| `TargetedAudiencePicker`, zielgruppenspezifische Service-Inhalte | `TargetedServicePageModel`, `Audience`, `FlowStep`, `ContentSection`, `Feature`, `FaqItem`, `LinkAction` |
| `SubscriptionCard` | `SubscriptionPageModel`, `SubscriptionPlan`, `LinkAction` |
| Selbststudium-Zielseiten | `SelfStudyPageModel`, `SelfStudyOffer`, `AudienceHeroContent` |
| `OfferEditionForm`, `SessionEditor`, `EditionPreview`, `PublicationChecklist` | `OfferEdition`, `CourseSessionDefinition`, stabiles `Offer`, Validierungsfehler und Audit-Metadaten gemäss Abschnitt 2.12 |
| `DailyReleaseManager`, `CourseDayPicker`, `ReleaseMaterialSelector`, `StudentReleasePreview` | `CourseDay`, `DailyRelease`, `DailyReleaseItem`, kanonische Content-Items und Audit-Metadaten gemäss Abschnitt 2.13 |
| `TeacherWorkEntryForm`, `WorkTimeOverview`, `PayrollReviewPanel` | `WorkEntry`, `TeacherAssignment`, `TeacherRateAgreement`, `PayrollPeriod`, `PayrollSnapshot` gemäss Abschnitt 2.14 |
| `FinancialCockpit`, `OfferProfitabilityTable`, `RevenueCostChart` | `FinancialEvent`, `ExpenseEntry`, `FinancialPeriod`, `Budget`, serverseitige Monats- und Angebotsaggregate gemäss Abschnitt 2.15 |
| `TipCategorySection`, `TipCard`, `FaqAccordion` | `TipsPageModel`, `TipCategory`, `TipPreview`, `FaqItem`, optionaler `LinkAction` |
| Über-uns-Seite | `AboutPageModel`, `ContentSection`, `Feature`, `TeamGroup`, `LinkAction` |
| Kontakt-Platzhalter | `PlaceholderPageModel`, `AudienceHeroContent` |

Layout-Primitives aus Abschnitt 1a (`PageContainer`, `Section`, `ResponsiveGrid` usw.) haben nur
Darstellungs-/Children-Props und benötigen bewusst kein persistiertes Domänenmodell. Damit bleibt
keine geplante fachliche Komponente aus Abschnitt 3 ohne benannte Datenquelle.

### 2.10 Bestandskurse und Anmeldungen verlustfrei übernehmen

Der lokale Migrationsverlauf enthält bereits ein produktiv verwendetes Kurs-/Buchungssystem. Es
darf weder durch Mockup-Seeds ersetzt noch beim Aufbau der neuen Marketingseiten ausgeblendet
werden:

- `003_create_intensivwoche_kurse.sql` legt `intensivwoche_kurse` an und fügt sechs ausdrücklich
  als Beispieldaten bezeichnete Zeilen ein. Sie sind **nicht automatisch Geschäftsbestand**.
  Vor dem Umbau werden sie durch ID/Referenzen klassifiziert: referenzierte oder remote vorhandene
  Zeilen gelten als schützenswerter Bestand; reine lokale Demozeilen werden verlustfrei nach
  `supabase/seed.sql` verschoben. Eine reguläre Migration erzeugt danach keine Demo-, Test- oder
  Auth-Daten mehr. Anzahl und Inhalt des entfernten Projekts werden read-only inventarisiert und
  niemals als mit dem lokalen Seed identisch angenommen.
- Der lokale Verlauf besitzt zwei Dateien mit derselben Version `002` und
  `002_create_intensivwoche_anmeldungen.sql` referenziert beim `CREATE TABLE` die im Repository
  nicht angelegte Tabelle `public.courses`. Migration 003 würde den FK erst später auf
  `intensivwoche_kurse` umstellen, kann bei einem frischen Reset aber nicht erreicht werden, wenn
  Migration 002 bereits fehlschlägt. Die Baseline muss deshalb vor neuen Migrationen in eine
  eindeutige, auf leerer DB ausführbare Reihenfolge gebracht werden: `kurs_id` wird zunächst ohne
  falschen FK angelegt, der korrekte FK entsteht nach der Kurstabelle. Vor einem Abgleich mit einem
  entfernten Projekt ist dessen Migrationshistorie read-only zu inventarisieren; kein spontanes
  `migration repair`, Umbenennen bereits remote registrierter Versionen oder `db push`.
- Die Baseline ist darüber hinaus unvollständig: `001_create_trainer_tables.sql` setzt
  `public.profiles` voraus; `005_create_mentorship_tables.sql` setzt `public.subjects` voraus und
  verwendet für `subject_id` eine UUID, während vorhandene Typen/Seeds numerische Subject-IDs
  zeigen. Vor jeder fachlichen Migration muss ein leerer Reset deshalb die kanonischen
  `profiles`-/`subjects`-Definitionen in korrekter Reihenfolge bereitstellen oder die betreffenden
  Migrationen nachweislich an die bereits kanonische Definition anbinden. Der FK-Typ muss exakt
  `public.subjects.id` entsprechen. Ein Schema, das nur gegen eine historisch manuell vorbereitete
  Remote-Datenbank läuft, ist nicht akzeptabel.
- `006_seed_test_data.sql` darf nicht Teil der regulären Migrationskette bleiben. Die darin
  enthaltenen Auth-Benutzer und der gemeinsame Passwort-Hash werden aus allen deploybaren
  Migrationen entfernt. Ausschliesslich lokale, synthetische Daten liegen in
  `supabase/seed.sql`; echte Geheimnisse werden nie eingecheckt. Staging-/Produktionsdaten werden
  weder durch `db reset` noch durch Seed-Skripte erzeugt.
- `intensivwoche_anmeldungen.kurs_id` verweist auf `intensivwoche_kurse.id`. Diese numerischen IDs
  sind Geschäfts-/Buchungsreferenzen. Sie werden nicht neu nummeriert, nicht durch Slugs ersetzt
  und nicht über Textvergleich neu zugeordnet.
- `/kurse` liest aktive Zeilen über `getPublicKurse()` aus
  `intensivwoche_kurse_mit_anmeldungen`; das Anmeldeformular schreibt direkt nach
  `intensivwoche_anmeldungen`. Dashboard-CRUD und Kalender greifen ebenfalls auf dieselben Tabellen
  zu. Diese Pfade bleiben funktionsfähig, bis ihre Ablösung separat verifiziert und freigegeben ist.
- Die geschützte Seite `/intensivkurse` liest Kurse und Anmeldungen derzeit separat. Dabei zählt sie
  auch stornierte Anmeldungen und setzt „wenige Plätze“ bei drei Restplätzen, während die View
  stornierte Datensätze ausschliesst und den Status erst bei zwei Restplätzen setzt. Der Zielmapper
  und alle Oberflächen verwenden verbindlich dieselbe DB-/View-Regel: `status != 'storniert'` und
  `remainingPlaces <= 2` für `wenige`; keine zweite clientseitige Statusberechnung.
- `types/kurs.ts` enthält zusätzlich `MOCK_KURSE`. Diese Kopie ist keine dritte Datenquelle und
  darf nicht in die neue Persistenz importiert werden; massgeblich sind die vorhandenen
  Supabase-Zeilen. Nach Umstellung wird das Mock nur noch als Test-Fixture verwendet oder entfernt.
- Der Dashboard-Code und die generierten Datenbanktypen erwarten
  `intensivwoche_kurse.created_by`, aber keine eingecheckte Migration legt die Spalte/Funktion
  vollständig an. Dieser Schema-Drift wird vor fachlichen Erweiterungen mit einer additiven,
  idempotenten Reparaturmigration geschlossen; vorhandene Zeilen bleiben mit `NULL` erhalten und
  werden nicht einer erfundenen Lehrperson zugeordnet.
- Es liegen zwei Datenbanktyp-Dateien vor: produktive Imports verwenden `types/database.ts`,
  `lib/supabase/database.types.ts` ist derzeit eine nicht importierte zweite Generierung. Vor dem
  Backfill werden beide gegen das lokale Schema verglichen; danach wird genau `types/database.ts`
  kanonisch regeneriert und die ungenutzte Kopie entfernt oder eindeutig als generiertes Alias
  ersetzt. Zwei divergierende Schema-Wahrheiten sind nicht zulässig.

**Verbindliche Rollenverteilung:** `intensivwoche_kurse` bleibt die kanonische Tabelle für
buchbare Durchführungen und Kapazitäten; `intensivwoche_anmeldungen` bleibt die kanonische
Anmeldung. Eine optionale normalisierte Angebots-/Content-Tabelle darf nur Kataloginhalte für
`Offer` enthalten und wird per nullable FK/Zuordnung mit `intensivwoche_kurse` verbunden. Sie ist
kein zweites Buchungssystem. Nicht zugeordnete Bestandszeilen bleiben über `/kurse` sichtbar und
werden auf den neuen Klassenübersichten zusätzlich als `ExistingCourseCardModel` angezeigt, sobald
ihre Klassenstufe eindeutig gemappt ist.

| Bestehendes Feld | Ziel / Regel |
|---|---|
| `id` | bleibt unverändert; `ExistingCourseCardModel.sourceKursId` und `SessionRow.source.kursId` |
| `name` | `ExistingCourseCardModel.title` und `SessionRow.kurs` |
| `fach` | `mathematik→ma`, `deutsch→de`, `franzoesisch→fr`, `natur-mensch-gesellschaft→nmg` |
| `beschreibung` / `detail_beschreibung` | `description` / `detailDescription`; kein HTML und kein Wegwerfen der Detailbeschreibung |
| `start_datum` / `end_datum` | SQL-`DATE` bleibt zunächst ISO-Datum (`YYYY-MM-DD`) für Labels; `SessionDefinition.startAt`/`endAt` nur setzen, wenn Datum, Uhrzeit und Zeitzone (`Europe/Zurich`) validiert gemeinsam geparst wurden |
| `uhrzeit` | zunächst verlustfrei `SessionRow.timeLabel`; erst nach validierter Parser-Migration in getrennte Zeiten zerlegen |
| `ort` | `SessionRow.standort`; `deliveryModes` nur bei eindeutigem Wert ableiten, sonst `onsite` |
| `preis` | `regularPrice`, `currency = "CHF"`; `earlyBirdPrice`/`earlyBirdDeadline` bleiben `undefined` |
| `max_teilnehmer` | `SessionAvailability.capacity` |
| View `aktuelle_teilnehmer` | `bookedCount`; nur nicht stornierte Anmeldungen zählen |
| View `status` | `offen→frei`, `wenige-plaetze→wenige`, `ausgebucht→voll`; `wenige` bei 1–2 Restplätzen, `voll` bei 0; überall aus derselben Kapazitäts-/Buchungsregel ableiten |
| `klassenstufen` | Originalarray behalten; bekannte Werte `5. Klasse→5`, `6. Klasse→6`; 7.–9. Klasse oder freie Werte in einen Prüfbericht `needs_review`, nicht still verwerfen |
| `lehrer` / `highlights` | `teacher` / `highlights` im Bestandskartenmodell |
| `ist_aktiv` | bestimmt öffentliche Sichtbarkeit; inaktive Zeilen bleiben für Dashboard/Historie erhalten |
| `created_by` | Owner-FK nach Reparaturmigration; bestehendes `NULL` bleibt zulässig |

**Migrationsreihenfolge und Schutzregeln:**

1. Vorher-Nachher-Inventar mit Zeilenzahlen für Kurse und Anmeldungen, Min/Max-ID, Anzahl aktiver
   Kurse, Anzahl `NULL`-FKs sowie gruppierten Anmeldestatus protokollieren. Zusätzlich alle
   Kurs-IDs mit Anzahl ihrer Anmeldungen exportieren; keine personenbezogenen Formulardaten in
   Logs oder Repository schreiben.
2. Zuerst die Baseline vollständig reparieren: eindeutige Versionen, `profiles` vor dem ersten
   `ALTER`, `subjects` vor Mentorship, identischer PK-/FK-Typ für `subject_id`, Anmeldungen ohne
   falschen `public.courses`-FK, Kurstabelle danach und anschliessend korrekter FK. Danach
   Schema-Drift (`created_by`, Owner-FK/Funktionen, fehlende Indizes) additiv reparieren und erst
   dann Katalogfelder/-tabellen ergänzen. Kein `DROP TABLE`, Neu-Seed oder `TRUNCATE`; Backfills
   verwenden stabile IDs und sind wiederholbar (`ON CONFLICT` bzw. `WHERE ... IS NULL`).
3. Die sechs lokalen Seed-Zeilen und alle bereits vorhandenen Remote-Zeilen werden aus der DB
   gemappt. Mockup-Inhalte dürfen neue Angebote ergänzen, aber niemals eine bestehende Zeile allein
   aufgrund ähnlicher Namen, Preise oder Datumswerte überschreiben.
4. Für jedes nicht eindeutig abbildbare Fach/Klassenlabel entsteht ein `needs_review`-Eintrag. Die
   Migration bricht nicht referenzzerstörend ab; der bestehende Datensatz bleibt auf `/kurse`
   erreichbar und wird erst nach redaktioneller Zuordnung auf eine neue Klassenroute gehoben.
   Das bestehende Verhalten filtert ausschliesslich nach `ist_aktiv`, nicht nach `end_datum`;
   abgelaufene, aber weiterhin aktive Bestandskurse dürfen deshalb nicht stillschweigend aus der
   neuen Darstellung verschwinden. Eine Archivierungsregel ist eine separate Fachentscheidung.
5. Die View wird explizit mit RLS-sicherem Verhalten (`security_invoker = true` auf unterstützter
   PostgreSQL-Version oder gleichwertige RLS-sichere RPC/Query) neu erstellt. Die Aussage aus
   `004_fix_rls_policies.sql`, Views erbten Policies automatisch, ist nicht als Sicherheitsbeweis
   ausreichend. Doppelte alte Policies werden anhand ihrer tatsächlichen Namen bereinigt.
6. Owner-RLS entspricht dem vorhandenen Dashboard-Verhalten: Lehrpersonen dürfen eigene Kurse
   lesen/ändern, Admins alle; anonyme Nutzer lesen nur aktive Kurse und dürfen nur für einen
   existierenden aktiven Kurs anmelden. Anonyme Nutzer dürfen Anmeldungen niemals lesen oder
   ändern.
    `/intensivkurse` darf Teilnehmerzahl/Status nicht mehr separat aus allen Anmeldungen berechnen,
    sondern nutzt die RLS-sichere View bzw. denselben zentralen Availability-Mapper.
   Rollenwerte werden dabei auf die tatsächlich verwendeten Werte `lehrperson`, `admin` und `user`
   vereinheitlicht; Policies mit `teacher` oder `student` sind zu migrieren und durch pgTAP zu
   belegen, nicht parallel beizubehalten.
7. Anmeldungen laufen ausschliesslich über eine atomare Datenbankfunktion, die den Kursdatensatz
   mit `SELECT ... FOR UPDATE` sperrt, Aktivität prüft, nur nicht stornierte Anmeldungen zählt,
   Kapazität prüft, eine aktive Doppelanmeldung verhindert und erst dann einfügt. Eine partielle
   Unique-Constraint bzw. ein funktionaler Unique-Index sichert mindestens `(kurs_id,
   lower(email))` für nicht stornierte Anmeldungen. Die Funktion verwendet einen festen leeren
   `search_path`, minimale Grants und gibt fachlich unterscheidbare Fehler für `voll`, `inaktiv`
   und `bereits_angemeldet` zurück. Beide Buchungsoberflächen rufen dieselbe Funktion auf; direkte
   Client-Inserts sind danach nicht mehr erlaubt. Ein Parallelitätstest mit zwei gleichzeitigen
   Buchungen auf den letzten Platz muss exakt einen Erfolg und eine Ablehnung ergeben.
8. Rollback entfernt höchstens neu hinzugefügte, noch ungenutzte Katalogstrukturen. Bestehende
   Kurs-/Anmeldungszeilen, IDs, Statuswerte und FK-Beziehungen werden niemals zurückgesetzt. Vor dem
   Umschalten der neuen Seiten muss der Vorher-Nachher-Abgleich exakt dieselben Kurs- und
   Anmeldungs-IDs sowie dieselben Anmeldungszahlen je Kurs nachweisen.

### 2.11 Vier geschützte Materialbereiche und Einschreibungsrechte

Die Migration berücksichtigt vier fachlich getrennte Materialbereiche:

| stabiler Schlüssel | Anzeige | berechtigte Zielgruppe |
|---|---|---|
| `langzeitgymi` | Langzeitgymi | eingeschriebene Schülerinnen und Schüler der 6. Klasse |
| `kurzgymi` | Kurzgymi | eingeschriebene Schülerinnen und Schüler der Zielgruppe 2./3. Sek |
| `bms` | BMS | eingeschriebene BMS-Selbststudium-Nutzende |
| `matura` | Matura | eingeschriebene Matura-Nutzende |

`MaterialAreaId` ist ein stabiler Domain-Key und wird weder aus `profiles.class_level` noch aus
sichtbaren Labels abgeleitet. Die vier Bereiche besitzen unterschiedliche Inhalte: Jedes Material
gehört deshalb genau einem Bereich. Eine Lookup-Tabelle `material_areas` enthält die vier stabilen
Keys; `learning_materials.area_id` verweist als Fremdschlüssel darauf. Eine Many-to-many-
Zuordnung oder Materialfreigabe für mehrere Bereiche ist nicht vorgesehen. Das vorhandene freie
`learning_materials.class_levels` bleibt während des Backfills erhalten, ist aber nach der
Umstellung keine Zugriffsregel mehr. Nach Auflösung aller `needs_review`-Zeilen wird `area_id` für
geschützte Materialien `NOT NULL`.

Die fachliche Einschreibung liegt in `self_study_enrollments`: mindestens `id`, `offer_id` bzw.
`audience_id`, `area_id`, `beneficiary_user_id` (bis zum Claim nullable), `status`
(`pending/paid/cancelled/refunded`), `access_until`, Payment-Provider-Referenz und Audit-Zeitpunkte.
Ein Elternkauf ohne vorhandenes Schülerkonto speichert nur einen gehashten, befristeten
Einladungs-Token; der Klartext-Token wird nicht persistiert.

Der effektive Zugriff wird über eine eigene Tabelle `material_access_grants` modelliert: mindestens
`id`, `user_id`, `area_id`, `status`, `valid_from`, `valid_until`, `source_kind`, `source_id`,
`created_at` und `revoked_at`. Ein Grant entsteht erst aus einer bestätigten/bezahlten
Selbststudium-Einschreibung oder einer protokollierten Admin-Freigabe. Kursanmeldungen und das
selbst veränderbare Profilfeld verleihen nicht automatisch Rechte. Eine Elternbestellung für ein
noch nicht vorhandenes Schülerkonto benötigt einen einmaligen Einladungs-/Zuordnungsablauf; eine
blosse Übereinstimmung von E-Mail, Vorname oder Nachname ist kein Sicherheitsnachweis.

**Verbindliche Sicherheitsregeln:**

- `/materialien/[area]` prüft serverseitig den aktiven Grant. Ohne Login geht es nach
  `/login?callbackUrl=/materialien/{area}`; ohne Grant erscheint 403/„Kein Zugang“, niemals ein
  stiller Fallback auf einen anderen Bereich.
- Der Login validiert `callbackUrl` als internen relativen Pfad und verwendet ihn nach Erfolg;
  externe URLs und Open Redirects sind ausgeschlossen.
- RLS erlaubt Lernenden nur Materialien, deren `learning_materials.area_id` ihrem aktiven,
  zeitlich gültigen Grant entspricht. Admin-/Lehrpersonenrechte werden getrennt über
  die kanonischen Rollen geprüft. Clientfilter und versteckte Tabs sind keine Autorisierung.
- Geschützte Dateien liegen in einem privaten Storage-Bucket und werden erst nach derselben
  Berechtigungsprüfung über kurzlebige Signed URLs ausgeliefert. Ein dauerhaft öffentliches
  `file_url` würde die RLS umgehen.
- `is_public` bedeutet künftig wirklich frei zugänglicher Inhalt. Entgeltliche
  Selbststudium-Materialien werden nicht als `is_public = true` veröffentlicht.
- Entzug, Ablauf und Rückerstattung müssen einen Grant deaktivieren; historische Grants bleiben
  auditierbar und werden nicht hart gelöscht.

**Additiver Backfill:** Vor der Zuordnung werden alle vorhandenen `learning_materials` inklusive
`class_levels`, Storage-Pfad und Sichtbarkeit inventarisiert. Nur eindeutig der 6. Klasse
zuordenbare Langzeitgymi-Materialien werden nach `langzeitgymi` übernommen. Zeilen mit den alten
Kombinationen `5. Klasse`/`6. Klasse`, leeren oder unbekannten Labels landen in `needs_review` und
werden nicht automatisch für einen geschützten Bereich freigeschaltet. Für Kurzgymi, BMS und
Matura werden leere, aber funktionsfähige Bereiche mit klarer Leermeldung angelegt; Inhalte werden
später jeweils exklusiv für ihren Bereich ergänzt. Bestehende Materialzeilen und Dateien werden
nicht dupliziert oder gelöscht.

**Lieferreihenfolge:** Schema, Domain-Typen, Grant-Erzeugung, RLS, privater Dateizugriff und sichere
Login-Rückleitung gehören bereits zur Migration. Die öffentlichen Seiten können parallel darauf
aufbauen. Befüllung und redaktioneller Ausbau der drei neuen Bereiche dürfen danach erfolgen; ein
Selbststudium-CTA darf jedoch erst produktiv Zugang versprechen, wenn Einschreibung, Grant,
Zielbereich und Entzug/Rückerstattung Ende-zu-Ende getestet sind. So entsteht kein späterer
Umbau des Auth-/Datenmodells, ohne die Seitenmigration auf noch fehlende Inhalte zu blockieren.

### 2.12 Jährliche Angebotsverwaltung über eine Admin-Maske

`Layout_Admin_Kursangebot_Maske.html` ist die verbindliche, zielgruppenunabhängige UX-Referenz für
die Erweiterung der vorhandenen Route `/dashboard/kurse`. Sie besitzt den neutralen Seitentitel
„Kursangebot verwalten“ und umfasst Angebote aller sieben Zielgruppen sowie Halbjahreskurs,
Intensivkurs/Lerncamp, Prüfungssimulation und Selbststudium. Die sichtbare 6.-Klasse-Auswahl ist
nur ein Beispieldatensatz, keine eigene Maske oder Typgrenze. Der Administrator ändert Preise,
Termine und Publikationsstatus über diese validierte Oberfläche; direkte Routinepflege im
Supabase Table Editor ist kein Geschäftsprozess.

Der obere Block ist der dauerhaft sichtbare **Bearbeitungskontext** aus Kursangebot, Prüfungsjahr
und Durchführung. Zielgruppe und Angebotstyp werden aus dem gewählten stabilen `Offer` abgeleitet
und in „Grundlagen“ nur schreibgeschützt als Stammdaten angezeigt; es existieren keine zweiten
Selects für dieselbe Identität. Ein neues Zielgruppe-/Typ-Paar entsteht ausschliesslich über einen
separaten „Neues Kursangebot“-Flow. Nach Veröffentlichung wird die stabile Offer-Identität nicht
umgehängt. Beim Kontextwechsel werden alle Felder aus der neuen Edition geladen und ungespeicherte
Änderungen vor dem Verwerfen abgefangen.

Stabiles Produkt und jährliche Durchführung werden getrennt:

```ts
type OfferEditionStatus = "draft" | "published" | "archived";

type OfferEdition = {
  id: string;
  offerId: string;                  // stabiles Offer, z. B. 6. Klasse / Intensivkurs
  schoolYear: string;               // "2026/27"
  publicTitle: string;
  tagline: string;
  description: string;
  regularPrice: number;
  earlyBirdEnabled: boolean;
  earlyBirdPrice: number | null;
  earlyBirdDeadline: string | null; // ISO-Datum
  currency: "CHF";
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  status: OfferEditionStatus;
  version: number;                  // Optimistic Concurrency
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type CourseSessionDefinition = SessionDefinition & {
  editionId: string;
  capacity: number;
  registrationStatus: "bookable" | "waitlist" | "cancelled";
};
```

Die Frühbucherlogik ist pro Durchführung konfigurierbar. Neue Halbjahreskurse sowie
Intensivkurse/Lerncamps starten mit `earlyBirdEnabled = true`; Prüfungssimulationen und
Selbststudium mit `false`. Dies ist eine Voreinstellung, keine im Frontend fest verdrahtete
Geschäftsregel: Der Administrator kann begründete Ausnahmen aktivieren oder deaktivieren. Bei
aktivem Frühbucherpreis sind Betrag und Stichtag Pflicht, der Frühbucherpreis muss kleiner als der
reguläre Preis sein. Bei deaktivierter Option werden beide Werte als `null` gespeichert und auf
öffentlichen Seiten nicht gerendert. Bestehende Buchungen behalten immer ihren Preis-Snapshot.

Für reguläre Kursgruppen gilt als verbindlicher Ausgangswert `capacity = 10`. Der Wert wird je
Session gespeichert und darf bei fachlich begründeten Raum-/Kursabweichungen explizit angepasst
werden; Auswertungen verwenden stets den tatsächlich gespeicherten Sessionwert. Für
Prüfungssimulationen ist Kapazität zwar für Buchungsgrenzen zulässig, aber keine fachliche
Auslastungs-KPI und wird im Finanz-Cockpit nicht als Prozentwert dargestellt.

Persistenz: `offers` hält den stabilen fachlichen Schlüssel (`audience_id`, `kurstyp`, `slug`),
`offer_editions` die jährlich veränderlichen Texte und Preise, `course_sessions` Termine,
Standorte und Kapazitäten. Eine Durchführung gehört genau einem Offer; eine Session genau einer
Durchführung. Für dieselbe Kombination `(offer_id, school_year, edition_key)` gilt eine
Eindeutigkeitsregel. Eine neue Jahresperiode wird über „Vorjahr duplizieren“ als `draft` erzeugt,
nicht durch Überschreiben der veröffentlichten Vorjahreszeile.

Jede Buchung speichert zusätzlich `edition_id`, `session_id`, `booked_price` und `currency` als
unveränderlichen Snapshot. Spätere Preis- oder Terminänderungen dürfen historische Buchungen und
Belege nicht verändern. Sessions mit bestehenden Anmeldungen werden nicht gelöscht; Absage und
Terminänderung sind explizite, auditierte Aktionen.

Die Admin-Maske besitzt vier Abschnitte: Grundlagen, Preise, Termine/Kapazität und
Veröffentlichung. Sie zeigt Live-Zusammenfassung, Pflichtfeldstatus und alle betroffenen
Verbraucher (Hauptseite, Detailseite, Termin-/Buchungsdialog, Admin-Anmeldungen). Veröffentlichung
ist eine transaktionale Server Action: Zod-Validierung, Rollenprüfung `admin`, Versionsvergleich,
mindestens ein buchbarer Termin für terminbasierte Angebote und anschliessende Cache-
Invalidierung über die zentralen Offer-/Audience-Tags. Halb gespeicherte Preis-/Session-Zustände
werden nicht öffentlich.

Alle Mutationen schreiben ein Audit-Protokoll mit Benutzer, Zeitpunkt, Entity, Aktion und
Vorher-/Nachher-Diff ohne personenbezogene Buchungsdaten. `draft` ist nur im Admin sichtbar,
`published` beliefert alle öffentlichen Seiten, `archived` bleibt für Historie und bestehende
Buchungen lesbar. Der bestehende `/dashboard/kurse`-CRUD wird erweitert und nicht durch ein
zweites Admin-System ersetzt.

### 2.13 Tagesfreigaben für Intensivkurse

`Layout_Admin_Tagesfreigaben.html` ist die verbindliche UX-Referenz für die tageweise Freigabe
von Übungen und Prüfungen. Die Maske ist Teil derselben Kursverwaltung wie Abschnitt 2.12 und
wird unter einer konkreten `OfferEdition` geöffnet. Der Administrator wählt zusätzlich eine
`course_session`; eine Freigabe gilt niemals global für ein Offer oder einen Materialbereich.

```ts
type DailyReleaseStatus = "draft" | "scheduled" | "active" | "revoked";

type CourseDay = {
  id: string;
  sessionId: string;
  sequence: number;                 // 1–5, eindeutig pro Session
  courseDate: string;               // lokales Kursdatum
};

type DailyRelease = {
  id: string;
  courseDayId: string;
  status: DailyReleaseStatus;
  opensAt?: string;                 // timestamptz; Anzeige Europe/Zurich
  closesAt?: string;
  version: number;
  publishedBy?: string;
  publishedAt?: string;
  revokedAt?: string;
};

type DailyReleaseItem = {
  releaseId: string;
  contentItemId: string;
  position: number;
};
```

Persistenz: `course_days` gehört zu genau einer `course_session`; `(session_id, sequence)` und
`(session_id, course_date)` sind eindeutig. `daily_releases` besitzt höchstens eine aktuelle
Freigabe pro Kurstag. `daily_release_items` verknüpft die Freigabe mit dem kanonischen
Inhaltskatalog für Übungen und Prüfungen; `(release_id, content_item_id)` ist eindeutig. Vor der
Migration wird inventarisiert, ob die vorhandenen Übungs-/Prüfungstabellen direkt über einen
gemeinsamen Content-FK referenzierbar sind. Es werden weder polymorphe IDs ohne Integritätsprüfung
noch Materialkopien angelegt.

`scheduled` benötigt keinen unzuverlässigen Browser-Timer: Der effektive Status wird serverseitig
aus `status`, `opens_at`, `closes_at` und Datenbankzeit bestimmt. Zeitpunkte werden als
`timestamptz` gespeichert und in `Europe/Zurich` eingegeben/angezeigt. Freigeben, Planen,
Zurückziehen und die auf eine Kursgruppe begrenzte Notfallsperre laufen als transaktionale,
Zod-validierte Server Actions mit `requireAdmin()`, Optimistic Concurrency über `version`,
Audit-Event und gezielter Cache-Invalidierung. Eine leere Auswahl kann nicht freigegeben werden;
`opens_at < closes_at` ist Pflicht. Eine abgelaufene Freigabe bleibt historisch auditierbar.

**Zugriffsregel:** Nur ein angemeldeter Benutzer mit einer aktiven, nicht stornierten Anmeldung
für exakt dieselbe `course_session` darf aktuell offene Release-Items sehen und private Dateien
über kurzlebige Signed URLs laden. Ein Selbststudium-Grant aus Abschnitt 2.11, die Klassenstufe im
Profil oder ein Clientfilter verleiht keinen Intensivkurszugriff. RLS bzw. eine gleichwertige
`security_invoker`-Query prüft Anmeldung, Session, Release-Zeitfenster und Item. Listenendpunkte,
Vorschauen und Storage dürfen Titel oder Pfade noch gesperrter Inhalte nicht vorzeitig offenlegen.
Admins und kanonische Lehrpersonenrechte werden separat geprüft; jede Mutation schreibt Benutzer,
Zeitpunkt, Kursgruppe, Kurstag, Aktion und Vorher-/Nachher-Diff ohne Teilnehmerdaten ins Audit-Log.

### 2.14 Arbeitszeiten und Lohnvorbereitung

`Layout_Admin_Zeiterfassung.html` ist die verbindliche Admin-Referenz für Soll-/Ist-Stunden,
Genehmigung und Monatsabschluss. Die Lernpersonenansicht nutzt dasselbe Modell unter
`/arbeitszeiten`: Eine Lernperson sieht nur eigene Einträge, bestätigt automatisch aus
`course_sessions` vorgeschlagene Unterrichtszeiten und erfasst Zusatzaufwand wie Aufsatzfeedback,
Vorbereitung, Coaching oder Administration. Geplante Kursdauer ist ein Vorschlag und niemals
automatisch eine genehmigte Lohnposition.

```ts
type WorkActivityType =
  | "course_teaching" | "exam_supervision" | "essay_feedback"
  | "coaching" | "preparation" | "administration" | "other";
type WorkEntryStatus = "draft" | "submitted" | "approved" | "rejected" | "locked";

type WorkEntry = {
  id: string;
  teacherId: string;
  activityType: WorkActivityType;
  workDate: string;
  durationMinutes: number;           // ganze Minuten, nie Dezimalstunden
  sessionId?: string;
  submissionId?: string;
  note?: string;
  status: WorkEntryStatus;
  version: number;
  approvedBy?: string;
  approvedAt?: string;
};

type TeacherRateAgreement = {
  id: string;
  teacherId: string;
  hourlyRateRappen: number;          // vom Administrator vereinbarter Betrag
  currency: "CHF";
  validFrom: string;
  validUntil?: string;
  version: number;
  createdBy: string;
};
```

Persistenz: `teacher_assignments` verknüpft Lernpersonen mit `course_sessions` und einer Rolle.
`work_entries` enthält die tatsächlich geleistete Zeit. Genau eine fachliche Quelle darf je
Eintrag gesetzt sein; Check-Constraints verhindern negative/Null-Minuten, unzulässige
Statusübergänge und überlappende Unterrichtseinträge. Der Administrator vereinbart den Lohn mit
der Lernperson und erfasst ihn ausschliesslich in `teacher_rate_agreements`: Stundensatz in ganzen
Rappen sowie `valid_from`/`valid_until`. Zeiträume derselben Lernperson dürfen sich nicht
überschneiden. Eine Änderung erzeugt eine neue zeitlich gültige Vereinbarung und überschreibt nie
einen früheren Satz. Das Lernpersonen-Dashboard besitzt keine Mutation für Lohnsätze.
`payroll_periods` steuert `open/review/locked`, und ein transaktionaler
Monatsabschluss erzeugt `payroll_snapshots` samt unveränderlichen Snapshot-Zeilen aus genehmigten
Minuten und dem am Leistungsdatum gültigen Satz. Pro Snapshot-Zeile gilt
`round(duration_minutes × hourly_rate_rappen / 60)` auf ganze Rappen; der verwendete Satz und die
Vereinbarungs-ID werden mitgespeichert. Die eigentliche Lohnbuchhaltung bleibt extern; der Export
enthält geprüfte Summen und stabile Quell-IDs.

Lernpersonen dürfen per RLS eigene `draft`-/`rejected`-Einträge lesen und bearbeiten sowie eigene
Einträge einreichen. Nach `submitted` sind Änderungen nur nach Rückweisung möglich. Administratoren
sehen alle Einträge, genehmigen oder weisen mit Begründung zurück und sperren Perioden. Genehmigte
oder abgeschlossene Werte werden nie überschrieben; Korrekturen erfolgen als auditierte Gegen-/
Korrekturbuchung. Jede Mutation nutzt Zod, Rollenprüfung, Optimistic Concurrency und Audit-Log.
Schüler, Eltern und öffentliche Rollen erhalten keinerlei Zugriff auf Zeit-, Satz- oder Lohndaten.
Das Finanz-Cockpit liest ausschliesslich den Betrag abgeschlossener Payroll-Snapshot-Zeilen; es
besitzt kein zweites editierbares Feld für Lohn oder Stundensatz.

### 2.15 Jährliches Finanz-Cockpit

`Layout_Admin_Finanzcockpit.html` ist die verbindliche UX-Referenz für die ganzjährige
Management-Auswertung. Es ist kein Ersatz für Finanz- oder Lohnbuchhaltung. Das Cockpit trennt
verbindlich `gebucht`, `bezahlt` und `periodengerecht verdient`; der ausgewählte Sichttyp wird in
KPI, Jahresdiagramm und Angebotstabelle sichtbar angezeigt und nie stillschweigend vermischt.

```ts
type FinancialEventType =
  | "booking" | "payment" | "refund" | "payroll_cost"
  | "course_expense" | "overhead" | "manual_adjustment";

type FinancialEvent = {
  id: string;
  eventType: FinancialEventType;
  sourceKind: string;
  sourceId: string;
  amountRappen: number;              // positiver Ganzzahlbetrag; Richtung aus eventType
  currency: "CHF";
  occurredAt: string;
  recognizedAt: string;
  editionId?: string;
  sessionId?: string;
  audienceId?: string;
  status: "pending" | "confirmed" | "cancelled";
};

type OfferFinancialSummary = {
  editionId: string;
  participantCount: number;
  sessionCount: number;
  bookedRevenueRappen: number;
  paidRevenueRappen: number;
  recognizedRevenueRappen: number;
  refundRappen: number;
  approvedWorkMinutes: number;
  directCostRappen: number;          // ausschliesslich abgeschlossene Payroll-Snapshot-Zeilen
  capacity?: number;                 // keine Auslastungs-KPI für Prüfungssimulation
  occupancyApplicable: boolean;
};
```

`financial_events` ist ein idempotenter, append-only Reporting-Ledger mit eindeutigem
`(source_kind, source_id, event_type, event_version)`. Buchungen verwenden den unveränderlichen
`booked_price`-Snapshot, Zahlungen und Rückerstattungen die Provider-Transaktionen, Lohnkosten nur
abgeschlossene `payroll_snapshot_lines`. `expense_entries` erfasst Räume, Material, Werbung,
externe Leistungen und Betriebskosten mit Belegreferenz, Leistungsdatum, Freigabestatus und
optionalem `edition_id`/`session_id`. `financial_periods`, `budgets` und auditierte
`financial_adjustments` vervollständigen den Abschlussprozess. Abgeschlossene Perioden bleiben
unverändert; spätere Korrekturen werden als neue Ereignisse gebucht.

**Angebotsauswertung:** Die Tabelle zeigt pro `OfferEdition` mindestens Angebot/Zielgruppe,
Teilnehmer, Kursgruppen, Auslastung, Umsatz, direkte Kosten, Durchschnittsumsatz pro Teilnehmer,
Deckungsbeitrag, Marge und Warnstatus. Teilnehmer sind aktive, nicht stornierte Anmeldungen;
Warteliste, Storno und Rückerstattung ohne aktive Leistung zählen nicht. Eine Person mit mehreren
gebuchten Angeboten zählt je Angebot einmal, weshalb die Gesamt-KPI ausdrücklich „aktive
Anmeldungen“ und nicht „eindeutige Personen“ heisst. Für reguläre Kursgruppen ist die
Kapazitätsreferenz zehn Schüler je Session; die Auswertung summiert dennoch die tatsächlich in
`course_sessions.capacity` gespeicherten Werte. Prüfungssimulationen zeigen Teilnehmer und Termine,
aber bewusst keine Auslastung. Umsatz richtet sich nach der ausgewählten Sicht (`booked`, `paid`,
`recognized`). Direkte Kosten entstehen ausschliesslich aus den dem Angebot zugeordneten,
abgeschlossenen `payroll_snapshot_lines` (`approved_work_minutes × vom Administrator hinterlegter,
historischer Stundensatz`). Das Finanz-Cockpit übernimmt den Snapshot-Betrag unverändert und
erlaubt keine zweite manuelle Lohnkostenpflege.
Raum-, Material-, Marketing- und allgemeine Betriebskosten werden separat gezeigt und nicht in
die direkten Kosten der Angebotszeile hineingerechnet.

```text
Direkte Kosten   = genehmigte Arbeitsminuten × gültiger historischer Stundensatz
Deckungsbeitrag = Umsatz der gewählten Sicht – direkte Kosten – Rückerstattungen
Marge            = Deckungsbeitrag / Umsatz der gewählten Sicht
```

Die Cockpit-Kachel trägt verbindlich den Titel **„Bruttogewinn nach Zielgruppen“**. Ihr Wert ist
je Zielgruppe die Summe der Deckungsbeiträge ihrer Angebote, also Umsatz der gewählten Sicht minus
direkte Lohnkosten und Rückerstattungen. Sie zeigt keine Umsatzwerte. Zielgruppenübergreifende
Angebote wie die Prüfungssimulation bleiben als eigene Zeile sichtbar und werden nicht willkürlich
auf mehrere Zielgruppen verteilt.

RLS-sichere Reporting-Views beziehungsweise materialisierte Monats-/Angebotsaggregate liefern
die Auswertung serverseitig; der Browser summiert keine Rohbuchungen. Finanzereignisse stossen
gezielte Aktualisierung an, ein periodischer Abgleich erkennt Drift zu Quellsystemen. Nur
Administratoren sehen Einzelwerte und Exporte. Exporte enthalten Definition, Filter, Zeitstempel,
Quellstand und Summenkontrollen. Negative Margen, tiefe Kursauslastung, offene Zahlungen, ungeprüfte
Lohnperioden und nicht zugeordnete Kosten werden sichtbar markiert, nicht herausgefiltert.

---

## 3. Komponentenliste

| Komponente | Props (Kern) | Vorkommen |
|---|---|---|
| `AudienceHero` | `content: AudienceHeroContent` | Alle 7 Hauptseiten — Zielgruppe/Prüfungs-Nutzenversprechen; nutzt `PageIntro` aus 1a |
| `CourseCardGrid` | `offers: CourseOffer[]` | Alle Hauptseiten — responsives Raster, Instanz von `ResponsiveGrid` |
| `CourseCard` | `offer: CourseOffer` | Hauptkurs-Kacheln; Titel, Tagline, Datum, Features, Preis, Ziel und Empfehlung kommen aus demselben Modell |
| `AddOnCourses` | `offers: (ExamSimulationOffer \| SelfStudyOffer)[]` | 6. Klasse, 2./3. Sek und BMS gemäss `Audience.capabilities` — kompakte Kartenliste für Prüfungssimulation/Selbststudium |
| `ExistingCourseSection` / `ExistingCourseCard` *(neu)* | `courses: ExistingCourseCardModel[]` | Klassenübersichten mit eindeutig gemappten aktiven Zeilen aus `intensivwoche_kurse`; zeigt auch Französisch/NMG und bucht mit der unveränderten `sourceKursId`; leerer Bestand rendert keine Sektion |
| `CourseHero` | `offer: CourseOffer` | Alle 13 vorhandenen regulären Kursdetailseiten — Kurstitel + Kurzbeschreibung + berechneter Preis; `PageIntro` + `Badge` |
| `CourseFlow` | `steps: FlowStep[]` | Alle 13 regulären Detailseiten; Pfeile zwischen Steps nur visuell, keine Navigation |
| `CourseContent` | `sections: ContentSection[]` | Nur Wochen-/Halbjahreskurse — strukturierte Inhalte, keine rohen HTML-Strings |
| `OverviewPriceBox` | `offer: CourseOffer` | Alle regulären Unterseiten; Bullets kommen aus `offer.overviewBullets` |
| `BookingSection` | `offer: CourseOffer`, `sessions: SessionRow[]` | Alle 13 regulären Detailseiten — Text aus `offer.booking`, Preis aus `offer`, Termine separat; umschliesst `SessionTable` |
| `SessionTable` | `columns: SessionColumn[]`, `rows: SessionRow[]` | Teil von `BookingSection` — Prototyp bereits geliefert (`SessionTable.jsx`), `Ablauf`-Typ siehe 2.4 |
| `SessionDetails` | `ablauf: Ablauf` | Teil von `SessionTable`, rendert `simple` oder `phased` — nahezu alle Terminlisten |
| `WeekFilter` | `weeks: WeekOption[]`, `activeWeekId: string`, `onChange(id: string)` | Teil von `SessionTable`, nur 2./3. Sek Intensivkurs; `SessionRow.weekId` ist der Filter-Key |
| `BookingButton` | `session: SessionRow` | Teil von `SessionTable` — CTA „Anmelden"; deaktiviert bzw. alternative Aktion je nach Status |
| `StatusBadge` | `status: AvailabilityStatus \| "empfohlen"` | In `SessionTable` und `CourseCard` |
| `CategoryBadge` | `label: string`, `subject?: Subject` | Fit-Tags/Fachlabels — eigene Variante, nicht mit `StatusBadge` vermischen |
| `WhyUsGrid` | `features: Feature[]` | Alle 13 regulären Detailseiten — Abschnitt „4 Gründe, die zählen", vier `FeatureCard`-Objekte auf Basis von `ContentCard` |
| `Testimonials` / `TestimonialCard` | `testimonials: Testimonial[]` | Alle 13 regulären Detailseiten im aktuellen Bestand; kein Carousel nötig |
| `ExamSimTimeline` *(neu)* | `segments: ExamTimelineSegment[]` | Nur Prüfungssimulation |
| `FaqAccordion` | `items: FaqItem[]` | Nur Prüfungssimulation |
| `SiteNav` *(neu)* | `model: SiteNavModel` | Ausschliesslich `app/[locale]/(marketing)/layout.tsx`, dort genau einmal — flache Flex-Navigation mit direkten Links ab `md:`, darunter shadcn `Sheet`; Login kommt aus `model.login` und bleibt `/login`; kein Import im globalen `app/layout.tsx` und kein seitenweises Rendering |
| `SiteFooter` *(neu)* | `model: SiteFooterModel` | Ausschliesslich im öffentlichen Marketing-Layout, nach `children`; übernimmt das wiederkehrende Footer-Muster der acht vollständigen Referenzseiten und enthält nur reale interne Ziele |
| `KlassenPicker` *(neu)* | `audiences: Audience[]` | Nur Startseite (Hero), filtert `placements.includes("heroPicker")`; liest dieselbe Quelle wie `SiteNav` |
| `ServiceCard` *(neu)* | `service: ServiceCardModel` | Nur Startseite — ganze Karte klickbar über `service.action`, Zielgruppe über `eligibleFor`; `ariaLabel` liegt im Modell |
| `ServiceSubgroup` *(neu)* | `group: ServiceSubgroupModel` | Nur Startseite — fasst Karten mit gemeinsamer Zielgruppen-Einschränkung zusammen |
| `FeaturedTestimonial` *(neu)* | `testimonial: Testimonial` | Nur Startseite — einzelnes grosses Zitat, andere Darstellung als `Testimonials` (3er-Grid) |
| `TargetedAudiencePicker` *(neu)* | `audiences: Audience[]` | Landingpages Prüfungssimulation und Distance Learning — Auswahl wird aus `TargetedServicePageModel.eligibleAudiences` gespeist; keine duplizierte Zielgruppenliste |
| `SubscriptionCard` *(neu)* | `plan: SubscriptionPlan` | Nur `/nachhilfe` — Empfehlung und CTA liegen im Plan; Preis wird berechnet, nicht als Text gepflegt |
| `TipCategorySection` *(neu)* | `category: TipCategory` | Nur `/tipps` — gruppiert redaktionelle Vorschauen nach der im Mockup vorgesehenen Kategorie |
| `TipCard` *(neu)* | `tip: TipPreview` | Nur `/tipps` — ohne reale Artikelseite ist die Karte semantischer Inhalt ohne Link/CTA; erst eine vorhandene und getestete Zielroute setzt `tip.action` |
| `OfferEditionForm` *(neu)* | `offer`, `edition`, `sessions?` | Zielgruppenunabhängige geschützte Kursverwaltung gemäss `Layout_Admin_Kursangebot_Maske.html`; alle sieben Zielgruppen und alle verwalteten Angebotstypen, Abschnitte Grundlagen, Preise, optionale Termine und Veröffentlichung |
| `SessionEditor` *(neu)* | `sessions: CourseSessionDefinition[]` | Nur für terminbasierte Angebote; fügt Termine hinzu, bearbeitet Standort/Kapazität, filtert die Bearbeitungsansicht dynamisch nach Standort und markiert Absagen statt belegte Sessions zu löschen; Selbststudium rendert keinen leeren Pflichttermin-Editor |
| `EditionPreview` *(neu)* | `edition: OfferEdition`, `sessions` | Sticky Zusammenfassung in der Admin-Maske; reine Vorschau, keine zweite Datenquelle |
| `PublicationChecklist` *(neu)* | `edition`, `sessions`, `issues` | Blockiert Veröffentlichung bei fehlenden Pflichtfeldern, ungültigen Preisen/Fristen oder fehlenden buchbaren Terminen |
| `DailyReleaseManager` *(neu)* | `edition`, `session`, `days`, `contentItems` | Geschützte Tagesfreigabe gemäss `Layout_Admin_Tagesfreigaben.html`; orchestriert Auswahl, Entwurf, Planung, Freigabe und Notfallsperre |
| `CourseDayPicker` *(neu)* | `days: CourseDay[]`, `activeDayId`, `onChange` | Zeigt die fünf Kurstage und ihren effektiven Status; Status bleibt serverseitig autoritativ |
| `ReleaseMaterialSelector` *(neu)* | `items`, `selectedIds`, `onChange` | Durchsuchbare Auswahl kanonischer Übungen/Prüfungen; speichert IDs und Reihenfolge, keine Materialkopien |
| `StudentReleasePreview` *(neu)* | `day`, `selectedItems` | Rein redaktionelle Vorschau innerhalb der Admin-Maske; verleiht keinen Zugriff und umgeht keine RLS |
| `TeacherWorkEntryForm` *(neu)* | `teacher`, `period`, `assignments`, `entries` | Lernpersonen-Dashboard: eigene Kurszeitvorschläge bestätigen, Zusatzaufwand erfassen und Monat einreichen |
| `WorkTimeOverview` *(neu)* | `period`, `teacherSummaries`, `filters` | Admin-Übersicht gemäss `Layout_Admin_Zeiterfassung.html`; Soll/Ist, Status, Abweichungen und genehmigte Lohnprognose |
| `PayrollReviewPanel` *(neu)* | `teacher`, `entries`, `rateAgreements`, `issues` | Admin pflegt zeitlich gültigen vereinbarten Stundensatz, genehmigt/weist Zeiten zurück und bereitet den unveränderlichen Snapshot vor |
| `FinancialCockpit` *(neu)* | `period`, `basis`, `kpis`, `monthlySeries`, `offerSummaries` | Admin-Jahresübersicht gemäss `Layout_Admin_Finanzcockpit.html`; gebucht/bezahlt/verdient bleiben getrennte Sichten |
| `OfferProfitabilityTable` *(neu)* | `summaries: OfferFinancialSummary[]` | Teilnehmer, Kursauslastung (nicht bei Prüfungssimulation), genehmigte Stunden, daraus berechnete direkte Kosten, Umsatz, Durchschnitt pro Teilnehmer, Deckungsbeitrag und Marge pro OfferEdition |
| `RevenueCostChart` *(neu)* | `series`, `interval`, `basis` | Serverseitig aggregierter Monats-/Quartalsvergleich; keine Summierung finanzieller Rohdaten im Client |

**Copy-Inkonsistenz gefunden und behoben:** Die Sektion „Ergänzend zu jeder Klassenstufe" auf
der Startseite stimmte ursprünglich nur für Lerncoaching/Nachhilfe, nicht für
Simulationsprüfung. Behoben: Sektions-Überschrift heisst jetzt „Ergänzend
zu unseren Kursen" (stimmt für alle vier), und die Simulationsprüfung-`ServiceCard` zeigt einen
Zusatz („Verfügbar für 6. Klasse & 2./3. Sek"). Der „Mehr erfahren"-Link führt auf eine eigene
Landingpage mit 2 Optionen (analog `KlassenPicker`, nur für die 2 Prüfungsjahre) statt direkt auf
eine der beiden Klassenstufen-Routen — löst damit auch die bisher offene Frage 6 zum Ziel dieses
Links.

**Nachträglich entdeckt: Distance Learning ist noch enger eingeschränkt als Simulationsprüfung.**
Nicht nur auf 6. Klasse & 2./3. Sek, sondern **nur auf deren Intensivkurs** (nicht den
Halbjahreskurs derselben Klassenstufen) — Grund: Der Intensivkurs fällt in die Sportferien, wenn
Familien häufiger verreisen, daher die Option zur Teilnahme per Video von unterwegs. Auch dafür
gibt es jetzt eine eigene Erklärseite (`/distance-learning`, siehe Abschnitt 6) mit demselben
2-Optionen-Picker-Muster wie bei Simulationsprüfung. Die ursprüngliche Startseiten-Kachel („Für
alle Klassenstufen") war hier faktisch falsch und wurde korrigiert.

**Einheitlicher Text der Intensivkurs-Kacheln:** Auf den Hauptseiten von 6. Klasse, 2./3. Sek und
BMS nennt die Intensivkurs-Karte verbindlich `5 aufeinanderfolgende Kurstage in einer
Schulferienwoche`. Der Beschreibungstext endet jeweils mit `– inklusive praktischer Tipps & Tricks
für die Gymiprüfung.` Zielgruppenspezifische Einleitung, Kurszeit und übrige Leistungen bleiben
unverändert.

**Nachträglich entschieden:** „Simulationsprüfung" und „Distance Learning" wurden aus `SiteNav`
entfernt/nie aufgenommen (bleiben `ServiceCard`s auf der Startseite), weil sie nur für einen Teil
der Zielgruppen gelten. Die flache Navigation enthält `Nachhilfe`, `Über uns` und alle sieben
Zielgruppen aus `Audience[]`, also auch BMS und Matura. Lerncoaching und Tipps bleiben über die
Startseiten-Kacheln beziehungsweise inhaltliche Verlinkungen auffindbar, aber nicht im Top-Level-Nav.
Auffindbarkeit von
Simulationsprüfung und Distance Learning bleibt über die Startseiten-Kachel und (bei
Simulationsprüfung zusätzlich) die `AddOnCourses`-Karte auf den jeweiligen Hauptseiten erhalten.


**Aktueller Abgleich:** `Testimonials` kommen inzwischen auf allen 13 regulären Detailreferenzen
vor, einschliesslich 1. Sek, 4./5. Klasse, BMS und Matura. Sie bleiben dennoch optional im Modell,
damit fehlende redaktionelle Daten keinen leeren Abschnitt erzeugen:
`{model.offer.testimonials?.length ? <Testimonials testimonials={model.offer.testimonials} /> : null}`.

**BMS und Matura:** Beide werden aus derselben `Audience[]`-Quelle wie die fünf schulischen
Gruppen geroutet. BMS besitzt im aktuellen Mockup vier Karten, aber nur Referenzen für
Intensivkurs, Prüfungssimulation und Selbststudium; der Halbjahreskurs benötigt vor Veröffentlichung
freigegebenen Platzhalter-/Echtinhalt. Matura besitzt eine Hauptseite plus zwei vollständige
Detailreferenzen. Keines der beiden Angebote darf über `istPruefungsjahr` oder einen
Klassenstufen-Textvergleich erkannt werden.

---

## 4. Prüfungssimulation: separat behandeln

Die Dateien `Layout_6_Klasse_Pruefungssimulation.html` und `Layout_2_Sek_Pruefungssimulation.html`
sind **keine** Fortsetzung des übrigen Designs — anderes Token-System, sandboxed iframe,
externe CDN-Libraries (Lucide, Floating UI). Sieht nach Export eines anderen Vorschau-Tools aus.

**Empfehlung:** Einmal mit den oben genannten Bausteinen (`CourseFlow`, `ExamSimTimeline`,
`WhyUsGrid`, `SessionTable` mit reduzierten Spalten, `FaqAccordion`) neu bauen — im
eigenen Design-System, ohne die zusätzlichen Libraries. Lohnt sich, weil nur zwei Klassenstufen
(6. Klasse, 2./3. Sek) diesen Seitentyp brauchen. Inhalte beider Dateien sind sich sehr ähnlich
(Prüfungsablauf, Zeitstrahl, Feedback-Flow, Terminliste, FAQ) — vermutlich reicht eine
parametrisierte Vorlage für beide.

`Layout_BMS_Pruefungssimulation_Seite.html` ist dagegen eine reguläre Referenz im gemeinsamen
Design-System und wird über dasselbe `ExamSimulationPageModel` angebunden, aber nicht aus dem
fremden Export-Markup rekonstruiert.

„Selbststudium" besitzt für 6. Klasse, 2./3. Sek und BMS je eine Referenz-Unterseite. Die BMS-Seite
wurde inhaltlich auf Deutsch/Mathematik und die BMS-Aufnahmeprüfung angepasst. Alle drei
Selbststudium-Karten führen verbindlich `2×30 Min. persönliches Zeitguthaben für Rückfragen` als
Leistung und wiederholen das enthaltene Zeitguthaben in der Preisnotiz. Selbststudium bleibt ein
eigener Angebotstyp (Zugang/Checkout statt Termine).

---

## 5. Buchungstabelle: Accessibility & Responsive-Fixes

Referenz-Prototyp bereits geliefert: `SessionTable.jsx`. Kernpunkte, die das CSS-Only-Original
(`display:block` + `data-label` + `::before`) nicht abdeckt:

- Echte `<table>` ab `md:`, echte `<ul>/<dl>`-Kartenliste darunter — kein Table-Reset per CSS,
  der den Screenreader-Kontext zerstören kann.
- Labels als echte DOM-Elemente (`<dt>`), nicht `content: attr(data-label)`.
- Touch-Targets ≥ 44px (Original: ~28–30px bei Buttons/Popover-Trigger).
- `<details>/<summary>` für Popover beibehalten — bereits gut gelöst im Original.
- **Ergänzung laut diesem Briefing:** `SessionDetails` muss `Ablauf` (simple/phased) rendern können.

**Nicht kopierfertig:** Der Prototyp liest `row.status` und `row.href`, fällt bei fehlendem Ziel
auf `href="#"` zurück und übergibt `row.ablauf` als flaches Array. Das widerspricht dem aktuellen
Modell (`availability`, `bookingAction`, discriminated union `Ablauf`) und würde Linktests sowie die
phasenbasierte Variante brechen. Übernommen werden nur semantische Desktop-/Mobile-Struktur,
Touch-Targets und die Nutzung von shadcn `Button`/`Badge`; Datenzugriff und Aktionen werden gegen
`SessionRow` aus Abschnitt 2.4 neu verdrahtet. Produktionscode enthält niemals den `#`-Fallback.

---

## 6. Seiten- und Routentabelle

Direkte Zuordnung Quelldatei → Next.js-Route. Hilft Claude Code konkret: eindeutige Slugs statt
Ad-hoc-Benennung während der Implementierung, und macht sichtbar, welche Datei welchen `kurstyp`
(Abschnitt 2.2) und welche `klassenstufe`-ID (Abschnitt 2.1) bedient.

Die Routen in der Tabelle sind **logische Pfade ohne Locale-Präfix**. In der Anwendung liegen sie
gemäss Abschnitt 8 unter `/{locale}/...`, in dieser Migration beispielsweise
`/de/kurse/4-klasse`. Ein künftiges `/en/...` entsteht erst nach dem Englisch-Aktivierungsgate.
Bestehende unlokalisierte Auth-/Dashboard-/API-Routen bleiben grundsätzlich ausserhalb des
Marketing-Routings. Die neue Admin-Referenz wird als ausdrückliche Ausnahme aufgeführt und
erweitert die vorhandene unlokalisierte Kursverwaltung.

**Stand des statischen Prototyps (16.07.2026):** Die 37 HTML-Dateien sind über relative
Dateilinks verbunden. Siebzehn eindeutig auflösbare Dateilinks/Platzhalter wurden korrigiert.
23 Dateien enthalten weiterhin zusammen 80 `href="#"`-Platzhalter. Es gibt keine fehlenden
relativen HTML-Dateiziele oder Anker. Das beschreibt nur den Prototyp: Im Repository existiert auf
`/kurse` bereits ein funktionierender Intensivwochen-Anmelde-Flow mit Modal und Supabase Server
Action. Für die Next.js-Umsetzung gelten die Routen in der folgenden Tabelle; vorhandene
Anmeldelogik wird geprüft und wiederverwendet bzw. erweitert, nicht durch `#` ersetzt.

**Verbindliche Auflösung der 80 verbleibenden `href="#"` (keiner wird kopiert):**

| Anzahl / Label | Next.js-Ziel oder Rendering-Regel |
|---|---|
| 45 × „Anmelden" | `BookingButton` aus `bookingAction`; Modal/RPC oder disabled, niemals Fallback-Link |
| 13 × „Weiterlesen →" | `TipPreview.action` bleibt leer; ohne echte Artikelroute kein `<a>` rendern |
| 7 × „EN" | beim Deutsch-only-Launch gar nicht rendern |
| 7 × „Kontakt" | lokalisierter Link `/de/kontakt` über den next-intl-Navigationswrapper |
| 3 × Beratungs-CTA | ebenfalls `/de/kontakt`, bis ein eigener Terminbuchungsflow existiert |
| 2 × „Zugang erhalten" | nur mit realem Self-Study-Checkout/Zugang; bis dahin disabled bzw. nicht als Link rendern |
| 2 × „Abo buchen" | nur mit realem Nachhilfe-Checkout; bis dahin disabled bzw. nicht als Link rendern |
| 1 × „Termin wählen" | Sprungziel `#buchung` auf der BMS-Prüfungssimulationsseite; Zielsektion erhält diese ID |

| Quelldatei | Vorgeschlagene Route | Seitentyp | Angebot / Zweck | Besondere Elemente |
|---|---|---|---|---|
| `Layout_Admin_Kursangebot_Maske.html` | `/dashboard/kurse/[offerId]/durchfuehrungen/[editionId]` | Geschützte Admin-Maske, **ohne Locale-Präfix** | Jährliche Preise, Termine, Kapazität und Veröffentlichung | Erweitert vorhandenes `/dashboard/kurse`; `OfferEditionForm`, `SessionEditor`, `EditionPreview`, `PublicationChecklist`; Administrator-Rolle, Audit-Log, Preis-Snapshots und transaktionales Publizieren gemäss Abschnitt 2.12 |
| `Layout_Admin_Tagesfreigaben.html` | `/dashboard/kurse/[offerId]/durchfuehrungen/[editionId]/tagesfreigaben` | Geschützte Admin-Maske, **ohne Locale-Präfix** | Übungen und Prüfungen kursgruppen- und tageweise freigeben | `DailyReleaseManager`, `CourseDayPicker`, `ReleaseMaterialSelector`, `StudentReleasePreview`; Einschreibungsprüfung, RLS, Zeitfenster, Audit-Log und Notfallsperre gemäss Abschnitt 2.13 |
| `Layout_Admin_Zeiterfassung.html` | `/dashboard/arbeitszeiten` | Geschützte Admin-Maske, **ohne Locale-Präfix** | Vereinbarten Stundensatz pflegen, Stunden prüfen/genehmigen und Monatsabschluss vorbereiten | `WorkTimeOverview`, `PayrollReviewPanel`; Minuten-/Rappenwerte, zeitliche Satzhistorie, Periodensperre, Snapshot und Audit gemäss Abschnitt 2.14 |
| *(gleicher Flow, kein separates Mockup)* | `/arbeitszeiten` | Geschütztes Lernpersonen-Dashboard, **ohne Locale-Präfix** | Eigene Zeiten bestätigen, Zusatzaufwand erfassen und einreichen | `TeacherWorkEntryForm`; RLS nur für eigene Einträge, keine Satz-/Lohndaten anderer Personen |
| `Layout_Admin_Finanzcockpit.html` | `/dashboard/finanzen` | Geschützte Admin-Maske, **ohne Locale-Präfix** | Jahresübersicht sowie Teilnehmer, Umsatz und Kosten pro Angebot | `FinancialCockpit`, `OfferProfitabilityTable`, `RevenueCostChart`; Admin-only Reporting gemäss Abschnitt 2.15 |
| `Startseite.html` | `/` | Startseite, **ersetzt die bestehende Startseite komplett** (nicht ergänzen) | Zielgruppen-Übersicht + Zusatzangebote | `SiteNav` mit sieben kompakten Zielgruppen-Direktlinks, Nachhilfe, Über uns und Login-Button zur bestehenden Route `/login`; `KlassenPicker`, `ServiceCard`-Grid, `FeaturedTestimonial`; **EN-Sprachumschalter → i18n-Umsetzung siehe Abschnitt 8**; Mobile-Navigation via `Sheet` gemäss Abschnitt 1b/3 |
| `Layout_Pruefungssimulation_Landingpage.html` | `/pruefungssimulation` | Auswahl-Landingpage (löst Offene Frage 6) | Erklärt Angebot + Eignung, verzweigt zu 6. Klasse/2.–3. Sek | `TargetedServicePageModel`; wiederverwendet `.aufbau/.phase`, `.features`, `TargetedAudiencePicker` (2 Optionen) und `FaqAccordion` |
| `Layout_Lerncoaching_Seite.html` | `/lerncoaching` | Zusatzangebot-Seite | Lerncoaching-Erklärung (Konzept, kein Preis) | `TargetedServicePageModel`; eigene Texte, stark gekürzt gegenüber Referenzseite; `relatedActions` verweist auf `/nachhilfe` |
| `Layout_Nachhilfe_Seite.html` | `/nachhilfe` | Zusatzangebot-Seite | Nachhilfe-Abo (10er/20er) | **Neuer Angebotstyp**, siehe `SubscriptionPlan`/Abschnitt 2.6 — bewusst von Lerncoaching getrennt (unterschiedliche Kaufabsicht, unterschiedliches Datenmodell); eigener Nav-Eintrag + eigene Startseiten-Kachel |
| `Layout_DistanceLearning_Seite.html` | `/distance-learning` | Erklärseite (kein Nav-Eintrag) | Video-Teilnahme am Intensivkurs-Sportferien | `TargetedServicePageModel`; nur 6. Klasse & 2./3. Sek, nur deren Intensivkurs (nicht Halbjahreskurs) — siehe `distanceLearningAvailable`-Hinweis bei `ServiceCard` (Abschnitt 3); `TargetedAudiencePicker`, kein Preis |
| *(kein Mockup — Platzhalter, siehe Frage 7)* | `/kontakt` | Platzhalterseite | Kontaktinfos | `PlaceholderPageModel`; nur `PageContainer` + `PageIntro`; echtes Formular erst nach Abschnitt 1b-Entscheidung |
| `Layout_Tipps_Uebersichtsseite.html` | `/tipps` | Redaktionelle Übersichtsseite | Kategorisierte Tipp-Vorschauen + FAQ | `TipsPageModel` mit `TipCategory`/`TipPreview`; Kategorien Prüfung&Planung/Lernen&Motivation/Deutsch/Mathematik/Förderbedarfe; einzelne Artikelseiten noch nicht gebaut |
| `Layout_UeberUns_Seite.html` | `/ueber-uns` | Marketingseite | Über uns | Vollständiges Mockup; kein Platzhalter mehr, zentrale `SiteNav`/`SiteFooter` statt dupliziertem Layout-Markup |
| `Layout_BMS_Hauptseite.html` | `/kurse/bms` | Zielgruppen-Hauptseite | BMS-Aufnahmeprüfung | Kurs-CTAs verwenden verbindlich die Intensivkurs-Unterseite; zusätzlich Prüfungssimulation und Selbststudium |
| `Layout_BMS_Intensivkurs_Unterseite.html` | `/kurse/bms/intensivkurs` | Kursdetail | BMS-Kurs | Verbindliche BMS-Kurs-Unterseite gemäss Nutzerfreigabe; keine separate Wochenkurs-/Halbjahreskurs-Zielroute anlegen |
| `Layout_BMS_Pruefungssimulation_Seite.html` | `/kurse/bms/pruefungssimulation` | Eigenständiges Zusatzangebot | BMS-Prüfungssimulation | Bereits im gemeinsamen Navy/Sage/Gold-System; keine Fremdexport-Behandlung wie bei den zwei ZAP-Dateien nötig |
| `Layout_BMS_Selbststudium_Unterseite.html` | `/kurse/bms/selbststudium` | Eigenständiges Zusatzangebot | BMS-Selbststudium | `SelfStudyPageModel`; Deutsch/Mathematik, BMS-Prüfungsarchiv und bis zu 3 Aufsätze mit Feedback |
| `Layout_Maturapruefung_Seite.html` | `/kurse/matura` | Zielgruppen-Hauptseite | Maturaprüfung Mathematik | 2 Karten, beide Detailziele vorhanden |
| `Layout_Matura_Halbjahreskurs_Unterseite.html` | `/kurse/matura/halbjahreskurs` | Kursdetail | Halbjahreskurs Matura Mathematik | Vollständige Termin-/Buchungsreferenz |
| `Layout_Matura_Intensivwoche_Unterseite.html` | `/kurse/matura/intensivwoche` | Kursdetail | Intensivwoche Matura Mathematik | Vollständige Termin-/Buchungsreferenz; interner `CourseOffer.kurstyp` kann `intensivkurs` bleiben, Route/Anzeigename kommen aus Daten |
| `Layout_1_Sek_Hauptseite.html` | `/kurse/1-sek` | Zielgruppen-Hauptseite | Vorbereitung Gymiprüfung 2028 | 2 Kurskarten: Halbjahreskurs/Vorkurs und Lerncamp Sportferien |
| `Layout_1_Sek_Halbjahesrkurs_Unterseite.html` **(korrigiert — siehe Hinweis unten)** | `/kurse/1-sek/vorkurs` | Kursdetail, Wochen-/Semesterkurs | Vorkurs Deutsch & Mathematik | 3 Ablaufphasen (korrigiert, siehe Hinweis unten), ausführliche Inhaltsblöcke, 4 Terminzeilen |
| `Layout_1_Sek_Intensivkurs_Unterseite.html` | `/kurse/1-sek/lerncamp-sportferien` | Kursdetail, Ferienkurs | Lerncamp Sportferien | 3 Ablaufphasen, 3 Terminzeilen mit aufklappbarem Tagesplan |
| `Layout_2_Sek__Hauptseite.html` | `/kurse/2-3-sek` | Zielgruppen-Hauptseite | Vorbereitung Gymiprüfung 2027 | 4 Karten; Halbjahreskurs empfohlen; Zusatzangebote Prüfungssimulation und Selbststudium |
| `Layout_2_Sek_Halbjahreskurs_Unterseite.html` | `/kurse/2-3-sek/halbjahreskurs` | Kursdetail, Halbjahreskurs | Deutsch & Mathematik | Umfangreichste Detailseite; 3 Ablaufphasen im Kursaufbau (korrigiert, siehe Hinweis unten), zusätzlich 3 Phasen *innerhalb* des Ablauf-Popovers (`AblaufPhased`, Abschnitt 2.4 — nicht zu verwechseln), Inhalte, Testimonials, 6 Terminzeilen |
| `Layout_2_Sek_Intensivkurs_Unterseite.html` | `/kurse/2-3-sek/intensivkurs-sportferien` | Kursdetail, Ferienkurs | Prüfungsaufgaben trainieren | 3 Phasen, Testimonials, 5 Terminzeilen, **interaktiver Wochenfilter** (funktionierendes Vanilla-JS, filtert Zeilen per `data-week`) — als React-State (`useState`) neu zu bauen, nicht als DOM-`style.display`; Tabelle hat hier keine eigene Zeit-Spalte (steckt im Tagesplan-Popover) |
| `Layout_2_Sek_Pruefungssimulation.html` | `/kurse/2-3-sek/pruefungssimulation` | Eigenständiges Zusatzangebot | Prüfungssimulation | **Neu aufzubauen** — Quelldatei nutzt fremdes Design-System (siehe Abschnitt 4), nicht direkt migrierbar |
| `Layout_4_Klasse_Hauptseite.html` | `/kurse/4-klasse` | Zielgruppen-Hauptseite | Grundlagen stärken | 2 Karten: Wochenkurs und Lerncamp Sportferien |
| `Layout_4_Klasse_Halbjahreskurs_Unterseite.html` | `/kurse/4-klasse/halbjahreskurs` | Kursdetail, Halbjahreskurs (Detailmockup nennt noch „Wochenkurs") | Deutsch, Mathematik & Lerncoaching | 3 Phasen, Fach-/Coaching-Inhalte, 4 Terminzeilen; zentraler Offer-Datensatz hält Karten- und Detailtitel konsistent |
| `Layout_4_Klasse_Intensivkurs_Unterseite.html` | `/kurse/4-klasse/lerncamp-sportferien` | Kursdetail, Ferienkurs | Ferien-Lerncamp | 3 Phasen, 4 Terminzeilen mit Tagesplan |
| `Layout_5_Klasse_Hauptseite.html` | `/kurse/5-klasse` | Zielgruppen-Hauptseite | Grundlagen stärken | 2 Karten: Wochenkurs und Lerncamp Sportferien |
| `Layout_5_Klasse_Halbjahreskurs_Unterseite.html` | `/kurse/5-klasse/halbjahreskurs` | Kursdetail, Halbjahreskurs (Detailmockup nennt noch „Wochenkurs") | Deutsch, Mathematik & Lerncoaching | 3 Phasen, Fach-/Coaching-Inhalte, 5 Terminzeilen; zentraler Offer-Datensatz hält Karten- und Detailtitel konsistent |
| `Layout_5_Klasse_Intensivkurs_Unterseite.html` | `/kurse/5-klasse/lerncamp-sportferien` | Kursdetail, Ferienkurs | Ferien-Lerncamp | Strukturell praktisch identisch mit 4. Klasse, 4 Terminzeilen |
| `Layout_6_Klasse_Hauptseite.html` | `/kurse/6-klasse` | Zielgruppen-Hauptseite | Vorbereitung Gymiprüfung 2027 | 4 Karten; Halbjahreskurs empfohlen; Zusatzangebote Prüfungssimulation und Selbststudium |
| `Layout_6_Klasse_Halbjahreskurs_Unterseite.html` | `/kurse/6-klasse/halbjahreskurs` | Kursdetail, Halbjahreskurs | Deutsch & Mathematik | 3 Phasen im Kursaufbau (korrigiert, siehe Hinweis unten), Fachinhalte, Testimonials, 5 Terminzeilen |
| `Layout_6_Klasse_Intensivkurs_Unterseite.html` | `/kurse/6-klasse/intensivkurs-sportferien` | Kursdetail, Ferienkurs | Prüfungsaufgaben trainieren | 3 Phasen, Testimonials, 8 Terminzeilen (korrigiert — 3 Standorte: Zürich HB, Stadelhofen, Winterthur), Tagesplan mit hervorgehobenem Prüfungssimulations-Tag |
| `Layout_6_Klasse_Pruefungssimulation.html` | `/kurse/6-klasse/pruefungssimulation` | Eigenständiges Zusatzangebot | Prüfungssimulation | **Neu aufzubauen** — Quelldatei nutzt fremdes Design-System (siehe Abschnitt 4), nicht direkt migrierbar |
| `Layout_6_Klasse_Selbststudium_Unterseite.html` | `/kurse/6-klasse/selbststudium` | Eigenständiges Zusatzangebot | Selbststudium 6. Klasse | Vorhandenes Mockup über `SelfStudyPageModel`; Checkout/Zugang nur mit realem Ziel |
| `Layout_2_Sek_Selbststudium_Unterseite.html` | `/kurse/2-3-sek/selbststudium` | Eigenständiges Zusatzangebot | Selbststudium 2./3. Sek | Vorhandenes Mockup über `SelfStudyPageModel`; Checkout/Zugang nur mit realem Ziel |

**Korrekturen gegenüber einer früheren Fassung dieses Dokuments (Abgleich mit dem aktuellen
Mockup-Stand):**

- **Kursaufbau hat bei allen fünf Halbjahreskurs-/Vorkurs-Unterseiten (4./5./6. Klasse, 1. Sek,
  2./3. Sek) durchgängig 3 Schritte, nicht 4.** Frühere Fassungen dieser Tabelle nannten „4 Phasen"
  — das `CourseFlow`-Bausteine sollte für `steps` daher generisch bleiben (Länge aus den Daten,
  nicht fest auf 4 auslegen). Bei den Intensivkurs-Unterseiten war die Angabe „3 Phasen" bereits
  korrekt.
- **6. Klasse Intensivkurs hat 8 Terminzeilen, nicht 7** (Kurs A–H, weiterhin 3 Standorte).
- **Dateiname-Korrektur 1. Sek:** Die tatsächlich hochgeladene Datei heisst
  `Layout_1_Sek_Halbjahesrkurs_Unterseite.html` (Tippfehler im Dateinamen selbst — „Halbjahesrkurs"
  statt „Halbjahreskurs"), nicht `Layout_1_Sek_Vorkurs_Unterseite.html` wie in einer früheren
  Fassung dieser Tabelle. Inhaltlich passt die Datei zur Beschreibung (Titel „Vorkurs 1. Sek",
  4 Terminzeilen, Preis-Bug wie oben in Abschnitt 2.3 dokumentiert). Beim Anlegen von Ordnern/
  Mockup-Ablage den tatsächlichen Dateinamen verwenden, nicht den hier ursprünglich genannten.
- **Distance Learning:** Es existiert genau eine Referenzdatei:
  `Layout_DistanceLearning_Seite.html`. Frühere Dokumentfassungen erwähnten irrtümlich ein
  Duplikat namens `Layout_DistanceLearning_Seite__1_.html`; diese Datei ist im aktuellen Bestand
  nicht vorhanden und darf in der Migration nicht erwartet werden.
- **Navigation der statischen Prototypen:** Logo und Nachhilfe-Link wurden in den vorhandenen
  Zusatzangebot-Seiten vereinheitlicht. Für die Migration bleibt trotzdem `SiteNav` die einzige
  Quelle der **öffentlichen Marketing-Navigation**; sie wird im öffentlichen `(marketing)`-Layout
  eingebunden. Navigations-Markup soll weder ins globale Root-Layout noch seitenweise aus den
  HTML-Dateien kopiert werden.

**Zur Umsetzung:** Die tabellarisch aufgeführten Zielgruppen-/Kursrouten sollten **nicht** als
einzelne Next.js-Pages dupliziert werden. Da Struktur und Komponenten über alle Zielgruppen
identisch sind (Abschnitt 3), passt ein dynamisches
Routenpaar besser:

```
app/[locale]/(marketing)/kurse/[audience]/page.tsx
// liest Offer[] für audienceId, rendert CourseCard-/AddOnCourses-Grid

app/[locale]/(marketing)/kurse/[audience]/[angebot]/page.tsx
// liest cachebares Offer + SessionDefinition[]; SessionRow[] entsteht request-time
```

`[audience]` und `[angebot]` kommen aus den stabilen Keys in Abschnitt 2.1/2.2 (`audienceId`,
`offer.slug`) — die Tabelle oben beschreibt damit **Dateninhalte**, nicht einzeln zu bauende
Seiten-Dateien.
Die beiden Prüfungssimulations-Routen und (sobald vorhanden) Selbststudium brauchen eigene
Templates, da sie strukturell von den Kurstyp-Seiten abweichen (Abschnitt 4).

**Kleiner Hinweis am Rand:** Die Quelldatei `Layout_2_Sek__Hauptseite.html` hat einen doppelten
Unterstrich im Dateinamen — vermutlich ein Tippfehler beim Speichern. Sollte beim Anlegen von
Ordnern/Routen nicht übernommen werden.

---

## 7. Rendering-Strategie

**Verbindlicher technischer Stand:** In `next.config.ts` ist `cacheComponents: true` aktiviert.
Damit gilt das Cache-Components-Modell von Next.js 16. Route-Segment-Exporte wie
`export const revalidate`, `dynamic` und `fetchCache` sind in diesem Modus deaktiviert und dürfen
für die neuen Marketingrouten nicht als Cache-Steuerung verwendet werden. Der bestehende
`unstable_cache`-Abruf in `app/(public)/kurse/actions.ts` ist Legacy-Bestand; Next.js 16 empfiehlt
hier `use cache`.

**Verbindliche Aufteilung:**

1. **Stabile Kursdaten werden explizit gecacht.** Beschreibung, Preis, Ablauf, Klassenstufe und
   Marketingtexte kommen aus einer async Datenfunktion mit `'use cache'`,
   `cacheLife({ stale: 300, revalidate: 3600, expire: 86400 })` und Tags wie
   `courses`, `course:<id>` bzw. `offers:<stufe>`. Cache-Schlüssel entstehen aus den übergebenen
   IDs/Slugs/Locale-Werten; `cookies()` oder `headers()` werden nicht innerhalb des Cache-Scopes
   gelesen.
2. **Verfügbarkeit wird nicht gecacht.** Freie Plätze, Teilnehmerzahl und Status „frei/voll"
   werden in einer eigenen async Server Component geladen. Sie ruft vor der Supabase-Abfrage
   `await connection()` aus `next/server` auf, enthält kein `'use cache'` und wird in der Seite
   unter `<Suspense fallback={<SessionTableSkeleton />}>` gerendert. Eine Server Component allein
   garantiert keine Frische; `connection()` markiert diesen Teil ausdrücklich als Request-time.
3. **Schreibaktionen invalidieren deterministisch.** Nach erfolgreicher Kurs-/Preisänderung in
   einer Server Action wird `updateTag('courses')` plus der betroffene Detail-Tag aufgerufen, damit
   der Bearbeiter seine Änderung sofort sieht. Für externe Webhooks darf
   `revalidateTag(tag, 'max')` verwendet werden, wenn Stale-while-Revalidate akzeptabel ist.
   Nach erfolgreicher Anmeldung wird kein 300-Sekunden-Daten-Cache invalidiert, weil die
   Verfügbarkeit ungecacht ist; die aktuelle Ansicht wird mit `refresh()` aus `next/cache` oder
   einem anschliessenden `router.refresh()` neu gerendert.
4. **Der bestehende `/kurse`-Abruf wird vor Wiederverwendung getrennt.** Der aktuelle
   `unstable_cache(..., { revalidate: 300 })` cached die View inklusive Teilnehmerzahl und darf
   nicht unverändert in die neuen Seiten übernommen werden. Katalogfelder wechseln auf die
   gecachte Datenfunktion aus Punkt 1; Teilnehmerzahl/Verfügbarkeit auf Punkt 2. Bis diese
   Trennung implementiert ist, bleibt `/kurse` Bestandsroute und wird nicht als Quelle für einen
   garantiert aktuellen Belegungsstatus ausgegeben.
5. **Prerendering und Komponenten:** `generateStaticParams()` liefert bekannte
   Locale-/Stufen-/Kurstyp-Kombinationen, steuert aber nicht die Datenfrische. Cache Components
   erzeugt die statische Shell automatisch; ungecachete Daten müssen an einer `Suspense`-Grenze
   liegen. Default bleiben Server Components. `WeekFilter` ist wegen State/Event-Handlern eine
   Client Component; natives `SessionDetails` bleibt Server Component.
6. **Metadata:** `generateMetadata()` verwendet dieselbe getaggte, gecachte Kursdatenfunktion wie
   die Seite, statt eine zweite Supabase-Abfrage oder einen unabhängigen Cache einzuführen.

**Nicht zulässig:** pauschales `force-dynamic`, Route-Level-`revalidate`, parallele Cache-Schlüssel
für dieselben Kursdaten, gecachte Kapazitätsprüfungen oder ein UI-Status, der nach erfolgreicher
Anmeldung bis zum Ablauf eines Zeitintervalls sichtbar veraltet bleibt. Die Datenbanktransaktion
bleibt unabhängig von der Anzeige die verbindliche Instanz für Kapazität und Doppelanmeldungen.

---

## 8. Internationalisierung (i18n) — verbindlicher Scope

**Entscheidung: Public-only i18n, Launch zunächst Deutsch-only.** Nur die neuen öffentlichen Marketing-, Kurs- und
Zusatzangebotsseiten werden mit **next-intl** lokalisiert. Die bestehende Lernplattform bleibt
bewusst ausserhalb des Locale-Segments. Damit werden Authentifizierung, Dashboard und bestehende
interne Links nicht im Rahmen dieser Migration umgebaut. Produktiv aktiv ist zunächst nur `de`.
`en` wird erst aktiviert, wenn alle statischen Texte und alle veröffentlichten DB-Inhalte
vollständig übersetzt sind und der Dokument-Sprachwert technisch korrekt gesetzt wird; ein
sichtbarer EN-Schalter ohne vollständige Inhalte ist nicht zulässig.

### 8.1 Dateistruktur und Routen

```
app/[locale]/(marketing)/layout.tsx  // besitzt SiteNav und rendert sie genau einmal
app/[locale]/(marketing)/page.tsx
app/[locale]/(marketing)/kurse/[audience]/page.tsx
app/[locale]/(marketing)/kurse/[audience]/[angebot]/page.tsx
app/[locale]/(marketing)/lerncoaching/page.tsx
app/[locale]/(marketing)/nachhilfe/page.tsx
app/[locale]/(marketing)/tipps/page.tsx
app/[locale]/(marketing)/distance-learning/page.tsx
app/[locale]/(marketing)/pruefungssimulation/page.tsx
app/[locale]/(marketing)/kontakt/page.tsx
app/[locale]/(marketing)/ueber-uns/page.tsx

i18n/routing.ts, request.ts, navigation.ts
messages/de.json
proxy.ts   // bestehende Auth-Logik + next-intl-Dispatch in EINER Datei
next.config.ts // mit createNextIntlPlugin('./i18n/request.ts')
```

Die folgenden bestehenden Bereiche bleiben unverändert und **ohne** Locale-Präfix:

- `app/(auth)` sowie `/login` und `/register`
- `app/(dashboard)` mit `/dashboard`, `/uebungen`, `/pruefung`, `/profil`, `/trainer`,
  `/aufsaetze`, `/intensivkurse` und `/materialien` sowie den darunterliegenden Admin-, Kurs-,
  Mentorship- und Materialverwaltungsrouten
- `app/(public)/kurse` als bestehende unlokalisierte Route `/kurse`, bis ihre Ablösung oder
  Weiterleitung ausdrücklich umgesetzt ist
- `app/api`, insbesondere NextAuth- und sonstige API-Endpunkte

`SiteNav` liegt ausschliesslich im lokalisierten `(marketing)`-Layout. `app/layout.tsx` darf sie
weder importieren noch rendern; auch einzelne `page.tsx`-Dateien rendern sie nicht erneut. Das
verhindert doppelte Navigation und hält Login-, Dashboard-, Übungs-, Prüfungs-, Profil-, Trainer-
und API-nahe Bereiche frei von der öffentlichen Marketing-Navigation.

### 8.2 Routing-Konfiguration

- `defaultLocale: 'de'`, `localePrefix: 'always'`.
- Für diese Migration verbindlich: `locales: ['de']`. `en` darf in Dateien vorbereitet, aber
  weder geroutet noch im Sprachumschalter angeboten werden.
- Die öffentlichen Routen aus Abschnitt 6 erhalten das aktive Locale-Präfix, z. B.
  `/de/kurse/4-klasse`.
- Die bestehende unlokalisierte Route `/kurse` wird durch diese i18n-Einrichtung nicht automatisch
  umgeleitet oder ersetzt; ihr Verhältnis zu den neuen Kursseiten wird separat entschieden.
- `generateStaticParams()` kombiniert nur für die lokalisierten Marketingseiten
  Locale × Audience × veröffentlichbares Angebot. Auth-/Dashboardseiten sind ausgeschlossen.
- Das lokalisierte Marketing-Layout validiert `params.locale` gegen die Routing-Konfiguration,
  liefert für unbekannte Locales `notFound()` und ruft vor jeder Übersetzungs-/Datenfunktion
  `setRequestLocale(locale)` auf. Dasselbe gilt für jede statisch gerenderte Marketing-Page.
- `generateStaticParams()` liefert alle aktiven Locales. Jede `[audience]`-/`[angebot]`-Page prüft
  die Kombination gegen die zentrale Angebotsmatrix und ruft bei unbekannten oder fachlich
  ungültigen Kombinationen `notFound()` auf; sie fällt nie still auf ein anderes Angebot zurück.
- `next.config.ts` wird mit `createNextIntlPlugin('./i18n/request.ts')` umschlossen; ohne Plugin
  gilt i18n als nicht eingerichtet.
- Das bestehende `app/page.tsx` wird nicht parallel als zweite Startseite weitergeführt. Es wird
  zu einem deterministischen Redirect auf `/de` reduziert oder entfernt, sofern die gemeinsame
  `proxy.ts` den Redirect mit getestetem Status übernimmt. Es darf nur eine kanonische Startseite
  geben.
- Solange nur Deutsch aktiv ist, bleibt `<html lang="de">` im globalen Root-Layout korrekt. Vor
  Aktivierung von `en` ist ein eigener Architektur-Schritt Pflicht, der den Dokument-Sprachwert
  pro Locale setzt (request-aware Root-Layout oder getrennte Root-Layouts) und gleichzeitig die
  bestehenden globalen Provider/Fonds/Styles für Marketing, Auth und Dashboard erhält. Ein
  englischer Pfad unter `<html lang="de">` darf nicht live gehen.
- Der Login-Button bleibt bewusst `/login`, nicht `/de/login` oder `/en/login`.
- Für den Deutsch-only-Launch wird kein Sprachumschalter gerendert. Bei einer späteren EN-
  Aktivierung verwendet er die next-intl-Navigation-Wrapper, behält dieselbe Marketingseite bei
  und wird erst nach vollständigen Übersetzungs-, Routing- und `<html lang>`-Tests sichtbar.

### 8.3 Eine gemeinsame `proxy.ts`, keine Überschreibung

Im Projekt existiert bereits `proxy.ts` mit NextAuth-Tokenprüfung. Sein Matcher umfasst aktuell
`/dashboard`, `/trainer`, `/uebungen`, `/pruefung`, `/profil`, `/login` und `/register`; bei
fehlendem Token wird nach `/login?callbackUrl=...` umgeleitet, bei fehlendem Supabase-Access-Token
zum erneuten Login. Zusätzlich schützt `app/(dashboard)/layout.tsx` seine gesamte Route Group per
`auth()` und `redirect('/login')`. next-intl darf weder den Proxy noch diesen Layout-Guard
ersetzen. Die gemeinsame Proxy-Funktion entscheidet anhand des Pfads:

1. Auth-/Protected-Pfad → unveränderte bestehende Auth-Logik.
2. Lokalisierter Marketingpfad bzw. Startseiten-Locale-Negotiation → next-intl-Handler.
3. `/api`, `/_next`, statische Dateien und sonstige bestehende Pfade → `NextResponse.next()`.

Der gemeinsame `config.matcher` muss beide benötigten Pfadgruppen erfassen und technische Pfade
ausschliessen. Bestehende Callback-URLs und Redirect-Ziele wie `/login` und `/dashboard` bleiben
unverändert. Vor jeder Änderung ist die vorhandene `proxy.ts` vollständig zu lesen; ihre
Tokenprüfung darf weder dupliziert noch entfernt werden.

### 8.4 Inhalte

- **Statische UI-Texte** (Nav, Buttons, Abschnittsüberschriften) → `messages/*.json`.
- **Kursinhalte aus Supabase** werden von next-intl nicht automatisch übersetzt. Für einen
  zweisprachigen Launch braucht es übersetzbare Felder, z. B. JSONB
  (`title: {"de": "...", "en": "..."}`).
- Die Locale-Auflösung passiert beim Datenladen der Marketing-Server-Components; die
  Domänenkomponenten erhalten weiterhin einfache Strings als Props.

---

## 9. Festgelegte Ausführungsentscheidungen

1. **Selbststudium:** Die beiden in Abschnitt 6 definierten Selbststudium-Zielrouten werden als
   minimale, aber vollständige Seiten aus den vorhandenen Primitives umgesetzt und verlinkt. Ein
   späteres individuelles Layout ersetzt nur die Darstellung, nicht Route oder Domainmodell.
2. **Preise:** Widersprüchliche Mockup-Preise werden nicht als Produktionswahrheit importiert.
   Für jedes Angebot existiert genau ein zentraler numerischer Preisdatensatz mit dokumentierter
   Quelle und Freigabestatus. Bis zur fachlichen Freigabe wird das betroffene Angebot nicht
   buchbar veröffentlicht; UI, Seed und Datenbank dürfen keine verschiedenen Werte enthalten.
   Ein Frühbucherpreis wird nur bei aktivem `earlyBirdEnabled`, vorhandenem `earlyBirdPrice` und
   einer noch gültigen `earlyBirdDeadline` angezeigt beziehungsweise gebucht.
3. **Zielgruppen:** Diese Migration unterstützt verbindlich sieben Gruppen: fünf
   Gymiprüfungsgruppen plus BMS und Matura. Daten unbekannter Stufen/Zielgruppen bleiben erhalten
   und werden als `needs_review` gemeldet, aber nicht automatisch veröffentlicht. Weitere Gruppen
   werden additiv über die zentrale `Audience[]`-/Angebotsmatrix ergänzt, nicht durch Sonderlogik.
4. ~~Wie viel Verzögerung beim Belegungsstatus ist akzeptabel...~~ **Geklärt:** Auf `/kurse`
   existiert bereits echte Buchungslogik; der aktuelle 300-Sekunden-Cache vermischt Katalogdaten
   und Teilnehmerzahl. Abschnitt 7 trennt das verbindlich: stabile Kursdaten über `use cache`,
   `cacheLife` und `cacheTag`; Verfügbarkeit ungecacht über `connection()` unter `Suspense`.
   Server Actions verwenden `updateTag()` für Katalogänderungen und `refresh()` nach Anmeldungen.
   Eine weitere Ausführungsentscheidung zur Cache-Strategie ist nicht mehr offen.
5. **Sprachen:** Für diese Migration ist Deutsch-only mit `locales: ['de']` festgelegt. Der
   EN-Schalter bleibt ausgeblendet. Public-only i18n, das Aktivierungsgate für Englisch und die
   Anforderungen an übersetzte DB-Inhalte sowie `<html lang>` stehen verbindlich in Abschnitt 8.
6. ~~Wohin führt der Nav-/Service-Link „Simulationsprüfung"~~ **Geklärt:** eigene
   Landingpage mit Auswahl zwischen 6. Klasse und 2./3. Sek (analog `KlassenPicker`, nur 2
   Optionen statt 5), nicht direkt eine der beiden `AddOnCourses`-Routen. Grund: löst gleichzeitig
   die Copy-Inkonsistenz „Ergänzend zu jeder Klassenstufe" in Abschnitt 3 (`ServiceCard`).
7. ~~Für „Lerncoaching", „Distance Learning", „Tipps" und „Über uns" liegt noch kein Mockup vor~~
   **Geklärt:** Alle vier sowie Nachhilfe besitzen echte Mockups. Nur Kontakt bleibt als allgemeine
   Marketing-Platzhalterseite. Das BMS-Selbststudium besitzt jetzt mit
   `Layout_BMS_Selbststudium_Unterseite.html` ein vollständiges Mockup. Die BMS-Kurs-Unterseite
   ist verbindlich `Layout_BMS_Intensivkurs_Unterseite.html`.
8. ~~Die Startseite definiert keine Mobile-Navigation...~~ **Geklärt:** shadcn `Sheet`
   (Hamburger-Drawer) unterhalb des Breakpoints, flache Direktlinks darüber — beide aus derselben
   `Audience[]`-Datenquelle. Siehe Abschnitt 1b und die aktualisierte `SiteNav`-Zeile in
   Abschnitt 3.

**Hinweis für die Implementierung:** `Startseite.html` **ersetzt** die bestehende
Startseite vollständig, sie wird nicht ergänzt. Der aktuelle Bestand ist bekannt:
`app/page.tsx` nutzt `app/components/zap/navbar.tsx` mit Mobile-Menü und Login-CTA. Die aktualisierte
HTML-Referenz definiert dagegen die verbindliche flache Zielgruppen-Navigation ohne Dropdown.
Schritt 1 des Ausführungsplans validiert diesen Snapshot
nur noch auf zwischenzeitlichen Drift; Schritt 7 entscheidet explizit, welche Interaktionslogik
wiederverwendet und welches Markup ersetzt wird.

---

## 10. Verbindliches Verifikations-Gate

Die Migration gilt erst als abgeschlossen, wenn **jeder** unten genannte Befehl mit Exit-Code 0
endet. Warnungen oder Fehler dürfen nicht durch `|| true`, deaktivierte ESLint-Regeln,
`typescript.ignoreBuildErrors`, ausgelassene Tests oder manuell behauptete Sichtprüfungen
umgangen werden.

### 10.1 Einmalig anzulegende Test-Infrastruktur

- `package.json` erhält die Scripts `typecheck: "tsc --noEmit"`,
  `test:routes: "playwright test tests/routes.spec.ts"` und
  `test:links: "playwright test tests/links.spec.ts"`, ausserdem `build:test`, `start:test` und
  `test:data-migration`. Die letzten drei laufen über `scripts/with-local-supabase.mjs`; dieses
  Skript liest die lokale CLI-Konfiguration, akzeptiert nur Loopback-URLs, setzt URL/Anon-/
  Service-Role-Werte explizit für den Kindprozess und bricht ab, wenn eine Remote-URL oder ein
  erforderlicher lokaler Wert fehlt.
- `@playwright/test` und `supabase` werden als exakt versionierte Dev-Dependencies aufgenommen und
  über `package-lock.json` fixiert; das Gate verwendet `npm exec -- ...`, nie ein unversioniertes
  `npx ...@latest`. Ein Docker-kompatibler Container-Runtime ist dokumentierte Voraussetzung.
  `playwright.config.ts` startet über `webServer.command: "npm run start:test"` den zuvor mit
  `npm run build:test` gebauten Produktionsserver und verwendet
  `http://127.0.0.1:3000` als `baseURL`.
- `tests/routes.spec.ts` enthält eine explizite Routentabelle für alle öffentlichen DE-Seiten,
  `/kurse`, Auth-Seiten und geschützten Bestandsrouten. Redirects werden mit Status und
  `Location` geprüft, nicht nur durch den final sichtbaren Seitentitel. Dieselbe Suite enthält
  Cache-Regressionstests: Eine Kurs-/Preisänderung ist nach der Server Action und `updateTag()`
  unmittelbar sichtbar; eine Testanmeldung aktualisiert Teilnehmerzahl/Status nach `refresh()`
  unmittelbar und nicht erst nach 300 Sekunden. Ein aktiver eindeutig gemappter Bestandskurs muss
  sowohl auf `/kurse` als auch in `ExistingCourseSection` der passenden Klassenroute erscheinen;
  beide Buchungswege senden dieselbe numerische `kurs_id`.
- `tests/links.spec.ts` crawlt alle gerenderten öffentlichen Seiten in Desktop- und Mobile-
  Viewport, sammelt interne `href`s und schlägt bei `#`, `.html`-Zielen, 4xx/5xx, falschem
  Locale-Präfix oder nicht erlaubten lokalisierten Auth-Links fehl. Bewusst unlokalisierte Ziele
  wie `/login`, `/register` und bis zur Ablösung `/kurse` werden als explizite Ausnahmen geführt.
- Da `supabase/config.toml` im Bestand fehlt, wird die lokale CLI-Konfiguration einmalig mit
  der lokal fixierten CLI (`npm exec -- supabase init`) angelegt. `supabase/seed.sql` enthält nur
  synthetische lokale Fixtures; `006_seed_test_data.sql` und Auth-Testnutzer werden aus der
  deploybaren Migrationskette entfernt. Unter `supabase/tests/database/` werden pgTAP-Tests für Migrationen
  und RLS ergänzt. Sie prüfen mindestens: anonymes Lesen nur aktiver Kurse, erlaubte anonyme
  Anmeldung, verbotenes anonymes Lesen/Ändern von Anmeldungen, erlaubte Owner-Mutation des eigenen
  Kurses, verbotene Mutation eines fremden Kurses sowie erlaubte Admin-Zugriffe. Sie prüfen auch
  die RLS-sichere View, die korrekt als Demo oder Bestand klassifizierten lokalen Kurs-Fixtures,
  alle vier Fach-Mappings,
  `needs_review` für unbekannte Klassenlabels, unveränderte Kurs-/Anmeldungs-FKs sowie identische
  Belegung in View und allen Mappern: stornierte Anmeldungen zählen nicht, 1–2 Restplätze ergeben
  `wenige`, 0 ergibt `voll`. Die Suite prüft zusätzlich die realen Rollenwerte `lehrperson`,
  `admin`, `user`, die atomare Buchungsfunktion, Doppelanmeldung und zwei parallele Buchungen auf
  den letzten Platz. Tests verwenden ausschliesslich lokale Testdaten.
- `scripts/test-data-migration.mjs` erstellt in einer isolierten lokalen Testdatenbank zuerst den
  unmittelbar vorherigen Schema-Zustand, fügt Sentinel-Kurs und -Anmeldung ein, wendet danach nur
  die neue additive Migration an und vergleicht IDs, FKs, Status und Counts. Es darf nicht bloss
  einen Reset des bereits fertigen Schemas testen.
- Für Routentests werden dedizierte lokale Werte `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`,
  `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` und stabile Fixture-IDs verwendet. Sie entstehen beim
  lokalen Seed, werden über eine nicht eingecheckte `.env.test.local` referenziert und nach dem
  Lauf durch Reset verworfen. Kein Test darf echte Kundendaten oder Remote-Zugangsdaten verwenden.

### 10.2 Befehle bei jeder vollständigen Verifikation

```powershell
npm ci
npm exec -- supabase start
npm exec -- supabase db reset --local
npm exec -- supabase db lint --local --fail-on error
npm exec -- supabase test db --local
npm run test:data-migration
npm run typecheck
npm run lint
npm run build:test
npm exec -- playwright install chromium
npm run test:routes
npm run test:links
```

Dies sind verbindlich **zwölf Befehle**. Jeder endet mit Exit-Code 0; beim ersten Fehler wird
abgebrochen und nach der Korrektur die vollständige Sequenz erneut ab Befehl 1 ausgeführt.
`supabase db reset --local` muss sämtliche Migrationen auf einer leeren lokalen Datenbank in
Reihenfolge anwenden. `supabase db lint --local --fail-on error` prüft danach das resultierende
Schema; `supabase test db --local` führt die pgTAP-/RLS-Suite aus. In diesem Gate sind
`--linked`, `db push` und jede andere Mutation eines entfernten Supabase-Projekts verboten.
`build:test`, `start:test`, Routen- und Linktests müssen über denselben Local-only-Wrapper laufen.
Die Sentinel-Prüfung wird ausschliesslich durch `npm run test:data-migration` erfüllt. Ohne
identischen Vorher-Nachher-Bestand ist das Gate nicht bestanden.

### 10.3 Verbindliche Redirect- und Routenerwartungen

- Anonym: `/login` und `/register` sind erreichbar; alle geschützten Routen werden auf
  `/login?callbackUrl=<ursprünglicher Pfad>` umgeleitet.
- Authentifiziert: `/login` und `/register` führen nach `/dashboard`; geschützte Routen bleiben
  erreichbar und behalten ihren unlokalisierten Pfad.
- Lernpersonen: `/arbeitszeiten` ist nur für kanonische Lernpersonen-/Adminrollen erreichbar und
  liefert ausschliesslich eigene Zeiteinträge. `/dashboard/arbeitszeiten` und
  `/dashboard/finanzen` bleiben Admin-only; Schüler, Eltern und gewöhnliche Benutzer erhalten 403.
- Öffentlich: alle aktivierten `/{locale}/...`-Routen liefern Erfolg, die Root-Weiterleitung folgt
  exakt der next-intl-Konfiguration und `/kurse` bleibt bis zur ausdrücklich beschlossenen
  Ablösung erreichbar.
- `/api`, `/_next` und statische Assets werden nicht lokalisiert und nicht vom Marketing-Redirect
  abgefangen.
- Der `SiteNav`-Login-Link lautet in jedem Locale exakt `/login`, nie `/{locale}/login`.

Die pgTAP-/RLS-Suite umfasst zusätzlich Arbeitszeit-, Payroll- und Finanzregeln aus Abschnitt
2.14/2.15: eigene gegenüber fremden Einträgen, Statusübergänge/Periodensperre, unveränderliche
Snapshots, idempotente Finanzereignisse sowie rechnerische Abstimmung von Teilnehmer-, Umsatz-,
Kosten-, Deckungsbeitrags- und Jahreswerten.

Der Abschlussbericht listet jeden Befehl, Exit-Code und die Zahl der ausgeführten Route-, Link-
und Datenbanktests auf. Ein fehlender Befehl oder ein übersprungener Test bedeutet: Verifikation
nicht bestanden.
