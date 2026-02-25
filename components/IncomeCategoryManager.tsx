
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const IncomeCategoryManager: React.FC = () => {
  const [newCatName, setNewCatName] = useState('');
  const categories = useLiveQuery(() => db.incomeCategories.toArray()) || [];

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await db.incomeCategories.add({
        id: crypto.randomUUID(),
        name: newCatName.trim(),
        isArchived: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      setNewCatName('');
    } catch (_err) {
      alert('Kategoriju neizdevās pievienot. Pārbaudiet, vai nosaukums nav dublēts.');
    }
  };

  const toggleArchive = async (id: string, currentlyArchived: boolean) => {
    const count = await db.incomes.where('categoryId').equals(id).count();
    if (currentlyArchived) {
      await db.incomeCategories.update(id, { isArchived: false, updatedAt: Date.now() });
    } else {
      if (count > 0) {
        if (confirm(`Arhivēt? Šai kategorijai ir ${count} ieraksti.`)) {
          await db.incomeCategories.update(id, { isArchived: true, updatedAt: Date.now() });
        }
      } else {
        if (confirm('Dzēst?')) await db.incomeCategories.delete(id);
      }
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-emerald-700">Ienākumu Kategorijas</h3>
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Jauna ienākumu kateg."
          className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none"
        />
        <button onClick={addCategory} className="bg-emerald-600 text-white px-6 font-bold rounded-xl">+</button>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {categories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center p-2 border-b border-slate-50">
            <span className={cat.isArchived ? 'text-slate-400 line-through' : 'text-slate-700'}>{cat.name}</span>
            <button onClick={() => toggleArchive(cat.id, cat.isArchived)} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100">
              {cat.isArchived ? 'Atjaunot' : 'Dzēst'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomeCategoryManager;
