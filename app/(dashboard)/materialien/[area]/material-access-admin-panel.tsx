'use client'

// Schritt 11a: Admin-only Panel zum Erteilen/Entziehen von Materialzugriff (source_kind =
// 'admin_grant'). Elternkäufe ohne bestehendes Konto (Einladungs-/Claim-Flow) sind bewusst nicht
// Teil dieser Runde -- diese Maske erteilt Zugriff nur für ein bereits existierendes Konto.

import { useState, useTransition } from 'react'
import { Loader2, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { adminGrantAccessAction, adminRevokeAccessAction } from './actions'
import type { MaterialAccessGrantWithUser } from '@/types/kurs-materialien'

export function MaterialAccessAdminPanel({
  areaId,
  initialGrants,
}: {
  areaId: string
  initialGrants: MaterialAccessGrantWithUser[]
}) {
  const [grants, setGrants] = useState(initialGrants)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeGrants = grants.filter((g) => g.status === 'active')

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await adminGrantAccessAction(areaId, { email })
      if (!result.success) {
        setError(result.error)
        return
      }
      setMessage(result.message)
      setEmail('')
      // Neu laden statt optimistischem Insert, da der Server die vollständige, angereicherte
      // Zeile (userEmail/userName) liefert und wir sie hier clientseitig nicht kennen.
      window.location.reload()
    })
  }

  const handleRevoke = (grantId: string) => {
    setError(null)
    setMessage(null)
    startTransition(async () => {
      const result = await adminRevokeAccessAction(areaId, grantId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setGrants((prev) => prev.map((g) => (g.id === grantId ? { ...g, status: 'revoked', revoked_at: new Date().toISOString() } : g)))
      setMessage(result.message)
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Zugriff verwalten (Admin)</h2>
      </div>

      <form onSubmit={handleGrant} className="flex flex-wrap gap-2 items-start">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-Mail des Kontos"
          required
          className="h-10 flex-1 min-w-[220px] px-3 rounded-lg border border-border bg-background text-sm"
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Zugriff erteilen
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-secondary-foreground">{message}</p>}

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Aktive Freigaben ({activeGrants.length})</h3>
        {activeGrants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine aktiven Freigaben in diesem Bereich.</p>
        ) : (
          <ul className="space-y-2">
            {activeGrants.map((grant) => (
              <li key={grant.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{grant.userName ?? grant.userEmail ?? grant.user_id}</p>
                  <p className="text-xs text-muted-foreground">
                    {grant.userEmail} · <Badge variant={grant.source_kind === 'admin_grant' ? 'secondary' : 'default'}>{grant.source_kind === 'admin_grant' ? 'manuell' : 'Selbststudium'}</Badge>
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => handleRevoke(grant.id)} disabled={isPending} aria-label="Zugriff entziehen">
                  <X className="w-4 h-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
