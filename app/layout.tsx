import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AuthStoreSync } from "@/components/providers/AuthStoreSync";
import { ProgressStoreSync } from "@/components/providers/ProgressStoreSync";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import { ClassFilterProvider } from "@/context/ClassFilterContext";
import { Toaster } from "@/app/components/ui/sonner";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Marken-Fonts für den Marketing-Bereich (.brand-marketing) — additiv, ersetzt
// Geist nicht global. Siehe design-reference/architektur-briefing-kursseiten.md Abschnitt 1.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Ohne metadataBase koennen relative canonical-/OpenGraph-URLs (lib/seo.ts) nicht zu absoluten
  // URLs aufgeloest werden -- Next.js warnt sonst bei jedem Build und faellt auf einen
  // Default-Host zurueck. Die echte Domain kommt ausschliesslich aus NEXT_PUBLIC_APP_URL (je
  // Umgebung getrennt, Abschnitt 10.4), nie hartkodiert.
  metadataBase: new URL(SITE_URL),
  title: "ZAP - Zentrale Aufnahmeprüfung",
  description: "Deine Lernplattform für die Zentrale Aufnahmeprüfung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // HINWEIS zur spaeteren Englisch-Aktivierung (Abschnitt 8.2): `lang` request-aware zu machen
  // (z.B. via next-intl getLocale()) wurde geprueft und wieder verworfen -- dieses Root-Layout
  // wraps ausnahmslos jede Route (auch /dashboard/*, /login etc.), und ein dynamischer Read hier
  // liegt zwangslaeufig ausserhalb jeder <Suspense>-Grenze (das <html>-Element selbst kann nicht
  // in Suspense stehen). Unter `cacheComponents: true` (next.config.ts) bricht das den Build fuer
  // die GESAMTE App, nicht nur die Marketingseiten (getestet: "/dashboard/mail-outbox" etc.
  // schlugen mit "Uncached data was accessed outside of <Suspense>" fehl). Der von Abschnitt 8.2
  // selbst genannte Alternativweg "getrennte Root-Layouts" (separate <html> pro Next.js
  // Root-Layout-Gruppe, je mit statisch bekanntem Locale aus generateStaticParams) ist die
  // tatsaechlich cacheComponents-kompatible Loesung, erfordert aber eine Route-Group-Umstrukturierung
  // (eigene Root-Layouts fuer den lokalisierten Marketing-Baum vs. Dashboard/Auth/API) -- das ist
  // ein eigener, groesserer Architekturschritt und bewusst NICHT Teil dieser Grundlagen-Runde.
  // `lang="de"` bleibt bis dahin hartkodiert; korrekt fuer den aktuellen Deutsch-only-Betrieb.
  return (
    <html lang="de" suppressHydrationWarning>
      <Suspense fallback={null}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable} antialiased`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <AuthStoreSync />
              <ProgressStoreSync />
              <ThemeSyncProvider>
                <ClassFilterProvider>
                  {children}
                </ClassFilterProvider>
              </ThemeSyncProvider>
            </AuthProvider>
            <Toaster />
          </ThemeProvider>
        </body>
      </Suspense>
    </html>
  );
}
