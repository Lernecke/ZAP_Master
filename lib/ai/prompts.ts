interface RubricCriterion {
  id: string
  name: string
  max_points?: number
  description: string
}

interface StructuredRubric {
  criteria: RubricCriterion[]
}

export function formatStructuredRubric(criteria: StructuredRubric): string {
  return criteria.criteria
    .map((c, i) => {
      const points = c.max_points ? ` (max. ${c.max_points} Punkte)` : ''
      return `${i + 1}. **${c.name}**${points}\n   ${c.description}`
    })
    .join('\n\n')
}

const MARKDOWN_FORMAT_EXAMPLE = `
## Beispiel für korrekte Markdown-Formatierung deiner Antwort:

\`\`\`markdown
# Korrekturvorschlag: [Titel des Aufsatzes]

---

## Gesamtbeurteilung

[2–3 Sätze zur Gesamteinschätzung.]

---

## Bewertung nach Kriterien

### 1. [Kriteriumsname] *(max. X Punkte)*

**Vorgeschlagene Punktzahl: X / Y**

**Was gut ist:** [Konkretes Lob mit Textstelle aus dem Aufsatz in Anführungszeichen «...»]

**Was verbessert werden sollte:** [Konkreter, handlungsorientierter Hinweis]

---

### 2. [Nächstes Kriterium] *(max. X Punkte)*

**Vorgeschlagene Punktzahl: X / Y**

**Was gut ist:** ...

**Was verbessert werden sollte:** ...

---

## Stärken

- **[Stärke 1]:** [Beschreibung mit Textstelle «...»]
- **[Stärke 2]:** [Beschreibung]
- **[Stärke 3]:** [Beschreibung]

---

## Verbesserungspotenzial

- **[Bereich 1]:** [Konstruktiver Hinweis, z. B. «Versuche, ...»]
- **[Bereich 2]:** [Konstruktiver Hinweis]

---

## Empfohlene Note

**Note: X / 6**

[Begründung in 1–2 Sätzen.]
\`\`\`

**Wichtige Markdown-Regeln:**
- Trenne jeden Abschnitt mit einer Leerzeile oben und unten
- Markdown-Tabellen brauchen zwingend eine Leerzeile davor und danach, und jede Zeile auf einer eigenen Zeile:

\`\`\`markdown
| Fehler im Text | Korrekte Schreibweise |
|---|---|
| *falschesWort* | richtiges Wort |
| *nochEinFehler* | korrekter Begriff |
\`\`\`

- Zitiere Textstellen aus dem Aufsatz immer mit Guillemets: «zitierter Text»
- Verwende **fett** nur für Schlüsselbegriffe und Labels wie **Was gut ist:**
- Schreibe die Antwort vollständig – brich niemals mitten in einem Abschnitt ab
`

export function buildCorrectionPrompt(params: {
  essayText: string
  rubricContent: string
  rubricType: 'pdf' | 'structured'
  essayTitle: string
  subject: string
  classLevel?: string | null
}): string {
  const { essayText, rubricContent, essayTitle, subject, classLevel } = params

  return `Du bist ein erfahrener Schweizer Primarschullehrer. Du korrigierst einen Schüleraufsatz und erstellst einen vollständigen, strukturierten Korrekturvorschlag auf Deutsch im Markdown-Format.

## Informationen zum Aufsatz
- **Titel:** ${essayTitle}
- **Fach:** ${subject}
- **Klassenstufe:** ${classLevel ?? 'nicht angegeben'}

## Bewertungsraster
${rubricContent}

## Aufsatz-Text
${essayText}

---

## Deine Aufgabe

Analysiere den Aufsatz sorgfältig anhand des Bewertungsrasters. Erstelle einen vollständigen Korrekturvorschlag. Gehe dabei jeden Abschnitt vollständig durch – brich die Antwort nicht vorzeitig ab.

${MARKDOWN_FORMAT_EXAMPLE}

Halte dich exakt an diese Struktur:

1. **Titel** mit \`# Korrekturvorschlag: \${essayTitle}\`
2. **Gesamtbeurteilung** – ehrliche, ermutigende Einschätzung in 2–3 Sätzen
3. **Bewertung nach Kriterien** – für **jedes Kriterium** im Bewertungsraster: Punktzahl, Was gut ist, Was verbessert werden sollte
4. **Stärken** – 2–4 konkrete Stärken mit Textstellen
5. **Verbesserungspotenzial** – 2–4 konstruktive, handlungsorientierte Hinweise
6. **Empfohlene Note** – Schweizer Skala 1–6 mit Begründung

Schreibe so, dass ein Schüler der Klassenstufe ${classLevel ?? 'der angegebenen Stufe'} das Feedback versteht. Sei fair, präzise und ermutigend. Vervollständige immer alle Abschnitte.`
}

