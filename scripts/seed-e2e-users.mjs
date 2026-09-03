#!/usr/bin/env node
// Legt/aktualisiert die beiden lokalen E2E-Testnutzer an (Abschnitt 10.1 des
// Architektur-Briefings). Laeuft NACH `supabase db reset --local`, da der Reset auth.users leert.
//
// Bewusst ueber die Supabase Admin API (auth.admin.createUser), nicht per rohem INSERT in
// auth.users: ein direktes INSERT muesste GoTrue-interne Pflichtfelder/Constraints nachbilden und
// koennte bei einer CLI-/GoTrue-Versionsaenderung stillschweigend brechen. Die Admin-API ist die
// vom Supabase-Team unterstuetzte Schnittstelle dafuer.
//
// Nutzung: node scripts/seed-e2e-users.mjs

import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { getLocalSupabaseStatus, projectRoot } from './lib/local-supabase.mjs'

function loadEnvTestLocal() {
  const filePath = path.join(projectRoot, '.env.test.local')
  if (!existsSync(filePath)) {
    console.error('Abbruch: .env.test.local fehlt. Kopiere .env.test.local.example nach .env.test.local.')
    process.exit(1)
  }
  const vars = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return vars
}

const envTest = loadEnvTestLocal()
const required = ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD']
for (const key of required) {
  if (!envTest[key]) {
    console.error(`Abbruch: ${key} fehlt in .env.test.local.`)
    process.exit(1)
  }
}

const status = getLocalSupabaseStatus()
const admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const users = [
  { email: envTest.E2E_USER_EMAIL, password: envTest.E2E_USER_PASSWORD, role: 'user', firstName: 'E2E', lastName: 'User' },
  { email: envTest.E2E_ADMIN_EMAIL, password: envTest.E2E_ADMIN_PASSWORD, role: 'admin', firstName: 'E2E', lastName: 'Admin' },
]

for (const u of users) {
  let userId
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
  })

  if (createError) {
    // Bereits vorhanden (z.B. Skript ohne vorherigen db reset erneut ausgefuehrt) -- Passwort
    // trotzdem auf den aktuellen .env.test.local-Wert zuruecksetzen, damit Login-Tests nicht an
    // einem veralteten Passwort scheitern.
    const { data: list, error: listError } = await admin.auth.admin.listUsers()
    if (listError) {
      console.error(`Fehler beim Anlegen von ${u.email}:`, createError.message)
      process.exit(1)
    }
    const existing = list.users.find((entry) => entry.email === u.email)
    if (!existing) {
      console.error(`Fehler beim Anlegen von ${u.email}:`, createError.message)
      process.exit(1)
    }
    userId = existing.id
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: u.password })
    if (updateError) {
      console.error(`Fehler beim Aktualisieren des Passworts fuer ${u.email}:`, updateError.message)
      process.exit(1)
    }
  } else {
    userId = created.user.id
  }

  const { error: profileError } = await admin
    .from('user')
    .upsert({ id: userId, email: u.email, first_name: u.firstName, last_name: u.lastName, role: u.role, name: `${u.firstName} ${u.lastName}`.trim() })

  if (profileError) {
    console.error(`Fehler beim Aktualisieren des Profils fuer ${u.email}:`, profileError.message)
    process.exit(1)
  }

  console.log(`OK: ${u.email} (${u.role}, id=${userId})`)
}
