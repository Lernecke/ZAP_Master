import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import {
  Award,
  Calculator,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Pencil,
  MessageSquare,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'

const TOTAL_MATH = 11
const TOTAL_GERMAN = 11
const SYNONYM_QUESTION_IDS = [7, 8, 9, 10, 11]
const COLLECTOR_THRESHOLD = 5

const BADGE_DEFS = [
  {
    name: 'Leonhard Euler',
    criteria: 'Alle 11 Mathematikübungen korrekt beantwortet.',
    Icon: Calculator,
  },
  {
    name: 'Johann Goethe',
    criteria: 'Alle 11 Deutschübungen korrekt beantwortet.',
    Icon: BookOpen,
  },
  {
    name: 'Albert Einstein',
    criteria: 'Alle 22 Übungen (Mathe + Deutsch) korrekt beantwortet.',
    Icon: GraduationCap,
  },
  {
    name: 'Mathegenie',
    criteria: '6 oder mehr Matheaufgaben richtig gelöst.',
    Icon: TrendingUp,
  },
  {
    name: 'Grammatik-Guru',
    criteria: '6 oder mehr Deutschaufgaben richtig gelöst.',
    Icon: Pencil,
  },
  {
    name: 'Synonymkenner',
    criteria: 'Alle Synonymaufgaben korrekt beantwortet.',
    Icon: MessageSquare,
  },
  {
    name: 'Prüfungssicher',
    criteria: 'Eine Prüfung im KI-Trainer erfolgreich abgeschlossen.',
    Icon: ShieldCheck,
  },
  {
    name: 'Perfektionistisch',
    criteria: 'Profil vollständig ausgefüllt (Name und Profilfoto).',
    Icon: UserCheck,
  },
  {
    name: 'Sammler',
    criteria: `${COLLECTOR_THRESHOLD} oder mehr Abzeichen verdient.`,
    Icon: Award,
  },
]

interface Props {
  userId: string
  token: string
}

export async function BadgesSection({ userId, token }: Props) {
  const supabase = createAuthenticatedSupabaseClient(token)

  const [exResult, badgesResult, profileResult, trainerResult] = await Promise.all([
    supabase
      .from('user_exercises')
      .select('question_id, exercise_type')
      .eq('user_id', userId)
      .eq('is_correct', true)
      .in('exercise_type', ['mathematik', 'deutsch']),
    supabase.from('user_badges').select('badge_name'),
    supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', userId)
      .single(),
    supabase
      .from('trainer_progress')
      .select('id')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .limit(1),
  ])

  const exercises = exResult.data ?? []
  const earnedBadgeNames = new Set(badgesResult.data?.map((b) => b.badge_name) ?? [])
  const profile = profileResult.data
  const examPassed = (trainerResult.data?.length ?? 0) > 0

  // Deduplicate by question_id per exercise type
  const uniqueMathIds = new Set(
    exercises.filter((e) => e.exercise_type === 'mathematik').map((e) => e.question_id)
  )
  const uniqueGermanIds = new Set(
    exercises.filter((e) => e.exercise_type === 'deutsch').map((e) => e.question_id)
  )

  const mathCount = uniqueMathIds.size
  const germanCount = uniqueGermanIds.size
  const synonymDone = SYNONYM_QUESTION_IDS.every((id) => uniqueGermanIds.has(id))
  const profileComplete = !!(profile?.first_name && profile?.last_name && profile?.avatar_url)

  // Calculate newly earned badges
  const candidates: string[] = []
  if (mathCount >= TOTAL_MATH) candidates.push('Leonhard Euler')
  if (germanCount >= TOTAL_GERMAN) candidates.push('Johann Goethe')
  if (mathCount >= TOTAL_MATH && germanCount >= TOTAL_GERMAN) candidates.push('Albert Einstein')
  if (mathCount >= 6) candidates.push('Mathegenie')
  if (germanCount >= 6) candidates.push('Grammatik-Guru')
  if (synonymDone) candidates.push('Synonymkenner')
  if (examPassed) candidates.push('Prüfungssicher')
  if (profileComplete) candidates.push('Perfektionistisch')
  if (new Set([...earnedBadgeNames, ...candidates]).size >= COLLECTOR_THRESHOLD) {
    candidates.push('Sammler')
  }

  const newBadges = candidates.filter((name) => !earnedBadgeNames.has(name))
  if (newBadges.length > 0) {
    await supabase.from('user_badges').insert(
      newBadges.map((badge_name) => ({
        user_id: userId,
        badge_name,
        earned_at: new Date().toISOString(),
      }))
    )
    newBadges.forEach((b) => earnedBadgeNames.add(b))
  }

  const earnedCount = earnedBadgeNames.size

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Abzeichen</h2>
        <span className="text-sm text-muted-foreground">
          {earnedCount} / {BADGE_DEFS.length} verdient
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-4">
        {BADGE_DEFS.map(({ name, criteria, Icon }) => {
          const isEarned = earnedBadgeNames.has(name)
          return (
            <div
              key={name}
              className="flex flex-col items-center gap-2 text-center"
              title={criteria}
            >
              <div
                className={`w-14 h-14 flex items-center justify-center rounded-full shadow-sm transition-colors ${
                  isEarned
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground/40'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <p
                className={`text-xs font-medium leading-tight ${
                  isEarned ? 'text-foreground' : 'text-muted-foreground/50'
                }`}
              >
                {name}
              </p>
            </div>
          )
        })}
      </div>

      {earnedCount === 0 && (
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Starte Übungen und Prüfungen, um dein erstes Abzeichen zu verdienen.
        </p>
      )}
    </div>
  )
}
