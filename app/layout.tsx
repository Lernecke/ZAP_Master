import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { AuthStoreSync } from "@/components/providers/AuthStoreSync";
import { ProgressStoreSync } from "@/components/providers/ProgressStoreSync";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import { ClassFilterProvider } from "@/context/ClassFilterContext";
import { Toaster } from "@/app/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZAP - Zentrale Aufnahmeprüfung",
  description: "Deine Lernplattform für die Zentrale Aufnahmeprüfung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <Suspense fallback={null}>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
