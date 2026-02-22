
# Maciņš - Izdevumu Sekotājs

Vienkārša un ātra MVP aplikācija personīgo izdevumu uzskaitei. Būvēta kā **local-first** risinājums, kas nozīmē, ka visi dati paliek tikai un vienīgi jūsu ierīcē (IndexedDB).

## Kā palaist
1. Pārliecinieties, ka jums ir uzstādīts Node.js.
2. Terminālī palaidiet `npm install`.
3. Palaidiet izstrādes serveri ar `npm run dev`.
4. Atveriet norādīto adresi pārlūkprogrammā (ieteicams lietot mobilā telefona simulatoru vai atvērt no viedtālruņa).

## Galvenās Funkcijas
- **Ātra ievade:** Amount input fokuss uzreiz pie atvēršanas.
- **Kategorijas:** Pievienojiet savas kategorijas Iestatījumu sadaļā.
- **Datu drošība:** Nekādu serveru. Eksportējiet JSON vai CSV failus jebkurā laikā.
- **Vizuālie pārskati:** Recharts grafiki par pēdējām 7 dienām un tēriņu sadalījums pa kategorijām.

## Datu Export/Import
- Iet uz **Iestatījumi**.
- Spiediet **Eksportēt JSON** rezervju kopijai.
- Lai atjaunotu datus (piemēram, citā pārlūkā), izmantojiet **Importēt no JSON**.

## MVP Acceptance Checklist
- [ ] Lietotājs var pievienot izdevumu (Summa + Kategorija).
- [ ] Forma nodziest pēc saglabāšanas, bet saglabā datumu/kategoriju ērtībai.
- [ ] Vēstures sadaļā var redzēt visus ierakstus un izdzēst nepareizos.
- [ ] Pārskatu sadaļā parādās stabiņu grafiks un TOP kategorijas.
- [ ] Lietotājs var izveidot jaunu kategoriju Iestatījumos.
- [ ] Eksporta fails (CSV) satur korektus datus lasīšanai Excel/Sheets.
