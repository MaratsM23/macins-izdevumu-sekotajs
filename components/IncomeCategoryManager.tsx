
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

const IncomeCategoryManager: React.FC = () => {
  const [newCatName, setNewCatName] = useState('');
  const categories = useLiveQuery(() => db.incomeCategories.toArray()) || [];

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await db.incomeCategories.add({
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setNewCatName('');
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
      <h3 className="text-lg font-bold" style={{ color: 'var(--success)' }}>Ienākumu Kategorijas</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Jauna ienākumu kateg."
          className="flex-1 p-3 rounded-xl outline-none"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
        <button onClick={addCategory} className="px-6 font-bold rounded-xl" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: 'var(--success)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>+</button>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {categories.map(cat => (
          <div key={cat.id} className="flex justify-between items-center p-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className={cat.isArchived ? 'line-through' : ''} style={{ color: cat.isArchived ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{cat.name}</span>
            <button onClick={() => toggleArchive(cat.id, cat.isArchived)} className="text-[10px] font-bold px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {cat.isArchived ? 'Atjaunot' : 'Dzēst'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomeCategoryManager;
