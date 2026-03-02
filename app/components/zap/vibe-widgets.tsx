"use client"

import { motion } from "framer-motion"
import { CheckCircle2, StickyNote } from "lucide-react"

const checklistItems = [
  { text: "Deutsch-Übungen", done: true },
  { text: "Mathe-Formeltrainer", done: true },
  { text: "Aufsatztraining", done: false },
]

export function VibeWidgets() {
  return (
    <section className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-center md:gap-12">
          {/* Checklist widget */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: -2 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-md"
          >
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Meine Checkliste
              </span>
            </div>
            <ul className="space-y-3">
              {checklistItems.map((ci) => (
                <li key={ci.text} className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      ci.done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background"
                    }`}
                  >
                    {ci.done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      ci.done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {ci.text}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Notepad widget */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: 1.5 }}
            whileInView={{ opacity: 1, y: 0, rotate: 1.5 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-md"
          >
            <div className="mb-4 flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notiz
              </span>
            </div>
            <div
              className="space-y-2.5 text-sm leading-relaxed text-muted-foreground"
              style={{
                backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, var(--border) 28px)",
                backgroundSize: "100% 28px",
                paddingTop: "4px",
              }}
            >
              <p>{"Pythagoras: a² + b² = c²"}</p>
              <p>{"Brüche vor der Prüfung wiederholen!"}</p>
              <p className="text-primary/60">{"..."}</p>
            </div>
          </motion.div>

          {/* Progress widget */}
          <motion.div
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            whileInView={{ opacity: 1, y: 0, rotate: -1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-md"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dein Fortschritt
              </span>
              <span className="text-sm font-bold text-primary">72%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                whileInView={{ width: "72%" }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <span>Mathematik</span>
              <span>36 / 50 Aufgaben</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
