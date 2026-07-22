#!/usr/bin/env node
// Einmaliges Generierungsskript: liest die 18 bereits publizierten Angebote direkt aus
// types/marketing.fixtures.ts (importiert das echte TS-Modul, keine manuelle Abschrift -- das
// waere bei 18 Datensaetzen mit mehrzeiligen Beschreibungstexten fehleranfaellig) und erzeugt
// daraus eine additive Migration, die offer_editions mit genau diesen aktuellen Werten befuellt.
// Erzeugt keine neuen offers-Zeilen (existieren bereits vollstaendig seit
// 20260721074103_seed_offer_catalog.sql) und laesst 5-Klasse-Lerncamp (Preiskonflikt, echter Preis
// folgt separat) sowie BMS-Halbjahreskurs (kein Inhalt) unangetastet.
//
// Nutzung: npx tsx scripts/generate-offer-editions-migration.mjs

import { writeFileSync } from 'node:fs'
import path from 'node:path'

import * as fixtures from '../types/marketing.fixtures.ts'

const SCHOOL_YEAR = '2026/27'

function sqlString(value) {
  // Dollar-Quoting statt '' -Verdopplung: robust gegenueber Apostrophen/Anfuehrungszeichen in
  // deutschen Texten, ohne dass ich jede Stelle einzeln escapen muss.
  return `$str$${value}$str$`
}

function offerEditionInsert(offer) {
  const earlyBirdEnabled = offer.earlyBirdPriceRappen != null && offer.earlyBirdDeadline != null
  return `insert into public.offer_editions (
  offer_id, school_year, public_title, tagline, description,
  regular_price_rappen, early_bird_enabled, early_bird_price_rappen, early_bird_deadline,
  currency, status
)
select o.id, ${sqlString(SCHOOL_YEAR)}, ${sqlString(offer.displayName)}, ${sqlString(offer.tagline)}, ${sqlString(offer.description)},
  ${offer.regularPriceRappen}, ${earlyBirdEnabled}, ${earlyBirdEnabled ? offer.earlyBirdPriceRappen : 'null'}, ${earlyBirdEnabled ? `'${offer.earlyBirdDeadline}'` : 'null'},
  ${sqlString(offer.currency)}, 'published'
from public.offers o
where o.audience_id = ${sqlString(offer.audienceId)} and o.kurstyp = ${sqlString(offer.kurstyp)} and o.slug = ${sqlString(offer.slug)}
on conflict (offer_id, school_year) do nothing;`
}

// Nur echte Offer-Fixtures (haben kurstyp + regularPriceRappen) -- filtert Sessions-Arrays,
// PageModels usw. automatisch heraus.
const offerEntries = Object.entries(fixtures).filter(
  ([, value]) =>
    value && typeof value === 'object' && !Array.isArray(value) &&
    typeof value.kurstyp === 'string' && typeof value.regularPriceRappen === 'number'
)

console.log(`Gefundene Offer-Fixtures mit Preis: ${offerEntries.length}`)
for (const [name, offer] of offerEntries) {
  console.log(`  ${name}: ${offer.audienceId}/${offer.kurstyp}/${offer.slug} -> ${offer.regularPriceRappen} Rappen`)
}

const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '')
const outFile = path.resolve(
  import.meta.dirname,
  '..',
  'supabase',
  'migrations',
  `${timestamp}_seed_published_offer_editions.sql`
)

const header = `-- Befuellt offer_editions fuer die 18 bereits oeffentlich publizierten Angebote (Abschnitt 2.12)
-- mit den aktuell auf der Website sichtbaren Preisen/Texten aus types/marketing.fixtures.ts --
-- generiert per scripts/generate-offer-editions-migration.mjs, keine manuelle Abschrift. Macht
-- die Preise ab sofort ueber /dashboard/kurse/angebote (Schritt 10a) live editierbar, OHNE die
-- oeffentlich sichtbaren Werte zu aendern (identisch zu den bisherigen Fixture-Werten). Sobald die
-- oeffentlichen Seiten auf offer_editions statt der statischen Fixtures umgestellt sind (separater
-- Schritt), werden Preisaenderungen ueber die Admin-Maske sofort live sichtbar.
--
-- BEWUSST NICHT enthalten: 5. Klasse Lerncamp (dokumentierter Preiskonflikt CHF 950 vs. 890, siehe
-- supabase/seed.sql und den Kommentar bei fuenfKlasseHalbjahreskurs in den Fixtures -- der echte
-- Preis folgt separat, sobald er fachlich freigegeben ist) und BMS-Halbjahreskurs (kein Inhalt,
-- siehe Abschnitt 9.1 des Architektur-Briefings). Beide offers-Zeilen existieren bereits, bleiben
-- hier aber ohne offer_editions-Zeile.
--
-- Alle offers-Zeilen existieren bereits (20260721074103_seed_offer_catalog.sql); ON CONFLICT DO
-- NOTHING macht diese Migration bei einem erneuten Lauf ungefaehrlich wiederholbar.

`

const sql = header + offerEntries.map(([, offer]) => offerEditionInsert(offer)).join('\n\n') + '\n'

writeFileSync(outFile, sql, 'utf-8')
console.log(`\nGeschrieben: ${outFile}`)
