import { auth } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import { getListing } from '../actions'
import { ListingDetail } from '../components/ListingDetail'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const result = await getListing(id)
  
  if (!result.success || !result.data) {
    return { title: 'Inserat nicht gefunden | ZAP' }
  }

  return {
    title: `${result.data.title} | Mentoring | ZAP`,
    description: result.data.description?.slice(0, 155),
  }
}

export default async function ListingDetailPage({ params, searchParams }: PageProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params
  const { action } = await searchParams
  
  const result = await getListing(id)
  
  if (!result.success || !result.data) {
    notFound()
  }

  const isOwner = result.data.author_id === session.user.id
  const showRequestModal = action === 'request' && !isOwner

  return (
    <ListingDetail 
      listing={result.data} 
      isOwner={isOwner}
      showRequestModal={showRequestModal}
    />
  )
}
