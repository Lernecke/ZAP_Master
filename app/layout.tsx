import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeSyncProvider } from "@/components/providers/ThemeSyncProvider";
import { ProgressProvider } from "@/context/ProgressContext";
import { ClassFilterProvider } from "@/context/ClassFilterContext";
import "./globals.css";
import "katex/dist/katex.min.css";

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
            <ThemeSyncProvider>
              <ClassFilterProvider>
                <ProgressProvider>{children}</ProgressProvider>
              </ClassFilterProvider>
            </ThemeSyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
