'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MentorshipMaterial, MaterialType } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog'
import { toast } from 'sonner'
import { submitMaterial, provideFeedback } from '../actions'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  FileText,
  Upload,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileUp,
  Download,
  Star,
  PenLine,
} from 'lucide-react'

const MATERIAL_TYPES: { value: MaterialType; label: string }[] = [
  { value: 'ESSAY', label: 'Aufsatz' },
  { value: 'WORKSHEET', label: 'Arbeitsblatt' },
  { value: 'HOMEWORK', label: 'Hausaufgabe' },
  { value: 'OTHER', label: 'Sonstiges' },
]

interface MaterialHubProps {
  relationId: string
  materials: MentorshipMaterial[]
  isMentor: boolean
}

export function MaterialHub({
  relationId,
  materials,
  isMentor,
}: MaterialHubProps) {
  const [showUpload, setShowUpload] = useState(false)

  // Separate materials by status
  const pendingMaterials = materials.filter((m) => m.status === 'PENDING')
  const inProgressMaterials = materials.filter((m) => m.status === 'IN_PROGRESS')
  const correctedMaterials = materials.filter((m) => m.status === 'CORRECTED')

  return (
    <div className="space-y-6">
      {/* Actions Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">
              {isMentor ? 'Eingereichte Materialien' : 'Material einreichen'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isMentor
                ? 'Korrigiere eingereichte Materialien und gib Feedback'
                : 'Lade Aufsätze, Arbeitsblätter oder Hausaufgaben zur Korrektur hoch'}
            </p>
          </div>
          {!isMentor && (
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Material hochladen
                </Button>
              </DialogTrigger>
              <UploadDialog
                relationId={relationId}
                mentorId={materials[0]?.assigned_to || ''}
                onClose={() => setShowUpload(false)}
              />
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="Ausstehend"
          count={pendingMaterials.length}
        />
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-blue-500" />}
          label="In Bearbeitung"
          count={inProgressMaterials.length}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          label="Korrigiert"
          count={correctedMaterials.length}
        />
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Noch keine Materialien</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {isMentor
                ? 'Dein Mentee hat noch keine Materialien eingereicht.'
                : 'Lade dein erstes Material zur Korrektur hoch!'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Pending and In Progress */}
          {(pendingMaterials.length > 0 || inProgressMaterials.length > 0) && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Zur Bearbeitung</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[...pendingMaterials, ...inProgressMaterials].map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    isMentor={isMentor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Corrected */}
          {correctedMaterials.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Abgeschlossen</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {correctedMaterials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    isMentor={isMentor}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode
  label: string
  count: number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {icon}
        <div>
          <p className="text-2xl font-bold">{count}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function UploadDialog({
  relationId,
  mentorId,
  onClose,
}: {
  relationId: string
  mentorId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MaterialType>('ESSAY')
  const [description, setDescription] = useState('')
  // Note: For actual file upload, you'd integrate with Supabase Storage
  const [fileUrl, setFileUrl] = useState('')

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Bitte gib einen Titel an.')
      return
    }

    startTransition(async () => {
      const result = await submitMaterial({
        relation_id: relationId,
        assigned_to: mentorId,
        type,
        title,
        description: description || undefined,
        file_urls: fileUrl ? [fileUrl] : [],
      })

      if (result.success) {
        toast.success(result.message)
        onClose()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Material hochladen</DialogTitle>
        <DialogDescription>
          Reiche ein Material zur Korrektur ein
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titel *</Label>
          <Input
            id="title"
            placeholder="z.B. Deutsch Aufsatz Woche 3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Art</Label>
          <Select value={type} onValueChange={(v) => setType(v as MaterialType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung (optional)</Label>
          <Textarea
            id="description"
            placeholder="Worauf soll besonders geachtet werden?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">Datei-URL (optional)</Label>
          <Input
            id="file"
            type="url"
            placeholder="https://..."
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Du kannst einen Link zu deiner Datei einfügen (z.B. Google Drive, Dropbox)
          </p>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 h-4 w-4" />
          )}
          Einreichen
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

function MaterialCard({
  material,
  isMentor,
}: {
  material: MentorshipMaterial
  isMentor: boolean
}) {
  const router = useRouter()
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [grade, setGrade] = useState('')
  const [isPending, startTransition] = useTransition()

  const createdAt = formatDistanceToNow(new Date(material.created_at), {
    addSuffix: true,
    locale: de,
  })

  const getStatusBadge = () => {
    switch (material.status) {
      case 'PENDING':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            <Clock className="mr-1 h-3 w-3" />
            Ausstehend
          </Badge>
        )
      case 'IN_PROGRESS':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300">
            <AlertCircle className="mr-1 h-3 w-3" />
            In Bearbeitung
          </Badge>
        )
      case 'CORRECTED':
        return (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Korrigiert
          </Badge>
        )
    }
  }

  const getTypeBadge = () => {
    const typeLabel = MATERIAL_TYPES.find((t) => t.value === material.type)?.label || material.type
    return <Badge variant="secondary">{typeLabel}</Badge>
  }

  const handleSubmitFeedback = () => {
    if (!feedback.trim()) {
      toast.error('Bitte gib ein Feedback ein.')
      return
    }

    startTransition(async () => {
      const result = await provideFeedback(
        material.id,
        feedback,
        grade || undefined
      )

      if (result.success) {
        toast.success(result.message)
        setShowFeedback(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            {getTypeBadge()}
            {getStatusBadge()}
          </div>
          <CardTitle className="text-base mt-2">{material.title}</CardTitle>
          <CardDescription className="text-xs">
            Eingereicht {createdAt}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 pb-2">
          {material.description && (
            <p className="text-sm text-muted-foreground">{material.description}</p>
          )}

          {/* File Links */}
          {material.file_urls && material.file_urls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {material.file_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  Datei {i + 1}
                </a>
              ))}
            </div>
          )}

          {/* Feedback (if corrected) */}
          {material.status === 'CORRECTED' && material.feedback && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 mb-1">
                <MessageSquare className="h-3 w-3" />
                Feedback
                {material.grade && (
                  <Badge variant="outline" className="ml-auto text-green-700 border-green-300">
                    <Star className="mr-1 h-3 w-3" />
                    {material.grade}
                  </Badge>
                )}
              </div>
              <p className="text-sm">{material.feedback}</p>
            </div>
          )}
        </CardContent>

        {/* Mentor Actions */}
        {isMentor && material.status !== 'CORRECTED' && (
          <CardFooter className="border-t pt-4">
            <Button size="sm" onClick={() => setShowFeedback(true)}>
              <PenLine className="mr-2 h-4 w-4" />
              Feedback geben
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Feedback geben</DialogTitle>
            <DialogDescription>
              Gib konstruktives Feedback zu &quot;{material.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback *</Label>
              <Textarea
                id="feedback"
                placeholder="Was war gut? Was kann verbessert werden?"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Bewertung (optional)</Label>
              <Input
                id="grade"
                placeholder="z.B. 5.0, Gut, A+"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedback(false)} disabled={isPending}>
              Abbrechen
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="mr-2 h-4 w-4" />
              )}
              Feedback senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
