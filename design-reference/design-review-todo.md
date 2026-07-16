# Design-Review: To-do für Layout-Seiten

Basiert auf einer Analyse aller 37 Dateien in `design-reference/` (Farbkontrast, Typografie-Skala, Bildnutzung). Stand: 16.07.2026.

## Priorität 1 — Barrierefreiheit & Konsistenz-Bugs

- [x] **Gold-Text-Kontrast beheben.** `.sequence b.goal` nutzte `color:var(--gold)` (`#C89B3C`) auf Papier-Hintergrund → nur 2,36:1 Kontrast. Auf `#7A5A1D` geändert (5,85:1 auf Papier).
  - Betroffene Dateien: `Layout_2_Sek__Hauptseite.html`, `Layout_6_Klasse_Hauptseite.html`
- [x] **Fit-Tag- & alle weiteren Gold-Akzent-Badges gefixt.** Alle Vorkommen von `#9c7a2c` (Fit-Tags, Addon-Tags, Mini-Split-Labels, Picker-Hover-States usw.) systemweit auf `#7A5A1D` geändert (5,23:1 auf `--gold-pale`, 6,35:1 als Weiss-auf-Hintergrund-Variante) — betraf 31 Dateien, 85 Textstellen.
- [x] **Startseiten-H1 vergrössert.** Von `clamp(24px,3vw,29px)` auf `clamp(28px,4vw,40px)` angeglichen an andere Hero-Seiten.
  - Datei: `Startseite.html`
- [x] **Prüfungssimulations-iframe-Wrapper ans Corporate Design angepasst.** Äusserer Hintergrund von generischem Hell/Dunkel-Schema auf `--paper` (`#F5F6F1`) geändert, Nav-Schrift von Arial auf Inter, iframe mit Karten-Schatten versehen. Das eingebettete Tool selbst (im `srcdoc`-iframe, eigene CSP) wurde bewusst nicht angetastet.
  - Dateien: `Layout_2_Sek_Pruefungssimulation.html`, `Layout_6_Klasse_Pruefungssimulation.html`

## Priorität 2 — Vertrauen & Konversion (Fotos)

- [x] **Team-Sektion mit Bildslots ausgestattet.** `.team-mark`-Kreise sind jetzt echte `<img>`-Elemente (mit `object-fit:cover`) statt reiner Text-Initialen. Aktuell mit generierten Platzhalter-Avataren befüllt — Pfad einfach durch echtes Foto ersetzen (`<!-- TODO -->`-Kommentar markiert die Stelle im Code).
  - Datei: `Layout_UeberUns_Seite.html`
- [x] **Testimonial mit Avatar-Bildslot ergänzt.** Grosses Anführungszeichen durch echten `<img>`-Avatar ersetzt (Platzhalter, TODO-Kommentar für echtes freigegebenes Foto).
  - Datei: `Startseite.html`
- [ ] **Optional: Vertrauensbild im Hero.** Noch offen — ein Foto von Kursraum/Kleingruppe neben oder über dem Klassen-Picker prüfen, nur wenn es die Klarheit des Pickers nicht beeinträchtigt.
  - Datei: `Startseite.html`

## Priorität 3 — Politur / Nice-to-have

- [x] **Admin-Sidebar-Icons ersetzt.** Alle 8 Unicode-Zeichen (▦ ◫ ◷ ◴ ◈ ▤ ▣ ◎) durch ein konsistentes Inline-SVG-Icon-Set (16×16, `currentColor`, feather-style) ersetzt — erbt automatisch Hover-/Active-Farben aus dem bestehenden CSS.
  - Dateien: alle 4 `Layout_Admin_*.html`
- [ ] **Body-Padding-Muster vereinheitlichen.** Einzelne Seiten weichen vom Standard `padding:64px 28px` ab (z. B. `Layout_1_Sek_Hauptseite.html` mit `24px 26px 26px`). Kurz prüfen, ob das beabsichtigt ist oder vereinheitlicht werden soll.

## Navigation — nachträglich ergänzt (nicht in der ursprünglichen Analyse)

- [x] **Kompakte Hauptnavigation + Breadcrumb auf allen 26 Seiten ohne Vollnav ergänzt.** Betroffen waren alle Kurs-Detailseiten, Klassenstufen-Übersichten und beide Prüfungssimulations-Wrapper, die zuvor nur einen "← Zurück"-Link hatten. Bewusst schlanker gehalten als die ursprüngliche Vollnavigation (siehe Diskussion): Logo + Klassenstufen-Dropdown + BMS + Matura + Nachhilfe + Über uns + Kontakt — ohne EN, Login und redundanten "Startseite"-Link (Logo + Breadcrumb decken das bereits ab). Das bislang ungenutzte Dropdown-CSS wird jetzt aktiv für die Klassenstufen-Gruppierung genutzt. Arial-Font-Inkonsistenz (13 Dateien) ist damit miterledigt.
  - Beide Prüfungssimulations-Dateien (`Layout_2_Sek_Pruefungssimulation.html`, `Layout_6_Klasse_Pruefungssimulation.html`) fehlten die Marken-CSS-Variablen im `:root` — beim Ergänzen der Navigation mit nachgezogen, sonst wäre die Nav dort unstyled geblieben.
  - Skip-Link ("Zum Inhalt springen") auf allen 26 Seiten ergänzt.

## Bewusst so belassen (Stärken erhalten)

- Schriftsystem Fraunces (Headlines) / Inter (Fliesstext) / IBM Plex Mono (Labels) — konsistent und hochwertig.
- Grundpalette Navy/Sage/Gold/Papier — stimmig, keine Änderung nötig.
- Gradient-Kachelköpfe der Kursseiten ohne Fotos — bewusst zeitlos, sollte so bleiben (keine Stock-Fotos hinzufügen).
