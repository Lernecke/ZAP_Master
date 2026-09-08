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
  source?: string
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
    source?: string
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

    // 2. Fetch Better Auth users
    const { data: rawBetterUsers } = await adminSupabase
      .from('user')
      .select('id, email, name, first_name, last_name, role, created_at')

    // 3. Fetch Supabase Auth users
    const { data: rawAuthUsers } = await adminSupabase.auth.admin.listUsers()

    // 4. Fetch Anmeldungen (Course Registrations)
    const { data: rawAnmeldungen } = await adminSupabase
      .from('intensivwoche_anmeldungen')
      .select('id, parent_email, child_firstname, child_lastname, beneficiary_user_id')

    const userById = new Map<string, { id: string; email: string | null; name: string | null; role: string | null; source: string }>()
    const userByEmail = new Map<string, { id: string; email: string | null; name: string | null; role: string | null; source: string }>()
    const anmeldungMap = new Map<string, { parent_email: string; child_name: string }>()

    // Process Better Auth users
    if (rawBetterUsers) {
      rawBetterUsers.forEach((u) => {
        const displayName = u.name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id
        const userObj = {
          id: u.id,
          email: u.email || null,
          name: displayName,
          role: u.role || 'user',
          source: 'Better Auth',
        }
        userById.set(u.id, userObj)
        if (u.email) {
          userByEmail.set(u.email.toLowerCase(), userObj)
        }
      })
    }

    // Process Supabase Auth users
    if (rawAuthUsers && rawAuthUsers.users) {
      rawAuthUsers.users.forEach((u) => {
        const metaName = u.user_metadata?.full_name || u.user_metadata?.name || u.email
        const userObj = {
          id: u.id,
          email: u.email || null,
          name: metaName || u.email || u.id,
          role: (u.user_metadata?.role as string) || 'user',
          source: 'Supabase Auth',
        }
        if (!userById.has(u.id)) userById.set(u.id, userObj)
        if (u.email && !userByEmail.has(u.email.toLowerCase())) {
          userByEmail.set(u.email.toLowerCase(), userObj)
        }
      })
    }

    // Process Anmeldungen
    if (rawAnmeldungen) {
      rawAnmeldungen.forEach((a) => {
        anmeldungMap.set(a.id, {
          parent_email: a.parent_email,
          child_name: [a.child_firstname, a.child_lastname].filter(Boolean).join(' '),
        })
      })
    }

    // Map payments to resolved users
    const mappedPayments: AdminPaymentRecord[] = (rawPayments || []).map((p) => {
      let matchedUser = p.user_id ? userById.get(p.user_id) || null : null

      const customerEmail = p.metadata && typeof p.metadata === 'object' && 'customer_email' in p.metadata && p.metadata.customer_email
        ? String(p.metadata.customer_email).toLowerCase()
        : null

      if (!matchedUser && customerEmail) {
        matchedUser = userByEmail.get(customerEmail) || null
      }

      if (!matchedUser && p.anmeldung_id) {
        const anmeldung = anmeldungMap.get(p.anmeldung_id)
        if (anmeldung) {
          const userFromEmail = userByEmail.get(anmeldung.parent_email.toLowerCase())
          if (userFromEmail) {
            matchedUser = userFromEmail
          } else {
            matchedUser = {
              id: p.anmeldung_id,
              email: anmeldung.parent_email,
              name: `Kind: ${anmeldung.child_name || 'Unbekannt'}`,
              role: 'anmeldung',
              source: 'Kursanmeldung',
            }
          }
        }
      }

      if (!matchedUser && customerEmail) {
        matchedUser = {
          id: p.user_id || 'gast',
          email: customerEmail,
          name: customerEmail.split('@')[0],
          role: 'gast',
          source: 'Gast-Zahlung',
        }
      }

      if (!matchedUser && p.user_id) {
        matchedUser = {
          id: p.user_id,
          email: customerEmail,
          name: customerEmail || `User (${p.user_id.slice(0, 8)})`,
          role: 'user',
          source: 'Benutzer ID',
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

    // Search filter
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

      return matchId || matchStatus || matchSession || matchIntent || matchAmount || matchUserEmail || matchUserName || matchUserId
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

    const userMap = new Map<string, AdminUserRecord>()

    const registerUser = (u: {
      id: string
      email: string | null
      name: string | null
      role: string | null
      created_at: string | null
      source: string
    }) => {
      const normEmail = u.email ? u.email.toLowerCase().trim() : null
      
      let existing = userMap.get(u.id)
      if (!existing && normEmail) {
        existing = userMap.get(normEmail)
      }

      if (existing) {
        if (!existing.email && u.email) existing.email = u.email
        if ((!existing.name || existing.name === existing.id || existing.name === existing.email) && u.name) {
          existing.name = u.name
        }
        if (!existing.created_at && u.created_at) existing.created_at = u.created_at
        if ((!existing.role || existing.role === 'user') && u.role && u.role !== 'user') existing.role = u.role
        
        userMap.set(u.id, existing)
        if (normEmail) userMap.set(normEmail, existing)
      } else {
        const newUser: AdminUserRecord = {
          id: u.id,
          name: u.name || u.email || u.id,
          email: u.email || null,
          role: u.role || 'user',
          created_at: u.created_at || null,
          total_payments_count: 0,
          succeeded_amount_rappen: 0,
          source: u.source,
        }
        userMap.set(u.id, newUser)
        if (normEmail) userMap.set(normEmail, newUser)
      }
    }

    // 1. Fetch Better Auth users from table "user"
    try {
      const { data: rawBetterUsers, error: betterErr } = await (adminSupabase as any)
        .from('user')
        .select('id, email, name, role, createdAt')

      if (betterErr) {
        console.error('Error fetching table "user":', betterErr)
      } else if (rawBetterUsers && Array.isArray(rawBetterUsers)) {
        rawBetterUsers.forEach((u: any) => {
          registerUser({
            id: u.id,
            email: u.email || null,
            name: u.name || u.email || u.id,
            role: u.role || 'user',
            created_at: u.createdAt || null,
            source: 'Better Auth',
          })
        })
      }
    } catch (e) {
      console.error('Failed to query "user" table:', e)
    }

    // 2. Fetch Profiles from table "profiles"
    try {
      const { data: rawProfiles, error: profilesErr } = await (adminSupabase as any)
        .from('profiles')
        .select('id, email, first_name, last_name, role, created_at')

      if (profilesErr) {
        console.error('Error fetching table "profiles":', profilesErr)
      } else if (rawProfiles && Array.isArray(rawProfiles)) {
        rawProfiles.forEach((p: any) => {
          const displayName = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.email || p.id
          registerUser({
            id: String(p.id),
            email: p.email || null,
            name: displayName,
            role: p.role || 'user',
            created_at: p.created_at || null,
            source: 'Supabase Profile',
          })
        })
      }
    } catch (e) {
      console.error('Failed to query "profiles" table:', e)
    }

    // 3. Fetch Supabase Auth users
    try {
      const { data: rawAuthUsers, error: authUsersErr } = await adminSupabase.auth.admin.listUsers()

      if (authUsersErr) {
        console.error('Error fetching auth.users:', authUsersErr)
      } else if (rawAuthUsers && rawAuthUsers.users) {
        rawAuthUsers.users.forEach((u) => {
          const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.email || u.id
          registerUser({
            id: u.id,
            email: u.email || null,
            name: displayName,
            role: (u.user_metadata?.role as string) || 'user',
            created_at: u.created_at || null,
            source: 'Supabase Auth',
          })
        })
      }
    } catch (e) {
      console.error('Failed to query auth.users:', e)
    }

    // 4. Fetch all payments to aggregate totals for registered users
    const { data: rawPayments, error: paymentsErr } = await adminSupabase
      .from('payments')
      .select('id, user_id, amount_rappen, status, metadata')

    if (paymentsErr) {
      console.error('Error fetching payments in admin users tab:', paymentsErr)
    }

    // Process Payments & Aggregate Totals ONLY for Registered Users
    if (rawPayments) {
      rawPayments.forEach((p) => {
        let matchedUser: AdminUserRecord | null = null

        if (p.user_id) {
          matchedUser = userMap.get(p.user_id) || null
        }

        if (!matchedUser && p.metadata && typeof p.metadata === 'object' && 'customer_email' in p.metadata && p.metadata.customer_email) {
          const customerEmail = String(p.metadata.customer_email).toLowerCase().trim()
          if (customerEmail) {
            matchedUser = userMap.get(customerEmail) || null
          }
        }

        if (matchedUser) {
          matchedUser.total_payments_count += 1
          if (p.status === 'succeeded') {
            matchedUser.succeeded_amount_rappen += p.amount_rappen
          }
        }
      })
    }

    // Deduplicate user list
    const uniqueUsersList = Array.from(new Set(userMap.values()))

    // Sort by registration date descending
    uniqueUsersList.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })

    const query = userSearchQuery.trim().toLowerCase()
    if (!query) {
      return { users: uniqueUsersList }
    }

    const filtered = uniqueUsersList.filter((u) => {
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

/**
 * Manually flag a payment record as 'succeeded' and confirm linked course registrations.
 */
export async function manuallyMarkPaymentSucceededAction(paymentId: string): Promise<{
  success: boolean
  error?: string
}> {
  const isAuthenticated = await checkAdminAuthAction()
  if (!isAuthenticated) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  try {
    const adminSupabase = createAdminSupabaseClient()

    // Fetch target payment
    const { data: payment, error: fetchErr } = await adminSupabase
      .from('payments')
      .select('id, stripe_checkout_session_id, stripe_payment_intent_id, anmeldung_id')
      .eq('id', paymentId)
      .single()

    if (fetchErr || !payment) {
      return { success: false, error: 'Zahlungsdatensatz nicht gefunden' }
    }

    // Call RPC to process status update atomically
    const { error: rpcErr } = await adminSupabase.rpc('process_stripe_payment_update', {
      p_checkout_session_id: payment.stripe_checkout_session_id,
      p_payment_intent_id: payment.stripe_payment_intent_id,
      p_status: 'succeeded',
      p_metadata: {
        manually_flagged_succeeded_at: new Date().toISOString(),
        flagged_by: 'admin_dashboard',
      },
    })

    if (rpcErr) {
      // Direct update fallback if RPC fails
      await adminSupabase
        .from('payments')
        .update({
          status: 'succeeded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      if (payment.anmeldung_id) {
        await adminSupabase
          .from('intensivwoche_anmeldungen')
          .update({
            status: 'confirmed',
            paid_at: new Date().toISOString(),
          })
          .eq('id', payment.anmeldung_id)
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Error in manuallyMarkPaymentSucceededAction:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unerwarteter Fehler' }
  }
}
