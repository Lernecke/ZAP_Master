import { auth } from './config'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/next-auth'

/**
 * Server-side Auth Guard für geschützte Routen
 * Verwendet in Server Components
 */
export async function requireAuth() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }
  
  return session
}

/**
 * Prüft ob User mindestens Lehrperson ist (Content-Manager)
 * Für: Kursverwaltung, Übungen, Materialien
 */
export async function requireContentManager() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }
  
  const role = session.user.role
  if (role !== 'lehrperson' && role !== 'admin') {
    redirect('/dashboard?error=unauthorized')
  }
  
  return session
}

/**
 * Prüft ob User System-Admin ist
 * Für: Benutzerverwaltung, Systemeinstellungen, sensible Daten
 */
export async function requireAdmin() {
  const session = await auth()
  
  if (!session?.user) {
    redirect('/login')
  }
  
  if (session.user.role !== 'admin') {
    redirect('/dashboard?error=unauthorized')
  }
  
  return session
}

/**
 * Prüft Rolle ohne Redirect (für bedingte Anzeige)
 */
export async function getUserRole(): Promise<UserRole | null> {
  const session = await auth()
  return session?.user?.role || null
}

/**
 * Prüft ob User Content Manager ist (ohne Redirect)
 */
export async function isContentManager(): Promise<boolean> {
  const session = await auth()
  const role = session?.user?.role
  return role === 'lehrperson' || role === 'admin'
}

/**
 * Prüft ob User Admin ist (ohne Redirect)
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === 'admin'
}
