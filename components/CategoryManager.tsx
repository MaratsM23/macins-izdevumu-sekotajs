
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseAmount, formatCurrency } from '../utils';

const CategoryManager: React.FC = () => {
  const [newCatName, setNewCatName] = useState('');
  const [isInvestment, setIsInvestment] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const categories = useLiveQuery(() => db.categories.toArray()) || [];

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await db.categories.add({
        id: crypto.randomUUID(),
        name: newCatName.trim(),
        isArchived: false,
        isInvestment: isInvestment,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setNewCatName('');
      setIsInvestment(false);
    } catch (err) {
      alert('Kategorija ar šādu nosaukumu jau eksistē vai radās kļūda.');
    }
  };

  const toggleArchive = async (id: string, currentlyArchived: boolean) => {
    const count = await db.expenses.where('categoryId').equals(id).count();

    if (currentlyArchived) {
      await db.categories.update(id, { isArchived: false, updatedAt: Date.now() });
    } else {
      if (count > 0) {
        if (window.confirm(`Šai kategorijai ir ${count} ieraksti. Tā tiks arhivēta (noslēpta no izvēlnes), bet dati paliks vēsturē.`)) {
          await db.categories.update(id, { isArchived: true, updatedAt: Date.now() });
        }
      } else {
        if (window.confirm('Dzēst šo kategoriju?')) {
          await db.categories.delete(id);
        }
      }
    }
  };

  const toggleInvestment = async (id: string, currentVal: boolean | undefined) => {
    await db.categories.update(id, {
      isInvestment: !currentVal,
      updatedAt: Date.now()
    });
  };

  const saveBudget = async (id: string, value: string) => {
    const parsed = parseAmount(value);
    await db.categories.update(id, {
      monthlyBudget: parsed > 0 ? parsed : undefined,
      updatedAt: Date.now()
    });
    setEditingBudgetId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-700">Kategoriju Pārvaldība</h3>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Jauna kategorija"
          className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <label className="flex items-center gap-1 cursor-pointer bg-blue-50 p-2 rounded-lg border border-blue-100 h-full">
           <input
             type="checkbox"
             checked={isInvestment}
             onChange={e => setIsInvestment(e.target.checked)}
             className="w-4 h-4 accent-blue-600"
           />
           <span className="text-[10px] font-bold text-blue-800 uppercase leading-none">Ieguld.?</span>
        </label>
        <button
          onClick={addCategory}
          className="bg-indigo-600 text-white px-4 py-3 font-bold rounded-xl hover:bg-indigo-700"
        >
          +
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center p-2 border-b border-slate-50 last:border-0 bg-white">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`truncate ${cat.isArchived ? 'text-slate-400 line-through' : 'text-slate-700 font-medium'}`}>
                {cat.name}
                </span>
                {cat.isInvestment && (
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Ieguld.</span>
                )}
            </div>

            {/* Budget field for non-investment, non-archived categories */}
            {!cat.isInvestment && !cat.isArchived && (
              <div className="shrink-0 mx-2">
                {editingBudgetId === cat.id ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    defaultValue={cat.monthlyBudget || ''}
                    placeholder="0"
                    onBlur={(e) => saveBudget(cat.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveBudget(cat.id, (e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') setEditingBudgetId(null);
                    }}
                    className="w-20 text-right p-1 text-sm border border-stone-200 rounded-lg outline-none focus:border-stone-400 bg-stone-50 font-bold text-stone-700"
                  />
                ) : (
                  <button
                    onClick={() => setEditingBudgetId(cat.id)}
                    className={`text-xs px-2 py-1 rounded-lg font-bold transition-colors ${
                      cat.monthlyBudget
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'text-stone-300 hover:text-stone-500 hover:bg-stone-50'
                    }`}
                  >
                    {cat.monthlyBudget ? `${cat.monthlyBudget} €/mēn` : 'Budžets?'}
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 shrink-0">
                <button
                   onClick={() => toggleInvestment(cat.id, cat.isInvestment)}
                   className={`text-xs px-2 py-1 rounded-md font-bold transition-colors ${cat.isInvestment ? 'bg-blue-50 text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                   title="Atzīmēt kā ieguldījumu"
                >
                   💰
                </button>
                <button
                onClick={() => toggleArchive(cat.id, cat.isArchived)}
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                    cat.isArchived ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-500'
                }`}
                >
                {cat.isArchived ? 'Atjaunot' : 'Dzēst'}
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
