import { Users, Search, UserPlus, Shield, ShieldCheck, User } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { requireAdmin } from '@/lib/auth/guards'
import { getUsers } from './actions'
import { UserTable } from './UserTable'

export default async function BenutzerPage() {
  const session = await requireAdmin()
  const { users, error } = await getUsers()
  
  // Statistiken
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    lehrpersonen: users.filter(u => u.role === 'lehrperson').length,
    user: users.filter(u => u.role === 'user').length,
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Benutzerverwaltung</h1>
          <p className="text-muted-foreground mt-1">
            Verwalte Benutzerkonten und Berechtigungen
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Gesamt</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.admins}</p>
              <p className="text-sm text-muted-foreground">Admins</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.lehrpersonen}</p>
              <p className="text-sm text-muted-foreground">Lehrpersonen</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.user}</p>
              <p className="text-sm text-muted-foreground">Benutzer</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-6">
          Fehler beim Laden der Benutzer: {error}
        </div>
      )}

      {/* User Table */}
      {users.length > 0 ? (
        <UserTable users={users} currentUserId={session.user.id} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Keine Benutzer gefunden
          </h3>
          <p className="text-muted-foreground">
            Es wurden noch keine Benutzer registriert.
          </p>
        </div>
      )}
    </div>
  )
}
