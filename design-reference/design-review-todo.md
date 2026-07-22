# Design-Review: To-do für Layout-Seiten

Basiert auf einer Analyse aller 37 HTML-Referenzdateien in `design-reference/` (Farbkontrast,
Typografie-Skala, Bildnutzung). Technische Integrität erneut geprüft am 18.07.2026.

Dieses Dokument bewertet ausschliesslich Design- und Referenzintegrität. Ein vollständig
abgehakter Design-Review ist **keine Datenbank-Migrationsfreigabe**: Der Live-Strukturabgleich vom
18.07.2026 weist erst 5 von 27 Zieltabellen als vorhanden aus. Die verbindliche Soll-/Ist-Matrix,
die 22 noch anzulegenden Tabellen und das Baseline-Gate stehen in `datenmodell-review.md`,
`architektur-briefing-kursseiten.md` und `claude-code-ausfuehrungsplan.md`.

## Priorität 1 — Barrierefreiheit & Konsistenz-Bugs

- [x] **Gold-Text-Kontrast beheben.** `.sequence b.goal` nutzte `color:var(--gold)` (`#C89B3C`) auf Papier-Hintergrund → nur 2,36:1 Kontrast. Auf `#7A5A1D` geändert (5,85:1 auf Papier).
  - Betroffene Dateien: `Layout_2_Sek__Hauptseite.html`, `Layout_6_Klasse_Hauptseite.html`
- [x] **Fit-Tag- & alle weiteren Gold-Akzent-Badges gefixt.** Alle Vorkommen von `#9c7a2c` (Fit-Tags, Addon-Tags, Mini-Split-Labels, Picker-Hover-States usw.) systemweit auf `#7A5A1D` geändert (5,23:1 auf `--gold-pale`, 6,35:1 als Weiss-auf-Hintergrund-Variante) — betraf 31 Dateien, 85 Textstellen.
- [x] **Startseiten-H1 vergrössert.** Von `clamp(24px,3vw,29px)` auf `clamp(28px,4vw,40px)` angeglichen an andere Hero-Seiten.
  - Datei: `Startseite.html`
- [x] **Prüfungssimulations-iframe-Wrapper ans Corporate Design angepasst.** Äusserer Hintergrund von generischem Hell/Dunkel-Schema auf `--paper` (`#F5F6F1`) geändert, Nav-Schrift von Arial auf Inter, iframe mit Karten-Schatten versehen. Das eingebettete Tool selbst (im `srcdoc`-iframe, eigene CSP) wurde bewusst nicht angetastet.
  - Dateien: `Layout_2_Sek_Pruefungssimulation.html`, `Layout_6_Klasse_Pruefungssimulation.html`
- [x] **Dateiintegrität bereinigt.** Je fünf versehentlich angehängte NUL-Bytes entfernt; beide
  Dateien sind wieder reguläre UTF-8-Textdateien und werden von Such-/Migrationstools nicht mehr
  als Binärdateien behandelt.
  - Dateien: `Layout_2_Sek__Hauptseite.html`, `Layout_6_Klasse_Hauptseite.html`

## Priorität 2 — Vertrauen & Konversion (Fotos)

- [x] **Team-Sektion mit Bildslots ausgestattet.** `.team-mark`-Kreise sind jetzt echte `<img>`-Elemente (mit `object-fit:cover`) statt reiner Text-Initialen. Aktuell mit generierten Platzhalter-Avataren befüllt — Pfad einfach durch echtes Foto ersetzen (`<!-- TODO -->`-Kommentar markiert die Stelle im Code).
  - Datei: `Layout_UeberUns_Seite.html`
- [x] **Testimonial mit Avatar-Bildslot ergänzt.** Grosses Anführungszeichen durch echten `<img>`-Avatar ersetzt (Platzhalter, TODO-Kommentar für echtes freigegebenes Foto).
  - Datei: `Startseite.html`
- [x] **Vertrauensbild im Hero bewusst verworfen.** Der Klassen-Picker bleibt die primäre
  Interaktion; ein zusätzliches Foto würde die klare Auswahlhierarchie schwächen. Vertrauen wird
  über den freigegebenen Testimonial-/Team-Bereich aufgebaut. Keine Stock-Fotos ergänzen.
  - Datei: `Startseite.html`

