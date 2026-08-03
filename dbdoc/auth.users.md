# auth.users

## Description

Auth: Stores user login data within a secure schema.

## Columns

| Name | Type | Default | Nullable | Extra Definition | Children | Parents | Comment |
| ---- | ---- | ------- | -------- | ---------------- | -------- | ------- | ------- |
| instance_id | uuid |  | true |  |  |  |  |
| id | uuid |  | false |  | [auth.identities](auth.identities.md) [auth.sessions](auth.sessions.md) [auth.mfa_factors](auth.mfa_factors.md) [auth.one_time_tokens](auth.one_time_tokens.md) [auth.oauth_authorizations](auth.oauth_authorizations.md) [auth.oauth_consents](auth.oauth_consents.md) [auth.webauthn_credentials](auth.webauthn_credentials.md) [auth.webauthn_challenges](auth.webauthn_challenges.md) [public.intensivwoche_anmeldungen](public.intensivwoche_anmeldungen.md) [public.intensivwoche_kurse](public.intensivwoche_kurse.md) [public.learning_materials](public.learning_materials.md) [public.trainer_progress](public.trainer_progress.md) [public.self_study_enrollments](public.self_study_enrollments.md) [public.material_access_grants](public.material_access_grants.md) [public.audit_log](public.audit_log.md) [public.daily_releases](public.daily_releases.md) [public.teacher_assignments](public.teacher_assignments.md) [public.work_entries](public.work_entries.md) [public.teacher_rate_agreements](public.teacher_rate_agreements.md) [public.payroll_periods](public.payroll_periods.md) [public.payroll_snapshots](public.payroll_snapshots.md) [public.expense_entries](public.expense_entries.md) [public.financial_periods](public.financial_periods.md) [public.financial_adjustments](public.financial_adjustments.md) |  |  |
| aud | varchar(255) |  | true |  |  |  |  |
| role | varchar(255) |  | true |  |  |  |  |
| email | varchar(255) |  | true |  |  |  |  |
| encrypted_password | varchar(255) |  | true |  |  |  |  |
| email_confirmed_at | timestamp with time zone |  | true |  |  |  |  |
| invited_at | timestamp with time zone |  | true |  |  |  |  |
| confirmation_token | varchar(255) |  | true |  |  |  |  |
| confirmation_sent_at | timestamp with time zone |  | true |  |  |  |  |
| recovery_token | varchar(255) |  | true |  |  |  |  |
| recovery_sent_at | timestamp with time zone |  | true |  |  |  |  |
| email_change_token_new | varchar(255) |  | true |  |  |  |  |
| email_change | varchar(255) |  | true |  |  |  |  |
| email_change_sent_at | timestamp with time zone |  | true |  |  |  |  |
| last_sign_in_at | timestamp with time zone |  | true |  |  |  |  |
| raw_app_meta_data | jsonb |  | true |  |  |  |  |
| raw_user_meta_data | jsonb |  | true |  |  |  |  |
| is_super_admin | boolean |  | true |  |  |  |  |
| created_at | timestamp with time zone |  | true |  |  |  |  |
| updated_at | timestamp with time zone |  | true |  |  |  |  |
| phone | text | NULL::character varying | true |  |  |  |  |
| phone_confirmed_at | timestamp with time zone |  | true |  |  |  |  |
| phone_change | text | ''::character varying | true |  |  |  |  |
| phone_change_token | varchar(255) | ''::character varying | true |  |  |  |  |
| phone_change_sent_at | timestamp with time zone |  | true |  |  |  |  |
| confirmed_at | timestamp with time zone |  | true | GENERATED ALWAYS AS LEAST(email_confirmed_at, phone_confirmed_at) STORED |  |  |  |
| email_change_token_current | varchar(255) | ''::character varying | true |  |  |  |  |
| email_change_confirm_status | smallint | 0 | true |  |  |  |  |
| banned_until | timestamp with time zone |  | true |  |  |  |  |
| reauthentication_token | varchar(255) | ''::character varying | true |  |  |  |  |
| reauthentication_sent_at | timestamp with time zone |  | true |  |  |  |  |
| is_sso_user | boolean | false | false |  |  |  | Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails. |
| deleted_at | timestamp with time zone |  | true |  |  |  |  |
| is_anonymous | boolean | false | false |  |  |  |  |

## Constraints

| Name | Type | Definition |
| ---- | ---- | ---------- |
| users_email_change_confirm_status_check | CHECK | CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2))) |
| users_pkey | PRIMARY KEY | PRIMARY KEY (id) |
| users_phone_key | UNIQUE | UNIQUE (phone) |

## Indexes

| Name | Definition | Comment |
| ---- | ---------- | ------- |
| users_pkey | CREATE UNIQUE INDEX users_pkey ON auth.users USING btree (id) |  |
| users_instance_id_idx | CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id) |  |
| users_instance_id_email_idx | CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text)) |  |
| confirmation_token_idx | CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text) |  |
| recovery_token_idx | CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text) |  |
| email_change_token_current_idx | CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text) |  |
| email_change_token_new_idx | CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text) |  |
| reauthentication_token_idx | CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text) |  |
| users_email_partial_key | CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false) | Auth: A partial unique index that applies only when is_sso_user is false |
| users_phone_key | CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone) |  |
| users_is_anonymous_idx | CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous) |  |

## Relations

![er](auth.users.svg)

---

> Generated by [tbls](https://github.com/k1LoW/tbls)
