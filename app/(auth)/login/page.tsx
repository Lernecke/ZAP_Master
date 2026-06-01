import { Suspense } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Skeleton } from '@/app/components/ui/skeleton'
import { LoginForm } from './login-form'


export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            ZAP
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <Skeleton className="h-9 w-64 mx-auto" />
        <Skeleton className="h-5 w-72 mx-auto" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
      <Skeleton className="h-4 w-48 mx-auto" />
    </div>
  )
}