## Priorität 3 — Politur / Nice-to-have

- [x] **Admin-Sidebar-Icons ersetzt.** Alle 8 Unicode-Zeichen (▦ ◫ ◷ ◴ ◈ ▤ ▣ ◎) durch ein konsistentes Inline-SVG-Icon-Set (16×16, `currentColor`, feather-style) ersetzt — erbt automatisch Hover-/Active-Farben aus dem bestehenden CSS.
  - Dateien: alle 4 `Layout_Admin_*.html`
- [x] **Body-Padding-Entscheidung getroffen.** Die statischen Prototypen behalten ihre
  seitenbezogenen Abstände für die visuelle Referenz. In Next.js werden sie nicht kopiert;
  `PageContainer`/`Section` aus dem Architektur-Briefing sind die einzige produktive
  Spacing-Quelle. Dadurch entsteht keine seitenweise Padding-Drift.

## Navigation — nachträglich ergänzt (nicht in der ursprünglichen Analyse)

- [x] **Kompakte Hauptnavigation + Breadcrumb auf allen 26 Seiten ohne Vollnav ergänzt.** Betroffen waren alle Kurs-Detailseiten, Klassenstufen-Übersichten und beide Prüfungssimulations-Wrapper, die zuvor nur einen "← Zurück"-Link hatten. Bewusst schlanker gehalten als die ursprüngliche Vollnavigation (siehe Diskussion): Logo + Klassenstufen-Dropdown + BMS + Matura + Nachhilfe + Über uns + Kontakt — ohne EN, Login und redundanten "Startseite"-Link (Logo + Breadcrumb decken das bereits ab). Das bislang ungenutzte Dropdown-CSS wird jetzt aktiv für die Klassenstufen-Gruppierung genutzt. Arial-Font-Inkonsistenz (13 Dateien) ist damit miterledigt.
  - Beide Prüfungssimulations-Dateien (`Layout_2_Sek_Pruefungssimulation.html`, `Layout_6_Klasse_Pruefungssimulation.html`) fehlten die Marken-CSS-Variablen im `:root` — beim Ergänzen der Navigation mit nachgezogen, sonst wäre die Nav dort unstyled geblieben.
  - Skip-Link ("Zum Inhalt springen") auf allen 26 Seiten ergänzt.
  - **Abgrenzung zur Migration:** Diese kompakte Dropdown-Navigation bleibt eine Hilfe für die klickbaren HTML-Prototypen und wird nicht als produktive Komponente übernommen. Die spätere zentrale `SiteNav` verwendet auf Desktop flache Direktlinks zu allen sieben Zielgruppen sowie Nachhilfe, Über uns und Kontakt, einen separaten Login-CTA und mobil dieselben Ziele im `Sheet`; beim Deutsch-only-Launch ohne EN-Schalter. Verbindliche Details: Abschnitt 1b des Architektur-Briefings.

## Inhaltskonsistenz — nachträglich bereinigt

- [x] **Intensivkurs-Unterseiten korrekt beschriftet.** Sechs aus Halbjahreskurs-Vorlagen kopierte `<title>`-/H1-Texte sowie die Breadcrumb-Endpunkte an die verbindlichen Anzeigenamen der Hauptseiten angeglichen: „Lerncamp – Sportferien“ für 1. Sek und 4./5. Klasse, „Intensivkurs-Sportferien“ für 2./3. Sek, 6. Klasse und BMS. Das fehlerhafte „Deutsch @ Mathematik“ wurde dabei zu „Deutsch & Mathematik“ korrigiert.
  - Dateien: `Layout_1_Sek_Intensivkurs_Unterseite.html`, `Layout_2_Sek_Intensivkurs_Unterseite.html`, `Layout_4_Klasse_Intensivkurs_Unterseite.html`, `Layout_5_Klasse_Intensivkurs_Unterseite.html`, `Layout_6_Klasse_Intensivkurs_Unterseite.html`, `Layout_BMS_Intensivkurs_Unterseite.html`
