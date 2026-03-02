'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { PlusCircle, Users, HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog'

export function MarketplaceHeader() {
  const router = useRouter()
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Götti-System
          </h1>
          <p className="text-muted-foreground">
            Finde deinen Mentor oder biete deine Hilfe an
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Dialog open={showInfo} onOpenChange={setShowInfo}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <HelpCircle className="mr-2 h-4 w-4" />
              Wie funktioniert&apos;s?
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Das Götti-System</DialogTitle>
              <DialogDescription>
                Verbindet Lernende mit erfahrenen Schülern oder Lehrpersonen
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold">Als Mentor (Götti/Gotte)</h4>
                <p className="text-muted-foreground">
                  Biete deine Expertise in Fächern an, in denen du gut bist.
                  Erstelle ein &quot;Angebot&quot;-Inserat mit deinen Stärken.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Als Mentee (Lernender)</h4>
                <p className="text-muted-foreground">
                  Suche Hilfe in bestimmten Fächern. Erstelle ein &quot;Gesuch&quot;-Inserat
                  oder reagiere auf bestehende Angebote.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Material-Hub</h4>
                <p className="text-muted-foreground">
                  Lade Aufsätze, Arbeitsblätter oder Hausaufgaben hoch und erhalte
                  Feedback von deinem Mentor.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Button onClick={() => router.push('/dashboard/mentorship/new')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Neues Inserat
        </Button>
      </div>
    </div>
  )
}
