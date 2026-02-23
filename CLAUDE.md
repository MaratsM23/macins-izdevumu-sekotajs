# Maciņš - Production Web App

Šī ir PRODUCTION lietotne, nevis prototips vai MVP. Reāli lietotāji to izmanto ikdienā. Visas izmaiņas tiek automātiski deploy'otas uz Vercel no main branch.

## Kritiskas lietas

- **NEKAD neizdzēst lietotāja datus** bez skaidra lietotāja pieprasījuma
- **NEKAD neveikt destruktīvas darbības** ar IndexedDB vai Supabase bez apstiprināšanas
- **Supabase ir galvenā DB** — visi dati tiek sinhronizēti caur Dexie hooks
- **Dexie ir lokālais cache** — nodrošina offline darbību un reaktīvu UI
- **Testēt pirms push** - `npx tsc --noEmit` obligāti pirms katra commit

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (dark theme ar CSS custom properties)
- Dexie (IndexedDB wrapper) - lokālais cache + offline
- dexie-react-hooks (useLiveQuery) - reaktīvs datu rādīšana
- Supabase - auth + galvenā datu bāze (PostgreSQL ar RLS)
- Recharts - grafiki
- Framer Motion - animācijas
- Vercel - hosting ar auto-deploy

## Arhitektūra: Sync

Dexie hooks automātiski push'o izmaiņas uz Supabase (fire-and-forget):
- `creating` hook → Supabase `upsert`
- `updating` hook → Supabase `upsert` ar merged `{...obj, ...mods}`
- `deleting` hook → Supabase `delete`

**Kritiskais `isSyncing` flags** — novērš infinite loop kad `syncFromSupabase()` ieraksta lokāli.

Bulk operācijas (clear, bulkAdd) netrigero hooks — Settings.tsx veic tiešus Supabase calls.

Faili:
- `lib/columnMapping.ts` - centrālais camelCase↔snake_case mapping
- `lib/supabaseSync.ts` - hooks, sync, queue, push/pull

## Projekta struktūra

- `App.tsx` - galvenais komponents, routing, auth state, sync init, logout
- `db.ts` - Dexie datubāze (MaciņšDB v9), default kategorijas, seedDatabase, _syncQueue
- `lib/columnMapping.ts` - tabulu un kolonnu mapping (Dexie↔Supabase)
- `lib/supabaseSync.ts` - sync engine (hooks, push, pull, queue, clear)
- `types.ts` - visi TypeScript interfaces
- `recurringLogic.ts` - regulāro maksājumu automātiska ģenerēšana
- `supabase-schema.sql` - sākotnējā DB shēma
- `supabase-migration-v2.sql` - Phase 2: data_source, user_profiles, consents
- `components/` - visi UI komponenti:
  - `Auth.tsx` - login/register forma
  - `AddExpenseForm.tsx` - izdevumu/ienākumu pievienošana
  - `History.tsx` - darījumu vēsture ar filtriem
  - `Reports.tsx` - budžeta pārskati, rēķinu apmaksa
  - `FinanceView.tsx` - finansu pārskats (uzkrājumi, parādi)
  - `Settings.tsx` - iestatījumi, eksports/imports, konta dzēšana, Supabase sync
  - `CategoryManager.tsx` - kategoriju pārvaldība
  - `Onboarding.tsx` - jauna lietotāja welcome flow

## Datu modelis

Lokāli (Dexie, camelCase) → Supabase (PostgreSQL, snake_case):
- `expenses` - izdevumi (id, amount, currency, date, categoryId, note, debtId)
- `incomes` - ienākumi (tāda pati struktūra kā expenses)
- `categories` - izdevumu kategorijas (id, name, sortOrder, isArchived, isInvestment, monthlyBudget)
- `incomeCategories` - ienākumu kategorijas
- `recurringExpenses` - regulārie maksājumi (id, amount, categoryId, frequency, startDate, lastGeneratedDate)
- `debts` - parādi (id, title, totalAmount, remainingAmount, monthlyPayment, dueDateDay)
- `_syncQueue` - offline sync queue (tikai lokāli)

Supabase papildus:
- `user_profiles` - lietotāja profils, valūta, AI eligibility
- `user_consents` - GDPR piekrišanas
- `deletion_requests` - konta dzēšanas audit trail

## Valoda

App UI ir latviešu valodā. Commit messages un kods ir angliski.

## Deployment

Push uz `main` → Vercel automātiski build'o un deploy'o. Nav staging vides.
