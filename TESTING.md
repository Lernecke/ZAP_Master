# ZAP Master — Test Suite & Security Testing Guide

This document describes the automated test architecture for **ZAP Master**, how to execute each test layer locally and in CI, and the complete catalog of security, validation, domain, end-to-end, and database test cases.

---

## 1. Test Architecture Overview

The test suite is structured into **four complementary layers** so that security-critical logic (authentication, middleware routing, webhook signature verification, payment verification gates, cron bearer auth, storage path sanitization, XSS escaping, RBAC, and IDOR checks) can run in ~1.3 seconds with zero external network dependencies, while full-stack browser E2E and PostgreSQL pgTAP suites verify live HTTP and database-level enforcement.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Fast Unit & Security Integration Suite (playwright.unit.config.ts)│
│ • Runs in ~1.3s in Node without starting Next.js or browsers               │
│ • 109 test cases across 5 suites under tests/unit/                         │
│ • Real Stripe HMAC-SHA256 webhook signature verification                   │
│ • Full proxy.ts middleware, Better Auth guards, payment gates, RBAC/IDOR   │
├────────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Live Browser & HTTP Security E2E Suite (playwright.config.ts)     │
│ • Runs against production build (`next start` on port 3000)                │
│ • tests/security-api.spec.ts (HTTP API & webhook security gates)           │
│ • tests/routes.spec.ts (public/protected routes, RBAC, cache invalidation) │
│ • tests/links.spec.ts, accessibility.spec.ts, performance.spec.ts,         │
│   flag-rollback.spec.ts                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Database RLS & RPC Suite (supabase/tests/database/*.sql)          │
│ • 25 pgTAP SQL test files (0001 – 0025) running in rolled-back transactions│
│ • Verifies RLS policies, SECURITY DEFINER functions, atomic booking RPC,   │
│   course fulfillment, material grant provisioning, and refund revocation   │
├────────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Static Analysis & Secret Scanning                                 │
│ • TypeScript strict check (`npm run typecheck`)                            │
│ • Secret leak prevention (`npm run check:secrets`)                         │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Quick Command Reference

### Fast Unit, Security, Validation & Domain Tests (No Server or DB Required)

| Command | Description |
| :--- | :--- |
| `npm test` | Runs all 109 unit & security integration tests (`playwright.unit.config.ts`) |
| `npm run test:unit` | Alias for `npm test` |
| `npm run test:security` | Runs only the security test suites in `tests/unit/security/` |
| `npx playwright test --config=playwright.unit.config.ts tests/unit/security/stripe-webhook.spec.ts` | Runs a single test file (e.g., Stripe webhook security tests) |
| `npm run typecheck` | Runs `tsc --noEmit` across the entire codebase and test files |
| `npm run check:secrets` | Verifies no service-role keys or secrets leak into client/public bundles |

### Full-Stack End-to-End & Database Tests (Requires Local Supabase Docker Stack)

> **Important Safety Rule**: Never point E2E or database tests at the live production Supabase project. All E2E scripts use `scripts/with-local-supabase.mjs`, which loads `.env.test.local` and aborts if `NEXT_PUBLIC_SUPABASE_URL` does not point to `127.0.0.1` or `localhost`.

```bash
# 1. Copy the test environment template once
cp .env.test.local.example .env.test.local

# 2. Start local Supabase (Docker) and reset schema + seed E2E users/fixtures
npx supabase start
npm run db:reset:test

# 3. Run all 25 pgTAP database security & schema tests (0001 - 0025)
npx supabase test db supabase/tests/database --local

# 4. Build the production Next.js bundle against the local Supabase instance
npm run build:test

# 5. Run the E2E suites
npm run test:security:e2e    # Live HTTP API & webhook security E2E (tests/security-api.spec.ts)
npm run test:routes          # Route protection, RBAC & cache regression E2E (tests/routes.spec.ts)
npm run test:links           # Broken link & CTA crawler (tests/links.spec.ts)
npm run test:a11y            # axe-core WCAG 2.1 AA accessibility checks (tests/accessibility.spec.ts)
npm run test:perf            # Core Web Vitals & bundle budgets (tests/performance.spec.ts)
npm run test:flag-rollback   # MARKETING_SITE_LIVE=false rollback verification (tests/flag-rollback.spec.ts)
```

---

## 3. Detailed Test Suite Catalog

### 3.1 Authentication, Session, Guards & Proxy Middleware (`tests/unit/security/auth-and-proxy.spec.ts`)

Covers `lib/auth/callback-url.ts`, `proxy.ts`, `lib/auth/config.ts`, `lib/auth/guards.ts`, `lib/auth/actions.ts`, `app/(auth)/register/actions.ts`, and `lib/supabase/server.ts`:

- **Open-Redirect Protection (`getSafeCallbackUrl`)**:
  - Allows valid internal relative paths and preserves query strings and hashes (`/dashboard`, `/intensivkurse?kurs=9001`, `/materialien/langzeitgymi#section-2`).
  - Falls back to `/dashboard` (or custom fallback) on `null`, `undefined`, empty string, whitespace, or relative paths without leading `/`.
  - Blocks protocol-relative URLs (`//evil.com`, `///evil.com`) and backslash bypasses (`/\evil.com`, `/\\evil.com`).
  - Blocks full external URLs (`https://evil.com`, `http://evil.com`) and dangerous URI schemes (`javascript:alert(1)`, `/javascript:alert(1)`, `data:text/html,...`, `/vbscript:msgbox(1)`).
  - Blocks URL-encoded open-redirect bypasses (`/%2f%2fevil.com`, `/%2F%2Fevil.com`, `/%5cevil.com`, `/https%3A%2F%2Fevil.com`) and malformed percent-encodings (`/%E0%A4%A`).
- **Next.js Proxy / Middleware (`proxy.ts`)**:
  - Verifies unauthenticated requests to all 17 protected route prefixes (`/dashboard`, `/dashboard/finanzen`, `/dashboard/arbeitszeiten`, `/dashboard/admin/benutzer`, `/trainer`, `/uebungen`, `/pruefung`, `/profil`, `/aufsaetze`, `/intensivkurse`, `/materialien`, `/arbeitszeiten`, etc.) return `HTTP 307` to `/login?callbackUrl=<exact_pathname>`.
  - Verifies `/api/auth/force-relogin` redirects unauthenticated requests to `/login`.
  - Verifies all three session cookie names (`better-auth.session_token`, `__Secure-better-auth.session_token`, `zap_auth_session`) are recognized.
  - Verifies authenticated users visiting `/login`, `/register`, `/forgot-password`, or `/reset-password` are redirected to the validated `callbackUrl` or `/dashboard`, and that malicious `callbackUrl` values on `/login` are neutralized to `/dashboard`.
  - Verifies `MARKETING_SITE_LIVE=false` rollback redirects localized marketing routes (`/`, `/de`, `/de/kurse/6-klasse`) to `/kurse` while keeping `/kurse` and `/admin` accessible.
- **Server Session & Role Guards (`lib/auth/config.ts`, `lib/auth/guards.ts`, `lib/auth/actions.ts`)**:
  - Tests `auth()` session mapping: default role (`user`), `accountType` (`parent_solo` vs `child`), `parentId`, name fallback, token attachment, and safe `null` return on unauthenticated or error states.
  - Tests `requireAuth()`, `requireContentManager()`, `requireAdmin()`, `getUserRole()`, `isContentManager()`, and `isAdmin()` across unauthenticated, student (`user`), teacher (`lehrperson`), and `admin` roles.
  - Tests `clearAuthSessionCookie()` and `signOutAction()` deleting all session cookies.
- **Registration & Supabase Client Privilege Separation (`app/(auth)/register/actions.ts`, `lib/supabase/server.ts`)**:
  - Rejects invalid registration payloads before calling Better Auth; maps `userId` and profile fields on success.
  - Verifies `createAdminSupabaseClient()` fails closed when `SUPABASE_SERVICE_ROLE_KEY` is missing.
  - Verifies `createAuthenticatedSupabaseClient()` attaches `Authorization: Bearer <jwt>` for valid 3-part JWTs without requiring the service-role key.

---

### 3.2 Stripe Webhook Signature & Event Handling (`tests/unit/security/stripe-webhook.spec.ts`)

Covers `app/api/webhooks/stripe/route.ts` and `lib/stripe.ts` using genuine Stripe HMAC-SHA256 signatures generated via `stripe.webhooks.generateTestHeaderString`:

- **Cryptographic Signature & Secret Gates**:
  - Missing `STRIPE_WEBHOOK_SECRET` returns `HTTP 500` (`Webhook secret is not configured`) — fail-closed.
  - Missing `stripe-signature` header returns `HTTP 400` (`Missing stripe-signature header`).
  - Forged signature signed with an attacker's secret returns `HTTP 400` (`Webhook Error: ...`) with zero DB calls.
  - Tampered payload (JSON body modified after signing, e.g., changing `unpaid` to `paid`) returns `HTTP 400`.
  - Replay attack with an expired timestamp (`> 300s` old) returns `HTTP 400` (`Timestamp outside the tolerance zone`).
- **Event Fulfillment & Revocation**:
  - `checkout.session.completed` (`paid` -> `p_status: 'succeeded'`, `unpaid` -> `p_status: 'processing'`, propagates `beneficiary_user_id`, `stripe_invoice_id`, and `customer_email`; returns `HTTP 500` on DB RPC error so Stripe retries).
  - `invoice.paid` & `invoice.payment_succeeded` (fulfills pending system payments via `fulfillSystemPaymentFromStripeInvoice` and cancels sibling non-succeeded payment rows).
  - `payment_intent.succeeded` & `payment_intent.payment_failed` (updates payment status and records `payment_method_types` / `last_payment_error`).
  - `charge.refunded` (marks payment `refunded`, revokes course and material access via `process_stripe_payment_update`, returns `HTTP 500` on DB failure).
  - `refund.created`, `refund.updated`, `charge.refund.updated` (ignores non-`succeeded` refunds; resolves `payment_intent` via `stripe.charges.retrieve` when omitted on the refund payload).
  - `credit_note.created` & `credit_note.updated` (ignores non-`issued` credit notes; processes `issued` credit notes and propagates `credit_note_id` and `out_of_band_amount`).
  - `invoice.voided` & `invoice.marked_uncollectible` (triggers refund/revocation flow by invoice ID).
  - Unhandled event types (e.g. `customer.created`) return `HTTP 200 { received: true }` safely.

---

### 3.3 Payment Routes & Stripe Portal Security (`tests/unit/security/payment-routes.spec.ts`)

Covers `app/api/stripe/verify-session/route.ts`, `app/api/stripe/create-checkout-session/route.ts`, `app/api/stripe/customer-portal/route.ts`, `app/api/payments/bank-transfer/route.ts`, `app/api/payments/bank-transfer/pdf/route.ts`, `app/api/user/theme/route.ts`, and `lib/stripe.ts`:

- **3-Gate Session Verification (`GET /api/stripe/verify-session`)**:
  - Gate 1: Rejects missing or malformed `session_id` not starting with `cs_test_` or `cs_live_` (`HTTP 400`).
  - Gate 2: Returns `HTTP 404` when Checkout Session is not found on Stripe.
  - Gate 3: Blocks cross-session URL hijacking (`HTTP 403`) when the Stripe session does not exist in our `payments` table.
  - Strict Payment Gate: Rejects unpaid sessions (`HTTP 400`) without calling the fulfillment RPC.
  - Paid session passes all gates, invokes `process_stripe_payment_update`, and returns `HTTP 200`.
- **Checkout Session Initialization (`POST /api/stripe/create-checkout-session`)**:
  - Rejects `amount_rappen <= 0` or missing `success_url`/`cancel_url` (`HTTP 400`).
  - Prevents double-payment (`HTTP 400`) when `anmeldung_id` or `retry_payment_id` already has a `succeeded` payment.
  - Reuses existing `pending`/`failed` payment record on retry, enriches metadata from `intensivwoche_anmeldungen`, and cancels sibling payment attempts.
- **Customer Portal Access Control & Open-Redirect Defense (`POST /api/stripe/customer-portal`)**:
  - Rejects unauthenticated callers (`HTTP 401`).
  - Blocks child accounts (`accountType === 'child'` or `parent_id` set) with `HTTP 403`.
  - Rejects accounts without an email address (`HTTP 400`).
  - Prevents open redirects via `return_url`: external URLs (`https://evil-phishing.example.com/steal`) fall back to `${origin}/profil`, while same-origin URLs are preserved.
- **Bank Transfer & Swiss QR-Bill PDF (`POST /api/payments/bank-transfer`, `GET /api/payments/bank-transfer/pdf`)**:
  - Validates `amount_rappen > 0`, blocks double-payment on already-paid enrollments, and creates `bank_transfer` payment records.
  - PDF route rejects missing `paymentId` (`HTTP 400`), returns `HTTP 404` when not found, and generates a valid `%PDF-` Swiss QR-Bill binary (`application/pdf`) for valid payments.
- **Stripe Customer & Invoice Sync Helpers (`lib/stripe.ts`)**:
  - Tests `getOrCreateStripeCustomer`, `syncSystemPaymentsToStripeInvoices`, `reconcilePendingPaymentsWithStripeInvoices`, and `ensureStripeInvoiceForPayment`.

---

### 3.4 Cron Auth, Storage Path Sanitization, XSS Escaping, Admin & IDOR (`tests/unit/security/cron-storage-admin.spec.ts`)

Covers `app/api/mail-outbox/process/route.ts`, `lib/storage/signed-upload.ts`, `app/(dashboard)/aufsaetze/actions.ts`, `app/(dashboard)/dashboard/aufsaetze/rubriken/actions.ts`, `lib/mail/templates/booking-confirmation.ts`, `app/admin/actions.ts`, `app/(dashboard)/dashboard/admin/benutzer/actions.ts`, `app/(dashboard)/profil/family-actions.ts`, `app/(dashboard)/profil/actions.ts`, `app/(dashboard)/dashboard/mentorship/actions.ts`, `app/(dashboard)/dashboard/materialien/actions.ts`, `app/(dashboard)/dashboard/kurse/actions.ts`, `app/(public)/kurse/actions.ts`, and `app/(dashboard)/dashboard/mail-outbox/actions.ts`:

- **Cron Bearer Token Authentication (`POST /api/mail-outbox/process`)**:
  - Fails closed (`HTTP 401`) when `MAIL_OUTBOX_CRON_SECRET` is unset or empty.
  - Rejects (`HTTP 401`) missing header, `Basic` auth, wrong-length token, and same-length wrong token (verified via `crypto.timingSafeEqual`).
  - Authorizes (`HTTP 200`) exact `Bearer <secret>` match and dispatches due outbox emails.
- **Storage Upload Path Traversal Defense (`createBucketSignedUploadUrl`)**:
  - Neutralizes `../../../etc/passwd`, backslashes, null bytes, and shell metacharacters while preserving German umlauts (`äöüÄÖÜß`) and truncating to `maxFileNameLength` under `{pathPrefix}/{userId}/{uuid}--`.
- **Essay & Rubric Path Spoofing & Role Guards**:
  - Blocks non-students from uploading student essays and blocks `saveEssayMetadata` when `filePath` does not start with `aufsaetze/${userId}/`.
  - Enforces draft-only mutation rules on `updateEssay` and `deleteEssay`.
  - Enforces teacher/admin role, 5 MB file size limit, `rubriken/${userId}/` path prefix on `saveRubricPdf`, and creator ownership on `deleteRubric`.
- **Booking Confirmation Email XSS Escaping & PII Minimization (`renderBookingConfirmation`)**:
  - Escapes `<`, `>`, `&`, `"`, and `'` across all interpolated fields (`<script>`, `<img onerror=...>`, quotes) and omits sensitive fields (`parent_phone`, `notes`).
- **Admin Dashboard & User Management Guards**:
  - Verifies password authentication in `app/admin/actions.ts`, `httpOnly` cookie attributes, and rejection of unauthenticated payment/user queries.
  - Verifies `updateUserRole` prevents admin self-demotion and `deleteUser` prevents admin self-deletion.
- **Family Sub-Account & Profile IDOR Prevention**:
  - Blocks child accounts from creating sub-accounts (`createChildAccountAction`).
  - Blocks Parent A from regenerating magic links (`regenerateChildMagicLinkAction`), deleting (`deleteChildAccountAction`), or viewing courses/materials (`getCoursesAndMaterialsAction`) belonging to Parent B's child.
- **Mentorship, Material, Course & Outbox Ownership Guards**:
  - Blocks self-requests on `createRequest`, enforces creator ownership for teachers on `updateMaterial`, `getKurse`, and `getKurs` while allowing admins, and enforces admin-only access on `getMailOutboxRows` / `processMailOutboxNow`.

---

### 3.5 Zod Validation Schemas (`tests/unit/validation/schemas.spec.ts`)

Tests all **16 Zod schemas** across `types/`:
- `loginSchema`, `registerSchema`, `forgotPasswordSchema`, `resetPasswordSchema` (`types/auth.ts`)
- `intensivwocheAnmeldungSchema` (`types/intensivwoche.ts`)
- `createChildAccountSchema` (`types/family.ts`)
- `createSignedUploadUrlSchema`, `gradeEssaySchema`, `createStructuredRubricSchema` (`types/aufsatz.ts`)
- `updateProfileSchema`, `updateThemeSchema` (`types/profil.ts`)
- `updateUserRoleSchema` (`types/admin.ts`)
- `kursFormSchema` (`types/kurs-form.ts`)
- `offerEditionFormSchema`, `courseSessionFormSchema` (`types/kurs-edition.ts`)
- `releaseFormSchema` (`types/kurs-tagesfreigabe.ts`)
- `workEntryFormSchema`, `rateAgreementFormSchema` (`types/kurs-arbeitszeit.ts`)
- `expenseEntryFormSchema`, `financialAdjustmentFormSchema` (`types/kurs-finanzen.ts`)
- `grantAccessFormSchema`, `isMaterialAreaId` (`types/kurs-materialien.ts`)
- `createMaterialSchema` (`types/material.ts`)
- `courseFormSchema`, `occurrenceFormSchema` (`types/auffrischungskurs.ts`)
- `contactFormSchema` (`types/contact-form.ts`)

---

### 3.6 Core Utilities, Domain Mappers, Mail Outbox & Zustand Stores (`tests/unit/lib/utilities-and-stores.spec.ts`)

- `lib/pricing.ts`: `formatChfRappen`, `formatSubscriptionPrice`, `formatOfferPrice`
- `lib/utils/zurich-time.ts`: `zurichLocalToUtcIso` & `utcIsoToZurichLocal` across CET (`+01:00`) and CEST (`+02:00`)
- `lib/utils/format.ts`, `lib/utils/examUtils.ts`, `lib/utils/extractEssayText.ts`
- `lib/kurse/mapper.ts` & `lib/kurse/session-row.ts`
- `lib/i18n/localize-content.ts`, `lib/seo.ts`, `lib/observability/logger.ts`, `lib/ai/prompts.ts`
- `lib/mail/dispatch-outbox.ts`: idempotent delivery, exponential backoff (`[1, 5, 25, 125, 625]` minutes), and `attempts < max_attempts` filtering
- `store/useAuthStore.ts` & `store/useProgressStore.ts`: Zustand role computation and exam answer persistence

---

### 3.7 Database pgTAP Security & Fulfillment Tests (`supabase/tests/database/0001` – `0025`)

All 25 SQL test files run inside `begin; ... rollback;` transactions against the local Supabase PostgreSQL instance:
- `0001` – `0022`: Baseline RLS, `SECURITY DEFINER` `search_path` hardening, atomic course booking RPC (`book_intensivwoche_kurs`), rate limiting, offer editions, daily releases, work time/payroll, financial cockpit, and mail outbox schema.
- `0023_payments_schema.sql`: `payments` table structure and basic `process_stripe_payment_update` transition.
- `0024_family_hierarchy_schema.sql`: `account_type` and `parent_id` hierarchy on `public."user"`.
- `0025_course_fulfillment_and_refund_security.sql`:
  - Verifies `anmeldungen_user_select_own_or_family` and `material_access_grants_select_own_family_or_admin` RLS policies exist.
  - Verifies `process_stripe_payment_update(..., 'succeeded', '{"beneficiary_user_id": ...}')` transitions enrollment to `'confirmed'`, binds `beneficiary_user_id`, and provisions an `active` `material_access_grants` row (`source_kind = 'course_booking'`).
  - Verifies `process_stripe_payment_update(..., 'failed', ...)` transitions enrollment to `'payment_failed'` and revokes the material grant (`status = 'revoked'`).
  - Verifies `process_stripe_payment_update(..., 'refunded', ...)` transitions enrollment to `'payment_outstanding'` and revokes the material grant.

---

## 4. Writing New Tests

- **Adding a Unit or Security Integration Test**:
  1. Create a `*.spec.ts` file under `tests/unit/security/`, `tests/unit/validation/`, or `tests/unit/lib/`.
  2. Import `../helpers/mock-registry` at the top of the file if testing Next.js route handlers or server actions that use `next/headers`, `next/navigation`, `next/cache`, `@/lib/auth`, or `@/lib/supabase/server`.
  3. Call `resetMocks()` in `test.beforeEach()` and use `createMockSupabase()` from `tests/unit/helpers/mock-supabase.ts` to inspect recorded `.from()`, `.rpc()`, and `.storage` calls.
- **Adding a pgTAP Database Test**:
  1. Create `supabase/tests/database/00XX_description.sql` wrapped in `begin; select plan(N); ... select * from finish(); rollback;`.
  2. Run `npx supabase test db supabase/tests/database --local`.
