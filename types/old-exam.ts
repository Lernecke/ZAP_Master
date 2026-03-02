// Types for the old ZAP exam system (different from Bardhi's trainer exams)

export interface OldExamQuestion {
  id: number
  question: string
  formula?: string
  type: 'numeric' | 'text' | 'choice'
  solution: string
  options?: string[]
}

export interface OldExamTask {
  task_id: string
  title: string
  subtitle: string
  questions: OldExamQuestion[]
}

export interface OldExam {
  title: string
  tasks: OldExamTask[]
}

export interface OldExamData {
  exam: OldExam
}

export interface UserExamAnswer {
  id: string
  user_id: string
  exercise_type: string
  question_id: number
  question: string
  user_answer: string
  is_correct: boolean
  created_at: string
}
