import Anthropic from '@anthropic-ai/sdk'

// Lazy-initialisiert damit der Build nicht fehlschlägt wenn ANTHROPIC_API_KEY fehlt
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY ist nicht in den Umgebungsvariablen gesetzt.')
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export const anthropic = {
  messages: {
    create: (...args: Parameters<Anthropic['messages']['create']>) =>
      getAnthropicClient().messages.create(...args),
  },
}

export const AI_MODEL = 'claude-sonnet-4-6'
export const AI_MAX_TOKENS = 4096
