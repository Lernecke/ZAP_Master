'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Eye,
  Loader2,
  Search,
  Filter,
  X,
  Send,
  User,
  Calendar,
  BookOpen,
  PenLine,
  RotateCcw,
  ChevronDown
} from 'lucide-react'
import { 
  getAllSubmittedEssays,
  getTeacherDownloadUrl,
  startReview,
  gradeEssay,
  getEssayStats,
  type EssayWithStudent
} from './actions'

const SUBJECTS = ['Deutsch', 'Mathematik', 'Französisch', 'Englisch', 'NMG', 'Andere']

const STATUS_CONFIG = {
  submitted: { label: 'Eingereicht', icon: Clock, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  in_korrektur: { label: 'In Korrektur', icon: PenLine, color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30', badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  reviewed: { label: 'Bewertet', icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/30', badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  returned: { label: 'Zurückgegeben', icon: Send, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' }
}

const GRADE_OPTIONS = ['6', '5.5', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1']

export function AufsaetzeVerwaltungClient() {
  const [essays, setEssays] = useState<EssayWithStudent[]>([])
  const [stats, setStats] = useState<{ total: number; submitted: number; inReview: number; reviewed: number; returned: number } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEssay, setSelectedEssay] = useState<EssayWithStudent | null>(null)
  const [showGradeModal, setShowGradeModal] = useState(false)
  
  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [subjectFilter, setSubjectFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Grading State
  const [grade, setGrade] = useState('')
  const [feedback, setFeedback] = useState('')
  const [returnToStudent, setReturnToStudent] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Action State
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    
    const [essaysResult, statsResult] = await Promise.all([
      getAllSubmittedEssays({
        status: statusFilter || undefined,
        subject: subjectFilter || undefined
      }),
      getEssayStats()
    ])
    
    if (essaysResult.success && essaysResult.data) {
      setEssays(essaysResult.data)
    }
    if (statsResult.success && statsResult.data) {
      setStats(statsResult.data)
    }
    
    setIsLoading(false)
  }, [statusFilter, subjectFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter essays by search term
  const filteredEssays = essays.filter(essay => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    const studentName = `${essay.student?.first_name || ''} ${essay.student?.last_name || ''}`.toLowerCase()
    return (
      essay.title.toLowerCase().includes(term) ||
      studentName.includes(term) ||
      essay.subject.toLowerCase().includes(term)
    )
  })

  const handleDownload = async (essayId: string) => {
    setActionLoading(essayId)
    const result = await getTeacherDownloadUrl(essayId)
    if (result.success && result.data) {
      window.open(result.data, '_blank')
    }
    setActionLoading(null)
  }

  const handleStartReview = async (essay: EssayWithStudent) => {
    setActionLoading(essay.id)
    const result = await startReview(essay.id)
    if (result.success) {
      await loadData()
    }
    setActionLoading(null)
  }

  const openGradeModal = (essay: EssayWithStudent) => {
    setSelectedEssay(essay)
    setGrade(essay.grade || '')
    setFeedback(essay.feedback || '')
    setReturnToStudent(true)
    setShowGradeModal(true)
  }

  const handleGrade = async () => {
    if (!selectedEssay) return
    
    setIsSubmitting(true)
    const result = await gradeEssay(selectedEssay.id, {
      grade,
      feedback,
      returnToStudent
    })
    
    if (result.success) {
      setShowGradeModal(false)
      setSelectedEssay(null)
      setGrade('')
      setFeedback('')
      await loadData()
    }
    setIsSubmitting(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStudentName = (essay: EssayWithStudent) => {
    if (essay.student?.first_name && essay.student?.last_name) {
      return `${essay.student.first_name} ${essay.student.last_name}`
    }
    return essay.student?.email || 'Unbekannt'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Aufsätze bewerten</h1>
        <p className="text-muted-foreground mt-1">
          Übersicht aller eingereichten Schüleraufsätze
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Gesamt</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
                <p className="text-xs text-muted-foreground">Offen</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <PenLine className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{stats.inReview}</p>
                <p className="text-xs text-muted-foreground">In Arbeit</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.reviewed}</p>
                <p className="text-xs text-muted-foreground">Bewertet</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.returned}</p>
                <p className="text-xs text-muted-foreground">Zurück</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Suchen nach Name, Titel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
            >
              <option value="">Alle Status</option>
              <option value="submitted">Eingereicht</option>
              <option value="in_korrektur">In Korrektur</option>
              <option value="reviewed">Bewertet</option>
              <option value="returned">Zurückgegeben</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          
          {/* Subject Filter */}
          <div className="relative">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer"
            >
              <option value="">Alle Fächer</option>
              {SUBJECTS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          
          {/* Reset Filters */}
          {(statusFilter || subjectFilter || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('')
                setSubjectFilter('')
                setSearchTerm('')
              }}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Essays Table */}
      {filteredEssays.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Keine Aufsätze gefunden</h3>
          <p className="text-muted-foreground">
            {essays.length === 0 
              ? 'Es wurden noch keine Aufsätze eingereicht.'
              : 'Keine Aufsätze entsprechen den Filterkriterien.'}
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Schüler</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Titel</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Fach</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Eingereicht</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Note</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEssays.map(essay => {
                  const status = STATUS_CONFIG[essay.status as keyof typeof STATUS_CONFIG]
                  const StatusIcon = status?.icon || AlertCircle
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
                            <p className="text-xs text-muted-foreground">{essay.student?.class_level || '–'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-sm truncate max-w-[200px]">{essay.title}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(essay.file_size)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs">
                          <BookOpen className="w-3 h-3" />
                          {essay.subject}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(essay.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status?.badgeColor || ''}`}>
                          <StatusIcon className="w-3 h-3" />
                          {status?.label || essay.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {essay.grade ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-bold text-sm">
                            {essay.grade}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">–</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Download */}
                          <button
                            onClick={() => handleDownload(essay.id)}
                            disabled={isProcessing}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                            title="Herunterladen"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>
                          
                          {/* Start Review (nur für submitted) */}
                          {essay.status === 'submitted' && (
                            <button
                              onClick={() => handleStartReview(essay)}
                              disabled={isProcessing}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50"
                              title="Korrektur starten"
                            >
                              <PenLine className="w-3.5 h-3.5" />
                              Starten
                            </button>
                          )}
                          
                          {/* Grade (für in_korrektur oder zum Überarbeiten) */}
                          {(essay.status === 'in_korrektur' || essay.status === 'submitted') && (
                            <button
                              onClick={() => openGradeModal(essay)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Bewerten
                            </button>
                          )}
                          
                          {/* View Details (für bereits bewertete) */}
                          {(essay.status === 'reviewed' || essay.status === 'returned') && (
                            <button
                              onClick={() => openGradeModal(essay)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Details
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

      {/* Grade Modal */}
      {showGradeModal && selectedEssay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Aufsatz bewerten</h2>
              <button
                onClick={() => {
                  setShowGradeModal(false)
                  setSelectedEssay(null)
                }}
                className="p-1 hover:bg-muted rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Essay Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{getStudentName(selectedEssay)}</span>
                  <span className="text-muted-foreground text-sm">({selectedEssay.student?.class_level})</span>
                </div>
                <p className="font-semibold">{selectedEssay.title}</p>
                <p className="text-sm text-muted-foreground">{selectedEssay.subject} • {formatFileSize(selectedEssay.file_size)}</p>
                {selectedEssay.description && (
                  <p className="text-sm text-muted-foreground italic">{selectedEssay.description}</p>
                )}
              </div>
              
              {/* Download Button */}
              <button
                onClick={() => handleDownload(selectedEssay.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Download className="w-4 h-4" />
                Aufsatz herunterladen
              </button>
              
              {/* Grade Select */}
              <div>
                <label className="block text-sm font-medium mb-2">Note</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  disabled={selectedEssay.status === 'reviewed' || selectedEssay.status === 'returned'}
                >
                  <option value="">Note auswählen</option>
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              
              {/* Feedback */}
              <div>
                <label className="block text-sm font-medium mb-2">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Schreibe ein Feedback für den Schüler..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none h-32"
                  disabled={selectedEssay.status === 'reviewed' || selectedEssay.status === 'returned'}
                />
              </div>
              
              {/* Return to Student Checkbox */}
              {selectedEssay.status !== 'reviewed' && selectedEssay.status !== 'returned' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="return-to-student"
                    checked={returnToStudent}
                    onChange={(e) => setReturnToStudent(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="return-to-student" className="text-sm">
                    Bewertung direkt an Schüler senden
                  </label>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 p-4 border-t border-border">
              <button
                onClick={() => {
                  setShowGradeModal(false)
                  setSelectedEssay(null)
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Schliessen
              </button>
              
              {selectedEssay.status !== 'reviewed' && selectedEssay.status !== 'returned' && (
                <button
                  onClick={handleGrade}
                  disabled={isSubmitting || (!grade && !feedback)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Bewertung speichern
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
