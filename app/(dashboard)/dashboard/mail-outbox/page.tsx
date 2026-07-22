import { requireAdmin } from '@/lib/auth/guards'
import { getMailOutboxRows } from './actions'
import { MailOutboxClient } from './mail-outbox-client'

export default async function MailOutboxPage() {
  // Abschnitt 10.4 (E-Mail-Outbox): admin-only, macht dauerhafte Zustellfehler sichtbar.
  await requireAdmin()

  const result = await getMailOutboxRows()

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mail-Warteschlange</h1>
        <p className="text-muted-foreground mt-1">
          Buchungsbestätigungen: Versandstatus, Fehlversuche und dauerhafte Zustellfehler.
        </p>
      </div>
      {result.success ? (
        <MailOutboxClient initialRows={result.data} />
      ) : (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          {result.error}
        </div>
      )}
    </div>
  )
}
