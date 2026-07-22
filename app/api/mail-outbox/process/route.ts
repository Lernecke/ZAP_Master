import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { dispatchDueOutboxMails } from '@/lib/mail/dispatch-outbox'

// Abschnitt 10.4 (E-Mail-Outbox): Endpunkt fuer eine externe periodische Ausloesung (z. B. Vercel
// Cron oder ein GitHub-Actions-Cron-Job) -- welcher Scheduler das konkret ist, ist eine
// Hosting-Entscheidung, die hier bewusst NICHT getroffen wird (siehe mail-outbox-runbook.md). Ohne
// gesetztes Secret bleibt der Endpunkt deaktiviert (Fail-closed), nicht offen mit einem
// erratbaren Default-Wert.
//
// Zusaetzlich zum externen Cron-Pfad kann derselbe Dispatcher manuell ueber den Admin-Button
// (app/(dashboard)/dashboard/mail-outbox/actions.ts) ausgeloest werden -- fuer den Fall, dass noch
// kein Scheduler eingerichtet ist, deckt das den haeufigsten Fall (ein einzelner haengengebliebener
// Versand) bereits ab, ohne dass ein externer Dienst zwingend erforderlich ist.
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.MAIL_OUTBOX_CRON_SECRET
  if (!expected) return false

  const authHeader = request.headers.get('authorization') ?? ''
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''

  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  if (expectedBuf.length !== providedBuf.length) return false
  return timingSafeEqual(expectedBuf, providedBuf)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await dispatchDueOutboxMails()
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unbekannter Fehler' },
      { status: 500 }
    )
  }
}
