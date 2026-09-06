'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import Image from 'next/image'
import { toast } from 'sonner'
import { updateProfileSchema } from '@/types/profil'
import {
  User,
  Camera,
  Trash2,
  Save,
  Sun,
  Moon,
  Monitor,
  Loader2,
  School,
  Calendar,
  GraduationCap,
  FileText,
  Mail,
  CheckCircle2,
  AlertCircle,
  Heart,
  Receipt,
  CreditCard,
  Smartphone,
  Clock,
  XCircle,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { Badge } from '@/app/components/ui/badge'
import { CheckoutButton } from '@/app/components/payment/checkout-button'
import type { PaymentRecord } from '@/types/payment'
import {
  updateProfile,
  updateThemePreference,
  uploadAvatar,
  deleteAvatar,
  sendVerificationEmailAction,
} from './actions'
import { PasskeySection } from './passkey-section'
import { SocialSection } from './social-section'

interface Profile {
  id: string
  email: string | null
  email_verified?: boolean
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
  school_name: string | null
  class_level: string | null
  birth_date: string | null
  gender: string | null
  role: string | null
  theme_preference: 'light' | 'dark' | 'system' | null
  created_at: string | null
}

interface ProfileStats {
  totalAttempts: number
  completedExams: number
}

interface ProfilClientProps {
  profile: Profile
  stats: ProfileStats
  payments?: PaymentRecord[]
}

const GENDER_OPTIONS = [
  { value: '', label: 'Nicht angegeben' },
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'other', label: 'Divers' },
]

const CLASS_LEVELS = [
  { value: '', label: 'Nicht angegeben' },
  { value: '5', label: '5. Klasse' },
  { value: '6', label: '6. Klasse' },
  { value: '7', label: '7. Klasse (Sek)' },
  { value: '8', label: '8. Klasse (Sek)' },
  { value: '9', label: '9. Klasse (Sek)' },
  { value: 'gym', label: 'Gymnasium' },
  { value: 'other', label: 'Andere' },
]