export const QUICK_CRITERIA_OPTIONS = [
  { id: 'grammatik', label: 'Grammatik' },
  { id: 'zeichensetzung', label: 'Zeichensetzung / Kommasetzung' },
  { id: 'rechtschreibung', label: 'Rechtschreibung' },
  { id: 'stil', label: 'Stil und Ausdruck' },
  { id: 'aufbau', label: 'Aufbau und Struktur' },
  { id: 'inhalt', label: 'Inhalt und Vollständigkeit' },
  { id: 'wortschatz', label: 'Wortschatz' },
]

export function buildMathStepsPrompt(question: string, solution: string, formula?: string): { system: string; user: string } {
  const aufgabe = formula ? `${question}\n\nGleichung: ${formula}` : question

  return {
    system: `Du bist ein Mathematiklehrer an einer Schweizer Primarschule. Deine Aufgabe ist es, den vollständigen Lösungsweg für eine Mathematikaufgabe Schritt für Schritt zu erklären.

Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Array. Kein Markdown, keine Erklärungen, kein Text vor oder nach dem JSON.

Format:
[
  {
    "step_number": 1,
    "explanation": "Erklärung auf Deutsch",
    "formula": "LaTeX-Formel (optional, nur wenn nötig)"
  }
]

Regeln:
- Zeige den echten Rechenweg: Umformungen, Vereinfachungen, Auflösung nach der Unbekannten
- Jeder Schritt erklärt EINEN klar abgegrenzten Rechenschritt
- Erklärungen auf Deutsch, verständlich für Primarschüler
- "formula" nur angeben wenn eine Formel den Schritt verdeutlicht (LaTeX, ohne $-Zeichen)
- 3–6 Schritte je nach Komplexität
- Das "formula"-Feld weglassen wenn kein LaTeX nötig ist
- NIEMALS einfach die Lösung nennen ohne den Rechenweg zu zeigen`,
    user: `Aufgabe: ${aufgabe}
Korrekte Lösung: ${solution}

Zeige den vollständigen Lösungsweg als JSON-Array.`,
  }
}

export function buildQuickCorrectionPrompt(params: {
  essayText: string
  criteria: string[]
  essayTitle: string
  subject: string
  classLevel?: string | null
}): string {
  const { essayText, criteria, essayTitle, subject, classLevel } = params

  const criteriaList = criteria.length > 0
    ? criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '1. Grammatik\n2. Rechtschreibung\n3. Zeichensetzung\n4. Stil und Ausdruck\n5. Aufbau und Struktur\n6. Inhalt'

  return `Du bist ein erfahrener Schweizer Primarschullehrer. Du korrigierst einen Schüleraufsatz und erstellst einen vollständigen, strukturierten Korrekturvorschlag auf Deutsch im Markdown-Format.

## Informationen zum Aufsatz
- **Titel:** ${essayTitle}
- **Fach:** ${subject}
- **Klassenstufe:** ${classLevel ?? 'nicht angegeben'}

## Zu prüfende Kriterien
${criteriaList}

## Aufsatz-Text
${essayText}

---

## Deine Aufgabe

Analysiere den Aufsatz anhand der oben genannten Kriterien. Erstelle einen vollständigen Korrekturvorschlag – brich die Antwort nicht vorzeitig ab.

${MARKDOWN_FORMAT_EXAMPLE}

Halte dich exakt an diese Struktur:

1. **Titel** mit \`# Korrekturvorschlag: ${essayTitle}\`
2. **Gesamtbeurteilung** – ehrliche, ermutigende Einschätzung in 2–3 Sätzen
3. **Bewertung nach Kriterien** – für **jedes der oben genannten Kriterien** einen eigenen Unterabschnitt mit: Einschätzung, Textstellen als Belege, konkreter Verbesserungshinweis
4. **Stärken** – 2–4 konkrete Stärken mit Textstellen aus dem Aufsatz
5. **Verbesserungspotenzial** – 2–4 konstruktive, handlungsorientierte Hinweise
6. **Empfohlene Note** – Schweizer Skala 1–6 mit Begründung

Schreibe so, dass ein Schüler der Klassenstufe ${classLevel ?? 'der angegebenen Stufe'} das Feedback versteht. Sei fair, präzise und ermutigend. Vervollständige immer alle Abschnitte.`
}
