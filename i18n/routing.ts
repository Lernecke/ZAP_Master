import { defineRouting } from "next-intl/routing"

// Englisch bleibt bewusst ausserhalb von `locales`, bis Abschnitt 8 des Architektur-Briefings
// erfuellt ist: vollstaendige Uebersetzung von messages/en.json (Vorlage vorhanden) und der
// *_TRANSLATIONS-Overlays in types/marketing.translations.ts (aktuell leer), inkl. Rechtstexte.
// Erst danach hier "en" ergaenzen -- <html lang> (app/layout.tsx) und die Katalog-Loader
// (lib/kurse/catalog.ts) sind bereits request-aware und brauchen dann keine weitere Aenderung.
export const routing = defineRouting({
  locales: ["de"],
  defaultLocale: "de",
  localePrefix: "always",
})
