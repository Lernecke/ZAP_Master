// Feature-Flag/Cutover-Mechanismus, Abschnitt 10.4 des Architektur-Briefings: "Die neuen
// Marketingrouten werden über ein serverseitiges Release-Flag aktiviert. Der Rollback schaltet
// zunächst auf die bisherige Start-/Kursroute zurück und entfernt keine neuen Daten."
//
// Wichtige Abweichung vom wörtlichen Wortlaut, bewusst dokumentiert statt still umgesetzt: Die
// "bisherige Startroute" (app/page.tsx mit der alten Navbar) wurde in Schritt 7 des
// Ausführungsplans absichtlich vollständig ersetzt, nicht parallel aufbewahrt ("Startseite.html
// ERSETZT die bestehende Startseite vollständig, sie wird nicht ergänzt", CLAUDE.md). Ein Rollback
// auf exakt diesen alten Code ist ohne Revert der Migrationscommits nicht mehr möglich. Die
// "bisherige Kursroute" (/kurse) existiert dagegen unverändert und vollständig funktionsfähig
// weiter (Abschnitt 6). Der Kill-Switch hier bildet deshalb die einzige heute noch erreichbare
// Hälfte der Vorgabe nach: bei deaktiviertem Flag fällt jede neue Marketingroute (inkl. "/") auf
// die bewährte Bestandsroute /kurse zurück, statt 404/500 zu zeigen. Das ist rein ein
// Routing-/Sichtbarkeitsschalter -- er löscht, sperrt oder migriert keine Daten und keine der
// unter dem Flag liegenden DB-Inhalte (offers/offer_editions/course_sessions bleiben unverändert
// bestehen und sind sofort wieder sichtbar, sobald das Flag erneut aktiviert wird).
//
// Server-only absichtlich ohne "NEXT_PUBLIC_"-Präfix: der Schalter muss die Route bereits im Proxy
// (Middleware) sperren, nicht nur eine ans Bundle geleakte Client-Konstante sein.
const RAW_VALUE = process.env.MARKETING_SITE_LIVE

/**
 * Default true (neue Marketingseiten live), damit ein fehlender/vergessener Env-Wert nicht
 * versehentlich die gesamte öffentliche Seite abschaltet. Nur ein expliziter String "false"
 * aktiviert den Rollback-Modus.
 */
export function isMarketingSiteLive(): boolean {
  return RAW_VALUE !== "false"
}

/**
 * Bestandsroute, auf die im Rollback-Modus zurückgeschaltet wird. Zentral hier gepflegt, damit
 * proxy.ts und app/sitemap.ts nicht unabhängig voneinander driften können.
 */
export const MARKETING_FALLBACK_PATH = "/kurse"
