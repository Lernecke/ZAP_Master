import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { ListingForm } from '../components/ListingForm'

export const metadata = {
  title: 'Neues Inserat | Götti-System | ZAP',
  description: 'Erstelle ein neues Angebot oder Gesuch',
}

export default async function NewListingPage() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }

  return <ListingForm mode="create" />
}
