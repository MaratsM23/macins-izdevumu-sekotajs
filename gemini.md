Sveiks! Kā izstrādātājs ar 20 gadu stāžu, esmu redzējis neskaitāmas tehnoloģiju maiņas. Šobrīd labākā izvēle šādam projektam (ātra izstrāde, cross-platform, mērogojamība) ir **React Native ar Expo** un **Supabase** kā aizmugursistēmu (backend). Tas ļaus tev viegli pievienot lietotājus (ģimeni, draugus) un nodrošinās datu drošību.

Zemāk ir sagatavots `gemini.md` fails, ko tu vari iekopēt savā AI čatā (Gemini, ChatGPT vai Claude), lai sāktu darbu.

***

# gemini.md: Personīgo Finanšu Lietotnes Izstrādes Plāns

## 1. Konteksts un Loma
Tu esi vecākais full-stack izstrādātājs. Tavs uzdevums ir palīdzēt man uzbūvēt mobilo lietotni "Finanšu Draugs". Lietotne paredzēta personīgo tēriņu fiksēšanai un kontrolei, ar iespēju vēlāk koplietot datus ar ģimeni un draugiem (shared spaces).

## 2. Tehnoloģiju Steks
*   **Framework:** React Native (Expo) ar Expo Router.
*   **Valoda:** TypeScript (tips drošībai).
*   **Backend/Database:** Supabase (Auth, PostgreSQL, Edge Functions).
*   **Styling:** NativeWind (Tailwind CSS mobilajām lietotnēm).
*   **State Management:** TanStack Query (React Query) datu sinhronizācijai.
*   **Grafiki:** Victory Native vai React Native Gifted Charts.

## 3. Galvenās Funkcijas (MVP)
1.  **Autorizācija:** Email/Password un Google Login (Supabase Auth).
2.  **Tēriņu Ievade:** Ātra forma (summa, kategorija, apraksts, datums).
3.  **Kategorijas:** Pielāgojamas kategorijas ar ikonām.
4.  **Pārskati:** Mēneša/nedēļas kopsavilkums un vizualizācija (pie chart/bar chart).
5.  **Grupas (Shared Wallets):** Iespēja izveidot kopīgu maku ar ģimeni vai draugiem, kur visi redz un pievieno tēriņus.
6.  **Valūtas:** Atbalsts EUR (ar iespēju paplašināt).

## 4. Datu Modelis (Database Schema)
*   **profiles:** `id, email, full_name, avatar_url`
*   **wallets:** `id, name, owner_id, type (personal/shared)`
*   **wallet_members:** `wallet_id, user_id, role (admin/member)`
*   **categories:** `id, name, icon, color, wallet_id (optional)`
*   **transactions:** `id, wallet_id, user_id, amount, category_id, description, date, type (expense/income)`

## 5. Izstrādes Posmi (Step-by-Step)

### 1. solis: Projekta inicializācija
- Izveidot Expo projektu ar TypeScript.
- Konfigurēt NativeWind.
- Uzstādīt Supabase klientu.

### 2. solis: Autentifikācija
- Izveidot Login un Sign-up ekrānus.
- Savienot ar Supabase Auth.
- Izveidot aizsargātos maršrutus (Protected Routes).

### 3. solis: Pamata funkcionalitāte (CRUD)
- Izveidot galveno ekrānu (Dashboard) ar kopējo bilanci.
- Izveidot formu tēriņu pievienošanai.
- Izveidot darījumu sarakstu (Transaction History).

### 4. solis: Grupu un Koplietošanas loģika
- Izveidot mehānismu "Uzaicināt lietotāju" (pēc e-pasta).
- Implementēt loģiku, lai redzētu darījumus no visiem grupas biedriem.

### 5. solis: UI/UX un Vizualizācija
- Pievienot grafikus.
- Ieviest "Dark Mode" atbalstu.
- Nodrošināt plūstošas animācijas (Reanimated).

## 6. Instrukcijas AI asistentam
Kad es uzdošu jautājumu, lūdzu:
1.  Sniedz koda piemērus, kas ir tīri un dokumentēti (Clean Code).
2.  Ievēro TypeScript labāko praksi.
3.  Ja ir nepieciešamas jaunas bibliotēkas, paskaidro, kāpēc tās ir labākās šim gadījumam.
4.  Vienmēr domā par datu drošību (Row Level Security Supabase pusē).

---

### Kā lietot šo failu:
1.  **Sagatavo vidi:** Uzstādi [Node.js](https://nodejs.org/) un [Expo CLI](https://docs.expo.dev/get-started/installation/).
2.  **Atver čatu:** Iekopē visu tekstu starp svītrām savā izvēlētajā AI modelī.
3.  **Pirmais jautājums:** Pēc tam, kad esi iedevis šo failu, raksti: *"Sākam ar 1. soli. Iedod komandas, lai izveidotu Expo projektu ar NativeWind un Supabase struktūru."*

### Seniora padoms:
Neaizraujies ar pārāk sarežģītām funkcijām sākumā. Tavs pirmais mērķis ir "Happy Path" – lai tu vari izvilkt telefonu, ievadīt "5.50€ - Pusdienas" un tas uzreiz parādās datubāzē. Kad tas strādā, tad būvē klāt koplietošanu ģimenei. Veiksmi darbā!