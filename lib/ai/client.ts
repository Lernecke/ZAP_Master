import Anthropic from '@anthropic-ai/sdk'

const MISSING_API_KEY_MESSAGE =
  'ANTHROPIC_API_KEY ist nicht gesetzt. Setze ANTHROPIC_API_KEY oder konfiguriere `LLM_PROVIDER=bfh`.'

const rejectMissingApiKey: typeof fetch = () =>
  Promise.reject(new Error(MISSING_API_KEY_MESSAGE))

// Lazy-initialisiert; ohne Schlüssel bleibt der Client importierbar und lehnt API-Aufrufe lokal ab.
let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    _client = apiKey
      ? new Anthropic({ apiKey })
      : new Anthropic({ apiKey: 'missing', fetch: rejectMissingApiKey })
  }
  return _client
}

export const anthropic = getAnthropicClient()

export const AI_MODEL = 'claude-sonnet-4-6'
export const AI_MAX_TOKENS = 4096
