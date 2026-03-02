'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MentorshipRelation } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar'
import { Input } from '@/app/components/ui/input'
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
import { endRelation } from '../actions'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  UserMinus,
  Loader2,
  Mail,
} from 'lucide-react'

interface RelationsListProps {
  relations: MentorshipRelation[]
  currentUserId: string
}

export function RelationsList({ relations, currentUserId }: RelationsListProps) {
  if (relations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Keine aktiven Beziehungen</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Du hast noch keine aktiven Götti-Beziehungen. Erstelle ein Inserat oder 
          reagiere auf bestehende Angebote/Gesuche!
        </p>
        <Link href="/dashboard/mentorship">
          <Button className="mt-4">Zum Marktplatz</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {relations.map((relation) => (
        <RelationCard
          key={relation.id}
          relation={relation}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

interface RelationCardProps {
  relation: MentorshipRelation
  currentUserId: string
}

function RelationCard({ relation, currentUserId }: RelationCardProps) {
  const router = useRouter()
  const [showEndDialog, setShowEndDialog] = useState(false)
  const [endReason, setEndReason] = useState('')
  const [isPending, startTransition] = useTransition()

  // Extract the related profiles
  const mentor = (relation as any).mentor
  const mentee = (relation as any).mentee

  const isMentor = relation.mentor_id === currentUserId
  const partner = isMentor ? mentee : mentor
  const startedAt = formatDistanceToNow(new Date(relation.started_at || relation.created_at), {
    addSuffix: true,
    locale: de,
  })

  const handleEndRelation = () => {
    if (!endReason.trim()) {
      toast.error('Bitte gib einen Grund an.')
      return
    }

    startTransition(async () => {
      const result = await endRelation(relation.id, endReason)
      
      if (result.success) {
        toast.success(result.message)
        setShowEndDialog(false)
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
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={partner?.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {getInitials(partner?.first_name, partner?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  {partner?.first_name} {partner?.last_name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Badge variant={isMentor ? 'secondary' : 'default'}>
                    {isMentor ? (
                      <>
                        <BookOpen className="mr-1 h-3 w-3" />
                        Mentee
                      </>
                    ) : (
                      <>
                        <GraduationCap className="mr-1 h-3 w-3" />
                        Mentor
                      </>
                    )}
                  </Badge>
                  {mentee?.class_level && (
                    <span className="text-xs">{mentee.class_level}. Klasse</span>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-300">
              Aktiv
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Relation Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Gestartet {startedAt}
            </span>
          </div>

          {/* Role Description */}
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm">
              {isMentor ? (
                <>
                  Du bist der <strong>Mentor (Götti/Gotte)</strong> in dieser Beziehung.
                  Du kannst {partner?.first_name} bei Fragen helfen und eingereichte
                  Materialien korrigieren.
                </>
              ) : (
                <>
                  Du bist der <strong>Mentee</strong> in dieser Beziehung.
                  Du kannst {partner?.first_name} um Hilfe bitten und Materialien
                  zur Korrektur einreichen.
                </>
              )}
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 border-t pt-6">
          {/* Contact */}
          {partner?.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${partner.email}`}>
                <Mail className="mr-2 h-4 w-4" />
                E-Mail
              </a>
            </Button>
          )}

          {/* Material Hub Link */}
          <Link href={`/dashboard/mentorship/relations/${relation.id}/materials`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Material-Hub
            </Button>
          </Link>

          {/* End Relation */}
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
            onClick={() => setShowEndDialog(true)}
          >
            <UserMinus className="mr-2 h-4 w-4" />
            Beenden
          </Button>
        </CardFooter>
      </Card>

      {/* End Relation Dialog */}
      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Götti-Beziehung beenden</DialogTitle>
            <DialogDescription>
              Bitte gib einen Grund an, warum du die Beziehung beenden möchtest.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Grund</Label>
              <Input
                id="reason"
                placeholder="z.B. Ziele erreicht, keine Zeit mehr, etc."
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEndDialog(false)}
              disabled={isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleEndRelation}
              disabled={isPending || !endReason.trim()}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="mr-2 h-4 w-4" />
              )}
              Beziehung beenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
