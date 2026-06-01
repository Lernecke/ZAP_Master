import { auth } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import { getListing } from '../../actions'
import { ListingForm } from '../../components/ListingForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = {
  title: 'Inserat bearbeiten | Mentoring | ZAP',
}

export default async function EditListingPage({ params }: PageProps) {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params
  const result = await getListing(id)
  
  if (!result.success || !result.data) {
    notFound()
  }

  // Only owner can edit
  if (result.data.author_id !== session.user.id) {
    redirect(`/dashboard/mentorship/${id}`)
  }

  return <ListingForm listing={result.data} mode="edit" />
}
