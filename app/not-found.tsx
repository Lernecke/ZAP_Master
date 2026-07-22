"use client"

import { motion, MotionConfig } from "framer-motion"
import { Zap, ArrowLeft, Home } from "lucide-react"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { MathBackground } from "@/app/components/zap/math-background"
import { Suspense } from "react"

export default function NotFound() {
  return (
    // Abschnitt 10.4 (Accessibility-Audit, "Reduced Motion"): die vorherige Fassung ignorierte
    // prefers-reduced-motion vollständig, insbesondere ein endlos wiederholender Y-Bounce
    // (repeat: Infinity) -- genau die Art von automatisch startender, dauerhafter, nicht
    // pausierbarer Bewegung, die WCAG 2.2 SC 2.2.2 (Pause, Stop, Hide) und SC 2.3.3 (Animation
    // from Interactions) adressieren. MotionConfig mit reducedMotion="user" deaktiviert für ALLE
    // motion.*-Nachfahren automatisch Eintritts- wie Endlos-Animationen, sobald das Betriebssystem
    // "Bewegung reduzieren" meldet -- kein manuelles Durchreichen an jede einzelne Stelle nötig.
    <MotionConfig reducedMotion="user">
    <main className="brand-marketing relative min-h-screen bg-background">
      <Suspense fallback={null}>
        <MathBackground />
        <div className="pointer-events-none fixed inset-0 z-[1] backdrop-blur-[1px]" aria-hidden="true" />
      </Suspense>

      <div className="relative z-[2] flex min-h-screen flex-col">
        {/* Minimal Navbar */}
        <header className="border-b border-border/50 bg-background/70 backdrop-blur-xl">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2" aria-label="ZAP Home">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">ZAP</span>
            </Link>
          </nav>
        </header>

        {/* Content */}
        <div className="flex flex-1 items-center justify-center px-6 py-20">
          {/* Grid background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
            style={{
              backgroundImage: `
                linear-gradient(var(--border) 1px, transparent 1px),
                linear-gradient(90deg, var(--border) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, var(--background) 80%)",
            }}
          />

          <div className="relative flex flex-col items-center text-center">
            {/* 404 number */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative mb-6"
            >
              <span className="text-[10rem] font-black leading-none tracking-tighter text-border md:text-[14rem]">
                404
              </span>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30 md:h-24 md:w-24">
                  <Zap className="h-10 w-10 text-primary-foreground md:h-12 md:w-12" strokeWidth={2.5} />
                </div>
              </motion.div>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl"
            >
              Diese Seite existiert{" "}
              <span className="text-primary">nicht.</span>
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mx-auto mt-4 max-w-md text-pretty text-lg text-muted-foreground"
            >
              Die URL existiert nicht oder wurde verschoben. Geh zurück und versuche es nochmal.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
            >
              <Link href="/">
                <Button size="lg" className="group rounded-full px-8 text-base">
                  <Home className="mr-2 h-4 w-4" />
                  Zur Startseite
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 text-base"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
    </MotionConfig>
  )
}
