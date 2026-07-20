import { setRequestLocale } from "next-intl/server"

export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // Placeholder — replaced with the real marketing homepage in Schritt 7.
  return <main className="p-8">Marketing-Startseite — Inhalt folgt in Schritt 7.</main>
}
