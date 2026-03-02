export type QuestionType = 'input' | 'multiple-choice' | 'true-false' | 'table-select' | 'text-area'

export interface ExamMeta {
  maxPoints: number
  time?: string
  hints: string[]
}

export interface SubTask {
  id: string
  label: string
  prompt: string
  suffix?: string
  correctAnswer?: string | number
  modelAnswer?: string
  imageUrl?: string
  options?: string[]
}

export interface TableRow {
  id: string
  text: string
}

export interface TableColumn {
  id: string
  label: string
}

export interface Question {
  id: string
  number: number
  type: QuestionType
  prompt: string
  context?: string
  imageUrl?: string
  subTasks?: SubTask[]
  rows?: TableRow[]
  columns?: TableColumn[]
  options?: string[]
  correctTableAnswers?: Record<string, string>
}

export interface Exam {
  id: string
  meta?: ExamMeta
  title: string
  subject: 'Math' | 'German'
  year: number
  textLines?: string[]
  questions: Question[]
  generatedBy?: string
}

export interface ExamGroup {
  year: number
  subject: 'Math' | 'German'
  variants: Exam[]
}
