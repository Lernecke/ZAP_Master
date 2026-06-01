'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MentorshipRequest } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
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
import { toast } from 'sonner'
import { acceptRequest, rejectRequest, cancelRequest } from '../actions'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Check,
  X,
  Clock,
  Loader2,
  MessageSquare,
  Inbox,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react'

interface RequestsListProps {
  requests: MentorshipRequest[]
  type: 'incoming' | 'outgoing'
}

export function RequestsList({ requests, type }: RequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Keine Anfragen</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {type === 'incoming'
            ? 'Du hast noch keine eingehenden Anfragen erhalten.'
            : 'Du hast noch keine Anfragen gesendet.'}
        </p>
        <Link href="/dashboard/mentorship">
          <Button variant="outline" className="mt-4">
            Zum Marktplatz
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} type={type} />
      ))}
    </div>
  )
}

interface RequestCardProps {
  request: MentorshipRequest
  type: 'incoming' | 'outgoing'
}

function RequestCard({ request, type }: RequestCardProps) {
  const router = useRouter()
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [responseMessage, setResponseMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isAccepting, setIsAccepting] = useState(false)

  // Access the related profiles and listing
  const requester = (request as any).requester
  const target = (request as any).target
  const listing = (request as any).listing

  const person = type === 'incoming' ? requester : target
  const createdAt = formatDistanceToNow(new Date(request.created_at), {
    addSuffix: true,
    locale: de,
  })

  const getStatusBadge = () => {
    switch (request.status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="mr-1 h-3 w-3" />
            Ausstehend
          </Badge>
        )
      case 'ACCEPTED':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <Check className="mr-1 h-3 w-3" />
            Angenommen
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="text-red-600 border-red-300">
            <X className="mr-1 h-3 w-3" />
            Abgelehnt
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge variant="secondary">
            Zurückgezogen
          </Badge>
        )
    }
  }

  const handleAccept = () => {
    setIsAccepting(true)
    setShowResponseDialog(true)
  }

  const handleReject = () => {
    setIsAccepting(false)
    setShowResponseDialog(true)
  }

  const handleConfirmResponse = () => {
    startTransition(async () => {
      const result = isAccepting
        ? await acceptRequest(request.id, responseMessage || undefined)
        : await rejectRequest(request.id, responseMessage || undefined)

      if (result.success) {
        toast.success(result.message)
        setShowResponseDialog(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelRequest(request.id)
      
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return '?'
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={person?.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(person?.first_name, person?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-base">
                  {person?.first_name} {person?.last_name}
                </CardTitle>
                <CardDescription className="text-xs">
                  {createdAt}
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Linked Listing */}
          {listing && (
            <Link 
              href={`/dashboard/mentorship/${request.listing_id}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {listing.title}
            </Link>
          )}

          {/* Message */}
          {request.message && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                Nachricht
              </div>
              <p className="text-sm">{request.message}</p>
            </div>
          )}

          {/* Response Message (if any) */}
          {request.response_message && (
            <div className="rounded-lg bg-muted/50 p-3 border-l-2 border-primary">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" />
                Antwort
              </div>
              <p className="text-sm">{request.response_message}</p>
            </div>
          )}
        </CardContent>

        {request.status === 'PENDING' && (
          <CardFooter className="flex gap-2 border-t pt-4">
            {type === 'incoming' ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={isPending}
                  className="flex-1"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Ablehnen
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={isPending}
                  className="flex-1"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Annehmen
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X className="mr-2 h-4 w-4" />
                )}
                Anfrage zurückziehen
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAccepting ? 'Anfrage annehmen' : 'Anfrage ablehnen'}
            </DialogTitle>
            <DialogDescription>
              {isAccepting
                ? 'Wenn du die Anfrage annimmst, wird eine Mentoring-Beziehung erstellt.'
                : 'Du kannst optional eine Nachricht an den Anfragenden senden.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="response">Nachricht (optional)</Label>
              <Textarea
                id="response"
                placeholder={
                  isAccepting
                    ? 'z.B. Freut mich! Wann hast du Zeit für ein erstes Treffen?'
                    : 'z.B. Leider habe ich gerade keine Kapazität...'
                }
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResponseDialog(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirmResponse}
              disabled={isPending}
              variant={isAccepting ? 'default' : 'destructive'}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isAccepting ? (
                <UserCheck className="mr-2 h-4 w-4" />
              ) : (
                <UserX className="mr-2 h-4 w-4" />
              )}
              {isAccepting ? 'Annehmen' : 'Ablehnen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
