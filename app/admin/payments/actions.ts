'use server'

import { cookies } from 'next/headers'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

const AUTH_COOKIE_NAME = 'admin_payments_auth_session'

function getExpectedPassword(): string {
  return process.env.ADMIN_PAYMENTS_PASSWORD || 'admin123'
}

export async function checkAdminAuthAction(): Promise<boolean> {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME)
  return authCookie?.value === 'authenticated'
}

export async function loginAdminAction(password: string): Promise<{ success: boolean; error?: string }> {
  const expectedPassword = getExpectedPassword()
  if (password === expectedPassword) {
    const cookieStore = await cookies()
    cookieStore.set(AUTH_COOKIE_NAME, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    return { success: true }
  }
  return { success: false, error: 'Falsches Passwort.' }
}

export async function logoutAdminAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(AUTH_COOKIE_NAME)
}

export interface AdminUserRecord {
  id: string
  name: string | null
  email: string | null
  role: string | null
  created_at: string | null
  total_payments_count: number
  succeeded_amount_rappen: number
}

export interface AdminPaymentRecord {
  id: string
  anmeldung_id: string | null
  user_id: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  amount_rappen: number
  currency: string
  status: string
  payment_method_types: string[]
  metadata: Record<string, unknown> | null
  created_at: string
  user: {
    id: string
    email: string | null
    name: string | null
    role: string | null
  } | null
}

export async function getAdminPaymentsDataAction(searchQuery = ''): Promise<{
  payments: AdminPaymentRecord[]
  error?: string
}> {
  const isAuthenticated = await checkAdminAuthAction()
  if (!isAuthenticated) {
    return { payments: [], error: 'Nicht authentifiziert' }
  }

  try {
    const adminSupabase = createAdminSupabaseClient()

    // 1. Fetch payments
    const { data: rawPayments, error: paymentsErr } = await adminSupabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })

    if (paymentsErr) {
      console.error('Error fetching payments in admin:', paymentsErr)
      return { payments: [], error: 'Fehler beim Laden der Zahlungen' }
    }

    // 2. Fetch users
    const { data: rawUsers, error: usersErr } = await adminSupabase
      .from('user')
      .select('id, email, name, first_name, last_name, role')

    if (usersErr) {
      console.error('Error fetching users in admin:', usersErr)
    }

    const userMap = new Map<string, { id: string; email: string | null; name: string | null; role: string | null }>()
    const emailToUserMap = new Map<string, { id: string; email: string | null; name: string | null; role: string | null }>()

    if (rawUsers) {
      rawUsers.forEach((u) => {
        const displayName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id
        const userObj = {
          id: u.id,
          email: u.email || null,
          name: displayName,
          role: u.role || 'user',
        }
        userMap.set(u.id, userObj)
        if (u.email) {
          emailToUserMap.set(u.email.toLowerCase(), userObj)
        }
      })
    }

    // 3. Map payments to users
    const mappedPayments: AdminPaymentRecord[] = (rawPayments || []).map((p) => {
      let matchedUser = p.user_id ? userMap.get(p.user_id) || null : null
      
      if (!matchedUser && p.metadata) {
        const customerEmail = typeof p.metadata === 'object' && p.metadata !== null && 'customer_email' in p.metadata
          ? String(p.metadata.customer_email).toLowerCase()
          : null
        if (customerEmail) {
          matchedUser = emailToUserMap.get(customerEmail) || null
        }
      }

      return {
        id: p.id,
        anmeldung_id: p.anmeldung_id,
        user_id: p.user_id,
        stripe_payment_intent_id: p.stripe_payment_intent_id,
        stripe_checkout_session_id: p.stripe_checkout_session_id,
        amount_rappen: p.amount_rappen,
        currency: p.currency,
        status: p.status,
        payment_method_types: p.payment_method_types,
        metadata: p.metadata as Record<string, unknown> | null,
        created_at: p.created_at,
        user: matchedUser,
      }
    })

    // 4. Apply search filtering
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return { payments: mappedPayments }
    }

    const filtered = mappedPayments.filter((p) => {
      const matchId = p.id.toLowerCase().includes(query)
      const matchStatus = p.status.toLowerCase().includes(query)
      const matchSession = p.stripe_checkout_session_id?.toLowerCase().includes(query) || false
      const matchIntent = p.stripe_payment_intent_id?.toLowerCase().includes(query) || false
      const matchAmount = (p.amount_rappen / 100).toString().includes(query)
      const matchUserEmail = p.user?.email?.toLowerCase().includes(query) || false
      const matchUserName = p.user?.name?.toLowerCase().includes(query) || false
      const matchUserId = p.user?.id?.toLowerCase().includes(query) || false
      const matchCustomerEmail = typeof p.metadata?.customer_email === 'string' && p.metadata.customer_email.toLowerCase().includes(query)

      return matchId || matchStatus || matchSession || matchIntent || matchAmount || matchUserEmail || matchUserName || matchUserId || matchCustomerEmail
    })

    return { payments: filtered }
  } catch (err) {
    console.error('Unexpected error in getAdminPaymentsDataAction:', err)
    return { payments: [], error: 'Unerwarteter Serverfehler' }
  }
}

