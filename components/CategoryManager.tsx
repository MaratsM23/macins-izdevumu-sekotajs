
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseAmount } from '../utils';
import { Category } from '../types';

const EMOJI_OPTIONS = ['🛒','🍽️','☕','🚌','🚗','💊','📱','🍿','🍷','🏠','🧸','🎁','💳','📄','📈','💰','💵','✈️','🎉','🤝','📦','🐾','👕','🎓','⚽','🔧','💡','🏋️','🎵','🏥','🥺','🎬','🍕','🏖️','💻'];

const HARDCODED_ICONS: Record<string, string> = {
  'Pārtika': '🛒', 'Pusdienas': '🍽️', 'Kafejnīcas': '☕',
  'Transports': '🚌', 'Car sharing': '🚗', 'Veselība': '💊',
  'Abonementi': '📱', 'Izklaide': '🍿', 'Kompulsīvie pirkumi': '🥺',
  'Alko': '🍷', 'Māja': '🏠', 'Bērni': '🧸', 'Dāvanas': '🎁',
  'Kredīti': '💳', 'Līzings': '📄', 'Ieguldījumi': '📈', 'Uzkrājumi': '💰',
  'Citi': '📦'
};

export function getCategoryIcon(cat: Category): string {
  return cat.icon || HARDCODED_ICONS[cat.name] || '📌';
}

const CategoryManager: React.FC = () => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📌');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isInvestment, setIsInvestment] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingIconId, setEditingIconId] = useState<string | null>(null);
  const allCategories = useLiveQuery(() => db.categories.toArray()) || [];

  const sorted = [...allCategories].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  const activeCategories = sorted.filter(c => !c.isArchived);
  const archivedCategories = sorted.filter(c => c.isArchived);
  const categories = [...activeCategories, ...archivedCategories];

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    const maxSort = allCategories.reduce((max, c) => Math.max(max, c.sortOrder ?? 0), -1);
    try {
      await db.categories.add({
        id: crypto.randomUUID(),
        name: newCatName.trim(),
        icon: newCatIcon,
        sortOrder: maxSort + 1,
        isArchived: false,
        isInvestment: isInvestment,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setNewCatName('');
      setNewCatIcon('📌');
      setIsInvestment(false);
      setShowIconPicker(false);
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

  const updateIcon = async (id: string, icon: string) => {
    await db.categories.update(id, { icon, updatedAt: Date.now() });
    setEditingIconId(null);
  };

  const moveCategory = async (id: string, direction: 'up' | 'down') => {
    const idx = activeCategories.findIndex(c => c.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= activeCategories.length) return;

    const current = activeCategories[idx];
    const swap = activeCategories[swapIdx];
    const currentOrder = current.sortOrder ?? idx;
    const swapOrder = swap.sortOrder ?? swapIdx;

    await db.categories.update(current.id, { sortOrder: swapOrder, updatedAt: Date.now() });
    await db.categories.update(swap.id, { sortOrder: currentOrder, updatedAt: Date.now() });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>Kategoriju Pārvaldība</h3>

      {/* Add new category */}
      <div className="space-y-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="p-3 rounded-xl text-xl shrink-0"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
            title="Izvēlēties ikonu"
          >
            {newCatIcon}
          </button>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Jauna kategorija"
            className="flex-1 p-3 rounded-xl outline-none"
            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
          />
          <label className="flex items-center gap-1 cursor-pointer p-2 rounded-lg h-full" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
             <input type="checkbox" checked={isInvestment} onChange={e => setIsInvestment(e.target.checked)} className="w-4 h-4" style={{ accentColor: 'var(--info)' }} />
             <span className="text-[10px] font-bold uppercase leading-none" style={{ color: 'var(--info)' }}>Ieguld.?</span>
          </label>
          <button onClick={addCategory} className="px-4 py-3 font-bold rounded-xl" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}>+</button>
        </div>

        {showIconPicker && (
          <div className="grid grid-cols-9 gap-1 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { setNewCatIcon(emoji); setShowIconPicker(false); }}
                className="p-2 rounded-lg text-lg hover:scale-110 transition-transform"
                style={{ backgroundColor: newCatIcon === emoji ? 'var(--accent-glow)' : 'transparent', border: newCatIcon === emoji ? '1px solid var(--border-accent)' : '1px solid transparent' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category list */}
      <div className="max-h-80 overflow-y-auto space-y-1 pr-2">
        {categories.map((cat, idx) => {
          const isActive = !cat.isArchived;
          const activeIdx = activeCategories.findIndex(c => c.id === cat.id);
          return (
            <div key={cat.id} className="flex justify-between items-center p-2 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Icon button */}
                <button
                  onClick={() => setEditingIconId(editingIconId === cat.id ? null : cat.id)}
                  className="text-lg shrink-0"
                  title="Mainīt ikonu"
                >
                  {getCategoryIcon(cat)}
                </button>

                {/* Reorder buttons */}
                {isActive && (
                  <div className="flex flex-col shrink-0 -my-1">
                    <button
                      onClick={() => moveCategory(cat.id, 'up')}
                      disabled={activeIdx === 0}
                      className="text-[10px] leading-none px-0.5 disabled:opacity-20"
                      style={{ color: 'var(--text-tertiary)' }}
                    >▲</button>
                    <button
                      onClick={() => moveCategory(cat.id, 'down')}
                      disabled={activeIdx === activeCategories.length - 1}
                      className="text-[10px] leading-none px-0.5 disabled:opacity-20"
                      style={{ color: 'var(--text-tertiary)' }}
                    >▼</button>
                  </div>
                )}

                <span className={`truncate font-medium ${cat.isArchived ? 'line-through' : ''}`} style={{ color: cat.isArchived ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                  {cat.name}
                </span>
                {cat.isInvestment && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--info)' }}>Ieguld.</span>
                )}
              </div>

              {/* Inline icon picker */}
              {editingIconId === cat.id && (
                <div className="absolute z-10 mt-1 grid grid-cols-9 gap-1 p-2 rounded-xl shadow-xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => updateIcon(cat.id, emoji)}
                      className="p-1.5 rounded-lg text-base hover:scale-110 transition-transform"
                      style={{ backgroundColor: getCategoryIcon(cat) === emoji ? 'var(--accent-glow)' : 'transparent' }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

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
          );
        })}
      </div>
    </div>
  );
};

export default CategoryManager;
