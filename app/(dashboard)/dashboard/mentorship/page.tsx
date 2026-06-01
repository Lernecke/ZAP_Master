import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { getListings, getMyListings, getIncomingRequests, getMyRelations } from './actions'
import { MarketplaceHeader } from './components/MarketplaceHeader'
import { ListingGrid } from './components/ListingGrid'
import { FilterSidebar } from './components/FilterSidebar'
import { MyDashboard } from './components/MyDashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Skeleton } from '@/app/components/ui/skeleton'

export const metadata = {
  title: 'Mentoring | ZAP',
  description: 'Finde deinen Mentor oder biete deine Hilfe an',
}

async function MarketplaceContent() {
  const [listingsResult, myListingsResult, requestsResult, relationsResult] = await Promise.all([
    getListings(),
    getMyListings(),
    getIncomingRequests(),
    getMyRelations(),
  ])

  const listings = listingsResult.success ? listingsResult.data ?? [] : []
  const myListings = myListingsResult.success ? myListingsResult.data ?? [] : []
  const pendingRequests = requestsResult.success ? requestsResult.data ?? [] : []
  const relations = relationsResult.success ? relationsResult.data ?? [] : []

  return (
    <div className="flex flex-col gap-6">
      {/* My Dashboard Summary */}
      <MyDashboard 
        myListings={myListings}
        pendingRequests={pendingRequests}
        activeRelations={relations}
      />
      
      {/* Main Content */}
      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="mb-4 grid w-full grid-cols-2 md:w-auto md:inline-flex">
          <TabsTrigger value="marketplace">Marktplatz</TabsTrigger>
          <TabsTrigger value="my-listings">Meine Inserate</TabsTrigger>
        </TabsList>
        
        <TabsContent value="marketplace">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <FilterSidebar />
            <ListingGrid listings={listings} showActions />
          </div>
        </TabsContent>
        
        <TabsContent value="my-listings">
          <ListingGrid listings={myListings} isOwner />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MarketplaceSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Dashboard Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      
      {/* Content Skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Skeleton className="h-96 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function MentorshipPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <MarketplaceHeader />
      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceContent />
      </Suspense>
    </div>
  )
}
