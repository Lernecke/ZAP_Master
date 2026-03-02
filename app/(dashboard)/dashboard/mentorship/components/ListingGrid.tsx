'use client'

import Link from 'next/link'
import { MentorshipListing } from '@/types/mentorship'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { BookOpen, GraduationCap, UserPlus, Eye, Pencil } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'

interface ListingGridProps {
  listings: MentorshipListing[]
  showActions?: boolean
  isOwner?: boolean
}

export function ListingGrid({ listings, showActions = false, isOwner = false }: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Keine Inserate gefunden</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {isOwner 
            ? 'Du hast noch keine Inserate erstellt. Erstelle dein erstes Inserat!'
            : 'Es gibt noch keine passenden Inserate. Probiere andere Filter oder erstelle selbst ein Inserat.'}
        </p>
        {isOwner && (
          <Link href="/dashboard/mentorship/new">
            <Button className="mt-4">
              <UserPlus className="mr-2 h-4 w-4" />
              Inserat erstellen
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard 
          key={listing.id} 
          listing={listing} 
          showActions={showActions}
          isOwner={isOwner}
        />
      ))}
    </div>
  )
}

interface ListingCardProps {
  listing: MentorshipListing
  showActions?: boolean
  isOwner?: boolean
}

function ListingCard({ listing, showActions = false, isOwner = false }: ListingCardProps) {
  const isOffer = listing.type === 'OFFER'
  const createdAt = formatDistanceToNow(new Date(listing.created_at), { 
    addSuffix: true, 
    locale: de 
  })

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant={isOffer ? 'default' : 'secondary'} className="shrink-0">
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
          <Badge variant="outline" className="shrink-0">
            {listing.status === 'ACTIVE' ? 'Aktiv' : 'Pausiert'}
          </Badge>
        </div>
        <CardTitle className="mt-2 line-clamp-2 text-lg">{listing.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {listing.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-3">
        <div className="flex flex-wrap gap-1">
          {listing.class_levels?.slice(0, 3).map((level) => (
            <Badge key={level} variant="outline" className="text-xs">
              {level}. Klasse
            </Badge>
          ))}
          {listing.class_levels && listing.class_levels.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{listing.class_levels.length - 3}
            </Badge>
          )}
        </div>
        
        <p className="mt-2 text-xs text-muted-foreground">
          Erstellt {createdAt}
        </p>
      </CardContent>
      
      <CardFooter className="flex gap-2 border-t pt-4">
        {isOwner ? (
          <>
            <Link href={`/dashboard/mentorship/${listing.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Ansehen
              </Button>
            </Link>
            <Link href={`/dashboard/mentorship/${listing.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </>
        ) : showActions ? (
          <>
            <Link href={`/dashboard/mentorship/${listing.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Details
              </Button>
            </Link>
            <Link href={`/dashboard/mentorship/${listing.id}?action=request`}>
              <Button size="sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Anfragen
              </Button>
            </Link>
          </>
        ) : (
          <Link href={`/dashboard/mentorship/${listing.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              <Eye className="mr-2 h-4 w-4" />
              Details
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
