import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Exam, ExamGroup } from '@/types/exam'
import ExamGroupCard from '@/app/components/exam/ExamGroupCard'
import { Calculator, BookOpen } from 'lucide-react'

export default async function TrainerPage() {
  const session = await auth()
  
  if (!session?.user?.id || !session.supabaseAccessToken) {
    redirect('/login')
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  const { data: exams, error } = await supabase
    .from('trainer_exams')
    .select('*')
    .order('year', { ascending: false })

  if (error) {
    console.error('Error fetching exams:', error)
  }

  // Group exams by subject and year
  const groupedExams: ExamGroup[] = []

  if (exams) {
    const examMap = new Map<string, Exam[]>()

    exams.forEach((exam) => {
      const examData = exam.data as unknown as Exam
      const fullExam: Exam = {
        id: exam.id,
        title: exam.title,
        subject: exam.subject as 'Math' | 'German',
        year: exam.year,
        generatedBy: exam.generated_by || undefined,
        textLines: exam.text_lines || undefined,
        meta: examData.meta,
        questions: examData.questions || [],
      }

      const key = `${exam.subject}-${exam.year}`
      if (!examMap.has(key)) {
        examMap.set(key, [])
      }
      examMap.get(key)!.push(fullExam)
    })

    examMap.forEach((variants, key) => {
      const [subject, year] = key.split('-')
      groupedExams.push({
        year: parseInt(year),
        subject: subject as 'Math' | 'German',
        variants,
      })
    })

    // Sort by year descending
    groupedExams.sort((a, b) => b.year - a.year)
  }

  const mathExams = groupedExams.filter((g) => g.subject === 'Math')
  const germanExams = groupedExams.filter((g) => g.subject === 'German')

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Prüfungstrainer</h1>
        <p className="text-muted-foreground mt-1">
          Übe mit echten und KI-generierten Prüfungen
        </p>
      </div>

      {groupedExams.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="text-muted-foreground mb-4">
              Noch keine Prüfungen vorhanden. Importiere zuerst Prüfungen in die Datenbank.
            </p>
          </div>
        ) : (
          <>
            {/* Math Section */}
            {mathExams.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <Calculator className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Mathematik</h2>
                  <span className="text-sm text-muted-foreground">({mathExams.length} Prüfungsjahre)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {mathExams.map((group) => (
                    <ExamGroupCard
                      key={`${group.subject}-${group.year}`}
                      year={group.year}
                      subject={group.subject}
                      variants={group.variants}
                      icon={<Calculator className="w-6 h-6 text-primary" />}
                      colorClass="bg-primary/10"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* German Section */}
            {germanExams.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-yellow-500/10 rounded-xl">
                    <BookOpen className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Deutsch</h2>
                  <span className="text-sm text-muted-foreground">({germanExams.length} Prüfungsjahre)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {germanExams.map((group) => (
                    <ExamGroupCard
                      key={`${group.subject}-${group.year}`}
                      year={group.year}
                      subject={group.subject}
                      variants={group.variants}
                      icon={<BookOpen className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />}
                      colorClass="bg-yellow-500/10"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
    </div>
  )
}
