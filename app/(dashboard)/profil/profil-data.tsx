import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { ProfilClient } from './profil-client'
import type { PaymentRecord } from '@/types/payment'

interface Props {
  userId: string
  token: string
  email: string | null | undefined
  emailVerified: boolean
}

type ThemePreference = 'light' | 'dark' | 'system' | null

function normalizeThemePreference(value: string | null): ThemePreference {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  return null
}

export async function ProfilData({ userId, token, email, emailVerified }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)

  const profileQuery = userId
    ? supabase.from('user').select('*').eq('id', userId).maybeSingle()
    : email
    ? supabase.from('user').select('*').eq('email', email).maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const progressQuery = isUuid
    ? supabase.from('trainer_progress').select('*').eq('user_id', userId)
    : Promise.resolve({ data: null, error: null })

  const { data: profile } = await profileQuery

  const targetEmail = profile?.email || email || null

  // Explicitly filter payments by user_id OR customer_email to guarantee scoping
  const filterConditions = [
    userId ? `user_id.eq.${userId}` : null,
    targetEmail ? `metadata->>customer_email.eq.${targetEmail}` : null,
  ].filter(Boolean)

  const paymentsQuery = filterConditions.length > 0
    ? supabase
        .from('payments')
        .select('*')
        .or(filterConditions.join(','))
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const [{ data: progressData }, { data: paymentsData }] = await Promise.all([
    progressQuery,
    paymentsQuery,
  ])

  const completedExams = progressData?.filter((p) => p.completed_at).length || 0
  const totalAttempts = progressData?.length || 0

  let firstName = profile?.first_name || null
  let lastName = profile?.last_name || null
  if (!firstName && !lastName && profile?.name) {
    const parts = profile.name.trim().split(/\s+/)
    firstName = parts[0] || null
    lastName = parts.slice(1).join(' ') || null
  }

  const profileData = profile
    ? {
        ...profile,
        first_name: firstName,
        last_name: lastName,
        email: profile.email || email || null,
        email_verified: emailVerified,
        account_type: profile.account_type || 'parent_solo',
        parent_id: profile.parent_id || null,
        theme_preference: normalizeThemePreference(profile.theme_preference),
        created_at: profile.createdAt || profile.created_at || null,
      }
    : {
        id: userId,
        email: email ?? null,
        email_verified: emailVerified,
        first_name: null,
        last_name: null,
        avatar_url: null,
        bio: null,
        school_name: null,
        class_level: null,
        birth_date: null,
        gender: null,
        role: 'user',
        account_type: 'parent_solo',
        parent_id: null,
        theme_preference: 'light' as const,
        created_at: null,
      }

  const rawPaymentsList = paymentsData || []

  // Group payments by anmeldung_id so each course registration only shows 1 status (succeeded if any, else latest)
  const paymentsByAnmeldung = new Map<string, (typeof rawPaymentsList)[number]>()
  const standalonePayments: (typeof rawPaymentsList)[number][] = []

  for (const p of rawPaymentsList) {
    if (!p.anmeldung_id) {
      standalonePayments.push(p)
    } else {
      const existing = paymentsByAnmeldung.get(p.anmeldung_id)
      if (!existing) {
        paymentsByAnmeldung.set(p.anmeldung_id, p)
      } else if (existing.status !== 'succeeded' && p.status === 'succeeded') {
        paymentsByAnmeldung.set(p.anmeldung_id, p)
      }
    }
  }

  const sortedPayments = [
    ...Array.from(paymentsByAnmeldung.values()),
    ...standalonePayments,
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Enrich payments with course and beneficiary information
  const anmeldungIds = sortedPayments.map((p) => p.anmeldung_id).filter(Boolean) as string[]

  const [{ data: anmeldungenData }, { data: childrenData }] = await Promise.all([
    anmeldungIds.length > 0
      ? supabase
          .from('intensivwoche_anmeldungen')
          .select(`
            id,
            child_firstname,
            child_lastname,
            beneficiary_user_id,
            kurs_id,
            intensivwoche_kurse ( name, fach )
          `)
          .in('id', anmeldungIds)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase
          .from('user')
          .select('id, name, first_name, last_name')
          .eq('parent_id', userId)
      : Promise.resolve({ data: [] }),
  ])

  interface EnrichedAnmeldung {
    id: string
    child_firstname: string | null
    child_lastname: string | null
    beneficiary_user_id: string | null
    kurs_id: number | null
    intensivwoche_kurse: { name: string; fach: string } | null
  }

  const anmeldungMap = new Map<string, EnrichedAnmeldung>()
  if (anmeldungenData) {
    for (const a of anmeldungenData) {
      anmeldungMap.set(a.id, a as unknown as EnrichedAnmeldung)
    }
  }

  const childMap = new Map<string, string>()
  if (childrenData) {
    for (const c of childrenData) {
      const name = c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Kind'
      childMap.set(c.id, name)
    }
  }

  const payments: PaymentRecord[] = sortedPayments.map((p) => {
    const meta = (p.metadata as Record<string, unknown> | null) || {}
    const anmeldung = p.anmeldung_id ? anmeldungMap.get(p.anmeldung_id) : null

    const courseName =
      (anmeldung?.intensivwoche_kurse as { name?: string } | null)?.name ||
      (typeof meta.kurs_name === 'string' ? meta.kurs_name : null) ||
      (typeof meta.description === 'string' ? meta.description : null) ||
      (p.anmeldung_id ? 'Kursbuchung' : 'Stripe Zahlung')

    const beneficiaryUserId =
      anmeldung?.beneficiary_user_id ||
      (typeof meta.beneficiary_user_id === 'string' ? meta.beneficiary_user_id : null)

    let beneficiaryName =
      (typeof meta.beneficiary_name === 'string' ? meta.beneficiary_name : null) ||
      (beneficiaryUserId && childMap.has(beneficiaryUserId) ? childMap.get(beneficiaryUserId) : null) ||
      (anmeldung?.child_firstname || anmeldung?.child_lastname
        ? [anmeldung.child_firstname, anmeldung.child_lastname].filter(Boolean).join(' ')
        : null)

    const isForChild = Boolean(
      (beneficiaryUserId && beneficiaryUserId !== userId) ||
        meta.booking_mode === 'child' ||
        (beneficiaryUserId && childMap.has(beneficiaryUserId))
    )

    if (!beneficiaryName) {
      beneficiaryName = isForChild ? 'Kind' : 'Mich selbst'
    }

    return {
      id: p.id,
      anmeldung_id: p.anmeldung_id,
      user_id: p.user_id,
      stripe_payment_intent_id: p.stripe_payment_intent_id,
      stripe_checkout_session_id: p.stripe_checkout_session_id,
      amount_rappen: p.amount_rappen,
      currency: p.currency,
      status: p.status as PaymentRecord['status'],
      payment_method_types: p.payment_method_types,
      metadata: meta,
      created_at: p.created_at,
      updated_at: p.updated_at,
      course_name: courseName,
      beneficiary_name: beneficiaryName,
      beneficiary_user_id: beneficiaryUserId,
      is_for_child: isForChild,
    }
  })

  return (
    <ProfilClient
      profile={profileData}
      stats={{ totalAttempts, completedExams }}
      payments={payments}
    />
  )
}