export async function getAdminUsersDataAction(userSearchQuery = ''): Promise<{
  users: AdminUserRecord[]
  error?: string
}> {
  const isAuthenticated = await checkAdminAuthAction()
  if (!isAuthenticated) {
    return { users: [], error: 'Nicht authentifiziert' }
  }

  try {
    const adminSupabase = createAdminSupabaseClient()

    const { data: rawUsers, error: usersErr } = await adminSupabase
      .from('user')
      .select('id, email, name, first_name, last_name, role, created_at')
      .order('created_at', { ascending: false })

    if (usersErr) {
      console.error('Error fetching users in admin:', usersErr)
      return { users: [], error: 'Fehler beim Laden der Benutzer' }
    }

    const { data: rawPayments } = await adminSupabase
      .from('payments')
      .select('id, user_id, amount_rappen, status, metadata')

    const userPaymentCounts = new Map<string, number>()
    const userPaymentSums = new Map<string, number>()
    const emailPaymentCounts = new Map<string, number>()
    const emailPaymentSums = new Map<string, number>()

    if (rawPayments) {
      rawPayments.forEach((p) => {
        if (p.user_id) {
          userPaymentCounts.set(p.user_id, (userPaymentCounts.get(p.user_id) || 0) + 1)
          if (p.status === 'succeeded') {
            userPaymentSums.set(p.user_id, (userPaymentSums.get(p.user_id) || 0) + p.amount_rappen)
          }
        }
        if (p.metadata && typeof p.metadata === 'object' && 'customer_email' in p.metadata) {
          const email = String(p.metadata.customer_email).toLowerCase()
          emailPaymentCounts.set(email, (emailPaymentCounts.get(email) || 0) + 1)
          if (p.status === 'succeeded') {
            emailPaymentSums.set(email, (emailPaymentSums.get(email) || 0) + p.amount_rappen)
          }
        }
      })
    }

    const mappedUsers: AdminUserRecord[] = (rawUsers || []).map((u) => {
      const displayName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id
      const email = u.email ? u.email.toLowerCase() : null
      
      const countById = userPaymentCounts.get(u.id) || 0
      const countByEmail = email ? emailPaymentCounts.get(email) || 0 : 0
      const totalCount = Math.max(countById, countByEmail)

      const sumById = userPaymentSums.get(u.id) || 0
      const sumByEmail = email ? emailPaymentSums.get(email) || 0 : 0
      const totalSum = Math.max(sumById, sumByEmail)

      return {
        id: u.id,
        name: displayName,
        email: u.email || null,
        role: u.role || 'user',
        created_at: u.created_at || null,
        total_payments_count: totalCount,
        succeeded_amount_rappen: totalSum,
      }
    })

    const query = userSearchQuery.trim().toLowerCase()
    if (!query) {
      return { users: mappedUsers }
    }

    const filtered = mappedUsers.filter((u) => {
      const matchName = u.name?.toLowerCase().includes(query) || false
      const matchEmail = u.email?.toLowerCase().includes(query) || false
      const matchId = u.id.toLowerCase().includes(query)
      const matchRole = u.role?.toLowerCase().includes(query) || false

      return matchName || matchEmail || matchId || matchRole
    })

    return { users: filtered }
  } catch (err) {
    console.error('Unexpected error in getAdminUsersDataAction:', err)
    return { users: [], error: 'Unerwarteter Serverfehler' }
  }
}
