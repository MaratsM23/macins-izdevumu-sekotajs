
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Transaction, TransactionType } from '../types';
import { parseAmount } from '../utils';

interface Props {
  transaction: Transaction;
  type: TransactionType;
  onClose: () => void;
}

const EditExpenseModal: React.FC<Props> = ({ transaction, type, onClose }) => {
  const [amount, setAmount] = useState(transaction.amount.toString());
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [date, setDate] = useState(transaction.date);
  const [note, setNote] = useState(transaction.note || '');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = useLiveQuery(async () => {
    const table = type === 'expense' ? db.categories : db.incomeCategories;
    const all = await table.toArray();
    return all.filter(c => !c.isArchived || c.id === transaction.categoryId);
  }, [type, transaction.categoryId]) || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      setError('Summai jābūt lielākai par 0.');
      return;
    }
    setError(null);
    const table = type === 'expense' ? db.expenses : db.incomes;
    await table.update(transaction.id, {
      amount: parsedAmount,
      categoryId,
      date,
      note: note.trim() || undefined,
      updatedAt: Date.now()
    });
    onClose();
  };

  const handleDelete = async () => {
    try {
      const table = type === 'expense' ? db.expenses : db.incomes;
      await table.delete(transaction.id);
      onClose();
    } catch (err) {
      console.error('Kļūda dzēšot:', err);
      setError('Neizdevās izdzēst ierakstu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animation-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="p-4 flex justify-between items-center" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-display font-bold text-lg" style={{ color: isConfirmingDelete ? 'var(--danger)' : 'var(--text-primary)' }}>
            {isConfirmingDelete ? 'Dzēst ierakstu?' : 'Rediģēt ierakstu'}
          </h3>
          <button onClick={onClose} className="p-2 text-xl rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }}>&times;</button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div className={isConfirmingDelete ? 'opacity-50 pointer-events-none' : ''}>
            <div>
              <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Summa</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full text-2xl font-bold p-2 border-b-2 outline-none bg-transparent transition-colors"
                style={{
                  color: 'var(--text-primary)',
                  borderColor: type === 'income' ? 'var(--success)' : 'var(--accent-primary)'
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
               <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Kategorija</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full p-2 rounded-lg outline-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Datums</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2 rounded-lg outline-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Piezīme</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2 rounded-lg outline-none"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm font-bold px-1" style={{ color: 'var(--danger)' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            {!isConfirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex-1 font-bold py-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}
                >
                  Dzēst
                </button>
                <button
                  type="submit"
                  className="flex-[2] font-bold py-3 rounded-xl transition-colors"
                  style={{
                    backgroundColor: type === 'income' ? 'var(--success)' : 'var(--accent-primary)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  Saglabāt
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setIsConfirmingDelete(false); setError(null); }}
                  className="flex-1 font-bold py-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Atcelt
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-[2] font-bold py-3 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--danger)', color: 'var(--bg-primary)' }}
                >
                  Jā, dzēst
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditExpenseModal;
