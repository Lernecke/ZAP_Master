import { ChevronDown } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

/**
 * SessionTable — generische, responsive & barrierefreie Buchungstabelle
 *
 * Aktualisiert auf shadcn/ui-Semantik (siehe Architektur-Briefing Abschnitt 1/1a):
 * keine eigenen Farbnamen (ink/sage/gold) mehr, sondern die semantischen Tailwind-Klassen
 * (bg-primary, bg-secondary, text-destructive, border-border, bg-muted …), plus shadcn
 * `Button` und `Badge` statt handgebauter <a>/<span>-Elemente.
 *
 * Ersetzt weiterhin das CSS-Only-Pattern (display:block + data-label + ::before) der
 * Original-Mockups, weil dieses den impliziten Table-Kontext für Screenreader auf Mobile
 * zerstören kann und attr(data-label) nicht überall vorgelesen wird.
 *
 * Ansatz: EINE Datenquelle (rows/columns), ZWEI Render-Pfade
 * (echte <table> ab md:, echte Card-Liste darunter). Beide liegen im DOM,
 * aber `hidden md:block` / `md:hidden` nutzt display:none — das nimmt
 * Elemente korrekt aus dem Accessibility-Tree, es gibt also keine
 * doppelte Vorlesung durch Screenreader.
 *
 * Deckt beide 4.-Klasse-Varianten ab:
 * - Intensivkurs (Spalten: Kurs, Datum, Zeit, Tagesplan, Standort, Status)
 * - Halbjahreskurs (Spalten: Kurs, Tag & Zeit, Ablauf, Standort, Status)
 * über die `columns`-Prop, ohne Codeänderung.
 */

export default function SessionTable({
  columns,
  rows,
  ariaLabel = "Kursübersicht und Buchung",
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Desktop / Tablet: echte Tabelle */}
      <table className="hidden md:table w-full border-collapse text-[13.5px]">
        <caption className="sr-only">{ariaLabel}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="border-t border-border px-2 py-3 text-left font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground first:border-t-0"
              >
                {col.label}
              </th>
            ))}
            <th scope="col" className="border-t-0 px-2 py-3">
              <span className="sr-only">Aktion</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={i % 2 === 1 ? "bg-muted/40" : undefined}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="border-t border-border px-2 py-[11px] align-top"
                >
                  {renderCell(row, col)}
                </td>
              ))}
              <td className="border-t border-border px-2 py-[11px] align-top">
                <BookingButton row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobil: Karten-Liste, eigenes Markup statt CSS-Table-Reset */}
      <ul className="md:hidden space-y-3 p-3" aria-label={ariaLabel}>
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-border bg-card p-4">
            <p className="font-serif text-[16.5px] font-semibold text-foreground mb-2">
              {row.kurs}
            </p>
            <dl className="space-y-2">
              {columns
                .filter((c) => c.key !== "kurs")
                .map((col) => (
                  <div key={col.key} className="border-t border-border pt-2">
                    <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                      {col.label}
                    </dt>
                    <dd>{renderCell(row, col)}</dd>
                  </div>
                ))}
            </dl>
            <div className="mt-3 pt-3 border-t border-border">
              <BookingButton row={row} block />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderCell(row, col) {
  if (col.key === "status") {
    return row.status === "frei" ? (
      <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary">
        freie Plätze
      </Badge>
    ) : (
      <Badge variant="destructive">keine Plätze</Badge>
    );
  }
  if (col.key === "ablauf" || col.key === "tagesplan") {
    return <SessionDetails items={row.ablauf} label={col.label} />;
  }
  return row[col.key];
}

// Natives <details>/<summary> beibehalten — das war im Original bereits
// eine gute, tastatur- und screenreader-zugängliche Wahl.
function SessionDetails({ items, label }) {
  return (
    <details className="group relative">
      <summary
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded border border-border px-3 py-2
                   font-mono text-[11.5px] text-muted-foreground whitespace-nowrap cursor-pointer
                   list-none marker:hidden
                   group-open:border-secondary group-open:text-secondary-foreground group-open:bg-secondary/10
                   hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2
                   focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {label}
        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
      </summary>
      <div
        className="absolute left-0 right-auto top-[calc(100%+6px)] z-10 min-w-[230px] w-max
                   rounded-md border border-border bg-card p-3 shadow-lg
                   max-md:left-auto max-md:right-0 max-md:w-full"
      >
        {items.map((it, idx) => (
          <div
            key={idx}
            className="flex justify-between gap-3.5 py-1 text-[12.5px] text-foreground whitespace-nowrap"
          >
            <span>{it.label}</span>
            {it.value && <strong className="font-semibold">{it.value}</strong>}
          </div>
        ))}
      </div>
    </details>
  );
}

function BookingButton({ row, block = false }) {
  if (row.status !== "frei") {
    return (
      <Button
        variant="outline"
        disabled
        aria-disabled="true"
        className={`min-h-[44px] px-4 text-[12.5px] font-semibold ${block ? "w-full" : ""}`}
      >
        Ausgebucht
      </Button>
    );
  }
  return (
    <Button
      asChild
      className={`min-h-[44px] px-4 text-[12.5px] font-semibold bg-primary text-primary-foreground hover:bg-secondary ${
        block ? "w-full" : ""
      }`}
    >
      <a href={row.href ?? "#"}>Anmelden</a>
    </Button>
  );
}

/* ---------------------------------------------------
   Beispiel-Nutzung mit den echten Daten aus den beiden
   4.-Klasse-Unterseiten, zur Veranschaulichung der API:
---------------------------------------------------- */

export const intensivkursColumns = [
  { key: "kurs", label: "Kurs" },
  { key: "datum", label: "Datum" },
  { key: "zeit", label: "Zeit" },
  { key: "tagesplan", label: "Tagesplan" },
  { key: "standort", label: "Standort" },
  { key: "status", label: "Status" },
];

export const intensivkursRows = [
  {
    id: "a",
    kurs: "Kurs A",
    datum: "08.–12. Feb.",
    zeit: "09.00–12.00",
    standort: "Zürich HB",
    status: "frei",
    ablauf: [
      { label: "Mo, 08. Feb.", value: "09.00–12.00" },
      { label: "Di, 09. Feb.", value: "09.00–12.00" },
      { label: "Mi, 10. Feb.", value: "09.00–12.00" },
      { label: "Do, 11. Feb.", value: "09.00–12.00" },
      { label: "Fr, 12. Feb. (Rückblick)", value: "09.00–12.00" },
    ],
  },
  {
    id: "c",
    kurs: "Kurs C",
    datum: "22.–26. Feb.",
    zeit: "09.00–12.00",
    standort: "Zürich HB",
    status: "voll",
    ablauf: [{ label: "Details wie Kurs A", value: "" }],
  },
];

export const halbjahreskursColumns = [
  { key: "kurs", label: "Kurs" },
  { key: "tagzeit", label: "Tag & Zeit" },
  { key: "ablauf", label: "Ablauf" },
  { key: "standort", label: "Standort" },
  { key: "status", label: "Status" },
];

export const halbjahreskursRows = [
  {
    id: "a",
    kurs: "Kurs A",
    tagzeit: "Samstag, 13:15–15:00",
    standort: "Zürich HB",
    status: "frei",
    ablauf: [
      { label: "Deutsch", value: "45 Min." },
      { label: "Mathematik", value: "45 Min." },
      { label: "Lerncoaching", value: "15 Min." },
    ],
  },
];
