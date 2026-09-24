'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Loader2, CheckCircle2, Copy, Mail, UserPlus, Sparkles } from 'lucide-react'
import { createChildAccountAction } from './family-actions'
import type { ChildAccount } from '@/types/family'

interface CreateChildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onChildCreated: (child: ChildAccount) => void
}

const CLASS_LEVELS = [
  { value: '5', label: '5. Klasse' },
  { value: '6', label: '6. Klasse' },
  { value: '7', label: '7. Klasse (Sek)' },
  { value: '8', label: '8. Klasse (Sek)' },
  { value: '9', label: '9. Klasse (Sek)' },
  { value: 'gym', label: 'Gymnasium' },
  { value: 'other', label: 'Andere' },
]

export function CreateChildModal({ open, onOpenChange, onChildCreated }: CreateChildModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [schoolName, setSchoolName] = useState('')

  const [loading, setLoading] = useState(false)
  const [createdChild, setCreatedChild] = useState<ChildAccount | null>(null)
  const [copied, setCopied] = useState(false)

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setClassLevel('')
    setSchoolName('')
    setCreatedChild(null)
    setCopied(false)
    setLoading(false)
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast.error('Bitte fülle alle Pflichtfelder aus.')
      return
    }

    setLoading(true)
    try {
      const res = await createChildAccountAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        classLevel: classLevel || undefined,
        schoolName: schoolName.trim() || undefined,
      })

      if (!res.success || !res.child) {
        toast.error(res.error || 'Kinderkonto konnte nicht erstellt werden.')
        setLoading(false)
        return
      }

      setCreatedChild(res.child)
      onChildCreated(res.child)
      toast.success(`Konto für ${res.child.name} wurde erstellt!`)
    } catch {
      toast.error('Beim Erstellen des Kontos ist ein Fehler aufgetreten.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdChild?.magicLinkUrl) return
    try {
      await navigator.clipboard.writeText(createdChild.magicLinkUrl)
      setCopied(true)
      toast.success('Magic Link in die Zwischenablage kopiert!')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Kopieren fehlgeschlagen. Bitte kopiere den Link manuell.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px]">
        {!createdChild ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Kind / Familienmitglied hinzufügen
              </DialogTitle>
              <DialogDescription className="text-gray-500 dark:text-gray-400">
                Erstelle ein Kinderkonto. Es wird automatisch eine E-Mail mit einem Magic Link zur
                Anmeldung an dein Kind gesendet. Zudem kannst du den Link direkt kopieren.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Vorname *</Label>
                  <Input
                    id="firstName"
                    placeholder="z. B. Sophie"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Nachname *</Label>
                  <Input
                    id="lastName"
                    placeholder="z. B. Muster"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-Mail-Adresse des Kindes *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="sophie.muster@beispiel.ch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Die E-Mail wird für den Magic-Link-Login verwendet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classLevel">Klassenstufe (optional)</Label>
                  <Select value={classLevel} onValueChange={setClassLevel}>
                    <SelectTrigger id="classLevel">
                      <SelectValue placeholder="Auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASS_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schoolName">Schulname (optional)</Label>
                  <Input
                    id="schoolName"
                    placeholder="z. B. Sekundarschule Zürich"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird erstellt...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Konto erstellen & Magic Link senden
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-2 space-y-5">
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-2">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center text-xl font-bold">
                Konto für {createdChild.name} wurde erstellt!
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600 dark:text-gray-300">
                Eine Einladungs-E-Mail mit dem Magic Link wurde automatisch an{' '}
                <span className="font-semibold text-gray-900 dark:text-white">{createdChild.email}</span>{' '}
                gesendet.
              </DialogDescription>
            </DialogHeader>

            {createdChild.magicLinkUrl && (
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Direkter Magic Link für {createdChild.first_name || 'dein Kind'}:</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={createdChild.magicLinkUrl}
                    className="font-mono text-xs bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  />
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    variant={copied ? 'default' : 'secondary'}
                    className="gap-1.5 shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Kopiert
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Kopieren
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Du kannst diesen Link kopieren und direkt per Messenger, SMS oder E-Mail an dein Kind senden.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" onClick={handleClose} className="w-full">
                Fertigstellen
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
