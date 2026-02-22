
import React from 'react';
import { motion } from 'framer-motion';

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="space-y-6 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" style={{ color: 'var(--text-primary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Privātuma Politika</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl space-y-6"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Lietotnes "Maciņš" Privātuma politika</h3>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>I. Vispārīgie nosacījumi</h4>
            <p>1. Sabiedrība ar ierobežotu atbildību "EM&EM" (reģ. Nr. 40203394215, juridiskā adrese: Kaķu iela 4-14, Rīga, LV-1073) (turpmāk – Sabiedrība) nodrošina lietotnes "Maciņš" darbību un apņemas aizsargāt lietotāju personas datus saskaņā ar šo Privātuma politiku.</p>
            <p>2. Šīs politikas mērķis ir informēt lietotāju par to, kādi dati tiek vākti lietotnē "Maciņš", kāpēc tie tiek apstrādāti un kā tiek nodrošināta to drošība.</p>
            <p>3. Apstrādājot personas datus, Sabiedrība ievēro Vispārīgo datu aizsardzības regulu (GDPR) un Latvijas Republikas normatīvos aktus.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>II. Datu pārzinis</h4>
            <p>4. Datu pārzinis: SIA "EM&EM", e-pasts: info@ememai.com, tīmekļa vietne: <a href="https://ememai.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>https://ememai.com</a>.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>III. Apstrādājamo datu veidi un nolūki</h4>
            <p>5. Sabiedrība apstrādā personas datus šādiem nolūkiem:</p>
            <div className="pl-4 space-y-2">
              <p><strong style={{ color: 'var(--text-primary)' }}>5.1. Lietotāja konta izveide un nodrošināšana:</strong> e-pasta adrese (obligāta autorizācijai) un lietotāja vārds (pēc izvēles, saziņas personalizēšanai).</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>5.2. Lietotnes pamatfunkcijas nodrošināšana:</strong> Lietotāja ievadītie finanšu dati (darījumu summas, kategorijas, apraksti, datumi). Šie dati tiek piesaistīti konkrētam lietotāja kontam.</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>5.3. Pakalpojuma kvalitātes uzlabošana un analītika:</strong> Anonimizēti lietošanas paradumi, izmantojot Google Analytics un Vercel Analytics. Šie dati palīdz saprast, kuras funkcijas ir populāras un vai lietotnē nav tehnisku kļūdu.</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>5.4. Nākotnes maksājumu apstrāde:</strong> Ja lietotne ieviesīs maksas abonementus, dati par maksājumu (piemēram, caur Stripe vai citu starpnieku) tiks apstrādāti, lai izpildītu distances līgumu.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>IV. Datu apstrādes tiesiskais pamats</h4>
            <p>6. Datu apstrāde balstās uz šādiem pamatiem:</p>
            <div className="pl-4 space-y-1">
              <p><strong style={{ color: 'var(--text-primary)' }}>Līguma izpilde (GDPR 6.p. 1.b):</strong> Lai nodrošinātu lietotnes darbību un finanšu uzskaiti.</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Leģitīmās intereses (GDPR 6.p. 1.f):</strong> Lietotnes drošības uzturēšana un anonīma analītika servisa uzlabošanai.</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Piekrišana (GDPR 6.p. 1.a):</strong> Mārketinga paziņojumiem vai specifiskai datu analīzei, ja tāda tiek pieprasīta.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>V. Datu glabāšana un atrašanās vieta</h4>
            <p>7. <strong style={{ color: 'var(--text-primary)' }}>Atrašanās vieta:</strong> Visi lietotnes dati tiek glabāti Supabase infrastruktūrā, serveru reģionā Frankfurtē, Vācijā (ES), kas nodrošina augstu datu aizsardzības līmeni un atbilstību ES jurisdikcijai.</p>
            <p>8. <strong style={{ color: 'var(--text-primary)' }}>Termiņš:</strong> Personas dati un finanšu darījumu vēsture tiek glabāta tik ilgi, kamēr lietotājam ir aktīvs konts.</p>
            <p>9. <strong style={{ color: 'var(--text-primary)' }}>Dzēšana:</strong> Lietotājam ir tiesības jebkurā brīdī izmantot lietotnē iebūvēto funkciju "Dzēst kontu". Šādā gadījumā visi lietotāja dati (e-pasts, vārds un visi finanšu ieraksti) no Supabase datubāzes tiek neatgriezeniski dzēsti.</p>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>VI. Datu koplietošana un trešās puses</h4>
            <p>10. Sabiedrība nepārdod un neiznomā lietotāju datus. Dati var tikt nodoti tikai šādiem uzticamiem apstrādātājiem:</p>
            <div className="pl-4 space-y-1">
              <p><strong style={{ color: 'var(--text-primary)' }}>Supabase:</strong> Datu glabāšanai un autentifikācijai (ES reģions).</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Google Analytics & Vercel Analytics:</strong> Anonīmai statistikai par lietotnes apmeklējumu.</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Maksājumu procesori (nākotnē):</strong> Piemēram, Stripe, lai nodrošinātu abonēšanas maksas iekasēšanu.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>VII. Datu drošība</h4>
            <p>11. Sabiedrība lieto progresīvus tehniskos aizsardzības pasākumus:</p>
            <div className="pl-4 space-y-1">
              <p><strong style={{ color: 'var(--text-primary)' }}>Row Level Security (RLS):</strong> Datubāzes līmenī tiek nodrošināts, ka katrs lietotājs var piekļūt tikai un vienīgi savām rindām (datiem). Nevienam citam lietotājam nav tehnikas iespēju redzēt jūsu datus.</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Šifrēšana:</strong> Dati tiek pārsūtīti, izmantojot drošu HTTPS protokolu (TLS šifrēšanu).</p>
              <p><strong style={{ color: 'var(--text-primary)' }}>Izolācija:</strong> Analītikas dati (Google/Vercel) netiek sasaistīti ar jūsu konkrētajiem finanšu darījumiem.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>VIII. Lietotāja tiesības</h4>
            <p>12. Jums ir tiesības:</p>
            <div className="pl-4 space-y-1">
              <p>&#8226; Piekļūt saviem datiem un saņemt to kopiju.</p>
              <p>&#8226; Labot nepareizus datus.</p>
              <p>&#8226; Pieprasīt datu dzēšanu (izmantojot lietotnes iestatījumus).</p>
              <p>&#8226; Iebilst pret analītisko datu vākšanu.</p>
              <p>&#8226; Uz datu pārnesamību (eksportēt savus tēriņus mašīnlasāmā formātā).</p>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>IX. Saziņa un sūdzības</h4>
            <p>13. Ja jums ir jautājumi par jūsu datiem lietotnē "Maciņš", rakstiet uz: <strong style={{ color: 'var(--accent-primary)' }}>info@ememai.com</strong>.</p>
            <p>14. Ja uzskatāt, ka jūsu datu aizsardzības tiesības ir pārkāptas, jums ir tiesības vērsties Datu valsts inspekcijā (<a href="https://dvi.gov.lv" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>dvi.gov.lv</a>).</p>
          </section>

          <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}><strong>Versija:</strong> 2.2</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}><strong>Atjaunots:</strong> 22.02.2026.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;
