
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

  // Base query
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

    // Sort desc date
    combined.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

    return combined;
  }, [filterType, startDate, endDate]);

  const getCategoryName = (id: string, type: TransactionType) => {
    const cats = type === 'expense' ? expenseCategories : incomeCategories;
    return cats.find(c => c.id === id)?.name || 'Nezināma';
  };

  // Filter
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

  // Grouping Logic
  const groupedTransactions = useMemo(() => {
    if (!filteredTransactions) return [];
    const groups: Record<string, typeof filteredTransactions> = {};
    const today = getTodayStr();

    // Get yesterday date string
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = yDate.toISOString().split('T')[0];

    filteredTransactions.forEach(t => {
      let key = t.date;
      if (t.date === today) key = 'Šodien';
      else if (t.date === yesterday) key = 'Vakar';
      else key = formatDateLV(t.date); // Standard LV format for others

      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    // We need to maintain the sort order of keys based on the original dates
    // Since 'filteredTransactions' is already sorted by date desc, 
    // the order of creation of keys in 'groups' essentially follows that, 
    // but Object.keys isn't guaranteed. Let's rely on the unique list of keys from the sorted array.
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
        <h2 className="text-2xl font-black tracking-tight text-stone-800">Vēsture</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all font-bold text-xs shadow-sm ${showFilters || hasActiveFilters
              ? 'bg-stone-800 text-white shadow-stone-800/20'
              : 'bg-white/80 backdrop-blur-md text-stone-600 hover:bg-white border border-stone-100'
            }`}
        >
          {hasActiveFilters && !showFilters && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>}
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
            className="bg-white/60 backdrop-blur-2xl p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 space-y-4 overflow-hidden"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Meklēt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-stone-100 outline-none focus:ring-2 focus:ring-stone-200 transition-all font-medium placeholder:text-stone-300 shadow-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-2">No datuma</label>
                <Calendar className="absolute left-3 bottom-3 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white rounded-2xl border border-stone-100 outline-none focus:ring-2 focus:ring-stone-200 text-sm font-bold text-stone-700 shadow-sm"
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 ml-2">Līdz datumam</label>
                <Calendar className="absolute left-3 bottom-3 w-4 h-4 text-stone-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white rounded-2xl border border-stone-100 outline-none focus:ring-2 focus:ring-stone-200 text-sm font-bold text-stone-700 shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-stone-100">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="flex-1 p-3 bg-white border border-stone-100 rounded-2xl outline-none text-sm font-bold text-stone-700 focus:ring-2 focus:ring-stone-200 shadow-sm appearance-none"
              >
                <option value="all">Visas transakcijas</option>
                <option value="expense">Tikai tēriņi</option>
                <option value="income">Tikai ienākumi</option>
              </select>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-5 bg-rose-50 text-rose-500 hover:bg-rose-100 text-xs font-bold rounded-2xl transition-colors"
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
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">{group.title}</h3>
                </div>

                <div className="bg-white/60 backdrop-blur-xl rounded-[1.5rem] border border-white/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden">
                  {group.data.map((t, index) => (
                    <motion.div
                      key={`${t._type}-${t.id}`}
                      layoutId={`row-${t.id}`}
                      onClick={() => setEditingItem({ item: t, type: t._type })}
                      className={`p-4 flex justify-between items-center group transition-all cursor-pointer active:bg-stone-100 hover:bg-white ${index !== group.data.length - 1 ? 'border-b border-stone-100/50' : ''
                        }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${t._type === 'expense' ? 'bg-stone-800 text-white' : 'bg-teal-600 text-white'
                            }`}>
                            {getCategoryName(t.categoryId, t._type)}
                          </span>
                        </div>
                        <p className="text-stone-700 font-bold truncate text-sm">
                          {t.note || (t._type === 'expense' ? 'Bez piezīmes' : 'Ienākums')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-black tracking-tight whitespace-nowrap ${t._type === 'expense' ? 'text-stone-800' : 'text-teal-600'
                          }`}>
                          {t._type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}

            <div className="text-center pt-8 pb-4">
              <div className="w-12 h-1.5 bg-stone-200/50 rounded-full mx-auto"></div>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="bg-white/50 backdrop-blur-md rounded-3xl p-8 max-w-[250px] mx-auto border border-white">
              <p className="text-stone-400 font-bold text-sm">Nekas netika atrasts šajā periodā.</p>
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
