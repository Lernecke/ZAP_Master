'use server'

import { auth } from '@/lib/auth/config'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { sendMagicLinkEmailMailpit } from '@/lib/mail/mailpit-client'
import { createChildAccountSchema, type CreateChildAccountInput, type ChildAccount } from '@/types/family'

/**
 * Creates a child account linked to the logged-in parent user.
 * Dispatches a Magic Link email automatically and returns the magic link URL so the parent can copy it.
 */
export async function createChildAccountAction(input: CreateChildAccountInput): Promise<{
  success: boolean
  error?: string
  magicLinkUrl?: string
  child?: ChildAccount
}> {
  const session = await auth()
  if (!session || !session.user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  // Guard: Children accounts cannot create sub-accounts
  if (session.user.accountType === 'child' || session.user.parentId) {
    return { success: false, error: 'Kinderkonten können keine weiteren Unterkonten erstellen.' }
  }

  const parsed = createChildAccountSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Validierungsfehler' }
  }

  const { firstName, lastName, email, classLevel, schoolName } = parsed.data
  const supabase = createAdminSupabaseClient()

  // 1. Check if email already exists
  const { data: existingUser } = await supabase
    .from('user')
    .select('id')
    .eq('email', email.toLowerCase())
    .maybeSingle()

  if (existingUser) {
    return { success: false, error: 'Diese E-Mail-Adresse wird bereits verwendet.' }
  }

  const childId = crypto.randomUUID()
  const fullName = `${firstName} ${lastName}`.trim()
  const nowISO = new Date().toISOString()

  // 2. Insert child into public."user" table
  const { error: insertError } = await supabase.from('user').insert({
    id: childId,
    name: fullName,
    email: email.toLowerCase(),
    emailVerified: false,
    first_name: firstName,
    last_name: lastName,
    class_level: classLevel || null,
    school_name: schoolName || null,
    account_type: 'child',
    parent_id: session.user.id,
    role: 'user',
    createdAt: nowISO,
    updatedAt: nowISO,
  })

  if (insertError) {
    console.error('[FamilyActions] Error inserting child user:', insertError)
    return { success: false, error: 'Kinderkonto konnte nicht erstellt werden.' }
  }

  // 3. Generate Magic Link Token
  const magicLinkResult = await generateAndSendMagicLink(email.toLowerCase())
  if (!magicLinkResult.success) {
    return {
      success: true,
      error: 'Konto erstellt, aber Magic Link konnte nicht gesendet werden.',
      child: {
        id: childId,
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        class_level: classLevel || null,
        school_name: schoolName || null,
        created_at: nowISO,
      },
    }
  }

  return {
    success: true,
    magicLinkUrl: magicLinkResult.magicLinkUrl,
    child: {
      id: childId,
      email: email.toLowerCase(),
      first_name: firstName,
      last_name: lastName,
      name: fullName,
      class_level: classLevel || null,
      school_name: schoolName || null,
      created_at: nowISO,
      magicLinkUrl: magicLinkResult.magicLinkUrl,
    },
  }
}

/**
 * Fetches all child accounts belonging to the authenticated parent.
 */
export async function getChildrenAction(): Promise<{
  success: boolean
  children?: ChildAccount[]
  error?: string
}> {
  const session = await auth()
  if (!session || !session.user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  // Children accounts cannot view parent or sibling management
  if (session.user.accountType === 'child' || session.user.parentId) {
    return { success: true, children: [] }
  }

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('user')
    .select('id, email, name, first_name, last_name, class_level, school_name, createdAt')
    .eq('parent_id', session.user.id)
    .order('createdAt', { ascending: false })

  if (error) {
    console.error('[FamilyActions] Error fetching children:', error)
    return { success: false, error: 'Kinderkonten konnten nicht geladen werden.' }
  }

  return {
    success: true,
    children: (data || []).map((c: {
      id: string
      email: string
      name: string
      first_name: string | null
      last_name: string | null
      class_level: string | null
      school_name: string | null
      createdAt: string | null
    }) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      first_name: c.first_name,
      last_name: c.last_name,
      class_level: c.class_level,
      school_name: c.school_name,
      created_at: c.createdAt,
    })),
  }
}

/**
 * Regenerates a Magic Link for a child account and sends an email.
 */
export async function regenerateChildMagicLinkAction(childId: string): Promise<{
  success: boolean
  magicLinkUrl?: string
  error?: string
}> {
  const session = await auth()
  if (!session || !session.user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAdminSupabaseClient()
  const { data: childUser, error } = await supabase
    .from('user')
    .select('id, email, parent_id')
    .eq('id', childId)
    .maybeSingle()

  if (error || !childUser) {
    return { success: false, error: 'Kinderkonto nicht gefunden.' }
  }

  if (childUser.parent_id !== session.user.id && session.user.role !== 'admin') {
    return { success: false, error: 'Keine Berechtigung für dieses Kinderkonto.' }
  }

  return generateAndSendMagicLink(childUser.email)
}

/**
 * Removes a child account from the parent's family overview.
 */
export async function deleteChildAccountAction(childId: string): Promise<{
  success: boolean
  error?: string
}> {
  const session = await auth()
  if (!session || !session.user) {
    return { success: false, error: 'Nicht authentifiziert' }
  }

  const supabase = createAdminSupabaseClient()
  const { data: childUser } = await supabase
    .from('user')
    .select('id, parent_id')
    .eq('id', childId)
    .maybeSingle()

  if (!childUser || (childUser.parent_id !== session.user.id && session.user.role !== 'admin')) {
    return { success: false, error: 'Keine Berechtigung zum Löschen dieses Kontos.' }
  }

  const { error: deleteError } = await supabase.from('user').delete().eq('id', childId)

  if (deleteError) {
    console.error('[FamilyActions] Error deleting child user:', deleteError)
    return { success: false, error: 'Kinderkonto konnte nicht gelöscht werden.' }
  }

  return { success: true }
}

/**
 * Helper function to create verification token in "verification" table and send Magic Link email.
 */
async function generateAndSendMagicLink(email: string): Promise<{
  success: boolean
  magicLinkUrl?: string
  error?: string
}> {
  try {
    const supabase = createAdminSupabaseClient()
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    const { data: user } = await supabase
      .from('user')
      .select('name')
      .eq('email', email)
      .maybeSingle()

    const userName = user?.name || ''

    // Insert verification token matching Better Auth magicLink plugin requirement:
    // identifier MUST be the token string, and value MUST be JSON.stringify({ email, name })
    const { error: tokenErr } = await supabase.from('verification').insert({
      id: crypto.randomUUID(),
      identifier: token,
      value: JSON.stringify({ email, name: userName }),
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    if (tokenErr) {
      console.error('[FamilyActions] Verification token insert error:', tokenErr)
      return { success: false, error: 'Magic Link Token konnte nicht erstellt werden.' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const magicLinkUrl = `${appUrl}/api/auth/magic-link/verify?token=${token}&callbackURL=${encodeURIComponent(
      '/dashboard'
    )}`

    // Send email automatically
    await sendMagicLinkEmailMailpit({ email, url: magicLinkUrl })

    return { success: true, magicLinkUrl }
  } catch (err) {
    console.error('[FamilyActions] Magic link dispatch error:', err)
    return { success: false, error: 'E-Mail Versand fehlgeschlagen.' }
  }
}
