'use client'

// Schritt 11a: Downloadliste für einen geschützten Materialbereich. Signed URLs werden erst on
// demand per Server Action geholt (kurzlebig, 2 Minuten) statt beim Seitenaufbau vorab erzeugt.

import { useState, useTransition } from 'react'
import { Download, FileText, Link as LinkIcon, Loader2 } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { getMaterialDownloadUrl } from './actions'
import type { LearningMaterialDB } from '@/types/kurs-materialien'

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function MaterialRow({ material }: { material: LearningMaterialDB }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDownload = () => {
    setError(null)
    startTransition(async () => {
      const result = await getMaterialDownloadUrl(material.id)
      if (!result.success || !result.data) {
        setError(!result.success ? result.error : 'Download-Link konnte nicht erstellt werden.')
        return
      }
      window.open(result.data.url, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          {material.is_link ? <LinkIcon className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">{material.name ?? 'Unbenanntes Material'}</p>
          {material.description && <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {material.file_type ?? material.type ?? ''} {material.file_size ? `· ${formatFileSize(material.file_size)}` : ''}
          </p>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={handleDownload} disabled={isPending} className="shrink-0">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {material.is_link ? 'Öffnen' : 'Herunterladen'}
      </Button>
    </li>
  )
}

export function MaterialienAreaClient({ materials }: { materials: LearningMaterialDB[] }) {
  if (materials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        In diesem Bereich sind noch keine Materialien verfügbar.
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {materials.map((material) => (
        <MaterialRow key={material.id} material={material} />
      ))}
    </ul>
  )
}
