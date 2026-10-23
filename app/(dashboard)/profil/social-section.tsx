'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Globe,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertTriangle,
  Link2,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { authClient } from '@/lib/auth-client'

export interface AccountItem {
  id: string
  providerId: string
  accountId: string
  createdAt?: Date | string | null
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

export function SocialSection() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await authClient.listAccounts()
      if (res?.data) {
        setAccounts(res.data as AccountItem[])
      } else if (res?.error) {
        console.error('Accounts list error:', res.error)
      }
    } catch (err) {
      console.error('Fehler beim Laden der verknüpften Konten:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    const error = searchParams.get('error')
    const linked = searchParams.get('linked')

    if (linked === 'google') {
      toast.success('Google-Konto wurde erfolgreich verknüpft!')
    }

    if (error) {
      if (
        error === 'account_already_linked_to_different_user' ||
        error === 'already_linked'
      ) {
        toast.error(
          'Dieses Google-Konto ist bereits mit einem anderen Benutzerkonto verknüpft!'
        )
      } else if (error === 'unable_to_link_account') {
        toast.error('Google-Konto konnte nicht verknüpft werden.')
      } else if (error === "email_doesn't_match") {
        toast.error(
          'Die E-Mail-Adresse des Google-Kontos stimmt nicht mit diesem Profil überein.'
        )
      } else {
        toast.error('Verknüpfung fehlgeschlagen. Bitte versuche es erneut.')
      }
    }
  }, [searchParams])

  const isGoogleLinked = accounts.some((acc) => acc.providerId === 'google')

  const handleLinkGoogle = async () => {
    if (isGoogleLinked) {
      toast.error('Dein Google-Konto ist bereits verknüpft.')
      return
    }

    setLinking(true)
    try {
      const res = await authClient.linkSocial({
        provider: 'google',
        callbackURL: '/profil?linked=google',
        errorCallbackURL: '/profil?error=already_linked',
      })

      if (res?.error) {
        if (
          res.error.message?.includes('already') ||
          res.error.code === 'ACCOUNT_ALREADY_LINKED'
        ) {
          toast.error(
            'Dieses Google-Konto ist bereits mit einem Konto verknüpft.'
          )
        } else {
          toast.error(
            res.error.message || 'Fehler beim Starten der Google-Verknüpfung.'
          )
        }
        setLinking(false)
      }
    } catch {
      toast.error('Verknüpfung konnte nicht gestartet werden.')
      setLinking(false)
    }
  }

  const handleUnlinkGoogle = async () => {
    setUnlinking(true)
    try {
      const res = await authClient.unlinkAccount({
        providerId: 'google',
      })

      if (res?.error) {
        toast.error(
          res.error.message ||
            'Das Google-Konto konnte nicht entkoppelt werden.'
        )
      } else {
        toast.success('Google-Konto wurde erfolgreich entkoppelt.')
        await fetchAccounts()
      }
    } catch {
      toast.error('Fehler beim Entkoppeln des Google-Kontos.')
    } finally {
      setUnlinking(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Social Login & Verknüpfte Konten
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Verwalte deine mit Social-Media-Anbietern verknüpften Zugänge.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verknüpfte Konten werden geladen...
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background border border-border">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Google</span>
                  {isGoogleLinked ? (
                    <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3" /> Verknüpft
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Nicht verknüpft
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isGoogleLinked
                    ? 'Verwende Google für die schnelle Anmeldung mit einem Klick.'
                    : 'Verknüpfe dein Google-Konto für bequemen Social Login.'}
                </p>
              </div>
            </div>

            <div>
              {isGoogleLinked ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={unlinking}
                  onClick={handleUnlinkGoogle}
                  className="w-full sm:w-auto rounded-xl"
                >
                  {unlinking ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Wird entkoppelt...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Entkoppeln
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={linking}
                  onClick={handleLinkGoogle}
                  className="w-full sm:w-auto rounded-xl border-border"
                >
                  {linking ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Verknüpfe...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-1.5 h-3.5 w-3.5" />
                      Google verknüpfen
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {isGoogleLinked && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                Dein Google-Konto ist bereits verknüpft. Weitere Verknüpfungen mit Google sind nicht möglich, solange die Verknüpfung aktiv ist.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
