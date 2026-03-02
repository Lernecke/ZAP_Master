import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import DashboardNavbar from '@/app/components/layout/DashboardNavbar'
import Sidebar from '@/app/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  )
}
