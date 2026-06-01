'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, FileText, ListChecks, Upload, X,
  Loader2, ChevronDown, ChevronUp, BookOpen, FileUp, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/app/components/ui/skeleton'
import {
  getRubrics, deleteRubric, createStructuredRubric,
  createSignedRubricUploadUrl, saveRubricPdf,
  type Rubric, type RubricCriterion
} from './actions'

const SUBJECTS = ['Deutsch', 'Mathematik', 'Französisch', 'Englisch', 'NMG', 'Andere']

type ModalType = 'pdf' | 'structured' | null

export function RubrikenClient() {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalType, setModalType] = useState<ModalType>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // PDF-Upload State
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfTitle, setPdfTitle] = useState('')
  const [pdfSubject, setPdfSubject] = useState('')
  const [pdfUploadProgress, setPdfUploadProgress] = useState(0)
  const [pdfError, setPdfError] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Structured Rubric State
  const [structTitle, setStructTitle] = useState('')
  const [structSubject, setStructSubject] = useState('')
  const [structDescription, setStructDescription] = useState('')
  const [criteria, setCriteria] = useState<RubricCriterion[]>([
    { id: crypto.randomUUID(), name: '', description: '', max_points: undefined },
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [structError, setStructError] = useState('')

  const loadRubrics = useCallback(async () => {
    const result = await getRubrics()
    if (result.success && result.data) setRubrics(result.data)
    setIsLoading(false)
  }, [])

  useEffect(() => { loadRubrics() }, [loadRubrics])

  const handleDelete = async (rubricId: string) => {
    if (!confirm('Dieses Bewertungsraster wirklich löschen?')) return
    setActionLoading(rubricId)
    await deleteRubric(rubricId)
    await loadRubrics()
    setActionLoading(null)
  }

  // ── PDF-UPLOAD ─────────────────────────────────────────────

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setPdfError('')
    if (!file) return
    if (file.type !== 'application/pdf') { setPdfError('Nur PDF-Dateien erlaubt.'); return }
    if (file.size > 5 * 1024 * 1024) { setPdfError('Datei zu gross (max. 5 MB).'); return }
    setPdfFile(file)
  }

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pdfFile || !pdfTitle) return
    setIsUploading(true)
    setPdfUploadProgress(10)
    setPdfError('')
    try {
      const urlResult = await createSignedRubricUploadUrl(pdfFile.name, pdfFile.size)
      if (!urlResult.success || !urlResult.data) throw new Error('error' in urlResult ? urlResult.error : 'Fehler')

      setPdfUploadProgress(30)
      const uploadRes = await fetch(urlResult.data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfFile,
      })
      if (!uploadRes.ok) throw new Error('Upload fehlgeschlagen.')

      setPdfUploadProgress(70)
      const saveResult = await saveRubricPdf(urlResult.data.path, pdfFile.name, pdfTitle, pdfSubject || undefined)
      if (!saveResult.success) throw new Error('error' in saveResult ? saveResult.error : 'Fehler')

      setPdfUploadProgress(100)
      setModalType(null)
      setPdfFile(null); setPdfTitle(''); setPdfSubject('')
      await loadRubrics()
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Fehler beim Hochladen.')
    } finally {
      setIsUploading(false)
    }
  }

  // ── STRUCTURED RUBRIC ──────────────────────────────────────

  const addCriterion = () => {
    setCriteria(prev => [...prev, { id: crypto.randomUUID(), name: '', description: '', max_points: undefined }])
  }

  const removeCriterion = (id: string) => {
    setCriteria(prev => prev.filter(c => c.id !== id))
  }

  const updateCriterion = (id: string, field: keyof RubricCriterion, value: string | number | undefined) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleStructuredSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setStructError('')
    if (!structTitle.trim()) { setStructError('Titel ist erforderlich.'); return }
    const valid = criteria.filter(c => c.name.trim() && c.description.trim())
    if (valid.length === 0) { setStructError('Mindestens ein vollständiges Kriterium erforderlich.'); return }

    setIsSaving(true)
    const result = await createStructuredRubric(structTitle, valid, structSubject || undefined, structDescription || undefined)
    setIsSaving(false)

    if (!result.success) { setStructError('error' in result ? result.error : 'Fehler'); return }

    setModalType(null)
    setStructTitle(''); setStructSubject(''); setStructDescription('')
    setCriteria([{ id: crypto.randomUUID(), name: '', description: '', max_points: undefined }])
    await loadRubrics()
  }

  // ── RENDER ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-56" />
        {[1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/aufsaetze" className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Bewertungsraster</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Raster für die KI-gestützte Aufsatzkorrektur verwalten
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setModalType('pdf'); setPdfError('') }}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm"
          >
            <FileUp className="w-4 h-4" />
            PDF hochladen
          </button>
          <button
            onClick={() => { setModalType('structured'); setStructError('') }}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Neues Raster
          </button>
        </div>
      </div>

      {/* Rubrik-Liste */}
      {rubrics.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <ListChecks className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Noch keine Bewertungsraster</h3>
          <p className="text-muted-foreground text-sm">
            Lade ein PDF hoch oder erstelle ein strukturiertes Raster.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rubrics.map(rubric => {
            const isExpanded = expandedId === rubric.id
            const isDeleting = actionLoading === rubric.id

            return (
              <div key={rubric.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <div className="p-2 bg-muted rounded-lg shrink-0">
                    {rubric.type === 'pdf'
                      ? <FileText className="w-5 h-5 text-primary" />
                      : <ListChecks className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{rubric.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded-full ${rubric.type === 'pdf' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                        {rubric.type === 'pdf' ? 'PDF' : 'Strukturiert'}
                      </span>
                      {rubric.subject && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {rubric.subject}
                        </span>
                      )}
                      {rubric.max_points && <span>{rubric.max_points} Punkte total</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rubric.type === 'structured' && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : rubric.id)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Kriterien anzeigen"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rubric.id)}
                      disabled={isDeleting}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Löschen"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Kriterien expandiert */}
                {isExpanded && rubric.criteria && (
                  <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/30 space-y-3">
                    {rubric.criteria.criteria.map((c, i) => (
                      <div key={c.id} className="flex gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium">
                            {c.name}
                            {c.max_points ? <span className="text-muted-foreground font-normal ml-2">({c.max_points} P.)</span> : null}
                          </p>
                          <p className="text-sm text-muted-foreground">{c.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL: PDF-Upload ── */}
      {modalType === 'pdf' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">PDF-Raster hochladen</h2>
              <button onClick={() => setModalType(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePdfUpload} className="p-4 space-y-4">
              {/* Datei */}
              <div>
                <label className="block text-sm font-medium mb-2">PDF-Datei *</label>
                <input type="file" accept=".pdf" onChange={handlePdfFileSelect} className="hidden" id="rubrik-pdf-upload" disabled={isUploading} />
                <label
                  htmlFor="rubrik-pdf-upload"
                  className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${pdfFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                >
                  {pdfFile ? (
                    <div className="flex items-center gap-2">
                      <FileText className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium">{pdfFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">PDF auswählen (max. 5 MB)</p>
                    </>
                  )}
                </label>
                {pdfError && <p className="mt-1 text-sm text-red-600">{pdfError}</p>}
              </div>

              {/* Titel */}
              <div>
                <label className="block text-sm font-medium mb-2">Titel *</label>
                <input
                  type="text" value={pdfTitle} onChange={e => setPdfTitle(e.target.value)}
                  placeholder="z.B. Bewertungsraster Erlebniserzählung"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required disabled={isUploading}
                />
              </div>

              {/* Fach */}
              <div>
                <label className="block text-sm font-medium mb-2">Fach (optional)</label>
                <select value={pdfSubject} onChange={e => setPdfSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={isUploading}
                >
                  <option value="">Kein Fach</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {isUploading && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${pdfUploadProgress}%` }} />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalType(null)} disabled={isUploading}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50">
                  Abbrechen
                </button>
                <button type="submit" disabled={!pdfFile || !pdfTitle || isUploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Hochladen...</> : <><Upload className="w-4 h-4" />Speichern</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Strukturiertes Raster ── */}
      {modalType === 'structured' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-semibold text-lg">Strukturiertes Raster erstellen</h2>
              <button onClick={() => setModalType(null)} className="p-1 hover:bg-muted rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleStructuredSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Titel *</label>
                <input type="text" value={structTitle} onChange={e => setStructTitle(e.target.value)}
                  placeholder="z.B. Bewertungsraster Argumentation"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none focus:ring-2 focus:ring-primary/20"
                  required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Fach (optional)</label>
                  <select value={structSubject} onChange={e => setStructSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none">
                    <option value="">Kein Fach</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Beschreibung (optional)</label>
                  <input type="text" value={structDescription} onChange={e => setStructDescription(e.target.value)}
                    placeholder="Kurze Notiz..."
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background outline-none" />
                </div>
              </div>

              {/* Kriterien */}
              <div>
                <label className="block text-sm font-medium mb-3">Kriterien *</label>
                <div className="space-y-3">
                  {criteria.map((c, i) => (
                    <div key={c.id} className="bg-muted/40 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Kriterium {i + 1}</span>
                        {criteria.length > 1 && (
                          <button type="button" onClick={() => removeCriterion(c.id)}
                            className="p-1 hover:text-red-600 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input type="text" value={c.name}
                        onChange={e => updateCriterion(c.id, 'name', e.target.value)}
                        placeholder="Name (z.B. Inhalt und Argumentation)"
                        className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background outline-none focus:ring-2 focus:ring-primary/20" />
                      <textarea value={c.description}
                        onChange={e => updateCriterion(c.id, 'description', e.target.value)}
                        placeholder="Beschreibung / Erwartungen..."
                        rows={2}
                        className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background outline-none resize-none focus:ring-2 focus:ring-primary/20" />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Max. Punkte:</label>
                        <input type="number" min={0} max={100}
                          value={c.max_points ?? ''}
                          onChange={e => updateCriterion(c.id, 'max_points', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="–"
                          className="w-16 px-2 py-1 text-sm border border-border rounded-md bg-background outline-none text-center" />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addCriterion}
                  className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Plus className="w-3.5 h-3.5" />
                  Kriterium hinzufügen
                </button>
              </div>

              {structError && <p className="text-sm text-red-600">{structError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalType(null)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors">
                  Abbrechen
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Speichern...</> : 'Raster speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
