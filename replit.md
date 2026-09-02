# Haiti Dental Clinic

A bilingual clinic workspace for managing Haitian dental patients, clinical records, treatment plans, attachments, and HTG/USD billing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server on its configured workflow port
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required environment is provisioned by Replit for PostgreSQL, Clerk, and private object storage.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dental-clinic` — React/Vite web application, routing, clinic UI, bilingual labels, Clerk pages, and visual theme.
- `artifacts/api-server/src/routes/clinic.ts` — clinic API handlers and report calculations.
- `artifacts/api-server/src/lib/clinicState.ts` — persisted clinic state, seed records, and audit event helpers.
- `artifacts/api-server/src/lib/objectStorage.ts` and `src/routes/storage.ts` — private attachment uploads and serving.
- `lib/api-spec/openapi.yaml` — source of truth for generated API hooks and Zod contracts.
- `lib/db/src/schema/index.ts` — Drizzle schema, including the persisted clinic state record.
- `artifacts/dental-clinic/public/logo.svg` and `src/index.css` — brand asset and shared visual tokens.

## Architecture decisions

- The clinic state is stored as a JSONB record behind typed API routes so the initial single-clinic product can ship without prematurely splitting every domain into tables.
- HTG and USD charges, payments, and balances remain separate; exchange rates are stored only as reference metadata and never blend totals.
- Tooth status is derived from treatment history and the odontogram uses FDI numbering for permanent, deciduous, and mixed dentition.
- Clerk provides authentication while the clinic API keeps audit records for patient-record actions; private attachments use Replit App Storage and signed uploads.
- The initial staff surface supports Dentist/Admin and Receptionist/Billing, with Dental Assistant permissions represented for later assignment.

## Product

The workspace includes a dashboard, patient directory, editable patient profiles, medical history and safety context, FDI odontograms with tooth history, visit and treatment-entry logs, multi-visit treatment plans, separate-currency billing, reports, attachments, audit trail, staff permissions, clinic settings, editable procedures, and EN/FR toggling. Primary routes are `/`, `/patients`, `/reports`, `/staff`, `/settings`, `/patients/:id`, `/patients/:id/odontogram`, and `/visits/:id`.

## User preferences

- The clinic brand uses Deep Teal, Soft Mint, Warm Coral, Off-white, Charcoal, and Muted Red.
- Keep the interface bilingual in English and French, with role-aware clinical and billing visibility.

## Gotchas

- Regenerate API hooks and Zod schemas after changing `lib/api-spec/openapi.yaml`.
- The web app uses the artifact base path from `import.meta.env.BASE_URL`; Clerk sign-in and sign-up components therefore receive full base-prefixed paths.
- Clerk development-key warnings are expected in preview. Production uses the provisioned proxy configuration.
- Currency totals must not be converted or blended. Attachment objects are private and should be accessed through the storage route, not public URLs.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
