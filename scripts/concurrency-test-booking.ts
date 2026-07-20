// Automatisierter Parallelitätstest für den letzten freien Platz
// (step0Baseline.revision2.md, Abschnitt 12, letzter Punkt). pgTAP läuft in einer einzigen
// Session und kann echte Nebenläufigkeit nicht abbilden -- deshalb ein eigenständiges Skript, das
// N gleichzeitige RPC-Aufrufe (als anon, wie ein echter Client) gegen einen Testkurs mit genau
// einem freien Platz feuert und erwartet: exakt ein Erfolg, der Rest 'voll'. Das prüft, dass das
// FOR UPDATE-Kurs-Lock in book_intensivwoche_kurs() echte Races serialisiert statt eine
// Überbuchung durchzulassen.
//
// Lokal ausführen (Supabase muss laufen, `supabase start`):
//   npx tsx scripts/concurrency-test-booking.ts
//
// Nutzt SUPABASE_SERVICE_ROLE_KEY nur für Setup/Cleanup der Testdaten; die eigentlichen
// konkurrierenden Buchungsversuche laufen über den anon-Key, wie ein echter Client.

import { createClient } from '@supabase/supabase-js'

const CONCURRENT_ATTEMPTS = 10

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error(
    'Missing environment variables. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(1)
}

// Sicherheitsnetz: dieses Skript legt Testdaten mit dem service_role-Key an und feuert absichtlich
// eine Race-Bedingung -- niemals gegen eine echte/entfernte Projekt-URL laufen lassen.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(supabaseUrl)) {
  console.error(
    `Refusing to run: NEXT_PUBLIC_SUPABASE_URL ("${supabaseUrl}") sieht nicht nach einer lokalen Supabase-Instanz aus. Dieses Skript darf nur gegen "supabase start" laufen.`
  )
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey)
const anon = createClient(supabaseUrl, anonKey)

async function main() {
  const runId = Date.now()
  const { data: kurs, error: insertError } = await admin
    .from('intensivwoche_kurse')
    .insert({
      name: `Concurrency Test Kurs ${runId}`,
      fach: 'mathematik',
      beschreibung: 'Automatisiert erzeugter Testkurs, wird am Ende des Skripts gelöscht.',
      start_datum: '2026-09-01',
      end_datum: '2026-09-05',
      uhrzeit: '09:00-12:00',
      ort: 'Testort',
      preis: 100.0,
      max_teilnehmer: 1,
      lehrer: 'Test Lehrer',
      ist_aktiv: true,
    })
    .select('id')
    .single()

  if (insertError || !kurs) {
    console.error('Setup fehlgeschlagen: Testkurs konnte nicht angelegt werden.', insertError)
    process.exit(1)
  }

  const kursId = kurs.id as number
  console.log(`Testkurs ${kursId} angelegt (max_teilnehmer = 1). Feuere ${CONCURRENT_ATTEMPTS} gleichzeitige Buchungsversuche...`)

  try {
    const attempts = Array.from({ length: CONCURRENT_ATTEMPTS }, (_, i) =>
      anon.rpc('book_intensivwoche_kurs', {
        p_kurs_id: kursId,
        p_child_firstname: `Kind${i}`,
        p_child_lastname: 'ConcurrencyTest',
        p_child_class_level: '6. Klasse',
        p_child_gender: i % 2 === 0 ? 'w' : 'm',
        p_parent_email: `concurrency-${runId}-${i}@example.com`,
        p_parent_phone: '0791112233',
      })
    )

    const results = await Promise.allSettled(attempts)

    const successes = results.filter((r) => r.status === 'fulfilled' && !r.value.error)
    const vollFailures = results.filter(
      (r) => r.status === 'fulfilled' && r.value.error?.message === 'voll'
    )
    const unexpected = results.filter(
      (r) =>
        r.status === 'rejected' ||
        (r.status === 'fulfilled' && r.value.error && r.value.error.message !== 'voll')
    )

    console.log(`Erfolge: ${successes.length}, 'voll'-Ablehnungen: ${vollFailures.length}, unerwartet: ${unexpected.length}`)

    if (unexpected.length > 0) {
      console.error('Unerwartete Fehler/Antworten:', unexpected)
    }

    const { count: tatsaechlicheZeilen } = await admin
      .from('intensivwoche_anmeldungen')
      .select('id', { count: 'exact', head: true })
      .eq('kurs_id', kursId)

    const pass =
      successes.length === 1 &&
      vollFailures.length === CONCURRENT_ATTEMPTS - 1 &&
      unexpected.length === 0 &&
      tatsaechlicheZeilen === 1

    if (pass) {
      console.log(`PASS: genau 1 von ${CONCURRENT_ATTEMPTS} gleichzeitigen Versuchen erfolgreich, ${tatsaechlicheZeilen} Zeile in der Tabelle -- kein Overbooking.`)
    } else {
      console.error(`FAIL: erwartet 1 Erfolg + ${CONCURRENT_ATTEMPTS - 1}x 'voll' + 1 Tabellenzeile, erhalten ${successes.length} Erfolg(e), ${tatsaechlicheZeilen} Zeile(n).`)
    }

    process.exitCode = pass ? 0 : 1
  } finally {
    await admin.from('intensivwoche_anmeldungen').delete().eq('kurs_id', kursId)
    await admin.from('intensivwoche_kurse').delete().eq('id', kursId)
    console.log('Cleanup abgeschlossen (Testkurs und zugehörige Anmeldungen gelöscht).')
  }
}

main()
