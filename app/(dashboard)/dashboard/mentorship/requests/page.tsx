import { Suspense } from 'react'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getIncomingRequests, getOutgoingRequests } from '../actions'
import { RequestsList } from '../components/RequestsList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Skeleton } from '@/app/components/ui/skeleton'
import { ArrowLeft, Inbox, Send } from 'lucide-react'

export const metadata = {
  title: 'Anfragen | Götti-System | ZAP',
}

async function RequestsContent() {
  const [incomingResult, outgoingResult] = await Promise.all([
    getIncomingRequests(),
    getOutgoingRequests(),
  ])

  const incoming = incomingResult.success ? incomingResult.data ?? [] : []
  const outgoing = outgoingResult.success ? outgoingResult.data ?? [] : []

  return (
    <Tabs defaultValue="incoming" className="w-full">
      <TabsList className="mb-4 grid w-full grid-cols-2 md:w-auto md:inline-flex">
        <TabsTrigger value="incoming" className="gap-2">
          <Inbox className="h-4 w-4" />
          Eingehende ({incoming.length})
        </TabsTrigger>
        <TabsTrigger value="outgoing" className="gap-2">
          <Send className="h-4 w-4" />
          Ausgehende ({outgoing.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="incoming">
        <RequestsList requests={incoming} type="incoming" />
      </TabsContent>
      
      <TabsContent value="outgoing">
        <RequestsList requests={outgoing} type="outgoing" />
      </TabsContent>
    </Tabs>
  )
}

function RequestsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default async function RequestsPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/mentorship"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Marktplatz
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Meine Anfragen
        </h1>
        <p className="text-muted-foreground">
          Verwalte eingehende und ausgehende Götti-Anfragen
        </p>
      </div>

      <Suspense fallback={<RequestsSkeleton />}>
        <RequestsContent />
      </Suspense>
    </div>
  )
}
