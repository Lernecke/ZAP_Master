"use client"

import { motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/app/components/ui/button"

export function CtaFooter() {
  return (
    <section id="cta" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center shadow-lg md:px-16 md:py-20"
        >
          {/* Subtle grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `
                linear-gradient(var(--primary-foreground) 1px, transparent 1px),
                linear-gradient(90deg, var(--primary-foreground) 1px, transparent 1px)
              `,
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative z-10">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
              Bereit für die ZAP?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-primary-foreground/80">
              Starte heute mit deiner Prüfungsvorbereitung und gehe mit dem besten
              Gefühl in die Zentrale Aufnahmeprüfung.
            </p>
            <div className="mt-8">
              <Link href="/register">
                <Button
                  size="lg"
                  variant="secondary"
                  className="group rounded-full px-8 text-base font-semibold"
                >
                  Kostenlos starten
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-border pt-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-foreground">ZAP</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ZAP Lernplattform. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </section>
  )
}
