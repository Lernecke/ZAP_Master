"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"

function FloatingPen() {
  return (
    <motion.svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-64 w-64 md:h-80 md:w-80"
      animate={{ y: [0, -12, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Notebook page */}
      <motion.g
        initial={{ rotate: -3 }}
        animate={{ rotate: [-3, 2, -3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <rect x="60" y="50" width="200" height="240" rx="12" className="fill-card stroke-border" strokeWidth="1.5" />
        {/* Lines on page */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.line
            key={i}
            x1="85"
            y1={95 + i * 28}
            x2={i === 6 ? "180" : "235"}
            y2={95 + i * 28}
            className="stroke-border"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: "easeOut" }}
          />
        ))}
        {/* Margin line */}
        <line x1="80" y1="55" x2="80" y2="285" className="stroke-destructive/30" strokeWidth="0.5" />
      </motion.g>

      {/* Pencil */}
      <motion.g
        animate={{ x: [0, 8, 0], y: [0, -6, 0], rotate: [0, 2, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <rect x="185" y="30" width="12" height="80" rx="2" className="fill-primary" transform="rotate(35 190 70)" />
        <polygon points="172,106 178,118 184,106" fill="oklch(0.75 0.04 75)" transform="rotate(35 178 112)" />
        <rect x="185" y="30" width="12" height="12" rx="2" className="fill-primary/80" transform="rotate(35 190 36)" />
      </motion.g>

      {/* Sparkle accents */}
      <motion.circle
        cx="250"
        cy="80"
        r="4"
        className="fill-primary"
        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="90"
        cy="260"
        r="3"
        className="fill-primary"
        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.circle
        cx="270"
        cy="220"
        r="3.5"
        className="fill-primary/70"
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </motion.svg>
  )
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
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
      {/* Radial fade overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, var(--background) 80%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Text content */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Deine Lernplattform für die ZAP</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl"
            >
              Meistere die ZAP{" "}
              <span className="text-primary">mit Leichtigkeit</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mx-auto mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground lg:mx-0"
            >
              Bereite dich mit echten Prüfungsaufgaben, einem persönlichen KI-Lernplan
              und smartem Fortschrittstracking optimal auf die Zentrale Aufnahmeprüfung vor.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start"
            >
              <Link href="/register">
                <Button size="lg" className="group rounded-full px-8 text-base">
                  Jetzt starten
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <span className="text-sm text-muted-foreground">
                Kostenlos testen — keine Kreditkarte nötig
              </span>
            </motion.div>
          </div>

          {/* Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-1 items-center justify-center"
          >
            <FloatingPen />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
