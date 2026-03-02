'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MentorshipListing } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Textarea } from '@/app/components/ui/textarea'
import { Label } from '@/app/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog'
import { toast } from 'sonner'
import { createRequest, deleteListing, updateListing } from '../actions'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  Pause,
  Play,
} from 'lucide-react'

interface ListingDetailProps {
  listing: MentorshipListing
  isOwner: boolean
  showRequestModal?: boolean
}

export function ListingDetail({
  listing,
  isOwner,
  showRequestModal = false,
}: ListingDetailProps) {
  const router = useRouter()
  const [showRequest, setShowRequest] = useState(showRequestModal)
  const [requestMessage, setRequestMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const isOffer = listing.type === 'OFFER'
  const isActive = listing.status === 'ACTIVE'
  const createdAt = formatDistanceToNow(new Date(listing.created_at), {
    addSuffix: true,
    locale: de,
  })

  const handleRequest = () => {
    startTransition(async () => {
      const result = await createRequest(listing.id, requestMessage || undefined)
      
      if (result.success) {
        toast.success(result.message)
        setShowRequest(false)
        router.push('/dashboard/mentorship')
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteListing(listing.id)
      
      if (result.success) {
        toast.success(result.message)
        router.push('/dashboard/mentorship')
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleToggleStatus = () => {
    startTransition(async () => {
      const newStatus = isActive ? 'PAUSED' : 'ACTIVE'
      const result = await updateListing(listing.id, { status: newStatus })
      
      if (result.success) {
        toast.success(newStatus === 'ACTIVE' ? 'Inserat aktiviert' : 'Inserat pausiert')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-6">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/mentorship"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Marktplatz
        </Link>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={isOffer ? 'default' : 'secondary'}>
              {isOffer ? (
                <>
                  <GraduationCap className="mr-1 h-3 w-3" />
                  Angebot
                </>
              ) : (
                <>
                  <BookOpen className="mr-1 h-3 w-3" />
                  Gesuch
                </>
              )}
            </Badge>
            <Badge variant={isActive ? 'outline' : 'secondary'}>
              {isActive ? 'Aktiv' : 'Pausiert'}
            </Badge>
            {isOwner && (
              <Badge variant="outline" className="ml-auto">
                Dein Inserat
              </Badge>
            )}
          </div>
          <CardTitle className="text-2xl">{listing.title}</CardTitle>
          <CardDescription className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Erstellt {createdAt}
            </span>
            {listing.updated_at && listing.updated_at !== listing.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Aktualisiert{' '}
                {formatDistanceToNow(new Date(listing.updated_at), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Beschreibung</h3>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {/* Class Levels */}
          {listing.class_levels && listing.class_levels.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Klassenstufen</h3>
              <div className="flex flex-wrap gap-2">
                {listing.class_levels.map((level) => (
                  <Badge key={level} variant="outline">
                    {level}. Klasse
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Availability */}
          {listing.availability && (
            <div>
              <h3 className="font-semibold mb-2">Verfügbarkeit</h3>
              <p className="text-muted-foreground">{listing.availability}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          {isOwner ? (
            <>
              <Button
                variant="outline"
                onClick={handleToggleStatus}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isActive ? (
                  <Pause className="mr-2 h-4 w-4" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isActive ? 'Pausieren' : 'Aktivieren'}
              </Button>
              <Link href={`/dashboard/mentorship/${listing.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Bearbeiten
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Inserat löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion kann nicht rückgängig gemacht werden. Das Inserat
                      und alle zugehörigen Anfragen werden dauerhaft gelöscht.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button
              onClick={() => setShowRequest(true)}
              disabled={!isActive || isPending}
              className="w-full sm:w-auto"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {isOffer ? 'Hilfe anfragen' : 'Hilfe anbieten'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Request Dialog */}
      <Dialog open={showRequest} onOpenChange={setShowRequest}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isOffer ? 'Hilfe anfragen' : 'Hilfe anbieten'}
            </DialogTitle>
            <DialogDescription>
              {isOffer
                ? 'Schicke eine Anfrage an den Mentor. Du kannst eine persönliche Nachricht hinzufügen.'
                : 'Biete deine Hilfe an. Du kannst eine persönliche Nachricht hinzufügen.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="message">Nachricht (optional)</Label>
              <Textarea
                id="message"
                placeholder={
                  isOffer
                    ? 'z.B. Hallo, ich würde gerne deine Hilfe in Mathe annehmen...'
                    : 'z.B. Hallo, ich könnte dir bei diesem Thema helfen...'
                }
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequest(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button onClick={handleRequest} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Senden...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Anfrage senden
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
