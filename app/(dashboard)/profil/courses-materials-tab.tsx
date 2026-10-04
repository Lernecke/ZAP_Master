'use client'

import * as React from 'react'
import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  Loader2,
  BookOpen,
  GraduationCap,
  Calendar,
  MapPin,
  Clock,
  User,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { FACH_LABELS, FACH_FARBEN } from '@/types/kurs'
import {
  getCoursesAndMaterialsAction,
  type CourseWithDetails,
  type MaterialGrantWithArea,
  type FamilyMemberOption,
} from './actions'

interface CoursesAndMaterialsTabProps {
  userId: string
  accountType?: string | null
}

export function CoursesAndMaterialsTab({ userId, accountType }: CoursesAndMaterialsTabProps) {
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<CourseWithDetails[]>([])
  const [materials, setMaterials] = useState<MaterialGrantWithArea[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberOption[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)
  const [isPending, startTransition] = useTransition()

  const isParent = accountType === 'parent_solo' || !accountType || accountType !== 'child'

  const loadData = async (targetId: string) => {
    setLoading(true)
    try {
      const res = await getCoursesAndMaterialsAction(targetId)
      if (res.success) {
        setCourses(res.courses || [])
        setMaterials(res.materials || [])
        if (res.familyMembers && res.familyMembers.length > 0) {
          setFamilyMembers(res.familyMembers)
        }
      }
    } catch (err) {
      console.error('Error loading courses and materials:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(selectedUserId)
  }, [selectedUserId])

  const handleUserChange = (newUserId: string) => {
    startTransition(() => {
      setSelectedUserId(newUserId)
    })
  }

  const selectedMember = familyMembers.find((m) => m.id === selectedUserId)
  const isViewingSelf = selectedUserId === userId

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* Family selector for parent accounts */}
      {isParent && familyMembers.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-2xl border border-border">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Ansicht für Familienmitglied</p>
              <p className="text-xs text-muted-foreground">
                Wähle aus, für wen aktive Kurse und Freischaltungen angezeigt werden.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              aria-label="Familienmitglied auswählen"
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none min-w-[200px]"
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={loading || isPending}
            >
              <option value={userId}>Mich selbst</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'Kind'}
                </option>
              ))}
            </select>
            {(loading || isPending) && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
            )}
          </div>
        </div>
      )}

      {/* Courses Section */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Aktive Kurse</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isViewingSelf
                  ? 'Deine gebuchten und bestätigten Kurse.'
                  : `Bestätigte Kurse für ${selectedMember?.name || 'dieses Familienmitglied'}.`}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
            <Link href="/intensivkurse">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Kursangebot entdecken
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => {
              const fachKey = course.intensivwoche_kurse?.fach as keyof typeof FACH_LABELS | undefined
              const fachFarben = fachKey ? FACH_FARBEN[fachKey] : undefined
              const fachLabel = fachKey ? FACH_LABELS[fachKey] : course.intensivwoche_kurse?.fach

              return (
                <div
                  key={course.id}
                  className="rounded-xl border border-border bg-background p-5 space-y-3.5 hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground text-base">
                        {course.intensivwoche_kurse?.name || 'Intensivkurs'}
                      </h4>
                      {fachLabel && (
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
                            fachFarben ? `${fachFarben.bg} ${fachFarben.text}` : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {fachLabel}
                        </span>
                      )}
                    </div>
                    <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-white shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      Aktiv
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                    {course.intensivwoche_kurse?.start_datum && course.intensivwoche_kurse?.end_datum && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <span>
                          {formatDate(course.intensivwoche_kurse.start_datum)} –{' '}
                          {formatDate(course.intensivwoche_kurse.end_datum)}
                        </span>
                      </div>
                    )}
                    {course.intensivwoche_kurse?.uhrzeit && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <span>{course.intensivwoche_kurse.uhrzeit}</span>
                      </div>
                    )}
                    {course.intensivwoche_kurse?.ort && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span>{course.intensivwoche_kurse.ort}</span>
                      </div>
                    )}
                  </div>

                  {(course.child_firstname || course.child_lastname) && (
                    <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        Teilnehmer:
                      </span>
                      <span className="font-medium text-foreground">
                        {[course.child_firstname, course.child_lastname].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 px-4 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-3">
            <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground text-sm">
                Keine aktiven Kurse gefunden
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isViewingSelf
                  ? 'Du bist aktuell für keinen aktiven Intensivkurs eingeschrieben.'
                  : `Für ${selectedMember?.name || 'dieses Konto'} liegt noch keine aktive Kursbuchung vor.`}
              </p>
            </div>
            <Button asChild size="sm" className="rounded-xl">
              <Link href="/intensivkurse">
                Zu den Intensivkursen <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Materials Section */}
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Lizenzen & Materialien</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isViewingSelf
                  ? 'Deine freigeschalteten Lernbereiche und Übungsmaterialien.'
                  : `Freigeschaltete Lernbereiche für ${selectedMember?.name || 'dieses Konto'}.`}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
            <Link href="/materialien">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Zu den Materialien
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : materials.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {materials.map((grant) => (
              <div
                key={grant.id}
                className="rounded-xl border border-border bg-background p-5 space-y-3 hover:border-indigo-500/40 transition-colors shadow-xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground text-base">
                      {grant.material_areas?.label || 'Materialbereich'}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Zugangsberechtigung aktiv
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                    Freigeschaltet
                  </Badge>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Gültig bis:</span>
                  <span className="font-medium text-foreground">
                    {grant.valid_until ? formatDate(grant.valid_until) : 'Unbegrenzt'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <div>
              <p className="font-medium text-foreground text-sm">
                Keine aktiven Material-Lizenzen vorhanden
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Lizenzen werden bei der Buchung von Vorbereitungskursen oder Selbststudium-Paketen automatisch freigeschaltet.
              </p>
            </div>
            <Button asChild size="sm" variant="outline" className="rounded-xl">
              <Link href="/materialien">
                Öffentliche Materialien ansehen <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
