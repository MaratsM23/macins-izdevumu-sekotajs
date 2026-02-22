
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
        if (window.confirm(`Šai kategorijai ir ${count} ieraksti. Tā tiks arhivēta.`)) {
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
    await db.categories.update(id, { isInvestment: !currentVal, updatedAt: Date.now() });
  };

  const saveBudget = async (id: string, value: string) => {
    const parsed = parseAmount(value);
    await db.categories.update(id, { monthlyBudget: parsed > 0 ? parsed : undefined, updatedAt: Date.now() });
    setEditingBudgetId(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>Kategoriju Pārvaldība</h3>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Jauna kategorija"
          className="flex-1 p-3 rounded-xl outline-none"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <label className="flex items-center gap-1 cursor-pointer p-2 rounded-lg h-full" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
           <input type="checkbox" checked={isInvestment} onChange={e => setIsInvestment(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--info)' }} />
           <span className="text-[10px] font-bold uppercase leading-none" style={{ color: 'var(--info)' }}>Ieguld.?</span>
        </label>
        <button onClick={addCategory} className="px-4 py-3 font-bold rounded-xl" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}>+</button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
        {categories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center p-2 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`truncate font-medium ${cat.isArchived ? 'line-through' : ''}`} style={{ color: cat.isArchived ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                {cat.name}
                </span>
                {cat.isInvestment && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--info)' }}>Ieguld.</span>
                )}
            </div>

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
                    className="w-20 text-right p-1 text-sm rounded-lg outline-none font-bold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                ) : (
                  <button
                    onClick={() => setEditingBudgetId(cat.id)}
                    className="text-xs px-2 py-1 rounded-lg font-bold transition-colors"
                    style={cat.monthlyBudget ? {
                      backgroundColor: 'rgba(74, 222, 128, 0.1)',
                      color: 'var(--success)',
                      border: '1px solid rgba(74, 222, 128, 0.2)'
                    } : {
                      color: 'var(--text-tertiary)'
                    }}
                  >
                    {cat.monthlyBudget ? `${cat.monthlyBudget} €/mēn` : 'Budžets?'}
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 shrink-0">
                <button
                   onClick={() => toggleInvestment(cat.id, cat.isInvestment)}
                   className="text-xs px-2 py-1 rounded-md font-bold transition-colors"
                   title="Atzīmēt kā ieguldījumu"
                   style={{ color: cat.isInvestment ? 'var(--info)' : 'var(--text-tertiary)' }}
                >
                   💰
                </button>
                <button
                onClick={() => toggleArchive(cat.id, cat.isArchived)}
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={cat.isArchived ? {
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)'
                } : {
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                  color: 'var(--danger)'
                }}
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
