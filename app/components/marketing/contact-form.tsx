'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { contactFormSchema, type ContactFormInput } from '@/types/contact-form'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Label } from '@/app/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip'

// Abschnitt 9.1 (Publikationsgate "Kontaktinhalt") und Abschnitt 1b des Architektur-Briefings:
// ein Kontaktformular ist für die erste Veröffentlichung optional und braucht vor echtem Versand
// eine eigene Spam-/Datenschutzentscheidung. Das Formular ist deshalb bewusst vollständig gebaut
// und validiert, sendet aber noch nirgends hin -- der Submit-Button bleibt disabled mit erklärendem
// Tooltip, statt einen Versand vorzutäuschen oder eine echte Empfänger-Adresse zu erfinden. Gleiches
// Muster wie bei noch nicht freigegebenen CTAs an anderer Stelle (z. B. BookingButton `disabled`,
// Selbststudium-/Nachhilfe-Checkout).
function ContactForm() {
  const form = useForm<ContactFormInput>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      preferredContact: 'email',
      name: '',
      email: '',
      phone: '',
      message: '',
    },
  })

  return (
    <Form {...form}>
      <form className="flex max-w-xl flex-col gap-6" noValidate>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-3 text-sm font-medium text-foreground">
            Ich möchte gerne kontaktiert werden via…
          </legend>
          <FormField
            control={form.control}
            name="preferredContact"
            render={({ field }) => (
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="phone" />
                  Telefon
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="email" />
                  E-Mail
                </Label>
              </RadioGroup>
            )}
          />
        </fieldset>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Vorname Nachname" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail-Adresse</FormLabel>
              <FormControl>
                <Input type="email" placeholder="beispiel@muster.ch" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefonnummer</FormLabel>
              <p className="text-sm text-muted-foreground">Unter welcher Nummer sind Sie erreichbar?</p>
              <FormControl>
                <Input type="tel" placeholder="+41 79 111 11 11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frage / Kommentar</FormLabel>
              <p className="text-sm text-muted-foreground">Wie können wir Ihnen weiterhelfen?</p>
              <FormControl>
                <Textarea rows={5} placeholder="" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button type="submit" disabled aria-disabled="true" className="rounded-full px-8">
                  Senden
                  <span className="sr-only"> — Formular ist noch nicht aktiv</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Kontaktformular wird in Kürze aktiviert.</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </form>
    </Form>
  )
}

export { ContactForm }
