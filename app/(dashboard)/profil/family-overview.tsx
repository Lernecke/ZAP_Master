'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  Mail,
  Copy,
  Trash2,
  Loader2,
  GraduationCap,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Send,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/app/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog'
import { CreateChildModal } from './create-child-modal'
import {
  getChildrenAction,
  regenerateChildMagicLinkAction,
  deleteChildAccountAction,
} from './family-actions'
import type { ChildAccount } from '@/types/family'

const CLASS_LEVEL_LABELS: Record<string, string> = {
  '5': '5. Klasse',
  '6': '6. Klasse',
  '7': '7. Klasse (Sek)',
  '8': '8. Klasse (Sek)',
  '9': '9. Klasse (Sek)',
  gym: 'Gymnasium',
  other: 'Andere',
}

export function FamilyOverview() {
  const [children, setChildren] = useState<ChildAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteChildTarget, setDeleteChildTarget] = useState<ChildAccount | null>(null)
  const [copiedChildId, setCopiedChildId] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadChildren = async () => {
    setLoading(true)
    try {
      const res = await getChildrenAction()
      if (res.success && res.children) {
        setChildren(res.children)
      } else if (res.error) {
        toast.error(res.error)
      }
    } catch {
      toast.error('Kinderkonten konnten nicht geladen werden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChildren()
  }, [])

  const handleChildCreated = (newChild: ChildAccount) => {
    setChildren((prev) => [newChild, ...prev])
  }

  const handleCopyMagicLink = async (child: ChildAccount) => {
    setActionLoadingId(child.id)
    try {
      const res = await regenerateChildMagicLinkAction(child.id)
      if (res.success && res.magicLinkUrl) {
        await navigator.clipboard.writeText(res.magicLinkUrl)
        setCopiedChildId(child.id)
        toast.success(`Magic Link für ${child.first_name || child.name} in die Zwischenablage kopiert!`)
        setTimeout(() => setCopiedChildId(null), 3000)
      } else {
        toast.error(res.error || 'Magic Link konnte nicht erstellt werden.')
      }
    } catch {
      toast.error('Kopieren fehlgeschlagen.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResendMagicLink = async (child: ChildAccount) => {
    setActionLoadingId(child.id)
    try {
      const res = await regenerateChildMagicLinkAction(child.id)
      if (res.success) {
        toast.success(`Ein neuer Magic Link wurde per E-Mail an ${child.email} gesendet!`)
      } else {
        toast.error(res.error || 'E-Mail konnte nicht gesendet werden.')
      }
    } catch {
      toast.error('Fehler beim Senden der E-Mail.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleConfirmDeleteChild = async () => {
    if (!deleteChildTarget) return

    const child = deleteChildTarget
    setActionLoadingId(child.id)
    try {
      const res = await deleteChildAccountAction(child.id)
      if (res.success) {
        setChildren((prev) => prev.filter((c) => c.id !== child.id))
        toast.success(`Kinderkonto für ${child.name} wurde gelöscht.`)
        setDeleteChildTarget(null)
      } else {
        toast.error(res.error || 'Kinderkonto konnte nicht gelöscht werden.')
      }
    } catch {
      toast.error('Fehler beim Löschen des Kinderkontos.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Users className="h-5 w-5 text-blue-600" />
              Familienübersicht & Kinderkonten
            </CardTitle>
            <CardDescription className="text-gray-500 dark:text-gray-400 mt-1">
              Verwalte die ZAP-Konten deiner Kinder. Erstelle Unterkonten, generiere Magic Links und
              sende Einladungen direkt weiter.
            </CardDescription>
          </div>

          <Button
            onClick={() => setModalOpen(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            Kind hinzufügen
          </Button>
        </CardHeader>

        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-blue-600" />
              Kinderkonten werden geladen...
            </div>
          ) : children.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Noch keine Kinderkonten angelegt
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-1 mb-4">
                Füge dein Kind hinzu, damit es einen eigenen ZAP-Zugang erhält. Deine Kinder können
                weder deine Elterneinstellungen noch deine Zahlungsdaten einsehen.
              </p>
              <Button onClick={() => setModalOpen(true)} variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Erstes Kinderkonto erstellen
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {children.map((child) => {
                const isActionBusy = actionLoadingId === child.id
                const isCopied = copiedChildId === child.id

                return (
                  <div
                    key={child.id}
                    className="flex flex-col justify-between p-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-sm">
                            {child.first_name?.[0] || child.name[0] || 'K'}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                              {child.name}
                            </h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {child.email}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/40 text-xs"
                        >
                          Kinderkonto
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                        {child.class_level && (
                          <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                            <GraduationCap className="h-3.5 w-3.5 text-gray-500" />
                            {CLASS_LEVEL_LABELS[child.class_level] || child.class_level}
                          </span>
                        )}
                        {child.created_at && (
                          <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-md">
                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                            Erstellt am {new Date(child.created_at).toLocaleDateString('de-CH')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                      <Button
                        size="sm"
                        variant={isCopied ? 'default' : 'outline'}
                        onClick={() => handleCopyMagicLink(child)}
                        disabled={isActionBusy}
                        className="gap-1.5 flex-1 text-xs"
                      >
                        {isActionBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isCopied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            Kopiert
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-blue-600" />
                            Magic Link kopieren
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResendMagicLink(child)}
                        disabled={isActionBusy}
                        title="Magic Link erneut per E-Mail senden"
                        className="text-gray-600 dark:text-gray-400 hover:text-blue-600"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteChildTarget(child)}
                        disabled={isActionBusy}
                        title="Kinderkonto löschen"
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-semibold">Datenschutz & Privatsphäre deiner Familie</p>
              <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                Kinderkonten haben ausschliesslich Zugriff auf ihre eigenen Lernmaterialien, Aufgaben
                und Testergebnisse. Deine Kontaktdaten, E-Mail-Adresse und Zahlungsinformationen sind
                für Kinderkonten zu jedem Zeitpunkt vollständig unsichtbar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateChildModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onChildCreated={handleChildCreated}
      />

      <AlertDialog
        open={!!deleteChildTarget}
        onOpenChange={(open) => !open && setDeleteChildTarget(null)}
      >
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Kinderkonto löschen
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-1 text-gray-600 dark:text-gray-300">
              Möchtest du das Kinderkonto für{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {deleteChildTarget?.name}
              </span>{' '}
              wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2 pt-2">
            <AlertDialogCancel disabled={!!actionLoadingId}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDeleteChild()
              }}
              disabled={!!actionLoadingId}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 text-white gap-2"
            >
              {actionLoadingId === deleteChildTarget?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                'Kinderkonto löschen'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
