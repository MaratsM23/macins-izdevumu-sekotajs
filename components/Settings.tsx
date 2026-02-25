
import React, { useState } from 'react';
import { db } from '../db';
import { downloadFile, validateImportData } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryManager from './CategoryManager';
import IncomeCategoryManager from './IncomeCategoryManager';
import RecurringManager from './RecurringManager';

const SettingsView: React.FC = () => {
  const [importError, setImportError] = useState('');

  const handleExportJSON = async () => {
    const expenses = await db.expenses.toArray();
    const incomes = await db.incomes.toArray();
    const categories = await db.categories.toArray();
    const incomeCategories = await db.incomeCategories.toArray();
    const recurring = await db.recurringExpenses.toArray();
    const debts = await db.debts.toArray();

    const data = {
      expenses,
      incomes,
      categories,
      incomeCategories,
      recurringExpenses: recurring,
      debts,
      exportDate: new Date().toISOString()
    };
    downloadFile(JSON.stringify(data, null, 2), `macins-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (validateImportData(json)) {
          if (window.confirm('Uzmanību! Visi esošie dati tiks aizvietoti ar faila saturu. Turpināt?')) {
            await (db as any).transaction('rw', [db.expenses, db.incomes, db.categories, db.incomeCategories, db.recurringExpenses, db.debts], async () => {
              await db.expenses.clear();
              await db.incomes.clear();
              await db.categories.clear();
              await db.incomeCategories.clear();
              await db.recurringExpenses.clear();
              await db.debts.clear();

              await db.expenses.bulkAdd(json.expenses || []);
              if (json.incomes) await db.incomes.bulkAdd(json.incomes);
              await db.categories.bulkAdd(json.categories || []);
              if (json.incomeCategories) await db.incomeCategories.bulkAdd(json.incomeCategories || []);
              if (json.recurringExpenses) await db.recurringExpenses.bulkAdd(json.recurringExpenses || []);
              if (json.debts) await db.debts.bulkAdd(json.debts || []);
            });
            alert('Dati veiksmīgi importēti!');
            window.location.reload();
          }
        } else {
          setImportError('Nepareizs faila formāts.');
        }
      } catch (err) {
        setImportError('Kļūda lasot failu.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleClearHistoryOnly = async () => {
    if (window.confirm('Vai dzēst VISU darījumu vēsturi? Kategorijas un regulārie maksājumi saglabāsies. To nevar atsaukt.')) {
      await Promise.all([
        db.expenses.clear(),
        db.incomes.clear(),
        // We keep debts structure but reset payment history logic if needed? 
        // Actually, for a fresh start, debts usually should go too or be reset. 
        // Let's clear debts too as they are "transactions" in a sense.
        db.debts.clear()
      ]);
      // Reset lastGeneratedDate for recurring expenses so they start fresh
      await db.recurringExpenses.toCollection().modify({ lastGeneratedDate: undefined });

      alert('Vēsture notīrīta! Kategorijas saglabātas.');
      window.location.reload();
    }
  };

  const handleFullReset = async () => {
    if (window.confirm('DANGER: Vai tiešām dzēst PILNĪGI VISUS datus? Aplikācija būs kā jauna.')) {
      await Promise.all([
        db.expenses.clear(),
        db.incomes.clear(),
        db.categories.clear(),
        db.incomeCategories.clear(),
        db.recurringExpenses.clear(),
        db.debts.clear()
      ]);
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-2"
      >
        <div className="bg-gradient-to-br from-stone-800 to-stone-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-md shadow-stone-800/20">S</div>
        <h2 className="text-2xl font-black tracking-tight text-stone-800">Iestatījumi</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
        className="space-y-8"
      >
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
        >
          <CategoryManager />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
        >
          <IncomeCategoryManager />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
        >
          <RecurringManager />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-stone-100/60 backdrop-blur-xl p-6 rounded-[2rem] space-y-4 border border-white"
        >
          <h3 className="text-lg font-bold text-stone-700 flex items-center gap-2">
            📂 Datu Pārvaldība
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-2 w-full p-4 bg-white border border-stone-200 rounded-2xl font-bold text-stone-700 shadow-sm hover:bg-stone-50 active:scale-[0.98] transition-all"
            >
              <span>Eksportēt Datus (Backup)</span>
              <span className="text-xs bg-stone-100 px-2 py-1 rounded text-stone-500">JSON</span>
            </button>

            <div className="relative group">
              <button className="flex items-center justify-center gap-2 w-full p-4 bg-white border-2 border-dashed border-stone-300 rounded-2xl font-bold text-stone-500 hover:bg-stone-50 hover:border-stone-400 transition-all">
                <span>Importēt Datus</span>
              </button>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            {importError && <p className="text-red-500 text-center text-xs font-black bg-red-50 p-3 rounded-xl border border-red-100 tracking-wide uppercase">{importError}</p>}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 pt-4"
        >
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest px-2">Bīstamā Zona</h3>

          <button
            onClick={handleClearHistoryOnly}
            className="w-full p-4 border border-orange-200 bg-orange-50 text-orange-700 rounded-2xl font-bold hover:bg-orange-100 active:scale-[0.98] transition-all text-left flex justify-between items-center"
          >
            <span>Dzēst tikai vēsturi</span>
            <span className="text-[10px] uppercase tracking-wider bg-white/50 px-2 py-1 rounded">Saglabāt kateg.</span>
          </button>

          <button
            onClick={handleFullReset}
            className="w-full p-4 bg-rose-50/80 text-rose-600 border border-rose-100 rounded-2xl font-bold hover:bg-rose-100 active:scale-[0.98] transition-all text-left flex justify-between items-center"
          >
            <span>Dzēst pilnīgi visu</span>
            <span className="text-xl">🗑️</span>
          </button>
          <p className="text-[10px] text-stone-400 text-center pt-2 font-black uppercase tracking-widest">
            Versija 2.0 Premium • Lokālie Dati
          </p>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default SettingsView;
