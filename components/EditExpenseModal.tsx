
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
  
  const categories = useLiveQuery(async () => {
    const table = type === 'expense' ? db.categories : db.incomeCategories;
    const all = await table.toArray();
    // Include currently selected category even if archived, so it doesn't break UI
    return all.filter(c => !c.isArchived || c.id === transaction.categoryId);
  }, [type, transaction.categoryId]) || [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      alert("Summai jābūt lielākai par 0");
      return;
    }

    // Determine target table based on transaction type
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
      // Determine target table based on transaction type
      const table = type === 'expense' ? db.expenses : db.incomes;
      await table.delete(transaction.id);
      onClose();
    } catch (error) {
      console.error("Kļūda dzēšot:", error);
      alert("Neizdevās izdzēst ierakstu.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animation-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">
            {isConfirmingDelete ? 'Dzēst ierakstu?' : 'Rediģēt ierakstu'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 text-xl">&times;</button>
        </div>
        
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div className={isConfirmingDelete ? 'opacity-50 pointer-events-none' : ''}>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Summa</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={`w-full text-2xl font-bold p-2 border-b-2 outline-none bg-transparent transition-colors ${
                  type === 'income' ? 'border-emerald-200 focus:border-emerald-500' : 'border-slate-200 focus:border-indigo-500'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
               <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Kategorija</label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Datums</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-500 mb-1">Piezīme</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {!isConfirmingDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors"
                >
                  Dzēst
                </button>
                <button
                  type="submit"
                  className={`flex-[2] text-white font-bold py-3 rounded-xl transition-colors shadow-lg ${
                    type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  Saglabāt
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Atcelt
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-[2] bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
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
