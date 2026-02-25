
import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, formatDateLV, getTodayStr } from '../utils';
import { Transaction, TransactionType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, Filter, X } from 'lucide-react';
import EditExpenseModal from './EditExpenseModal';

const HistoryView: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [editingItem, setEditingItem] = useState<{ item: Transaction, type: TransactionType } | null>(null);

  const expenseCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const incomeCategories = useLiveQuery(() => db.incomeCategories.toArray()) || [];

  const rawTransactions = useLiveQuery(async () => {
    let expenses = await db.expenses.toArray();
    let incomes = await db.incomes.toArray();

    if (startDate) {
      expenses = expenses.filter(e => e.date >= startDate);
      incomes = incomes.filter(i => i.date >= startDate);
    }
    if (endDate) {
      expenses = expenses.filter(e => e.date <= endDate);
      incomes = incomes.filter(i => i.date <= endDate);
    }

    let combined = [
      ...expenses.map(e => ({ ...e, _type: 'expense' as TransactionType })),
      ...incomes.map(i => ({ ...i, _type: 'income' as TransactionType }))
    ];

    if (filterType !== 'all') {
      combined = combined.filter(t => t._type === filterType);
    }

    combined.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    return combined;
  }, [filterType, startDate, endDate]);

  const getCategoryName = (id: string, type: TransactionType) => {
    const cats = type === 'expense' ? expenseCategories : incomeCategories;
    return cats.find(c => c.id === id)?.name || 'Nezināma';
  };

  const filteredTransactions = useMemo(() => {
    if (!rawTransactions) return [];
    if (!searchTerm.trim()) return rawTransactions;

    const lowerTerm = searchTerm.toLowerCase();
    return rawTransactions.filter(t => {
      const catName = getCategoryName(t.categoryId, t._type).toLowerCase();
      const note = (t.note || '').toLowerCase();
      const amountStr = t.amount.toString();

      return catName.includes(lowerTerm) || note.includes(lowerTerm) || amountStr.includes(lowerTerm);
    });
  }, [rawTransactions, searchTerm, expenseCategories, incomeCategories]);

  const groupedTransactions = useMemo(() => {
    if (!filteredTransactions) return [];
    const groups: Record<string, typeof filteredTransactions> = {};
    const today = getTodayStr();

    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

    filteredTransactions.forEach(t => {
      let key = t.date;
      if (t.date === today) key = 'Šodien';
      else if (t.date === yesterday) key = 'Vakar';
      else key = formatDateLV(t.date);

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    const uniqueKeys = Array.from(new Set(filteredTransactions.map(t => {
      if (t.date === today) return 'Šodien';
      if (t.date === yesterday) return 'Vakar';
      return formatDateLV(t.date);
    }))) as string[];

    return uniqueKeys.map(key => ({
      title: key,
      data: groups[key],
      total: groups[key].reduce((sum, t) => sum + (t._type === 'income' ? t.amount : -t.amount), 0)
    }));

  }, [filteredTransactions]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setFilterType('all');
    setShowFilters(false);
  };

  const hasActiveFilters = searchTerm || startDate || endDate || filterType !== 'all';

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Filter Controls */}
      <div className="flex justify-between items-center px-2">
        <h2 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Vēsture</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all font-bold text-xs"
          style={showFilters || hasActiveFilters ? {
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)'
          } : {
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)'
          }}
        >
          {hasActiveFilters && !showFilters && <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }}></div>}
          {showFilters ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
          <span>{showFilters ? 'Aizvērt' : 'Filtri'}</span>
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="p-5 rounded-2xl space-y-4 overflow-hidden"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Meklēt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all font-medium"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase mb-1 ml-2" style={{ color: 'var(--text-tertiary)' }}>No datuma</label>
                <Calendar className="absolute left-3 bottom-3 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm font-bold"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase mb-1 ml-2" style={{ color: 'var(--text-tertiary)' }}>Līdz datumam</label>
                <Calendar className="absolute left-3 bottom-3 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm font-bold"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="flex-1 p-3 rounded-xl outline-none text-sm font-bold appearance-none"
                style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="all">Visas transakcijas</option>
                <option value="expense">Tikai tēriņi</option>
                <option value="income">Tikai ienākumi</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-5 text-xs font-bold rounded-xl transition-colors"
                  style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}
                >
                  Notīrīt
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grouped Results List */}
      <AnimatePresence mode="popLayout">
        {groupedTransactions && groupedTransactions.length > 0 ? (
          <div className="space-y-6">
            {groupedTransactions.map((group, groupIndex) => (
              <motion.div
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{group.title}</h3>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  {group.data.map((t, index) => (
                    <motion.div
                      key={`${t._type}-${t.id}`}
                      layoutId={`row-${t.id}`}
                      onClick={() => setEditingItem({ item: t, type: t._type })}
                      className="p-4 flex justify-between items-center group transition-all cursor-pointer active:opacity-70"
                      style={index !== group.data.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md" style={t._type === 'expense' ? {
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--border-accent)'
                          } : {
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            color: 'var(--success)',
                            border: '1px solid rgba(74, 222, 128, 0.2)'
                          }}>
                            {getCategoryName(t.categoryId, t._type)}
                          </span>
                        </div>
                        <p className="font-bold truncate text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {t.note || (t._type === 'expense' ? 'Bez piezīmes' : 'Ienākums')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black tracking-tight whitespace-nowrap" style={{
                          color: t._type === 'expense' ? 'var(--text-primary)' : 'var(--success)'
                        }}>
                          {t._type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

            <div className="text-center pt-8 pb-4">
              <div className="w-12 h-1.5 rounded-full mx-auto" style={{ backgroundColor: 'var(--bg-tertiary)' }}></div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="rounded-2xl p-8 max-w-[250px] mx-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <p className="font-bold text-sm" style={{ color: 'var(--text-tertiary)' }}>Nekas netika atrasts šajā periodā.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {editingItem && (
        <EditExpenseModal
          transaction={editingItem.item}
          type={editingItem.type}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};

export default HistoryView;
