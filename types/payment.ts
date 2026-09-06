export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'

export interface PaymentRecord {
  id: string
  anmeldung_id: string | null
  user_id: string | null
  stripe_payment_intent_id: string | null
  stripe_checkout_session_id: string | null
  amount_rappen: number
  currency: string
  status: PaymentStatus
  payment_method_types: string[]
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CreateCheckoutSessionParams {
  anmeldung_id?: string
  user_id?: string
  amount_rappen: number
  currency?: string
  description?: string
  customer_email?: string
  payment_methods?: ('card' | 'twint')[]
  success_url: string
  cancel_url: string
  metadata?: Record<string, string>
}

export interface CreateCheckoutSessionResult {
  sessionId: string
  url: string | null
  paymentId: string
}
