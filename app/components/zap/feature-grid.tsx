"use client"

import { motion } from "framer-motion"
import { FileCheck, Brain, BarChart3, Users } from "lucide-react"

const features = [
  {
    icon: FileCheck,
    title: "Echte Prüfungsaufgaben",
    description:
      "Übe mit originalen Aufgaben vergangener Zentraler Aufnahmeprüfungen und erhalte sofortiges Feedback.",
  },
  {
    icon: Brain,
    title: "KI-Lernplan",
    description:
      "Unser intelligenter Algorithmus erstellt dir einen massgeschneiderten Lernplan — angepasst an dein Tempo.",
  },
  {
    icon: BarChart3,
    title: "Fortschrittstracker",
    description:
      "Behalte deine Stärken und Schwächen im Blick. Visualisiere deinen Lernfortschritt in Echtzeit.",
  },
  {
    icon: Users,
    title: "Lerngemeinschaft",
    description:
      "Tausche dich mit anderen Schülern aus, stelle Fragen und lerne gemeinsam für die ZAP.",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
}

export function FeatureGrid() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Funktionen
          </p>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Alles, was du für die ZAP brauchst
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-muted-foreground">
            Strukturiert, intelligent und auf den Punkt — damit du mit Selbstvertrauen in die Prüfung gehst.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <feature.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
