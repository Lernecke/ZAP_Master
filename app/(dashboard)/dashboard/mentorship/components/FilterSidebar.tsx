'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/app/components/ui/button'
import { Label } from '@/app/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group'
import { Checkbox } from '@/app/components/ui/checkbox'
import { Input } from '@/app/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Filter, RotateCcw, Search } from 'lucide-react'

const CLASS_LEVELS = [7, 8, 9]

export function FilterSidebar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  // Local state
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [type, setType] = useState<string>(searchParams.get('type') || 'all')
  const [classLevels, setClassLevels] = useState<number[]>(() => {
    const levels = searchParams.get('levels')
    return levels ? levels.split(',').map(Number) : []
  })

  const updateFilters = () => {
    startTransition(() => {
      const params = new URLSearchParams()
      
      if (search) params.set('search', search)
      if (type !== 'all') params.set('type', type)
      if (classLevels.length > 0) params.set('levels', classLevels.join(','))
      
      router.push(`/dashboard/mentorship?${params.toString()}`)
    })
  }

  const resetFilters = () => {
    setSearch('')
    setType('all')
    setClassLevels([])
    startTransition(() => {
      router.push('/dashboard/mentorship')
    })
  }

  const toggleClassLevel = (level: number) => {
    setClassLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    )
  }

  return (
    <Card className="h-fit lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Filter className="h-4 w-4" />
          Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label>Suche</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nach Titel suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <Label>Typ</Label>
          <RadioGroup value={type} onValueChange={setType}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="type-all" />
              <Label htmlFor="type-all" className="font-normal cursor-pointer">
                Alle
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="OFFER" id="type-offer" />
              <Label htmlFor="type-offer" className="font-normal cursor-pointer">
                Angebote (Mentor sucht Mentee)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="REQUEST" id="type-request" />
              <Label htmlFor="type-request" className="font-normal cursor-pointer">
                Gesuche (Mentee sucht Mentor)
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Class Level Filter */}
        <div className="space-y-2">
          <Label>Klassenstufe</Label>
          <div className="space-y-2">
            {CLASS_LEVELS.map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox
                  id={`level-${level}`}
                  checked={classLevels.includes(level)}
                  onCheckedChange={() => toggleClassLevel(level)}
                />
                <Label
                  htmlFor={`level-${level}`}
                  className="font-normal cursor-pointer"
                >
                  {level}. Klasse
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            disabled={isPending}
            className="flex-1"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Zurücksetzen
          </Button>
          <Button
            size="sm"
            onClick={updateFilters}
            disabled={isPending}
            className="flex-1"
          >
            Anwenden
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
