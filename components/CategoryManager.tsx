
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseAmount } from '../utils';
import { Category } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const EMOJI_OPTIONS = [
  // Ēdiens & Dzērieni
  '🛒','🍽️','☕','🍕','🍔','🍷','🍺','🧁','🥗','🍣',
  // Transports
  '🚌','🚗','🚕','✈️','🚲','⛽','🚇',
  // Māja & Ģimene
  '🏠','🧸','👶','👕','🧹','🛏️','🪴',
  // Veselība & Sports
  '💊','🏋️','🏥','🧘','🦷',
  // Izklaide & Hobiji
  '🍿','🎬','🎵','📚','🎮','⚽','🏖️','🎨',
  // Finanses
  '💳','📄','📈','💰','💵','🏦',
  // Tehnoloģijas
  '📱','💻','🖥️','🎧',
  // Cits
  '🎁','🐾','🎓','🔧','💡','🤝','📦','🥺','🎉','📌',
];

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

/* ─── Sortable Category Row ─── */
const SortableCategoryRow: React.FC<{
  cat: Category;
  onToggleArchive: (id: string, archived: boolean) => void;
  onToggleInvestment: (id: string, val: boolean | undefined) => void;
  onSaveBudget: (id: string, val: string) => void;
  onUpdateIcon: (id: string, icon: string) => void;
  editingBudgetId: string | null;
  setEditingBudgetId: (id: string | null) => void;
  editingIconId: string | null;
  setEditingIconId: (id: string | null) => void;
}> = ({ cat, onToggleArchive, onToggleInvestment, onSaveBudget, onUpdateIcon, editingBudgetId, setEditingBudgetId, editingIconId, setEditingIconId }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id, disabled: cat.isArchived });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: '1px solid var(--border)',
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex justify-between items-center p-2 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Drag handle */}
        {!cat.isArchived && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-2 rounded shrink-0"
            style={{ color: 'var(--text-tertiary)', touchAction: 'none' }}
            title="Vilkt lai pārkārtotu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="19" r="2"/><circle cx="15" cy="19" r="2"/></svg>
          </button>
        )}

        {/* Icon button */}
        <button
          onClick={() => setEditingIconId(editingIconId === cat.id ? null : cat.id)}
          className="text-lg shrink-0"
          title="Mainīt ikonu"
        >
          {getCategoryIcon(cat)}
        </button>

        <span className={`truncate font-medium ${cat.isArchived ? 'line-through' : ''}`} style={{ color: cat.isArchived ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
          {cat.name}
        </span>
        {cat.isInvestment && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--info)' }}>Ieguld.</span>
        )}
      </div>

      {/* Inline icon picker */}
      {editingIconId === cat.id && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={() => setEditingIconId(null)}>
          <div className="w-full max-w-xs p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Izvēlies ikonu: {cat.name}</p>
            <div className="grid grid-cols-8 gap-1.5 max-h-60 overflow-y-auto">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onUpdateIcon(cat.id, emoji)}
                  className="p-2 rounded-lg text-xl hover:scale-110 transition-transform"
                  style={{ backgroundColor: getCategoryIcon(cat) === emoji ? 'var(--accent-glow)' : 'transparent', border: getCategoryIcon(cat) === emoji ? '1px solid var(--border-accent)' : '1px solid transparent' }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
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
              onBlur={(e) => onSaveBudget(cat.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveBudget(cat.id, (e.target as HTMLInputElement).value);
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
           onClick={() => onToggleInvestment(cat.id, cat.isInvestment)}
           className="text-xs px-2 py-1 rounded-md font-bold transition-colors"
           title="Atzīmēt kā ieguldījumu"
           style={{ color: cat.isInvestment ? 'var(--info)' : 'var(--text-tertiary)' }}
        >
           💰
        </button>
        <button
          onClick={() => onToggleArchive(cat.id, cat.isArchived)}
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
};

/* ─── Main CategoryManager ─── */
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeCategories.findIndex(c => c.id === active.id);
    const newIndex = activeCategories.findIndex(c => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(activeCategories, oldIndex, newIndex);
    const updates = reordered.map((cat, i) =>
      db.categories.update(cat.id, { sortOrder: i, updatedAt: Date.now() })
    );
    await Promise.all(updates);
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
          <div className="grid grid-cols-8 gap-1.5 p-3 rounded-xl max-h-48 overflow-y-auto" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { setNewCatIcon(emoji); setShowIconPicker(false); }}
                className="p-2 rounded-lg text-xl hover:scale-110 transition-transform"
                style={{ backgroundColor: newCatIcon === emoji ? 'var(--accent-glow)' : 'transparent', border: newCatIcon === emoji ? '1px solid var(--border-accent)' : '1px solid transparent' }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category list with drag-and-drop */}
      <div className="pr-2">
        {activeCategories.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeCategories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {activeCategories.map(cat => (
                <SortableCategoryRow
                  key={cat.id}
                  cat={cat}
                  onToggleArchive={toggleArchive}
                  onToggleInvestment={toggleInvestment}
                  onSaveBudget={saveBudget}
                  onUpdateIcon={updateIcon}
                  editingBudgetId={editingBudgetId}
                  setEditingBudgetId={setEditingBudgetId}
                  editingIconId={editingIconId}
                  setEditingIconId={setEditingIconId}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Archived categories (not draggable) */}
        {archivedCategories.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-4 mb-2 px-1" style={{ color: 'var(--text-tertiary)' }}>Arhivētās</p>
            {archivedCategories.map(cat => (
              <SortableCategoryRow
                key={cat.id}
                cat={cat}
                onToggleArchive={toggleArchive}
                onToggleInvestment={toggleInvestment}
                onSaveBudget={saveBudget}
                onUpdateIcon={updateIcon}
                editingBudgetId={editingBudgetId}
                setEditingBudgetId={setEditingBudgetId}
                editingIconId={editingIconId}
                setEditingIconId={setEditingIconId}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default CategoryManager;
