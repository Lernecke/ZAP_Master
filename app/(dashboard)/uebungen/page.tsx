import Link from 'next/link'
import { Calculator, BookOpen, ArrowRight } from 'lucide-react'

export default function UebungenPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Übungen</h1>
        <p className="text-muted-foreground mt-1">
          Wähle ein Fach und verbessere deine Fähigkeiten.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/uebungen/mathematik"
          className="bg-card rounded-2xl shadow-sm border border-border p-8 hover:shadow-md hover:border-primary/50 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="p-3 bg-primary/10 rounded-xl inline-block mb-4">
                <Calculator className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Mathematik
              </h2>
              <p className="text-muted-foreground mb-4">
                Übe Rechnen, Algebra, Geometrie und mehr.
              </p>
              <span className="inline-flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                Übungen starten
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>

        <Link
          href="/uebungen/deutsch"
          className="bg-card rounded-2xl shadow-sm border border-border p-8 hover:shadow-md hover:border-yellow-500/50 transition-all group"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="p-3 bg-yellow-500/10 rounded-xl inline-block mb-4">
                <BookOpen className="w-8 h-8 text-yellow-600 dark:text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Deutsch</h2>
              <p className="text-muted-foreground mb-4">
                Übe Grammatik, Rechtschreibung, Textverständnis.
              </p>
              <span className="inline-flex items-center gap-2 text-yellow-600 dark:text-yellow-500 font-medium group-hover:gap-3 transition-all">
                Übungen starten
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-primary/5 border border-primary/20 rounded-2xl p-6">
        <h3 className="font-semibold text-foreground mb-2">💡 Tipp</h3>
        <p className="text-muted-foreground text-sm">
          Die Übungen werden aus deinem bisherigen ZAP-Projekt migriert. 
          Für vollständige Prüfungen nutze den{' '}
          <Link href="/trainer" className="underline font-medium text-primary">
            Prüfungstrainer
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
