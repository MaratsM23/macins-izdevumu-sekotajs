
import React, { useState } from 'react';
import { db } from '../db';
import { supabase } from '../supabase';
import { downloadFile } from '../utils';
import { pushAllToSupabase, clearSupabaseTables } from '../lib/supabaseSync';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryManager from './CategoryManager';
import IncomeCategoryManager from './IncomeCategoryManager';
import RecurringManager from './RecurringManager';

interface SettingsProps {
  onLogout?: () => void;
  isDemoMode?: boolean;
  userEmail?: string;
  onShowPrivacy?: () => void;
}

const SettingsView: React.FC<SettingsProps> = ({ onLogout, isDemoMode, userEmail, onShowPrivacy }) => {
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportJSON = async () => {
    const expenses = await db.expenses.toArray();
    const incomes = await db.incomes.toArray();
    const categories = await db.categories.toArray();
    const incomeCategories = await db.incomeCategories.toArray();
    const recurring = await db.recurringExpenses.toArray();
    const debts = await db.debts.toArray();

    const data = { expenses, incomes, categories, incomeCategories, recurringExpenses: recurring, debts, exportDate: new Date().toISOString() };
    downloadFile(JSON.stringify(data, null, 2), `macins-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleExportCSV = async () => {
    const expenses = await db.expenses.toArray();
    const incomes = await db.incomes.toArray();
    const categories = await db.categories.toArray();
    const incomeCategories = await db.incomeCategories.toArray();

    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
    const incCatMap = Object.fromEntries(incomeCategories.map(c => [c.id, c.name]));

    const rows = [
      ['Tips', 'Datums', 'Summa', 'Valūta', 'Kategorija', 'Piezīme'],
      ...expenses.map(e => [
        'Izdevums',
        e.date,
        String(e.amount),
        e.currency || 'EUR',
        catMap[e.categoryId] || '',
        (e.note || '').replace(/"/g, '""'),
      ]),
      ...incomes.map(i => [
        'Ienākums',
        i.date,
        String(i.amount),
        i.currency || 'EUR',
        incCatMap[i.categoryId] || '',
        (i.note || '').replace(/"/g, '""'),
      ]),
    ];

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    downloadFile('\uFEFF' + csv, `macins-dati-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // 1. Parse JSON
        let data: any;
        try {
          data = JSON.parse(e.target?.result as string);
        } catch {
          throw new Error('Fails nav derīgs JSON.');
        }

        // 2. Validate required top-level keys
        const required = ['expenses', 'incomes', 'categories', 'incomeCategories', 'recurringExpenses', 'debts'];
        for (const key of required) {
          if (!data[key] || !Array.isArray(data[key])) {
            throw new Error(`Trūkst vai nepareizs lauks: "${key}"`);
          }
        }

        if (!window.confirm('Uzmanību! Visi esošie dati tiks aizvietoti ar faila saturu. Turpināt?')) return;

        // 3. Normalize empty-string foreign keys to null
        const normalizeFK = (obj: any) => ({
          ...obj,
          categoryId: obj.categoryId === '' ? null : (obj.categoryId ?? null),
        });

        // 4. Filter malformed records + normalize per table
        const validExpenses   = data.expenses.filter((r: any) => r.id && r.amount != null && r.date).map(normalizeFK);
        const validIncomes    = data.incomes.filter((r: any) => r.id && r.amount != null && r.date).map(normalizeFK);
        const validCategories = data.categories.filter((r: any) => r.id && r.name).map((c: any) => ({
          ...c,
          icon: c.icon ?? null,
          sortOrder: c.sortOrder ?? c.sort_order ?? 0,
        }));
        const validIncomeCats = data.incomeCategories.filter((r: any) => r.id && r.name);
        const validRecurring  = data.recurringExpenses.filter((r: any) => r.id && r.amount != null);
        const validDebts      = data.debts.filter((r: any) => r.id && r.title).map(normalizeFK);

        const totalRecords = validExpenses.length + validIncomes.length + validCategories.length +
                             validIncomeCats.length + validRecurring.length + validDebts.length;

        const BATCH_SIZE = 200;

        // 5. Clear Supabase
        setImportProgress('Notīra serverī...');
        await clearSupabaseTables(['expenses', 'incomes', 'categories', 'income_categories', 'recurring_expenses', 'debts']);

        // 6. Clear local DB
        setImportProgress('Notīra lokāli...');
        await db.expenses.clear();
        await db.incomes.clear();
        await db.categories.clear();
        await db.incomeCategories.clear();
        await db.recurringExpenses.clear();
        await db.debts.clear();

        // 7. Batched bulkPut with progress
        let imported = 0;
        const batchInsert = async (table: any, records: any[], label: string) => {
          for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);
            await table.bulkPut(batch);
            imported += batch.length;
            setImportProgress(`Importē... ${imported} / ${totalRecords} (${label})`);
          }
        };

        await batchInsert(db.categories, validCategories, 'kategorijas');
        await batchInsert(db.incomeCategories, validIncomeCats, 'ienākumu kategorijas');
        await batchInsert(db.expenses, validExpenses, 'izdevumi');
        await batchInsert(db.incomes, validIncomes, 'ienākumi');
        await batchInsert(db.recurringExpenses, validRecurring, 'regulārie');
        await batchInsert(db.debts, validDebts, 'parādi');

        // 8. Push to Supabase — warn but don't crash if it fails
        setImportProgress('Sinhronizē ar serveri...');
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) await pushAllToSupabase(session.user.id);
        } catch {
          alert('Dati saglabāti lokāli. Sinhronizācija ar serveri neizdevās.');
        }

        setImportProgress(null);
        alert(`Imports veiksmīgs: ${validExpenses.length} izdevumi, ${validIncomes.length} ienākumi ielādēti.`);
        window.location.reload();
      } catch (err) {
        setImportProgress(null);
        const msg = err instanceof Error ? err.message : 'Nezināma kļūda';
        alert(`Imports neizdevās. Pārbaudi faila formātu.\n\n${msg}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClearHistoryOnly = async () => {
    if (window.confirm('Vai dzēst VISU darījumu vēsturi? Kategorijas un regulārie maksājumi saglabāsies.')) {
      await clearSupabaseTables(['expenses', 'incomes', 'debts']);
      await Promise.all([db.expenses.clear(), db.incomes.clear(), db.debts.clear()]);
      await db.recurringExpenses.toCollection().modify({ lastGeneratedDate: undefined });
      alert('Vēsture notīrīta!');
      window.location.reload();
    }
  };

  const handleFullReset = async () => {
    if (window.confirm('DANGER: Vai tiešām dzēst PILNĪGI VISUS datus?')) {
      await clearSupabaseTables(['expenses', 'incomes', 'categories', 'income_categories', 'recurring_expenses', 'debts']);
      await Promise.all([db.expenses.clear(), db.incomes.clear(), db.categories.clear(), db.incomeCategories.clear(), db.recurringExpenses.clear(), db.debts.clear()]);
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DZĒST') return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      await Promise.all([db.expenses.clear(), db.incomes.clear(), db.categories.clear(), db.incomeCategories.clear(), db.recurringExpenses.clear(), db.debts.clear()]);
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      alert('Kļūda dzēšot kontu. Lūdzu mēģiniet vēlreiz.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-lg" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-accent)', color: 'var(--accent-primary)' }}>S</div>
        <h2 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Iestatījumi</h2>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <CategoryManager />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <IncomeCategoryManager />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <RecurringManager />
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Datu Pārvaldība</h3>

          <div className="grid grid-cols-1 gap-3">
            <button onClick={handleExportJSON} className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-bold active:scale-[0.98] transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <span>Eksportēt Datus (Backup)</span>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>JSON</span>
            </button>

            <button onClick={handleExportCSV} className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-bold active:scale-[0.98] transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <span>Eksportēt Darījumus</span>
              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>CSV</span>
            </button>

            <div className="relative group">
              <button className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-bold transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', border: '2px dashed var(--border)', color: importProgress ? 'var(--text-tertiary)' : 'var(--text-secondary)', opacity: importProgress ? 0.6 : 1 }}>
                <span>{importProgress ?? 'Importēt Datus'}</span>
              </button>
              {!importProgress && <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />}
            </div>
          </div>
        </motion.section>

        {onLogout && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl space-y-3" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Konts</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {isDemoMode ? 'Demo režīms' : userEmail || 'Lietotājs'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {isDemoMode ? 'Dati glabājas tikai šajā ierīcē' : 'Supabase autentifikācija'}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}
              >
                Iziet
              </button>
            </div>
            {onShowPrivacy && (
              <button
                onClick={onShowPrivacy}
                className="w-full text-left text-xs font-medium pt-2 underline"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Privātuma politika
              </button>
            )}
          </motion.section>
        )}

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-4">
          <h3 className="text-xs font-black uppercase tracking-widest px-2" style={{ color: 'var(--text-tertiary)' }}>Bīstamā Zona</h3>

          <button onClick={handleClearHistoryOnly} className="w-full p-4 rounded-2xl font-bold active:scale-[0.98] transition-all text-left flex justify-between items-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.2)', color: 'var(--warning)' }}>
            <span>Dzēst tikai vēsturi</span>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>Saglabāt kateg.</span>
          </button>

          <button onClick={handleFullReset} className="w-full p-4 rounded-2xl font-bold active:scale-[0.98] transition-all text-left flex justify-between items-center" style={{ backgroundColor: 'rgba(248, 113, 113, 0.08)', border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--danger)' }}>
            <span>Dzēst pilnīgi visu</span>
          </button>

          {onLogout && !isDemoMode && (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full p-4 rounded-2xl font-bold active:scale-[0.98] transition-all text-left flex justify-between items-center" style={{ backgroundColor: 'rgba(220, 38, 38, 0.12)', border: '2px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>
              <span>Dzēst kontu</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)' }}>Neatgriezeniski</span>
            </button>
          )}

          <p className="text-[10px] text-center pt-2 font-black uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
            Versija 2.0 Premium
          </p>
        </motion.section>
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm rounded-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '2px solid rgba(220, 38, 38, 0.3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <div className="text-4xl">&#9888;</div>
                <h3 className="text-lg font-bold" style={{ color: '#dc2626' }}>Dzēst kontu?</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Visi jūsu dati tiks neatgriezeniski dzēsti:</strong>
                </p>
                <ul className="text-xs text-left space-y-1 px-4" style={{ color: 'var(--text-tertiary)' }}>
                  <li>&#8226; Visi izdevumi un ienākumi</li>
                  <li>&#8226; Visas kategorijas</li>
                  <li>&#8226; Visi parādi</li>
                  <li>&#8226; Visi regulārie maksājumi</li>
                  <li>&#8226; Jūsu konts un autentifikācijas dati</li>
                </ul>
                <p className="text-xs font-bold pt-2" style={{ color: '#dc2626' }}>
                  Šo darbību nav iespējams atsaukt!
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  Ierakstiet <span style={{ color: '#dc2626' }}>DZĒST</span> lai apstiprinātu:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DZĒST"
                  disabled={isDeleting}
                  className="w-full p-3 rounded-xl text-center font-bold tracking-widest text-sm"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  disabled={isDeleting}
                  className="flex-1 p-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  Atcelt
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DZĒST' || isDeleting}
                  className="flex-1 p-3 rounded-xl font-bold text-sm active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: deleteConfirmText === 'DZĒST' ? '#dc2626' : 'rgba(220, 38, 38, 0.2)',
                    color: deleteConfirmText === 'DZĒST' ? '#fff' : 'rgba(220, 38, 38, 0.4)',
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {isDeleting ? 'Dzēš...' : 'Dzēst kontu'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsView;
