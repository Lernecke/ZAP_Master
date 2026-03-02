"use client"

import { motion } from "framer-motion"
import { Quote } from "lucide-react"

export function Testimonial() {
  return (
    <section id="testimonial" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <Quote className="mx-auto mb-6 h-8 w-8 text-primary/30" />
          <blockquote className="text-xl font-medium leading-relaxed tracking-tight text-foreground italic md:text-2xl">
            {'"'}Dank ZAP habe ich endlich den Durchblick in Mathe. Der Lernplan hat mir genau
            gezeigt, wo ich noch Lücken hatte. Ich hab die Prüfung bestanden — und sogar besser
            abgeschnitten als gedacht!{'"'}
          </blockquote>
          <div className="mt-8 flex flex-col items-center gap-1">
            <span className="text-sm font-semibold text-foreground">Lena M.</span>
            <span className="text-sm text-muted-foreground">
              Schülerin, Zürich — ZAP 2025 bestanden
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
