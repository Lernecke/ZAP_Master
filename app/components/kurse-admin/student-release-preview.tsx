// Schritt 10b: "Schüler-Vorschau" aus Layout_Admin_Tagesfreigaben.html. Abschnitt 3 stellt
// ausdrücklich klar: "rein redaktionelle Vorschau innerhalb der Admin-Maske; verleiht keinen
// Zugriff und umgeht keine RLS" -- diese Komponente liest ausschliesslich die im Formular
// ausgewählten Items, nicht die Datenbank.

import type { ReleaseContentItem } from '@/types/kurs-tagesfreigabe'

export function StudentReleasePreview({
  dayLabel,
  selectedItems,
}: {
  dayLabel: string
  selectedItems: ReleaseContentItem[]
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="text-base font-semibold text-foreground mb-3">Schüler-Vorschau</h3>
      <div className="border border-border rounded-xl p-4 bg-muted/30">
        <small className="font-mono text-[10px] uppercase tracking-wide text-secondary-foreground">
          Mein Intensivkurs · Heute
        </small>
        <strong className="block mt-1 text-sm text-foreground">{dayLabel}</strong>
        {selectedItems.length > 0 ? (
          <ul className="mt-2.5 space-y-1 text-xs text-muted-foreground list-disc list-inside">
            {selectedItems.map((item) => (
              <li key={`${item.kind}:${item.sourceId}`}>{item.title}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2.5 text-xs text-muted-foreground">Noch keine Inhalte ausgewählt</p>
        )}
      </div>
    </section>
  )
}
