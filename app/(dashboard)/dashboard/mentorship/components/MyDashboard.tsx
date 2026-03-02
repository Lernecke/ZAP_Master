'use client'

import Link from 'next/link'
import { MentorshipListing, MentorshipRequest, MentorshipRelation } from '@/types/mentorship'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { FileText, Inbox, Users, ChevronRight, Bell } from 'lucide-react'

interface MyDashboardProps {
  myListings: MentorshipListing[]
  pendingRequests: MentorshipRequest[]
  activeRelations: MentorshipRelation[]
}

export function MyDashboard({ myListings, pendingRequests, activeRelations }: MyDashboardProps) {
  const activeListings = myListings.filter((l) => l.status === 'ACTIVE')
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* My Listings Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Meine Inserate</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeListings.length}</div>
          <p className="text-xs text-muted-foreground">
            {myListings.length > activeListings.length && (
              <span>({myListings.length - activeListings.length} pausiert)</span>
            )}
            {myListings.length === 0 && 'Noch keine Inserate'}
          </p>
          <Link href="/dashboard/mentorship?tab=my-listings" className="block">
            <Button variant="link" size="sm" className="mt-2 h-auto p-0">
              Alle anzeigen <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Pending Requests Summary */}
      <Card className={pendingRequests.length > 0 ? 'border-primary/50' : ''}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Offene Anfragen</CardTitle>
          <div className="relative">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            {pendingRequests.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingRequests.length}</div>
          <p className="text-xs text-muted-foreground">
            {pendingRequests.length > 0 
              ? 'Warten auf deine Antwort'
              : 'Keine offenen Anfragen'}
          </p>
          {pendingRequests.length > 0 && (
            <Link href="/dashboard/mentorship/requests">
              <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-primary">
                <Bell className="mr-1 h-3 w-3" />
                Jetzt antworten <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Active Relations Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Aktive Beziehungen</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeRelations.length}</div>
          <p className="text-xs text-muted-foreground">
            {activeRelations.length > 0
              ? 'Götti-Verbindungen'
              : 'Noch keine Verbindungen'}
          </p>
          {activeRelations.length > 0 && (
            <Link href="/dashboard/mentorship/relations">
              <Button variant="link" size="sm" className="mt-2 h-auto p-0">
                Übersicht <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
