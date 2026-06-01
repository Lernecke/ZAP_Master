'use server'

import type Anthropic from '@anthropic-ai/sdk'
import { anthropic, AI_MODEL, AI_MAX_TOKENS } from '@/lib/ai/client'
import type { Json } from '@/types/database'
import { buildMathStepsPrompt } from '@/lib/ai/prompts'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import type { MathSolutionStep } from '@/types/exercise'

export async function generateMathSteps(
  exerciseType: string,
  exerciseId: number,
  question: string,
  solution: string,
  formula?: string,
): Promise<MathSolutionStep[] | null> {
  try {
    const supabase = createAdminSupabaseClient()

    // Check cache first
    const { data: cached } = await supabase
      .from('math_solution_steps')
      .select('steps')
      .eq('exercise_type', exerciseType)
      .eq('exercise_id', exerciseId)
      .maybeSingle()

    if (cached) {
      return cached.steps as unknown as MathSolutionStep[]
    }

    // Generate via Anthropic API
    const { system, user } = buildMathStepsPrompt(question, solution, formula)

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: user }],
    }) as Anthropic.Message

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : null
    if (!raw) return null

    // Strip markdown code fences if model wraps the JSON anyway
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()

    const steps: MathSolutionStep[] = JSON.parse(cleaned)

    // Store in DB (upsert in case of race condition)
    await supabase.from('math_solution_steps').upsert(
      {
        exercise_type: exerciseType,
        exercise_id: exerciseId,
        question,
        solution,
        steps: steps as unknown as Json,
        model_used: AI_MODEL,
      },
      { onConflict: 'exercise_type,exercise_id' },
    )

    return steps
  } catch (err) {
    console.error('[generateMathSteps] Fehler:', err)
    return null
  }
}