export function ProfilClient({ profile, stats, payments }: ProfilClientProps) {
  const { setTheme } = useTheme()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [schoolName, setSchoolName] = useState(profile.school_name || '')
  const [classLevel, setClassLevel] = useState(profile.class_level || '')
  const [birthDate, setBirthDate] = useState(profile.birth_date || '')
  const [gender, setGender] = useState(profile.gender || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>(
    profile.theme_preference || 'light'
  )

  // UI state
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null)

  const handleRetryPayment = async (payment: PaymentRecord) => {
    setRetryingPaymentId(payment.id)
    try {
      const description =
        typeof payment.metadata?.description === 'string'
          ? payment.metadata.description
          : payment.anmeldung_id
          ? 'Kursbuchung Erneut versuchen'
          : 'Stripe Zahlung Wiederholen'

      const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
      const successUrl = `${window.location.origin}/kurse/erfolg?session_id={CHECKOUT_SESSION_ID}`

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anmeldung_id: payment.anmeldung_id || undefined,
          user_id: profile.id,
          amount_rappen: payment.amount_rappen,
          description,
          customer_email: profile.email || undefined,
          payment_methods: ['card', 'twint'],
          success_url: successUrl,
          cancel_url: currentUrl,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Erstellen der neuen Zahlungssession')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Keine Weiterleitungs-URL von Stripe erhalten')
      }
    } catch (err) {
      console.error('Retry checkout error:', err)
      toast.error(err instanceof Error ? err.message : 'Zahlungsfehler aufgetreten')
      setRetryingPaymentId(null)
    }
  }

  const handleSendVerificationEmail = async () => {
    setSendingVerification(true)
    try {
      const res = await sendVerificationEmailAction()
      if (res.success) {
        toast.success(res.message)
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error('Bestätigungs-E-Mail konnte nicht gesendet werden.')
    } finally {
      setSendingVerification(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)

    const parsed = updateProfileSchema.safeParse({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      bio: bio.trim() || undefined,
      school_name: schoolName.trim() || undefined,
    })

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Validierungsfehler')
      setSaving(false)
      return
    }

    const result = await updateProfile({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      bio: parsed.data.bio,
      school_name: parsed.data.school_name,
      class_level: classLevel,
      birth_date: birthDate || null,
      gender: gender || null,
    })

    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.error)
    }

    setSaving(false)
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setThemePreference(newTheme)
    setTheme(newTheme)

    const result = await updateThemePreference(newTheme)
    if (!result.success) {
      toast.error(result.error)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)

    const formData = new FormData()
    formData.append('avatar', file)

    const result = await uploadAvatar(formData)

    if (result.success && result.data) {
      setAvatarUrl(result.data)
      toast.success(result.message)
    } else if (!result.success) {
      toast.error(result.error)
    }

    setUploadingAvatar(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('Profilbild wirklich löschen?')) return

    setUploadingAvatar(true)
    const result = await deleteAvatar()

    if (result.success) {
      setAvatarUrl(null)
      toast.success(result.message)
    } else {
      toast.error(result.error)
    }

    setUploadingAvatar(false)
  }

  const getRoleName = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'lehrperson':
        return 'Lehrperson'
      default:
        return 'Schüler/in'
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Avatar & Quick Info */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Profilbild</h3>
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-background shadow-lg">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profilbild"
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <User className="w-16 h-16 text-primary/50" />
                    </div>
                  )}
                </div>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="rounded-lg"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Ändern
                </Button>
                {avatarUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAvatar}
                    disabled={uploadingAvatar}
                    aria-label="Profilbild löschen"
                    className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                JPG, PNG, WebP oder GIF. Max. 2MB.
              </p>
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Statistiken</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prüfungsversuche</span>
                <span className="text-lg font-bold text-foreground">{stats.totalAttempts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Abgeschlossen</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats.completedExams}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Erfolgsquote</span>
                <span className="text-lg font-bold text-primary">
                  {stats.totalAttempts > 0
                    ? Math.round((stats.completedExams / stats.totalAttempts) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Kontoinformationen</h3>
            <div className="space-y-4 text-sm">
              <div>
                <div className="flex items-center justify-between gap-2 text-muted-foreground mb-1">
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  {profile.email_verified ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium shrink-0"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Verifiziert
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium shrink-0"
                    >
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      Nicht verifiziert
                    </Badge>
                  )}
                </div>

                {!profile.email_verified && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Deine E-Mail-Adresse ist noch nicht verifiziert.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendVerificationEmail}
                      disabled={sendingVerification}
                      className="w-full text-xs rounded-lg border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    >
                      {sendingVerification ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Wird gesendet...
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5 mr-1.5" />
                          Verifizierungs-E-Mail senden
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-muted-foreground">
                <GraduationCap className="w-4 h-4" />
                <span>{getRoleName(profile.role)}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Mitglied seit{' '}
                  {profile.created_at
                    ? new Date(profile.created_at).toLocaleDateString('de-CH')
                    : 'Unbekannt'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Persönliche Daten</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Vorname
                </label>
                <input
                  id="first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  placeholder="Dein Vorname"
                />
              </div>
              <div>
                <label htmlFor="last-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Nachname
                </label>
                <input
                  id="last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  placeholder="Dein Nachname"
                />
              </div>
              <div>
                <label htmlFor="birth-date" className="block text-sm font-medium text-foreground mb-1.5">
                  Geburtsdatum
                </label>
                <input
                  id="birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-foreground mb-1.5">
                  Geschlecht
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1.5">
                Über mich
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                placeholder="Erzähle etwas über dich..."
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {bio.length}/500
              </p>
            </div>
          </div>

          {/* School Info */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <School className="w-5 h-5" />
              Schulinformationen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="school-name" className="block text-sm font-medium text-foreground mb-1.5">
                  Schule
                </label>
                <input
                  id="school-name"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  placeholder="Name deiner Schule"
                />
              </div>
              <div>
                <label htmlFor="class-level" className="block text-sm font-medium text-foreground mb-1.5">
                  Klassenstufe
                </label>
                <select
                  id="class-level"
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                >
                  {CLASS_LEVELS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Darstellung</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Wähle dein bevorzugtes Farbschema. Diese Einstellung wird gespeichert.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  themePreference === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Sun className="w-6 h-6 text-amber-500" />
                </div>
                <span className="text-sm font-medium text-foreground">Hell</span>
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  themePreference === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <Moon className="w-6 h-6 text-slate-300" />
                </div>
                <span className="text-sm font-medium text-foreground">Dunkel</span>
              </button>
              <button
                onClick={() => handleThemeChange('system')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                  themePreference === 'system'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-slate-800 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground">System</span>
              </button>
            </div>
          </div>

          {/* Social Accounts & Linking */}
          <SocialSection />

          {/* Passkeys & Security */}
          <PasskeySection />

          {/* Test Donation Section */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">10 CHF Test-Spende</h3>
                <p className="text-sm text-muted-foreground">
                  Teste die Stripe Zahlungsabwicklung für TWINT und Kreditkarte.
                </p>
              </div>
            </div>

            <CheckoutButton
              userId={profile.id}
              customerEmail={profile.email || undefined}
              amountRappen={1000}
              description="10 CHF Test-Spende"
              buttonText="10 CHF Test-Spende bezahlen"
            />
          </div>

          {/* Payment History / Zahlungshistorie */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Zahlungshistorie</h3>
                <p className="text-sm text-muted-foreground">
                  Übersicht deiner getätigten Zahlungen und Kurstransaktionen.
                </p>
              </div>
            </div>

            {payments && payments.length > 0 ? (
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {payments.map((payment) => {
                  const amount = (payment.amount_rappen / 100).toFixed(2)
                  const date = new Date(payment.created_at).toLocaleDateString('de-CH', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const description =
                    typeof payment.metadata?.description === 'string'
                      ? payment.metadata.description
                      : payment.anmeldung_id
                      ? 'Kursbuchung'
                      : 'Stripe Zahlung'

                  return (
                    <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 bg-background hover:bg-accent/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-2 rounded-lg bg-muted text-muted-foreground">
                          {payment.payment_method_types?.includes('twint') ? (
                            <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground text-sm">{description}</div>
                          <div className="text-xs text-muted-foreground">{date}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="font-semibold text-foreground text-sm">
                          {payment.currency.toUpperCase()} {amount}
                        </div>
                        <div className="flex items-center gap-2">
                          {payment.status === 'succeeded' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Bezahlt
                            </span>
                          ) : payment.status === 'pending' || payment.status === 'processing' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Clock className="w-3.5 h-3.5" /> Ausstehend
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="w-3.5 h-3.5" /> {payment.status}
                            </span>
                          )}

                          {payment.status !== 'succeeded' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryingPaymentId === payment.id}
                              onClick={() => handleRetryPayment(payment)}
                              className="rounded-lg h-8 px-2.5 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/5"
                            >
                              {retryingPaymentId === payment.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Lädt...
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Erneut versuchen
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
                <Receipt className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="text-sm font-medium text-foreground">Keine bisherigen Zahlungen</p>
                <p className="text-xs text-muted-foreground">
                  Deine getätigten Kursbuchungen und Spenden erscheinen hier.
                </p>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="rounded-xl px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Änderungen speichern
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
