import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { routing } from "@/i18n/routing"
import { marketingLayoutModel } from "@/app/data/marketing-site"
import { SiteNav } from "@/app/components/marketing/site-nav"
import { SiteFooter } from "@/app/components/marketing/site-footer"

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function MarketingLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  // Client-Components in diesem Baum (z. B. SiteNav für den Sheet-Zustand) brauchen den
  // next-intl-Kontext, um @/i18n/navigation-Hooks wie Link/usePathname nutzen zu können.
  return (
    <NextIntlClientProvider messages={messages}>
      <div className="brand-marketing flex min-h-screen flex-col bg-background">
        <SiteNav model={marketingLayoutModel.nav} />
        <main className="flex-1">{children}</main>
        <SiteFooter model={marketingLayoutModel.footer} />
      </div>
    </NextIntlClientProvider>
  )
}
