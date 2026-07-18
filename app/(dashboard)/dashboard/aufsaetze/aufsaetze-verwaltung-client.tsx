'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatFileSize, formatDateTime as formatDate } from '@/lib/utils/format'
import {
  FileText, Clock, CheckCircle2, AlertCircle,
  Download, Eye, Loader2, Search, X, Send, User, Calendar,
  BookOpen, PenLine, RotateCcw, ChevronDown, Sparkles,
  ListChecks, RefreshCw, Unlock, MessageSquare, CornerDownRight
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false })
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  getAllSubmittedEssays, getTeacherDownloadUrl, startReview,
  gradeEssay, getEssayStats, getAiCorrection, generateAiCorrection,
  updateAiCorrectionSuggestion, releaseAiCorrection, refineAiCorrection,
  type EssayWithStudent, type AiCorrection
} from './actions'
import { getRubrics, type Rubric } from './rubriken/actions'
import { QUICK_CRITERIA_OPTIONS } from '@/lib/ai/prompts'

const SUBJECTS = ['Deutsch', 'Mathematik', 'Französisch', 'Englisch', 'NMG', 'Andere']

const STATUS_CONFIG = {
  submitted: { label: 'Eingereicht', icon: Clock, badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  in_korrektur: { label: 'In Korrektur', icon: PenLine, badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  reviewed: { label: 'Bewertet', icon: CheckCircle2, badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  returned: { label: 'Zurückgegeben', icon: Send, badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
}

const GRADE_OPTIONS = ['6', '5.5', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1']

async function fetchEssayOverview(status: string, subject: string) {
  return Promise.all([
    getAllSubmittedEssays({ status: status || undefined, subject: subject || undefined }),
    getEssayStats(),
  ])
}

export function AufsaetzeVerwaltungClient() {
  const [essays, setEssays] = useState<EssayWithStudent[]>([])
  const [stats, setStats] = useState<{ total: number; submitted: number; inReview: number; reviewed: number; returned: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEssay, setSelectedEssay] = useState<EssayWithStudent | null>(null)
  const [showGradeModal, setShowGradeModal] = useState(false)

  // Filter State
  const [statusFilter, setStatusFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Grading State
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')
  const [returnToStudent, setReturnToStudent] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // KI-Korrektur State
  const [aiCorrection, setAiCorrection] = useState<AiCorrection | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [selectedRubricId, setSelectedRubricId] = useState('')
  const [aiMode, setAiMode] = useState<'rubric' | 'quick'>('rubric')
  const [selectedQuickCriteria, setSelectedQuickCriteria] = useState<string[]>(
    QUICK_CRITERIA_OPTIONS.map(c => c.id)
  )
  const [editedSuggestion, setEditedSuggestion] = useState('')
  const [isSavingSuggestion, setIsSavingSuggestion] = useState(false)
  const [isReleasing, setIsReleasing] = useState(false)
  const [showAiSection, setShowAiSection] = useState(false)
  const [aiPreviewMode, setAiPreviewMode] = useState<'edit' | 'preview'>('edit')
  const [followUpMessage, setFollowUpMessage] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState('')
  const [lastGenerationOptions, setLastGenerationOptions] = useState<{ rubricId?: string; quickCriteria?: string[] } | null>(null)

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const [essaysResult, statsResult] = await fetchEssayOverview(statusFilter, subjectFilter)
    if (essaysResult.success && essaysResult.data) setEssays(essaysResult.data)
    if (statsResult.success && statsResult.data) setStats(statsResult.data)
    setIsLoading(false)
  }, [statusFilter, subjectFilter])

  useEffect(() => {
    let cancelled = false

    void fetchEssayOverview(statusFilter, subjectFilter).then(([essaysResult, statsResult]) => {
      if (cancelled) return

      if (essaysResult.success && essaysResult.data) setEssays(essaysResult.data)
      if (statsResult.success && statsResult.data) setStats(statsResult.data)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [statusFilter, subjectFilter])

  const filteredEssays = essays.filter(essay => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const name = `${essay.student?.first_name ?? ''} ${essay.student?.last_name ?? ''}`.toLowerCase()
    return essay.title.toLowerCase().includes(term) || name.includes(term) || essay.subject.toLowerCase().includes(term)
  })

  const openGradeModal = async (essay: EssayWithStudent) => {
    setSelectedEssay(essay)
    setGrade(essay.grade ?? '')
    setFeedback(essay.feedback ?? '')
    setReturnToStudent(true)
    setAiCorrection(null)
    setAiError('')
    setSelectedRubricId('')
    setAiMode('rubric')
    setSelectedQuickCriteria(QUICK_CRITERIA_OPTIONS.map(c => c.id))
    setEditedSuggestion('')
    setShowAiSection(false)
    setFollowUpMessage('')
    setRefineError('')
    setLastGenerationOptions(null)
    setShowGradeModal(true)

    // Rubriken und vorhandene KI-Korrektur laden
    const [rubricResult, aiResult] = await Promise.all([
      getRubrics(),
      getAiCorrection(essay.id),
    ])
    if (rubricResult.success && rubricResult.data) setRubrics(rubricResult.data)
    if (aiResult.success && aiResult.data) {
      setAiCorrection(aiResult.data)
      setEditedSuggestion(aiResult.data.teacher_edited_suggestion ?? aiResult.data.raw_suggestion)
      setShowAiSection(true)
    }
  }

  const closeModal = () => {
    setShowGradeModal(false)
    setSelectedEssay(null)
    setAiCorrection(null)
    setRubrics([])
    setSelectedRubricId('')
  }

  const handleDownload = async (essayId: string) => {
    setActionLoading(essayId)
    const result = await getTeacherDownloadUrl(essayId)
    if (result.success && result.data) window.open(result.data, '_blank')
    setActionLoading(null)
  }

  const handleStartReview = async (essay: EssayWithStudent) => {
    setActionLoading(essay.id)
    await startReview(essay.id)
    await loadData()
    setActionLoading(null)
  }

  const handleGrade = async () => {
    if (!selectedEssay) return
    setIsSubmitting(true)
    const result = await gradeEssay(selectedEssay.id, { grade, feedback, returnToStudent })
    if (result.success) { closeModal(); await loadData() }
    setIsSubmitting(false)
  }

  // ── KI-KORREKTUR ───────────────────────────────────────────

  const handleGenerateAi = async () => {
    if (!selectedEssay) return
    if (aiMode === 'rubric' && !selectedRubricId) return
    if (aiMode === 'quick' && selectedQuickCriteria.length === 0) return

    setAiLoading(true)
    setAiError('')

    const options = aiMode === 'rubric'
      ? { rubricId: selectedRubricId }
      : { quickCriteria: selectedQuickCriteria.map(id => QUICK_CRITERIA_OPTIONS.find(o => o.id === id)?.label ?? id) }

    setLastGenerationOptions(options)

    const result = await generateAiCorrection(selectedEssay.id, options)
    if (!result.success) {
      setAiError('error' in result ? result.error : 'Fehler')
      setAiLoading(false)
      return
    }
    const aiResult = await getAiCorrection(selectedEssay.id)
    if (aiResult.success && aiResult.data) {
      setAiCorrection(aiResult.data)
      setEditedSuggestion(aiResult.data.teacher_edited_suggestion ?? aiResult.data.raw_suggestion)
      setFollowUpMessage('')
      setRefineError('')
    }
    setAiLoading(false)
  }

  const handleRegenerate = async () => {
    if (!selectedEssay || !lastGenerationOptions) return
    setAiCorrection(null)
    setEditedSuggestion('')
    setAiLoading(true)
    setAiError('')

    const result = await generateAiCorrection(selectedEssay.id, lastGenerationOptions)
    if (!result.success) {
      setAiError('error' in result ? result.error : 'Fehler')
      setAiLoading(false)
      return
    }
    const aiResult = await getAiCorrection(selectedEssay.id)
    if (aiResult.success && aiResult.data) {
      setAiCorrection(aiResult.data)
      setEditedSuggestion(aiResult.data.teacher_edited_suggestion ?? aiResult.data.raw_suggestion)
      setFollowUpMessage('')
      setRefineError('')
    }
    setAiLoading(false)
  }

  const handleRefine = async () => {
    if (!selectedEssay || !followUpMessage.trim()) return
    setIsRefining(true)
    setRefineError('')
    const result = await refineAiCorrection(selectedEssay.id, followUpMessage)
    if (!result.success) {
      setRefineError('error' in result ? result.error : 'Fehler')
      setIsRefining(false)
      return
    }
    const aiResult = await getAiCorrection(selectedEssay.id)
    if (aiResult.success && aiResult.data) {
      setAiCorrection(aiResult.data)
      setEditedSuggestion(aiResult.data.teacher_edited_suggestion ?? aiResult.data.raw_suggestion)
      setFollowUpMessage('')
    }
    setIsRefining(false)
  }

  const toggleQuickCriterion = (id: string) => {
    setSelectedQuickCriteria(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleSaveSuggestion = async () => {
    if (!selectedEssay) return
    setIsSavingSuggestion(true)
    await updateAiCorrectionSuggestion(selectedEssay.id, editedSuggestion)
    setIsSavingSuggestion(false)
  }

  const handleRelease = async () => {
    if (!selectedEssay) return
    setIsReleasing(true)
    const result = await releaseAiCorrection(selectedEssay.id)
    if (result.success) {
      const aiResult = await getAiCorrection(selectedEssay.id)
      if (aiResult.success && aiResult.data) setAiCorrection(aiResult.data)
      await loadData()
    }
    setIsReleasing(false)
  }

  const handleAdoptSuggestion = () => {
    if (aiCorrection) setFeedback(editedSuggestion)
  }


  const getStudentName = (essay: EssayWithStudent) => {
    if (essay.student?.first_name && essay.student?.last_name) return `${essay.student.first_name} ${essay.student.last_name}`
    return essay.student?.email ?? 'Unbekannt'
  }

  const isReadOnly = selectedEssay?.status === 'reviewed' || selectedEssay?.status === 'returned'

  // ── LOADING ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Aufsätze bewerten</h1>
          <p className="text-muted-foreground mt-1 text-sm">Übersicht aller eingereichten Schüleraufsätze</p>
        </div>
        <Link
          href="/dashboard/aufsaetze/rubriken"
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <ListChecks className="w-4 h-4" />
          Bewertungsraster
        </Link>
      </div>


      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" placeholder="Suchen nach Name, Titel..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-border rounded-lg bg-background outline-none cursor-pointer">
              <option value="">Alle Status</option>
              <option value="submitted">Eingereicht</option>
              <option value="in_korrektur">In Korrektur</option>
              <option value="reviewed">Bewertet</option>
              <option value="returned">Zurückgegeben</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="relative">
            <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-border rounded-lg bg-background outline-none cursor-pointer">
              <option value="">Alle Fächer</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {(statusFilter || subjectFilter || searchTerm) && (
            <button onClick={() => { setStatusFilter(''); setSubjectFilter(''); setSearchTerm('') }}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw className="w-4 h-4" />Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredEssays.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Aufsätze gefunden</h3>
          <p className="text-muted-foreground">{essays.length === 0 ? 'Es wurden noch keine Aufsätze eingereicht.' : 'Keine Aufsätze entsprechen den Filterkriterien.'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Schüler', 'Titel', 'Fach', 'Eingereicht', 'Status', 'Note', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEssays.map(essay => {
                  const status = STATUS_CONFIG[essay.status as keyof typeof STATUS_CONFIG]
                  const StatusIcon = status?.icon ?? AlertCircle
                  const isProcessing = actionLoading === essay.id

                  return (
                    <tr key={essay.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{getStudentName(essay)}</p>
                            <p className="text-xs text-muted-foreground">{essay.student?.class_level ?? '–'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-sm truncate max-w-[200px]">{essay.title}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(essay.file_size)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs">
                          <BookOpen className="w-3 h-3" />{essay.subject}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />{formatDate(essay.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status?.badgeColor ?? ''}`}>
                          <StatusIcon className="w-3 h-3" />{status?.label ?? essay.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {essay.grade
                          ? <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-bold text-sm">{essay.grade}</span>
                          : <span className="text-muted-foreground text-sm">–</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleDownload(essay.id)} disabled={isProcessing}
                            className="p-2 hover:bg-muted rounded-lg transition-colors" title="Herunterladen">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                          {essay.status === 'submitted' && (
                            <button onClick={() => handleStartReview(essay)} disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 disabled:opacity-50 transition-colors">
                              <PenLine className="w-3.5 h-3.5" />Starten
                            </button>
                          )}
                          {(essay.status === 'in_korrektur' || essay.status === 'submitted') && (
                            <button onClick={() => openGradeModal(essay)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                              <CheckCircle2 className="w-3.5 h-3.5" />Bewerten
                            </button>
                          )}
                          {(essay.status === 'reviewed' || essay.status === 'returned') && (
                            <button onClick={() => openGradeModal(essay)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                              <Eye className="w-3.5 h-3.5" />Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          BEWERTUNGS-MODAL
      ════════════════════════════════════════ */}
      {showGradeModal && selectedEssay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-semibold">Aufsatz bewerten</h2>
              <button onClick={closeModal} className="p-1 hover:bg-muted rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-5 flex-1">

              {/* Aufsatz-Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{getStudentName(selectedEssay)}</span>
                  {selectedEssay.student?.class_level && (
                    <span className="text-muted-foreground text-sm">({selectedEssay.student.class_level})</span>
                  )}
                </div>
                <p className="font-semibold">{selectedEssay.title}</p>
                <p className="text-sm text-muted-foreground">{selectedEssay.subject} · {formatFileSize(selectedEssay.file_size)}</p>
              </div>

              {/* Download */}
              <button onClick={() => handleDownload(selectedEssay.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                <Download className="w-4 h-4" />Aufsatz herunterladen
              </button>

              {/* ── KI-KORREKTUR ABSCHNITT ── */}
              <div className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAiSection(s => !s)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">KI-Korrekturvorschlag</span>
                    {aiCorrection && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        aiCorrection.status === 'released'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {aiCorrection.status === 'released' ? 'Freigegeben' : 'Bereit'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAiSection ? 'rotate-180' : ''}`} />
                </button>

                {showAiSection && (
                  <div className="border-t border-border p-4 space-y-4">

                    {/* Noch kein Vorschlag: Modus wählen + generieren */}
                    {!aiCorrection && (
                      <div className="space-y-4">
                        {/* Modus-Tabs */}
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          <button
                            onClick={() => setAiMode('rubric')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors ${aiMode === 'rubric' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            <ListChecks className="w-3.5 h-3.5" />
                            Mit Bewertungsraster
                          </button>
                          <button
                            onClick={() => setAiMode('quick')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors border-l border-border ${aiMode === 'quick' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Ohne Raster
                          </button>
                        </div>

                        {/* Mit Bewertungsraster */}
                        {aiMode === 'rubric' && (
                          rubrics.length === 0 ? (
                            <div className="text-center py-6 bg-muted/30 rounded-lg">
                              <ListChecks className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground mb-3">Noch keine Bewertungsraster vorhanden.</p>
                              <Link href="/dashboard/aufsaetze/rubriken" target="_blank"
                                className="text-sm text-primary hover:underline">
                                Jetzt Raster erstellen →
                              </Link>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm font-medium mb-2">Bewertungsraster auswählen</label>
                              <select value={selectedRubricId} onChange={e => setSelectedRubricId(e.target.value)}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20">
                                <option value="">Raster auswählen...</option>
                                {rubrics.map(r => (
                                  <option key={r.id} value={r.id}>
                                    {r.title}{r.subject ? ` (${r.subject})` : ''} – {r.type === 'pdf' ? 'PDF' : 'Strukturiert'}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        )}

                        {/* Ohne Bewertungsraster: Checkboxen */}
                        {aiMode === 'quick' && (
                          <div>
                            <label className="block text-sm font-medium mb-2">Zu prüfende Kriterien</label>
                            <div className="grid grid-cols-2 gap-2">
                              {QUICK_CRITERIA_OPTIONS.map(opt => (
                                <label key={opt.id}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${selectedQuickCriteria.includes(opt.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedQuickCriteria.includes(opt.id)}
                                    onChange={() => toggleQuickCriterion(opt.id)}
                                    className="w-4 h-4 rounded accent-primary"
                                  />
                                  <span className="text-sm">{opt.label}</span>
                                </label>
                              ))}
                            </div>
                            {selectedQuickCriteria.length === 0 && (
                              <p className="text-xs text-amber-600 mt-2">Mindestens ein Kriterium auswählen.</p>
                            )}
                          </div>
                        )}

                        {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                        <button
                          onClick={handleGenerateAi}
                          disabled={
                            aiLoading ||
                            (aiMode === 'rubric' && !selectedRubricId) ||
                            (aiMode === 'quick' && selectedQuickCriteria.length === 0)
                          }
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {aiLoading
                            ? <><Loader2 className="w-4 h-4 animate-spin" />KI korrigiert… (ca. 10–20 Sek.)</>
                            : <><Sparkles className="w-4 h-4" />KI-Vorschlag generieren</>}
                        </button>
                      </div>
                    )}

                    {/* Vorschlag vorhanden */}
                    {aiCorrection && aiCorrection.status !== 'generating' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Generiert mit <span className="font-medium">{aiCorrection.model_used}</span>
                            {aiCorrection.input_tokens && aiCorrection.output_tokens && (
                              <span className="ml-2">· {aiCorrection.input_tokens + aiCorrection.output_tokens} Tokens</span>
                            )}
                          </p>
                          {aiCorrection.status === 'ready' && (
                            <button
                              onClick={handleRegenerate}
                              disabled={aiLoading}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                              title="Komplett neu generieren mit denselben Einstellungen"
                            >
                              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              Neu generieren
                            </button>
                          )}
                        </div>

                        {/* Textarea zum Bearbeiten (nur wenn nicht released) */}
                        {aiCorrection.status === 'ready' ? (
                          <>
                            {/* Edit / Preview Tabs */}
                            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                              <button
                                onClick={() => setAiPreviewMode('edit')}
                                className={`flex-1 py-1.5 transition-colors ${aiPreviewMode === 'edit' ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}
                              >
                                Bearbeiten
                              </button>
                              <button
                                onClick={() => setAiPreviewMode('preview')}
                                className={`flex-1 py-1.5 border-l border-border transition-colors ${aiPreviewMode === 'preview' ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}
                              >
                                Vorschau
                              </button>
                            </div>

                            {aiPreviewMode === 'edit' ? (
                              <textarea
                                value={editedSuggestion}
                                onChange={e => setEditedSuggestion(e.target.value)}
                                rows={12}
                                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-y font-mono"
                              />
                            ) : (
                              <div className="min-h-48 px-3 py-2 border border-border rounded-lg bg-muted/20 prose prose-sm dark:prose-invert max-w-none overflow-y-auto">
                                <ReactMarkdown>{editedSuggestion}</ReactMarkdown>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <button onClick={handleSaveSuggestion} disabled={isSavingSuggestion}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors">
                                {isSavingSuggestion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                Speichern
                              </button>
                              <button onClick={handleAdoptSuggestion}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                                In Feedback übernehmen
                              </button>
                              <button onClick={handleRelease} disabled={isReleasing}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors ml-auto">
                                {isReleasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                                An Schüler freigeben
                              </button>
                            </div>

                            {/* Follow-up Prompt */}
                            <div className="border border-border rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b border-border">
                                <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Nachfrage an KI</span>
                              </div>
                              <div className="p-3 space-y-2">
                                <textarea
                                  value={followUpMessage}
                                  onChange={e => setFollowUpMessage(e.target.value)}
                                  placeholder="z. B. «Fokussiere mehr auf die Grammatikfehler» oder «Mache den Ton freundlicher für eine 5. Klasse» …"
                                  rows={2}
                                  disabled={isRefining}
                                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-60"
                                />
                                {refineError && <p className="text-xs text-red-600">{refineError}</p>}
                                <button
                                  onClick={handleRefine}
                                  disabled={isRefining || !followUpMessage.trim()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                  {isRefining
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Wird angepasst…</>
                                    : <><CornerDownRight className="w-3.5 h-3.5" />Korrektur anpassen</>}
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          // Released: Read-only Vorschau
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-3">
                              Freigegeben am {formatDate(aiCorrection.released_at!)}
                            </p>
                            <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                              <ReactMarkdown>{aiCorrection.teacher_edited_suggestion ?? aiCorrection.raw_suggestion}</ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── BEWERTUNG ── */}
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <select value={grade} onChange={e => setGrade(e.target.value)} disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
                  <option value="">Note auswählen</option>
                  {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Schreibe ein Feedback für den Schüler..."
                  rows={5}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none disabled:opacity-60"
                />
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="return-to-student" checked={returnToStudent}
                    onChange={e => setReturnToStudent(e.target.checked)}
                    className="w-4 h-4 rounded border-border" />
                  <label htmlFor="return-to-student" className="text-sm">
                    Bewertung direkt an Schüler senden
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={closeModal}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                Schliessen
              </button>
              {!isReadOnly && (
                <button onClick={handleGrade} disabled={isSubmitting || (!grade && !feedback)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Speichern...</>
                    : <><CheckCircle2 className="w-4 h-4" />Bewertung speichern</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
