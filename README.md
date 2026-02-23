
# Maciņš - Personīgo Finanšu Lietotne

Production-ready web aplikācija personīgo finanšu pārvaldībai. Hostēta uz Vercel, autentifikācija un datu glabāšana caur Supabase.

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + custom dark theme
- **Lokālais cache:** Dexie (IndexedDB) - offline-first
- **Datu bāze:** Supabase (PostgreSQL) - galvenā DB ar RLS
- **Auth:** Supabase Authentication
- **Sync:** Dexie hooks → Supabase (fire-and-forget, offline queue)
- **Hosting:** Vercel (auto-deploy no main branch)
- **Analytics:** Vercel Analytics + Speed Insights

## Kā palaist lokāli
1. `npm install`
2. Izveidot `.env` ar Supabase credentials (vai palaist demo režīmā bez tiem)
3. `npm run dev`

## Galvenās Funkcijas
- **Izdevumu/ienākumu uzskaite** ar kategorijām un piezīmēm
- **Regulārie maksājumi** ar automātisku ģenerēšanu
- **Parādu pārvaldība** ar maksājumu sekošanu
- **Uzkrājumu konti** ar iemaksu/izņemšanu sekošanu
- **Budžeta plānošana** pa kategorijām ar vizuāliem indikatoriem
- **Detalizēti pārskati** ar Recharts grafikiem
- **Onboarding flow** jauniem lietotājiem
- **JSON/CSV eksports** datu backup un GDPR
- **Konta dzēšana** ar pilnu datu tīrīšanu

## Arhitektūra
- **Supabase kā galvenā DB:** Visi dati sinhronizējas ar Supabase PostgreSQL caur Dexie hooks.
- **Local-first cache:** Dexie (IndexedDB) nodrošina ātru UI un offline darbību.
- **Offline sync queue:** Ja push uz Supabase neizdodas, operācija tiek saglabāta rindā un atkārtota vēlāk.
- **Mobile-first dizains:** Optimizēts telefona ekrāniem ar touch-friendly UI.
