// Einmaliges Aufräum-Skript für den verwaisten Storage-Bucket `learning_materials`
// (step0Baseline.revision2.md, Storage-Erhebung 18./19.07.2026; Entscheidung 20.07.2026 nach
// Nutzer-Review der lokal gesicherten Dateien). Kein Code referenziert diesen Bucket (der aktive
// Pfad ist `lernmaterialien`), keine RLS-Policy existiert dafür. Alle fünf enthaltenen Dateien sind
// bereits verifiziert lokal gesichert unter
// docs/migration-evidence/private/2026-07-19/learning_materials_backup/.
//
// Läuft NUR gegen das Live-Projekt (kein lokaler Modus nötig) und braucht service_role. Prüft vor
// jeder Löschung, dass die Objektliste exakt den fünf erwarteten, bereits gesicherten Dateien
// entspricht -- bricht sonst ohne Löschung ab.
//
// Ausführen:
//   npx tsx scripts/decommission-learning-materials-bucket.ts

import { createClient } from '@supabase/supabase-js'

const BUCKET = 'learning_materials'
const EXPECTED_PROJECT_REF = 'ybzdibifgqjsbohtztmy'
const EXPECTED_OBJECTS = [
  '2023_mathematik_aufgaben_lg.pdf',
  '2023_mathematik_loesungen_lg.pdf',
  '2023_sprachpruefung_lg.pdf',
  '2023_sprachpruefung_loesung_lg.pdf',
  '2023_textblatt_lg.pdf',
].sort()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceKey) {
  console.error('Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!supabaseUrl.includes(EXPECTED_PROJECT_REF)) {
  console.error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL ("${supabaseUrl}") passt nicht zum erwarteten Projekt "${EXPECTED_PROJECT_REF}".`)
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey)

async function main() {
  const { data: objects, error: listError } = await admin.storage.from(BUCKET).list('', { limit: 100 })

  if (listError) {
    console.error('Objektliste konnte nicht gelesen werden.', listError)
    process.exit(1)
  }

  const actualNames = (objects ?? []).map((o) => o.name).sort()
  const matches =
    actualNames.length === EXPECTED_OBJECTS.length &&
    actualNames.every((name, i) => name === EXPECTED_OBJECTS[i])

  if (!matches) {
    console.error('Abbruch: Bucket-Inhalt weicht von den erwarteten, bereits gesicherten fünf Dateien ab.')
    console.error('Erwartet:', EXPECTED_OBJECTS)
    console.error('Gefunden:', actualNames)
    process.exit(1)
  }

  console.log(`Bestätigt: alle ${EXPECTED_OBJECTS.length} Objekte in "${BUCKET}" entsprechen dem verifizierten lokalen Backup. Lösche Objekte...`)

  const { error: removeError } = await admin.storage.from(BUCKET).remove(EXPECTED_OBJECTS)
  if (removeError) {
    console.error('Löschen der Objekte fehlgeschlagen.', removeError)
    process.exit(1)
  }

  console.log('Objekte gelöscht. Lösche Bucket...')

  const { error: deleteBucketError } = await admin.storage.deleteBucket(BUCKET)
  if (deleteBucketError) {
    console.error('Löschen des Buckets fehlgeschlagen.', deleteBucketError)
    process.exit(1)
  }

  console.log(`PASS: Bucket "${BUCKET}" vollständig entfernt. Dateien bleiben lokal gesichert unter docs/migration-evidence/private/2026-07-19/learning_materials_backup/.`)
}

main()
