
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { formatCurrency, formatDateLV, getTodayStr, parseAmount } from '../utils';
import { RecurringExpense, Transaction } from '../types';
import EditExpenseModal from './EditExpenseModal';

// Warm/Earth Tone Palette
const COLORS = ['#d97706', '#059669', '#78716c', '#0ea5e9', '#d946ef', '#f59e0b', '#84cc16', '#6366f1'];

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ReportsView: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewCategory, setViewCategory] = useState<{ id: string, name: string, amount: number, isInvestment: boolean } | null>(null);
  const [showAllTrends, setShowAllTrends] = useState(false);

  // State for managing bills
  type BillStatusItem = RecurringExpense & {
    categoryName: string;
    expectedDateStr: string;
    expectedDay: number;
    isPaid: boolean;
    matchedTransaction?: Transaction;
    isMarkedAsPaid: boolean;
  };

  const [selectedBill, setSelectedBill] = useState<BillStatusItem | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // State for paying a bill (Manual Entry)
  const [paymentForm, setPaymentForm] = useState<{
    amount: string;
    date: string;
    note: string;
  } | null>(null);

  // State for inline budget editing
  const [editingBudgetCatId, setEditingBudgetCatId] = useState<string | null>(null);

  const expenses = useLiveQuery(() => db.expenses.toArray()) || [];
  const incomes = useLiveQuery(() => db.incomes.toArray()) || [];
  const expenseCats = useLiveQuery(() => db.categories.toArray()) || [];
  const recurring = useLiveQuery(() => db.recurringExpenses.toArray()) || [];
  const debts = useLiveQuery(() => db.debts.toArray()) || [];

  const dateRange = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return {
      start: formatLocalDate(start),
      end: formatLocalDate(end)
    };
  }, [selectedMonth]);

  // Logic for previous month range (for Trends)
  const prevDateRange = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const prevEnd = new Date(year, month, 0);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);

    return {
      start: formatLocalDate(prevStart),
      end: formatLocalDate(prevEnd)
    };
  }, [selectedMonth]);

  const filteredExpenses = useMemo(() => expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end), [expenses, dateRange]);
  const filteredIncomes = useMemo(() => incomes.filter(i => i.date >= dateRange.start && i.date <= dateRange.end), [incomes, dateRange]);

  // Separate Living Expenses from Investments
  const { livingExpenses, investmentExpenses, totalLiving, totalInvested } = useMemo(() => {
    let living = 0;
    let invested = 0;
    const lExp: typeof filteredExpenses = [];
    const iExp: typeof filteredExpenses = [];

    filteredExpenses.forEach(e => {
      const cat = expenseCats.find(c => c.id === e.categoryId);
      if (cat?.isInvestment) {
        invested += e.amount;
        iExp.push(e);
      } else {
        living += e.amount;
        lExp.push(e);
      }
    });

    return {
      livingExpenses: lExp,
      investmentExpenses: iExp,
      totalLiving: living,
      totalInvested: invested
    };
  }, [filteredExpenses, expenseCats]);

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalOutflow = totalLiving + totalInvested;
  const balance = totalIncome - totalOutflow;
  const savingsRate = totalIncome > 0 ? Math.round((totalInvested / totalIncome) * 100) : 0;

  // BUDGET SUMMARY
  const budgetSummary = useMemo(() => {
    const budgetedCats = expenseCats.filter(c => c.monthlyBudget && c.monthlyBudget > 0 && !c.isInvestment);
    if (budgetedCats.length === 0) return null;

    const totalBudget = budgetedCats.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
    const budgetedCatIds = new Set(budgetedCats.map(c => c.id));
    const totalSpentInBudgeted = filteredExpenses
      .filter(e => budgetedCatIds.has(e.categoryId))
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = totalBudget - totalSpentInBudgeted;
    const percentUsed = totalBudget > 0 ? Math.round((totalSpentInBudgeted / totalBudget) * 100) : 0;

    return {
      totalBudget,
      totalSpent: totalSpentInBudgeted,
      remaining,
      percentUsed
    };
  }, [expenseCats, filteredExpenses]);

  // TREND ANALYSIS LOGIC
  const trendData = useMemo(() => {
    const getSumByCategory = (range: { start: string, end: string }) => {
      const sums: Record<string, number> = {};
      expenses.forEach(e => {
        if (e.date >= range.start && e.date <= range.end) {
          sums[e.categoryId] = (sums[e.categoryId] || 0) + e.amount;
        }
      });
      return sums;
    };

    const currentSums = getSumByCategory(dateRange);
    const prevSums = getSumByCategory(prevDateRange);

    const allCatIds = new Set([...Object.keys(currentSums), ...Object.keys(prevSums)]);

    const trends = Array.from(allCatIds).map(catId => {
      const current = currentSums[catId] || 0;
      const previous = prevSums[catId] || 0;
      const diff = current - previous;
      const percent = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((diff / previous) * 100);

      const cat = expenseCats.find(c => c.id === catId);
      const name = cat?.name || 'Nezināma';
      const isInvestment = !!cat?.isInvestment;

      let isGood = false;
      let isNeutral = Math.abs(diff) < 1;

      if (!isNeutral) {
        if (isInvestment) {
          isGood = diff > 0;
        } else {
          isGood = diff < 0;
        }
      }

      return {
        id: catId,
        name,
        current,
        previous,
        diff,
        percent,
        isGood,
        isNeutral,
        isInvestment
      };
    });

    return trends.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [expenses, dateRange, prevDateRange, expenseCats]);

  const visibleTrends = showAllTrends ? trendData : trendData.slice(0, 5);

  // BILL TRACKER LOGIC
  const billStatus = useMemo(() => {
    if (!recurring.length) return [];

    return recurring
      .filter(r => r.isActive && r.frequency === 'monthly')
      .map(item => {
        const startDateObj = parseLocalDate(item.startDate);
        const expectedDay = startDateObj.getDate();
        const expectedDateObj = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), expectedDay);
        const expectedDateStr = formatLocalDate(expectedDateObj);

        const isMarkedAsPaid = item.lastGeneratedDate &&
          item.lastGeneratedDate >= dateRange.start;

        const matchedTransaction = filteredExpenses.find(e => {
          const sameCategory = e.categoryId === item.categoryId;
          return sameCategory;
        });

        const isPaid = isMarkedAsPaid;
        const categoryName = expenseCats.find(c => c.id === item.categoryId)?.name || '...';

        return {
          ...item,
          categoryName,
          expectedDateStr,
          expectedDay,
          isPaid,
          matchedTransaction,
          isMarkedAsPaid
        };
      })
      .sort((a, b) => {
        if (a.isPaid === b.isPaid) return a.expectedDay - b.expectedDay;
        return a.isPaid ? 1 : -1;
      });
  }, [recurring, filteredExpenses, selectedMonth, dateRange, expenseCats]);

  // DEBT TRACKER LOGIC
  const debtStatus = useMemo(() => {
    const activeDebts = debts.filter(d => !d.isPaidOff && d.monthlyPayment > 0);

    return activeDebts.map(debt => {
      const strictMatch = filteredExpenses.find(e => e.debtId === debt.id);

      const fuzzyMatch = !strictMatch && filteredExpenses.find(e => {
        if (e.categoryId !== debt.categoryId) return false;
        if (e.debtId && e.debtId !== debt.id) return false;
        const diff = Math.abs(e.amount - debt.monthlyPayment);
        return diff < 5;
      });

      const matchedTransaction = strictMatch || fuzzyMatch;
      const isPaid = !!matchedTransaction;

      return {
        ...debt,
        isPaid,
        matchedTransaction
      };
    });
  }, [debts, filteredExpenses]);

  const pendingBillsAmount = billStatus.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);

  const pendingDebtAmount = useMemo(() => {
    const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
    const selectedKey = monthKey(selectedMonth);
    const currentKey = monthKey(new Date());

    if (selectedKey > currentKey) {
      return debtStatus.reduce((sum, d) => sum + d.monthlyPayment, 0);
    }
    if (selectedKey < currentKey) {
      return 0;
    }
    return debtStatus.filter(d => !d.isPaid).reduce((sum, d) => sum + d.monthlyPayment, 0);
  }, [debtStatus, selectedMonth]);

  const totalReserved = pendingBillsAmount + pendingDebtAmount;
  const disposableIncome = balance - totalReserved;

  const chartData = useMemo(() => {
    const days: Record<string, { name: string, expense: number, income: number, invested: number }> = {};
    const current = parseLocalDate(dateRange.start);
    const end = parseLocalDate(dateRange.end);

    while (current <= end) {
      const dStr = formatLocalDate(current);
      days[dStr] = { name: dStr.split('-')[2], expense: 0, income: 0, invested: 0 };
      current.setDate(current.getDate() + 1);
    }

    filteredExpenses.forEach(e => {
      if (days[e.date]) {
        const cat = expenseCats.find(c => c.id === e.categoryId);
        if (cat?.isInvestment) {
          days[e.date].invested += e.amount;
        } else {
          days[e.date].expense += e.amount;
        }
      }
    });
    filteredIncomes.forEach(i => { if (days[i.date]) days[i.date].income += i.amount; });

    return Object.values(days);
  }, [filteredExpenses, filteredIncomes, dateRange, expenseCats]);

  const categoryBreakdown = useMemo(() => {
    const data: Record<string, { amount: number, id: string }> = {};
    filteredExpenses.forEach(e => {
      const catId = e.categoryId;
      if (!data[catId]) {
        data[catId] = { amount: 0, id: catId };
      }
      data[catId].amount += e.amount;
    });

    return Object.values(data)
      .map(item => {
        const cat = expenseCats.find(c => c.id === item.id);
        return {
          id: item.id,
          name: cat?.name || 'Nezināma',
          amount: item.amount,
          isInvestment: !!cat?.isInvestment,
          monthlyBudget: cat?.monthlyBudget
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenseCats]);

  const detailTransactions = useMemo(() => {
    if (!viewCategory) return [];
    return filteredExpenses
      .filter(e => e.categoryId === viewCategory.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredExpenses, viewCategory]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
    setViewCategory(null);
  };

  const openPaymentModal = (bill: BillStatusItem) => {
    setSelectedBill(bill);
    setPaymentForm({
      amount: bill.amount.toString(),
      date: getTodayStr(),
      note: bill.note || ''
    });
  };

  const confirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || !paymentForm) return;

    const parsedAmount = parseAmount(paymentForm.amount);
    if (parsedAmount <= 0) {
      alert("Lūdzu ievadiet summu.");
      return;
    }

    try {
      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: parsedAmount,
        currency: 'EUR',
        date: paymentForm.date,
        categoryId: selectedBill.categoryId,
        note: `[Rēķins] ${paymentForm.note}`.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      await db.recurringExpenses.update(selectedBill.id, {
        lastGeneratedDate: paymentForm.date
      });

      setSelectedBill(null);
      setPaymentForm(null);
    } catch (err) {
      alert('Kļūda reģistrējot maksājumu');
    }
  };

  const linkExistingTransaction = async (billId: string, transactionDate: string) => {
    await db.recurringExpenses.update(billId, {
      lastGeneratedDate: transactionDate
    });
    setSelectedBill(null);
  };

  const markBillAsUnpaid = async (bill: BillStatusItem) => {
    if (window.confirm('Vai tiešām atzīmēt kā nesamaksātu?')) {
      const expectedDate = parseLocalDate(bill.expectedDateStr);
      expectedDate.setMonth(expectedDate.getMonth() - 1);
      await db.recurringExpenses.update(bill.id, { lastGeneratedDate: formatLocalDate(expectedDate) });
      setSelectedBill(null);
    }
  };

  const saveInlineBudget = async (catId: string, value: string) => {
    const parsed = parseAmount(value);
    await db.categories.update(catId, {
      monthlyBudget: parsed > 0 ? parsed : undefined,
      updatedAt: Date.now()
    });
    setEditingBudgetCatId(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-stone-800">Mēneša Budžets</h2>
        <div className="flex items-center gap-2 bg-white rounded-full p-1 shadow-sm border border-stone-100">
          <button onClick={() => navigateMonth(-1)} className="w-8 h-8 flex items-center justify-center hover:bg-stone-50 rounded-full text-stone-400">←</button>
          <span className="px-1 text-sm font-bold capitalize text-stone-700">{selectedMonth.toLocaleString('lv-LV', { month: 'short', year: 'numeric' })}</span>
          <button onClick={() => navigateMonth(1)} className="w-8 h-8 flex items-center justify-center hover:bg-stone-50 rounded-full text-stone-400">→</button>
        </div>
      </div>

      {/* Safe to Spend Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`p-8 rounded-[2rem] text-white shadow-2xl transition-colors duration-500 relative overflow-hidden backdrop-blur-xl border border-white/20 ${disposableIncome >= 0 ? 'bg-gradient-to-br from-stone-800/90 to-stone-600/90 shadow-stone-800/20' : 'bg-gradient-to-br from-orange-600/90 to-red-500/90 shadow-orange-500/20'}`}
      >
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase opacity-70 mb-2 tracking-[0.2em] flex items-center gap-2">
            Brīvie līdzekļi
            {disposableIncome >= 0 ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> : <span className="w-1.5 h-1.5 rounded-full bg-red-300"></span>}
          </p>
          <motion.p
            key={disposableIncome}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl lg:text-6xl font-black tracking-tighter"
          >
            {formatCurrency(disposableIncome)}
          </motion.p>

          <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-8">
            <div>
              <span className="block text-[9px] font-black uppercase opacity-60 mb-1 tracking-wider">Faktiskā Bilance</span>
              <span className="text-xl font-bold tracking-tight">{formatCurrency(balance)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-black uppercase opacity-60 mb-1 tracking-wider">Rezervēts</span>
              <span className="text-xl font-bold text-white/90 tracking-tight">-{formatCurrency(totalReserved)}</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white flex flex-col justify-between transition-transform hover:scale-105">
          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-2">Ienākumi</span>
          <p className="text-sm font-bold text-emerald-800 break-words tracking-tight">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white flex flex-col justify-between transition-transform hover:scale-105">
          <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider mb-2">Tēriņi</span>
          <p className="text-sm font-bold text-stone-800 break-words tracking-tight">{formatCurrency(totalLiving)}</p>
        </div>
        <div className="bg-white/60 backdrop-blur-xl p-4 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white flex flex-col justify-between transition-transform hover:scale-105">
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-2">Ieguldīts</span>
          <div>
            <p className="text-sm font-bold text-blue-700 break-words tracking-tight">{formatCurrency(totalInvested)}</p>
            {totalIncome > 0 && <p className="text-[9px] font-black text-blue-400 mt-0.5 tracking-wide">{savingsRate}% no ien.</p>}
          </div>
        </div>
      </motion.div>

      {/* BUDGET SUMMARY CARD */}
      {budgetSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
        >
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Budžeta izpilde</h3>
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className="text-2xl font-black tracking-tight text-stone-800">{formatCurrency(budgetSummary.totalSpent)}</span>
              <span className="text-sm text-stone-400 font-bold ml-1">/ {formatCurrency(budgetSummary.totalBudget)}</span>
            </div>
            <span className={`text-sm font-black px-3 py-1 rounded-xl ${
              budgetSummary.percentUsed > 100
                ? 'bg-red-50 text-red-600 border border-red-100'
                : budgetSummary.percentUsed > 80
                  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                  : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}>
              {budgetSummary.percentUsed}%
            </span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(budgetSummary.percentUsed, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full transition-colors ${
                budgetSummary.percentUsed > 100
                  ? 'bg-red-500'
                  : budgetSummary.percentUsed > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              }`}
            />
          </div>
          <p className={`text-xs font-bold mt-3 ${budgetSummary.remaining >= 0 ? 'text-stone-500' : 'text-red-500'}`}>
            {budgetSummary.remaining >= 0
              ? `Atlikums: ${formatCurrency(budgetSummary.remaining)}`
              : `Pārtērēts par ${formatCurrency(Math.abs(budgetSummary.remaining))}`
            }
          </p>
        </motion.div>
      )}

      {/* TREND INDICATORS */}
      {trendData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Tendences (vs iepr. mēn.)</h3>
            <button
              onClick={() => setShowAllTrends(!showAllTrends)}
              className="text-[9px] font-black tracking-wider bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full text-stone-500 hover:bg-white border border-stone-200 transition-colors shadow-sm"
            >
              {showAllTrends ? 'RĀDĪT MAZĀK' : 'RĀDĪT VISAS'}
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleTrends.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/60 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex justify-between items-center"
                >
                  <div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      {item.name}
                      {item.isInvestment && <span className="text-[8px] bg-blue-100/80 text-blue-700 px-1.5 py-0.5 rounded-md">IEG</span>}
                    </p>
                    <p className="text-lg font-black tracking-tight text-stone-800">{formatCurrency(item.current)}</p>
                  </div>

                  {!item.isNeutral && (
                    <div className={`flex flex-col items-end`}>
                      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${item.isGood ? 'bg-emerald-50/80 font-black text-emerald-600 border-emerald-100' : 'bg-red-50/80 font-black text-red-600 border-red-100'
                        }`}>
                        <span className="text-[10px]">{item.percent > 0 ? '▲' : '▼'}</span>
                        <span>{Math.abs(item.percent)}%</span>
                      </div>
                      <span className={`text-[10px] font-bold tracking-wide mt-1.5 ${item.isGood ? 'text-emerald-600/70' : 'text-red-600/70'}`}>
                        {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                      </span>
                    </div>
                  )}
                  {item.isNeutral && (
                    <div className="bg-stone-50/80 border border-stone-100 text-stone-400 px-3 py-1 rounded-lg text-xs font-black">
                      -
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* Bill Tracker Section */}
      {billStatus.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Mēneša Rēķini</h3>
            <span className="text-[10px] font-bold bg-stone-100 px-2 py-1 rounded-md text-stone-500">
              {billStatus.filter(b => b.isPaid).length}/{billStatus.length} Apmaksāti
            </span>
          </div>
          <div className="space-y-2">
            {billStatus.map(bill => (
              <div
                key={bill.id}
                onClick={() => openPaymentModal(bill)}
                className={`flex justify-between items-center p-4 rounded-2xl border cursor-pointer active:scale-[0.98] transition-all ${bill.isPaid ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-white border-stone-100 shadow-sm hover:border-orange-200'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${bill.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                    {bill.isPaid ? '✓' : '⚡'}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${bill.isPaid ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
                      {bill.note || bill.categoryName}
                    </p>
                    <p className="text-[10px] text-stone-400 font-medium">
                      Termiņš: {bill.expectedDay}. datums
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${bill.isPaid ? 'text-stone-400' : 'text-stone-800'}`}>
                    {formatCurrency(bill.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debt Payments Section */}
      {debtStatus.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Kredītu Maksājumi</h3>
            <span className="text-[10px] font-bold bg-stone-100 px-2 py-1 rounded-md text-stone-500">
              {debtStatus.filter(d => d.isPaid).length}/{debtStatus.length} Apmaksāti
            </span>
          </div>
          <div className="space-y-2">
            {debtStatus.map(debt => (
              <div
                key={debt.id}
                className={`flex justify-between items-center p-4 rounded-2xl border transition-all ${debt.isPaid ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-white border-stone-100 shadow-sm'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${debt.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {debt.isPaid ? '✓' : '!'}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${debt.isPaid ? 'text-stone-500 line-through' : 'text-stone-800'}`}>
                      {debt.title}
                    </p>
                    <p className="text-[10px] text-stone-400 font-medium">
                      Līzings / Kredīts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${debt.isPaid ? 'text-stone-400' : 'text-stone-800'}`}>
                    {formatCurrency(debt.monthlyPayment)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category & Chart Sections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
      >
        <h3 className="text-xs font-black text-stone-400 mb-6 uppercase tracking-widest">Naudas plūsma</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a8a29e', fontWeight: 600 }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#fafaf9' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Bar name="Ienākumi" dataKey="income" fill="#059669" radius={[6, 6, 0, 0]} />
              <Bar name="Tēriņi" dataKey="expense" stackId="a" fill="#1c1917" radius={[0, 0, 6, 6]} />
              <Bar name="Ieguldīts" dataKey="invested" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* TOP CATEGORIES WITH BUDGET PROGRESS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
      >
        <h3 className="text-xs font-black text-stone-400 mb-6 uppercase tracking-widest">Top Kategorijas</h3>
        <div className="space-y-4">
          <AnimatePresence>
            {categoryBreakdown.map((item, idx) => {
              const budget = item.monthlyBudget;
              const percentUsed = budget ? (item.amount / budget) * 100 : null;
              const isOverBudget = percentUsed !== null && percentUsed > 100;
              const isNearBudget = percentUsed !== null && percentUsed > 80 && percentUsed <= 100;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group"
                >
                  <div
                    onClick={() => setViewCategory(item)}
                    className="flex justify-between items-center cursor-pointer hover:bg-white p-2 -mx-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-10 rounded-full shadow-sm"
                        style={{ backgroundColor: item.isInvestment ? '#3b82f6' : COLORS[idx % COLORS.length] }}
                      />
                      <div>
                        <span className="block text-sm font-black text-stone-700 tracking-tight">{item.name}</span>
                        {item.isInvestment && <span className="text-[9px] text-blue-500 font-black uppercase tracking-wider">Uzkrājums</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-black tracking-tight ${item.isInvestment ? 'text-blue-600' : 'text-stone-800'}`}>
                          {formatCurrency(item.amount)}
                        </span>
                        {budget && (
                          <span className="block text-[10px] text-stone-400 font-bold">
                            / {formatCurrency(budget)}
                          </span>
                        )}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-stone-400 text-xs font-black">›</span>
                      </div>
                    </div>
                  </div>

                  {/* Budget progress bar */}
                  {budget && percentUsed !== null && (
                    <div className="px-2 -mx-2 mt-1 mb-1">
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentUsed, 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 }}
                          className={`h-full rounded-full ${
                            isOverBudget
                              ? 'bg-red-500'
                              : isNearBudget
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      {isOverBudget && (
                        <p className="text-[10px] font-bold text-red-500 mt-1">
                          Pārsniegts par {formatCurrency(item.amount - budget)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Inline budget edit button (for non-investment categories without budget) */}
                  {!item.isInvestment && !budget && (
                    <div className="px-2 -mx-2 mt-0.5">
                      {editingBudgetCatId === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            placeholder="Budžets EUR"
                            onBlur={(e) => saveInlineBudget(item.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineBudget(item.id, (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingBudgetCatId(null);
                            }}
                            className="w-24 text-xs p-1.5 border border-stone-200 rounded-lg outline-none focus:border-stone-400 bg-stone-50 font-bold text-stone-700"
                          />
                          <span className="text-[10px] text-stone-400">€/mēn</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingBudgetCatId(item.id); }}
                          className="text-[10px] font-bold text-stone-300 hover:text-stone-500 transition-colors"
                        >
                          + Iestatīt budžetu
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {categoryBreakdown.length === 0 && <p className="text-center text-stone-400 font-bold py-4 text-sm">Nav datu par šo mēnesi.</p>}
        </div>
      </motion.div>

      {/* Bill Management / Payment Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animation-fade-in" onClick={() => setSelectedBill(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-stone-800">{selectedBill.note || selectedBill.categoryName}</h3>
                <p className="text-sm text-stone-500">Mēneša rēķins: <span className="font-bold">{formatCurrency(selectedBill.amount)}</span></p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="text-stone-300 hover:text-stone-600 text-2xl leading-none">&times;</button>
            </div>

            {!selectedBill.isPaid && paymentForm ? (
              <div>
                {selectedBill.matchedTransaction && (
                  <div className="mb-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">Atrasts līdzīgs maksājums</p>
                    <div className="text-sm flex justify-between font-bold text-stone-700 mb-1">
                      <span>{formatDateLV(selectedBill.matchedTransaction.date)}</span>
                      <span>{formatCurrency(selectedBill.matchedTransaction.amount)}</span>
                    </div>
                    <div className="text-xs text-stone-500 mb-3">{selectedBill.matchedTransaction.note || 'Bez piezīmes'}</div>
                    <button
                      onClick={() => linkExistingTransaction(selectedBill.id, selectedBill.matchedTransaction.date)}
                      className="w-full bg-white border border-emerald-200 text-emerald-700 font-bold py-3 rounded-xl text-xs hover:bg-emerald-50 transition-colors shadow-sm"
                    >
                      Piesaistīt šo ierakstu
                    </button>
                  </div>
                )}

                <form onSubmit={confirmPayment} className="space-y-4">
                  <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
                    <p className="text-xs font-bold text-stone-400 mb-3 uppercase tracking-widest">Jauns maksājums</p>

                    <div className="mb-4">
                      <label className="block text-xs font-bold text-stone-500 mb-1">Faktiskā Summa</label>
                      <input
                        type="text" inputMode="decimal"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full text-3xl font-bold p-2 bg-transparent border-b-2 border-stone-200 focus:border-orange-500 outline-none text-stone-800"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Datums</label>
                        <input
                          type="date"
                          value={paymentForm.date}
                          onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })}
                          className="w-full p-2 bg-white rounded-lg border-none outline-none shadow-sm font-medium text-stone-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-stone-500 mb-1">Piezīme</label>
                        <input
                          type="text"
                          value={paymentForm.note}
                          onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })}
                          className="w-full p-2 bg-white rounded-lg border-none outline-none shadow-sm font-medium text-stone-600"
                          placeholder="..."
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-stone-800 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-stone-900 active:scale-95 transition-all"
                  >
                    Apstiprināt & Samaksāt
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="p-5 rounded-2xl border bg-emerald-50 border-emerald-100 text-center">
                  <p className="text-2xl mb-1">🎉</p>
                  <p className="font-bold text-emerald-800">Rēķins Apmaksāts</p>
                  <p className="text-xs text-emerald-600/70 mt-1">
                    {selectedBill.lastGeneratedDate ? `Datums: ${formatDateLV(selectedBill.lastGeneratedDate)}` : 'Apstiprināts manuāli'}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  {selectedBill.matchedTransaction && (
                    <button
                      onClick={() => {
                        setEditingTransaction(selectedBill.matchedTransaction);
                        setSelectedBill(null);
                      }}
                      className="w-full bg-stone-100 text-stone-600 font-bold py-3 rounded-xl hover:bg-stone-200 transition-colors"
                    >
                      Rediģēt saistīto ierakstu
                    </button>
                  )}

                  <button
                    onClick={() => markBillAsUnpaid(selectedBill)}
                    className="w-full text-stone-400 font-bold py-3 rounded-xl hover:text-red-500 transition-colors text-xs"
                  >
                    Atzīmēt kā nesamaksātu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Transaction List Modal (for category details) */}
      {viewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animation-fade-in" onClick={() => setViewCategory(null)}>
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
            <div className={`p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 z-10 ${viewCategory.isInvestment ? 'bg-blue-50' : 'bg-stone-50'}`}>
              <div>
                <h3 className={`font-bold text-xl ${viewCategory.isInvestment ? 'text-blue-900' : 'text-stone-800'}`}>{viewCategory.name}</h3>
                <p className="text-xs text-stone-500 font-bold uppercase mt-1 tracking-wide">Kopā: {formatCurrency(viewCategory.amount)}</p>
              </div>
              <button onClick={() => setViewCategory(null)} className="bg-white p-2 rounded-full shadow-sm text-stone-400 hover:text-stone-800">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2">
              {detailTransactions.map(t => (
                <div key={t.id} className="flex justify-between items-start p-3 hover:bg-stone-50 rounded-xl transition-colors">
                  <div className="pr-4">
                    <div className="text-sm font-bold text-stone-700">{t.note || 'Bez piezīmes'}</div>
                    <div className="text-xs text-stone-400 mt-0.5 font-medium">{formatDateLV(t.date)}</div>
                  </div>
                  <div className="text-sm font-bold whitespace-nowrap text-stone-800">
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for correcting "False Positive" matches */}
      {editingTransaction && (
        <EditExpenseModal
          transaction={editingTransaction}
          type="expense"
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </div>
  );
};

export default ReportsView;