- [x] **Kursstandorte auf zwei verbindliche Werte reduziert.** Alle Terminlisten, Übersichtsangaben und Prüfungssimulations-Termine verwenden nur noch `Zürich HB` oder `Winterthur`. `Stadelhofen`, unscharfes `Zürich` in Terminzeilen und `online` als Standort wurden entfernt; Online-Teilnahme bleibt eine separate Durchführungsform. Die Admin-Kursangebotsmaske bietet statt Freitext nur noch diese zwei Standortoptionen.

## Redaktionelle Publikationsblocker

Diese Punkte verhindern nicht den technischen Aufbau der späteren Seiten. Bis zur dokumentierten
Freigabe bleibt jeweils nur das betroffene Angebot, Inhaltsfragment oder CTA unveröffentlicht,
ausgeblendet oder nicht buchbar. Verbindliche Regeln und Fallbacks: Architektur-Briefing,
Abschnitt 9.1.

- [ ] **Widersprüchliche Kurspreise fachlich freigeben.** Je Angebot genau einen numerischen Wert samt Quelle bestätigen; insbesondere die in Abschnitt 2.3 des Architektur-Briefings dokumentierten Abweichungen. Bis dahin keine produktive Preis-/Buchungsfreigabe.
- [x] **BMS-Halbjahreskurs entschieden: Detailinhalt liefern.** Bestätigt am 22.07.2026. Curriculum (Kursaufbau, Mathematik/Deutsch/Mentale-Vorbereitung) ausdrücklich identisch mit dem 2./3.-Sek-Halbjahreskurs übernommen (`bmsHalbjahreskurs` in `types/marketing.fixtures.ts`), Tagline/Beschreibung/Leistungen/Preis stammen aus der bereits vorhandenen, zuvor falsch verlinkten Hauptseiten-Karte. `/kurse/bms/halbjahreskurs` jetzt im Katalog (`lib/kurse/offer-catalog.ts`). Sessions bleiben leer (keine echten BMS-Termine bestätigt). Der Preis unterliegt weiterhin der noch offenen generellen Preis-Freigabe oben.
- [ ] **Kontaktinhalt freigeben.** Mindestens echte Kontaktkanäle und einen freigegebenen Kurztext für `/kontakt` bereitstellen. Ein Kontaktformular oder Terminbuchungsflow ist für die erste Veröffentlichung optional.
- [x] **Über-uns-Kennzahlen entschieden: weglassen.** Bestätigt am 22.07.2026. Die migrierte `/ueber-uns`-Seite (`aboutPageModel` in `types/marketing.fixtures.ts`) enthält bereits keine Zahlensektion -- die Platzhalterzahlen aus `Layout_UeberUns_Seite.html` wurden beim Seitenbau nie übernommen. Kein Code-Änderung nötig, nur dieser Punkt nachträglich abgehakt.
- [ ] **Team- und Testimonial-Bilder freigeben.** Echte Assets nur mit geklärten Nutzungs-/Einwilligungsrechten und passenden Alternativtexten einsetzen. Generierte Initialen-Avatare nicht als echte Personenfotos darstellen.
- [ ] **Selbststudium-Zugang Ende-zu-Ende freigeben.** Checkout, Grant, Login-Rückleitung, Materialzugriff, Ablauf und Entzug/Rückerstattung testen; bis dahin keinen aktiven „Zugang erhalten“-Link anzeigen.
- [ ] **Nachhilfe-Abo-Ziel freigeben.** Realen Checkout oder ausdrücklich bestätigten Kontaktflow testen; bis dahin keinen aktiven „Abo buchen“-Link anzeigen.
- [ ] **Impressum und Datenschutz freigeben.** Fachlich geprüfte Texte und Verantwortlichkeiten
  liefern; bis dahin kein öffentlicher Cutover. Technische Routen und `LegalPageModel` sind im
  Architektur-Briefing verbindlich eingeplant.

## Bewusst so belassen (Stärken erhalten)

- Schriftsystem Fraunces (Headlines) / Inter (Fliesstext) / IBM Plex Mono (Labels) — konsistent und hochwertig.
- Grundpalette Navy/Sage/Gold/Papier — stimmig, keine Änderung nötig.
- Gradient-Kachelköpfe der Kursseiten ohne Fotos — bewusst zeitlos, sollte so bleiben (keine Stock-Fotos hinzufügen).
