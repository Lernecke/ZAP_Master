import Link from 'next/link'
import { Zap } from 'lucide-react'
import { RegisterForm } from './register-form'


export default function RegisterPage() {
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
        <RegisterForm />
      </main>
    </div>
  )
}
