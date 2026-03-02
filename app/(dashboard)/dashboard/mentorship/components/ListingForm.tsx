'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Label } from '@/app/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { toast } from 'sonner'
import { createListing, updateListing } from '../actions'
import { MentorshipListing, ListingType } from '@/types/mentorship'
import { ArrowLeft, Loader2, Save, BookOpen, GraduationCap } from 'lucide-react'
import Link from 'next/link'

const CLASS_LEVELS = [7, 8, 9]

const listingSchema = z.object({
  type: z.enum(['OFFER', 'REQUEST'] as const),
  title: z.string().min(5, 'Titel muss mindestens 5 Zeichen lang sein').max(100),
  description: z.string().min(20, 'Beschreibung muss mindestens 20 Zeichen lang sein').max(2000),
  class_levels: z.array(z.number()).min(1, 'Mindestens eine Klassenstufe auswählen'),
  availability: z.string().optional(),
})

type ListingFormData = z.infer<typeof listingSchema>

interface ListingFormProps {
  listing?: MentorshipListing
  mode: 'create' | 'edit'
}

export function ListingForm({ listing, mode }: ListingFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      type: (listing?.type as ListingType) || 'OFFER',
      title: listing?.title || '',
      description: listing?.description || '',
      class_levels: listing?.class_levels || [],
      availability: listing?.availability || '',
    },
  })

  const selectedType = form.watch('type')

  const onSubmit = (data: ListingFormData) => {
    startTransition(async () => {
      const result = mode === 'create'
        ? await createListing(data)
        : await updateListing(listing!.id, data)

      if (result.success) {
        toast.success(result.message)
        router.push('/dashboard/mentorship')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/mentorship"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zum Marktplatz
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'Neues Inserat erstellen' : 'Inserat bearbeiten'}
          </CardTitle>
          <CardDescription>
            {mode === 'create'
              ? 'Erstelle ein Angebot oder Gesuch für das Götti-System'
              : 'Aktualisiere dein Inserat'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Type Selection */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Art des Inserats</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <Label
                          htmlFor="type-offer"
                          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                            selectedType === 'OFFER'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <RadioGroupItem
                            value="OFFER"
                            id="type-offer"
                            className="sr-only"
                          />
                          <GraduationCap className={`mb-2 h-8 w-8 ${
                            selectedType === 'OFFER' ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <span className="font-semibold">Angebot</span>
                          <span className="mt-1 text-xs text-center text-muted-foreground">
                            Ich möchte helfen
                          </span>
                        </Label>
                        <Label
                          htmlFor="type-request"
                          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors ${
                            selectedType === 'REQUEST'
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <RadioGroupItem
                            value="REQUEST"
                            id="type-request"
                            className="sr-only"
                          />
                          <BookOpen className={`mb-2 h-8 w-8 ${
                            selectedType === 'REQUEST' ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <span className="font-semibold">Gesuch</span>
                          <span className="mt-1 text-xs text-center text-muted-foreground">
                            Ich suche Hilfe
                          </span>
                        </Label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          selectedType === 'OFFER'
                            ? 'z.B. Hilfe in Mathematik (Algebra, Geometrie)'
                            : 'z.B. Suche Unterstützung in Deutsch (Aufsätze)'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ein aussagekräftiger Titel hilft anderen, dein Inserat zu finden.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschreibung</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          selectedType === 'OFFER'
                            ? 'Beschreibe, wobei du helfen kannst und welche Erfahrung du hast...'
                            : 'Beschreibe, wobei du Hilfe brauchst und was deine Ziele sind...'
                        }
                        className="min-h-[120px] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 2000 Zeichen
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Class Levels */}
              <FormField
                control={form.control}
                name="class_levels"
                render={() => (
                  <FormItem>
                    <FormLabel>Klassenstufen</FormLabel>
                    <FormDescription>
                      {selectedType === 'OFFER'
                        ? 'Für welche Klassenstufen bietest du Hilfe an?'
                        : 'In welcher Klassenstufe bist du?'}
                    </FormDescription>
                    <div className="flex gap-4 pt-2">
                      {CLASS_LEVELS.map((level) => (
                        <FormField
                          key={level}
                          control={form.control}
                          name="class_levels"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(level)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || []
                                    if (checked) {
                                      field.onChange([...current, level])
                                    } else {
                                      field.onChange(
                                        current.filter((l) => l !== level)
                                      )
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {level}. Klasse
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Availability */}
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verfügbarkeit (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="z.B. Montag und Mittwoch nach der Schule"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Wann bist du für Treffen oder Online-Sessions verfügbar?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isPending}
                >
                  Abbrechen
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {mode === 'create' ? 'Inserat erstellen' : 'Änderungen speichern'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
