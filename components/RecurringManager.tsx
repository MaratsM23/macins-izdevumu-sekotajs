
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Frequency, RecurringExpense } from '../types';
import { parseAmount, getTodayStr, formatCurrency, formatDateLV } from '../utils';

// Helper for local date math
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function advanceDate(date: Date, frequency: Frequency): Date {
  const newDate = new Date(date);
  switch (frequency) {
    case 'daily': newDate.setDate(newDate.getDate() + 1); break;
    case 'weekly': newDate.setDate(newDate.getDate() + 7); break;
    case 'monthly': {
      const originalDay = newDate.getDate();
      newDate.setDate(1);
      newDate.setMonth(newDate.getMonth() + 1);
      const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
      newDate.setDate(Math.min(originalDay, lastDay));
      break;
    }
    case 'yearly': newDate.setFullYear(newDate.getFullYear() + 1); break;
  }
  return newDate;
}

const RecurringManager: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [startDate, setStartDate] = useState(getTodayStr());
  const [note, setNote] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const activeCategories = allCategories.filter(c => !c.isArchived);
  const recurring = useLiveQuery(() => db.recurringExpenses.toArray()) || [];

  useEffect(() => {
    if (activeCategories.length > 0 && !categoryId) {
      setCategoryId(activeCategories[0].id);
    }
  }, [activeCategories.length, categoryId]);

  const resetForm = () => {
    setAmount('');
    setNote('');
    setStartDate(getTodayStr());
    setFrequency('monthly');
    setEditingId(null);
    setIsFormOpen(false);
    if (activeCategories.length > 0) setCategoryId(activeCategories[0].id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0 || !categoryId) return;

    const expenseData = {
      amount: parsedAmount,
      categoryId,
      frequency,
      startDate,
      note: note.trim() || undefined,
      isActive: true,
      updatedAt: Date.now()
    };

    if (editingId) {
      await db.recurringExpenses.update(editingId, expenseData);
    } else {
      await db.recurringExpenses.add({
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        ...expenseData
      });
    }

    resetForm();
  };

  const startEditing = (item: RecurringExpense) => {
    setEditingId(item.id);
    setAmount(item.amount.toString());
    setCategoryId(item.categoryId);
    setFrequency(item.frequency);
    setStartDate(item.startDate);
    setNote(item.note || '');
    setIsFormOpen(true);
  };

  const deleteTemplate = async (id: string) => {
    if (window.confirm('Dzēst šo regulāro maksājumu?')) {
      await db.recurringExpenses.delete(id);
      if (editingId === id) resetForm();
    }
  };

  const handleManualTrigger = async (template: RecurringExpense) => {
    const todayStr = getTodayStr();
    try {
      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: template.amount,
        currency: 'EUR',
        date: todayStr,
        categoryId: template.categoryId,
        note: `[Manuāls] ${template.note || ''}`.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      await db.recurringExpenses.update(template.id, {
        lastGeneratedDate: todayStr
      });

      setJustAddedId(template.id);
      setTimeout(() => setJustAddedId(null), 2000);
    } catch (err) {
      console.error(err);
      alert("Kļūda pievienojot.");
    }
  };

  const getNextScheduledDate = (item: RecurringExpense) => {
    const last = item.lastGeneratedDate || item.startDate;
    const lastDate = parseLocalDate(last);
    const nextDate = advanceDate(lastDate, item.frequency);
    return formatLocalDate(nextDate);
  };

  const freqLabels: Record<Frequency, string> = {
    daily: 'Dienā', weekly: 'Nedēļā', monthly: 'Mēnesī', yearly: 'Gadā'
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-700">Regulārie maksājumi</h3>
        <button 
          onClick={() => {
            if (isFormOpen) resetForm();
            else setIsFormOpen(true);
          }}
          className="text-indigo-600 text-sm font-bold bg-indigo-50 px-3 py-1 rounded-lg"
        >
          {isFormOpen ? 'Aizvērt' : '+ Jauns'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-indigo-50 p-4 rounded-xl space-y-3 shadow-inner border border-indigo-100">
          <h4 className="text-xs font-bold text-indigo-800 uppercase mb-2">
            {editingId ? 'Rediģēt ierakstu' : 'Jauns regulārs maksājums'}
          </h4>
          
          <input 
            type="text" 
            placeholder="Nosaukums (piem. Spotify, Līzings)" 
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full p-2 rounded-lg border border-indigo-200 outline-none font-medium"
            autoFocus
          />

          <div className="grid grid-cols-2 gap-2">
            <input 
              type="text" inputMode="decimal" placeholder="Summa" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="p-2 rounded-lg border border-indigo-200 outline-none" required
            />
            <select 
              value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="p-2 rounded-lg border border-indigo-200 outline-none" required
            >
              {activeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select 
              value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}
              className="p-2 rounded-lg border border-indigo-200 outline-none"
            >
              {Object.entries(freqLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <input 
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="p-2 rounded-lg border border-indigo-200 outline-none" required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={resetForm} className="flex-1 py-2 text-slate-500 font-bold">
              Atcelt
            </button>
            <button type="submit" className="flex-[2] bg-indigo-600 text-white font-bold py-2 rounded-lg shadow-md hover:bg-indigo-700">
              {editingId ? 'Saglabāt Izmaiņas' : 'Pievienot'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {recurring.map(item => {
          const categoryName = allCategories.find(c => c.id === item.categoryId)?.name || '...';
          const displayName = item.note || categoryName;
          
          return (
            <div 
              key={item.id} 
              className={`flex justify-between items-center p-3 bg-white border rounded-xl shadow-sm transition-all ${
                justAddedId === item.id ? 'border-green-400 bg-green-50' : 'border-slate-100'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                    {categoryName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {freqLabels[item.frequency]}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {displayName}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Nākamais: {formatDateLV(getNextScheduledDate(item))}
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                <div className="text-right mr-2">
                  <p className="font-bold text-slate-900">{formatCurrency(item.amount)}</p>
                </div>
                
                <div className="flex bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                  <button 
                    onClick={() => handleManualTrigger(item)}
                    className={`p-2 rounded-md transition-colors ${justAddedId === item.id ? 'bg-green-500 text-white' : 'hover:bg-white hover:shadow-sm text-slate-400 hover:text-amber-500'}`}
                    title="Pievienot tūlīt"
                  >
                    {justAddedId === item.id ? '✓' : '⚡'}
                  </button>
                  <button 
                    onClick={() => startEditing(item)}
                    className="p-2 rounded-md hover:bg-white hover:shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Rediģēt"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => deleteTemplate(item.id)} 
                    className="p-2 rounded-md hover:bg-white hover:shadow-sm text-slate-400 hover:text-red-500 transition-colors"
                    title="Dzēst"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {recurring.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            Nav regulāro maksājumu.
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringManager;
