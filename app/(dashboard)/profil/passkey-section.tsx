'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  Fingerprint,
  Smartphone,
  Laptop,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { authClient } from '@/lib/auth-client'

export interface PasskeyItem {
  id: string
  name?: string | null
  createdAt?: Date | string | null
  deviceType?: string | null
  backedUp?: boolean | null
  transports?: string | null
}

export function PasskeySection() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [passkeyName, setPasskeyName] = useState('')

  const fetchPasskeys = useCallback(async () => {
    try {
      setLoading(true)
      const res = await authClient.passkey.listUserPasskeys()
      if (res?.data) {
        setPasskeys(res.data as PasskeyItem[])
      } else if (res?.error) {
        console.error('Passkey list error:', res.error)
      }
    } catch (err) {
      console.error('Fehler beim Laden der Passkeys:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPasskeys()
  }, [fetchPasskeys])

  const translatePasskeyError = (msg?: string, fallback = 'Fehler beim Verarbeiten des Passkeys.') => {
    if (!msg) return fallback
    const lower = msg.toLowerCase()
    if (lower.includes('passkey not found') || lower.includes('passkey_not_found') || lower.includes('no passkey')) {
      return 'Passkey wurde nicht gefunden. Bitte erstelle einen neuen Passkey.'
    }
    if (lower.includes('canceled') || lower.includes('cancelled') || lower.includes('abort') || lower.includes('notallowederror')) {
      return 'Vorgang wurde abgebrochen.'
    }
    if (lower.includes('not supported') || lower.includes('unsupported')) {
      return 'Passkeys werden von diesem Browser oder Gerät nicht unterstützt.'
    }
    return msg
  }

  const handleAddPasskey = async () => {
    setAdding(true)
    try {
      const nameToUse = passkeyName.trim() || undefined
      const res = await authClient.passkey.addPasskey({
        name: nameToUse,
      })

      if (res?.error) {
        toast.error(translatePasskeyError(res.error.message, 'Passkey konnte nicht hinzugefügt werden.'))
      } else {
        toast.success('Passkey wurde erfolgreich hinzugefügt!')
        setPasskeyName('')
        setShowAddDialog(false)
        await fetchPasskeys()
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? translatePasskeyError(err.message, 'Passkey konnte nicht hinzugefügt werden.') : 'Passkey konnte nicht hinzugefügt werden.'
      toast.error(errorMessage)
    } finally {
      setAdding(false)
    }
  }

  const handleDeletePasskey = async (id: string, name?: string | null) => {
    const displayName = name || 'Diesen Passkey'
    if (!confirm(`Möchtest du "${displayName}" wirklich entfernen?`)) return

    setDeletingId(id)
    try {
      const res = await authClient.passkey.deletePasskey({ id })
      if (res?.error) {
        toast.error(translatePasskeyError(res.error.message, 'Passkey konnte nicht gelöscht werden.'))
      } else {
        toast.success('Passkey wurde gelöscht.')
        await fetchPasskeys()
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? translatePasskeyError(err.message, 'Passkey konnte nicht gelöscht werden.') : 'Passkey konnte nicht gelöscht werden.'
      toast.error(errorMessage)
    } finally {
      setDeletingId(null)
    }
  }

  const getDeviceIcon = (deviceType?: string | null) => {
    if (deviceType?.toLowerCase().includes('single') || deviceType?.toLowerCase().includes('phone')) {
      return <Smartphone className="w-5 h-5 text-primary" />
    }
    if (deviceType?.toLowerCase().includes('multi') || deviceType?.toLowerCase().includes('desktop')) {
      return <Laptop className="w-5 h-5 text-primary" />
    }
    return <Fingerprint className="w-5 h-5 text-primary" />
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2 text-base">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Passkeys & Biometrische Anmeldung
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Melde dich schnell und sicher ohne Passwort an – nutze Touch ID, Face ID, Windows Hello oder einen Sicherheitsschlüssel.
          </p>
        </div>
        {!showAddDialog && (
          <Button
            onClick={() => setShowAddDialog(true)}
            size="sm"
            className="rounded-xl shrink-0 gap-1.5 ml-4"
          >
            <Plus className="w-4 h-4" />
            Passkey hinzufügen
          </Button>
        )}
      </div>

      {/* Add Passkey Dialog / Inline Form */}
      {showAddDialog && (
        <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Neuen Passkey einrichten
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddDialog(false)
                setPasskeyName('')
              }}
              disabled={adding}
              className="text-xs h-7 px-2"
            >
              Abbrechen
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Gib deinem Passkey eine Bezeichnung (z. B. &quot;Mein MacBook&quot; oder &quot;Arbeits-Handy&quot;), um ihn später wiederzuerkennen.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="z. B. MacBook Touch ID"
              disabled={adding}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !adding) handleAddPasskey()
              }}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button
              onClick={handleAddPasskey}
              disabled={adding}
              size="sm"
              className="rounded-lg h-10 px-4 shrink-0"
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                'Jetzt registrieren'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Passkey List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          Passkeys werden geladen...
        </div>
      ) : passkeys.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl p-6 bg-muted/20">
          <Fingerprint className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">Keine Passkeys vorhanden</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Du hast bisher noch keinen Passkey registriert. Füge einen Passkey hinzu, um dich künftig mit biometrischer Erkennung anzumelden.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {getDeviceIcon(pk.deviceType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {pk.name || 'Unbenannter Passkey'}
                    </p>
                    {pk.backedUp && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Synchronisiert
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hinzugefügt am{' '}
                    {pk.createdAt
                      ? new Date(pk.createdAt).toLocaleDateString('de-CH', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : 'Unbekannt'}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeletePasskey(pk.id, pk.name)}
                disabled={deletingId === pk.id}
                aria-label="Passkey löschen"
                className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 ml-3"
              >
                {deletingId === pk.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Entfernen
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
