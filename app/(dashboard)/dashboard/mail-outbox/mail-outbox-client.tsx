'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { processMailOutboxNow, type MailOutboxRowView } from './actions'

function formatTimestamp(value: string | null): string {
  if (!value) return '–'
  return new Date(value).toLocaleString('de-CH', { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusBadge({ status, attempts, maxAttempts }: { status: string; attempts: number; maxAttempts: number }) {
  if (status === 'sent') {
    return <Badge className="bg-secondary text-secondary-foreground">Versendet</Badge>
  }
  if (status === 'failed' && attempts >= maxAttempts) {
    return <Badge variant="destructive">Dauerhaft fehlgeschlagen</Badge>
  }
  if (status === 'failed') {
    return <Badge variant="outline">Fehlgeschlagen, wird erneut versucht ({attempts}/{maxAttempts})</Badge>
  }
  return <Badge variant="outline">Ausstehend</Badge>
}

export function MailOutboxClient({ initialRows }: { initialRows: MailOutboxRowView[] }) {
  const [rows, setRows] = useState(initialRows)
  const [isProcessing, startProcessing] = useTransition()

  const permanentFailures = rows.filter((r) => r.status === 'failed' && r.attempts >= r.maxAttempts)

  function handleProcessNow() {
    startProcessing(async () => {
      const result = await processMailOutboxNow()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(
        `Verarbeitet: ${result.data.processed}, versendet: ${result.data.sent}, fehlgeschlagen: ${result.data.failed}`
      )
      const refreshed = await import('./actions').then((m) => m.getMailOutboxRows())
      if (refreshed.success) setRows(refreshed.data)
    })
  }

  return (
    <div className="space-y-4">
      {permanentFailures.length > 0 && (
        <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {permanentFailures.length} Mail{permanentFailures.length !== 1 ? 's' : ''} konnte{permanentFailures.length !== 1 ? 'n' : ''}{' '}
          nach {permanentFailures[0]?.maxAttempts ?? 5} Versuchen nicht zugestellt werden -- manuelle Prüfung nötig.
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleProcessNow} disabled={isProcessing}>
          {isProcessing ? 'Verarbeite...' : 'Jetzt verarbeiten'}
        </Button>
      </div>

      <div className="rounded-2xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Kurs</th>
              <th className="p-3 font-medium">Kind</th>
              <th className="p-3 font-medium">Erstellt</th>
              <th className="p-3 font-medium">Nächster Versuch</th>
              <th className="p-3 font-medium">Fehler</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Keine Einträge.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <StatusBadge status={row.status} attempts={row.attempts} maxAttempts={row.maxAttempts} />
                </td>
                <td className="p-3 text-foreground">{row.kursName ?? '–'}</td>
                <td className="p-3 text-foreground">{row.childName ?? '–'}</td>
                <td className="p-3 text-muted-foreground">{formatTimestamp(row.createdAt)}</td>
                <td className="p-3 text-muted-foreground">
                  {row.status === 'sent' ? formatTimestamp(row.sentAt) : formatTimestamp(row.nextAttemptAt)}
                </td>
                <td className="p-3 text-destructive text-xs max-w-xs truncate" title={row.lastError ?? undefined}>
                  {row.lastError ?? '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
