
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Frequency, RecurringExpense } from '../types';
import { parseAmount, getTodayStr, formatCurrency, formatDateLV } from '../utils';
import { getCategoryIcon } from './CategoryManager';

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const activeCategories = allCategories.filter(c => !c.isArchived);
  const recurring = useLiveQuery(() => db.recurringExpenses.toArray()) || [];

  useEffect(() => {
    if (activeCategories.length > 0 && !categoryId) setCategoryId(activeCategories[0].id);
  }, [activeCategories.length, categoryId]);

  const resetForm = () => {
    setAmount(''); setNote(''); setStartDate(getTodayStr()); setFrequency('monthly');
    setEditingId(null); setIsFormOpen(false);
    if (activeCategories.length > 0) setCategoryId(activeCategories[0].id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0 || !categoryId) return;
    const expenseData = { amount: parsedAmount, categoryId, frequency, startDate, note: note.trim() || undefined, isActive: true };
    if (editingId) { await db.recurringExpenses.update(editingId, expenseData); }
    else { await db.recurringExpenses.add({ id: crypto.randomUUID(), createdAt: Date.now(), ...expenseData }); }
    resetForm();
  };

  const startEditing = (item: RecurringExpense) => {
    setEditingId(item.id); setAmount(item.amount.toString()); setCategoryId(item.categoryId);
    setFrequency(item.frequency); setStartDate(item.startDate); setNote(item.note || ''); setIsFormOpen(true);
  };

  const deleteTemplate = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    await db.recurringExpenses.delete(confirmDeleteId);
    if (editingId === confirmDeleteId) resetForm();
    setConfirmDeleteId(null);
  };

  const handleManualTrigger = async (template: RecurringExpense) => {
    const todayStr = getTodayStr();
    try {
      await db.expenses.add({ id: crypto.randomUUID(), amount: template.amount, currency: 'EUR', date: todayStr, categoryId: template.categoryId, note: `[Manuāls] ${template.note || ''}`.trim(), createdAt: Date.now(), updatedAt: Date.now() });
      await db.recurringExpenses.update(template.id, { lastGeneratedDate: todayStr });
      setJustAddedId(template.id);
      setTimeout(() => setJustAddedId(null), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getNextScheduledDate = (item: RecurringExpense) => {
    const last = item.lastGeneratedDate || item.startDate;
    const lastDate = parseLocalDate(last);
    const nextDate = advanceDate(lastDate, item.frequency);
    return formatLocalDate(nextDate);
  };

  const freqLabels: Record<Frequency, string> = { daily: 'Dienā', weekly: 'Nedēļā', monthly: 'Mēnesī', yearly: 'Gadā' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>Regulārie maksājumi</h3>
        <button
          onClick={() => { if (isFormOpen) resetForm(); else setIsFormOpen(true); }}
          className="text-sm font-bold px-3 py-1 rounded-lg"
          style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--border-accent)' }}
        >
          {isFormOpen ? 'Aizvērt' : '+ Jauns'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="p-4 rounded-xl space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <h4 className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--accent-primary)' }}>
            {editingId ? 'Rediģēt ierakstu' : 'Jauns regulārs maksājums'}
          </h4>

          <input type="text" placeholder="Nosaukums (piem. Spotify, Līzings)" value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 rounded-lg outline-none font-medium" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} autoFocus />

          <div className="grid grid-cols-2 gap-2">
            <input type="text" inputMode="decimal" placeholder="Summa" value={amount} onChange={e => setAmount(e.target.value)} className="p-2 rounded-lg outline-none" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} required />
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="p-2 rounded-lg outline-none" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} required>
              {activeCategories.map(c => <option key={c.id} value={c.id}>{getCategoryIcon(c)} {c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="p-2 rounded-lg outline-none" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {Object.entries(freqLabels).map(([val, label]) => (<option key={val} value={val}>{label}</option>))}
            </select>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 rounded-lg outline-none" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} required />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={resetForm} className="flex-1 py-2 font-bold" style={{ color: 'var(--text-tertiary)' }}>Atcelt</button>
            <button type="submit" className="flex-[2] font-bold py-2 rounded-lg" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}>
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
              className="flex justify-between items-center p-3 rounded-xl transition-all"
              style={{
                backgroundColor: justAddedId === item.id ? 'rgba(74, 222, 128, 0.1)' : 'var(--bg-tertiary)',
                border: `1px solid ${justAddedId === item.id ? 'rgba(74, 222, 128, 0.3)' : 'var(--border)'}`
              }}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide" style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                    {categoryName}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                    {freqLabels[item.frequency]}
                  </span>
                </div>
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{displayName}</p>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Nākamais: {formatDateLV(getNextScheduledDate(item))}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <div className="text-right mr-2">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount)}</p>
                </div>

                <div className="flex rounded-lg p-0.5" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => handleManualTrigger(item)}
                    className="p-2 rounded-md transition-colors"
                    title="Pievienot tūlīt"
                    style={{ color: justAddedId === item.id ? 'var(--success)' : 'var(--text-tertiary)' }}
                  >
                    {justAddedId === item.id ? '✓' : '⚡'}
                  </button>
                  <button onClick={() => startEditing(item)} className="p-2 rounded-md transition-colors" title="Rediģēt" style={{ color: 'var(--text-tertiary)' }}>✏️</button>
                  <button onClick={() => deleteTemplate(item.id)} className="p-2 rounded-md transition-colors" title="Dzēst" style={{ color: 'var(--text-tertiary)' }}>🗑️</button>
                </div>
              </div>
            </div>
          );
        })}
        {recurring.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Nav regulāro maksājumu.
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-xs p-6 rounded-2xl space-y-4 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Dzēst regulāro maksājumu?</p>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Šo darbību nevar atsaukt.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-3 font-bold rounded-xl"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                Atcelt
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-3 font-bold rounded-xl"
                style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
              >
                Dzēst
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringManager;
