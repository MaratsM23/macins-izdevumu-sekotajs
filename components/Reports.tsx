
import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../db';
import { formatCurrency, formatDateLV, getTodayStr, parseAmount } from '../utils';
import { Transaction } from '../types';
import EditExpenseModal from './EditExpenseModal';
import { findDebtCategoryId } from '../lib/debtUtils';

const COLORS = ['#d4a853', '#4ade80', '#60a5fa', '#c47d2e', '#d946ef', '#fbbf24', '#84cc16', '#6366f1'];

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
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [paymentForm, setPaymentForm] = useState<{ amount: string; date: string; note: string; } | null>(null);
  const [editingBudgetCatId, setEditingBudgetCatId] = useState<string | null>(null);
  const [selectedDebt, setSelectedDebt] = useState<any | null>(null);
  const [debtPaymentForm, setDebtPaymentForm] = useState<{ amount: string; date: string } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [debtPaymentError, setDebtPaymentError] = useState<string | null>(null);

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
    return { start: formatLocalDate(start), end: formatLocalDate(end) };
  }, [selectedMonth]);

  const prevDateRange = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const prevEnd = new Date(year, month, 0);
    const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1);
    return { start: formatLocalDate(prevStart), end: formatLocalDate(prevEnd) };
  }, [selectedMonth]);

  const filteredExpenses = useMemo(() => expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end), [expenses, dateRange]);
  const filteredIncomes = useMemo(() => incomes.filter(i => i.date >= dateRange.start && i.date <= dateRange.end), [incomes, dateRange]);

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

    return { livingExpenses: lExp, investmentExpenses: iExp, totalLiving: living, totalInvested: invested };
  }, [filteredExpenses, expenseCats]);

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalOutflow = totalLiving + totalInvested;
  const balance = totalIncome - totalOutflow;
  const savingsRate = totalIncome > 0 ? Math.round((totalInvested / totalIncome) * 100) : 0;

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

    return { totalBudget, totalSpent: totalSpentInBudgeted, remaining, percentUsed };
  }, [expenseCats, filteredExpenses]);

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
        isGood = isInvestment ? diff > 0 : diff < 0;
      }
      return { id: catId, name, current, previous, diff, percent, isGood, isNeutral, isInvestment };
    });

    return trends.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [expenses, dateRange, prevDateRange, expenseCats]);

  const visibleTrends = showAllTrends ? trendData : trendData.slice(0, 5);

  const billStatus = useMemo(() => {
    if (!recurring.length) return [];
    return recurring
      .filter(r => r.isActive && r.frequency === 'monthly')
      .map(item => {
        const startDateObj = parseLocalDate(item.startDate);
        const expectedDay = startDateObj.getDate();
        const expectedDateObj = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), expectedDay);
        const expectedDateStr = formatLocalDate(expectedDateObj);
        const isMarkedAsPaid = item.lastGeneratedDate && item.lastGeneratedDate >= dateRange.start;
        const matchedTransaction = filteredExpenses.find(e => e.categoryId === item.categoryId);
        const isPaid = isMarkedAsPaid;
        const categoryName = expenseCats.find(c => c.id === item.categoryId)?.name || '...';
        return { ...item, categoryName, expectedDateStr, expectedDay, isPaid, matchedTransaction, isMarkedAsPaid };
      })
      .sort((a, b) => {
        if (a.isPaid === b.isPaid) return a.expectedDay - b.expectedDay;
        return a.isPaid ? 1 : -1;
      });
  }, [recurring, filteredExpenses, selectedMonth, dateRange, expenseCats]);

  const debtStatus = useMemo(() => {
    const activeDebts = debts.filter(d => !d.isPaidOff && d.monthlyPayment > 0);
    return activeDebts.map(debt => {
      const strictMatch = filteredExpenses.find(e => e.debtId === debt.id);
      const fuzzyMatch = !strictMatch && filteredExpenses.find(e => {
        if (e.categoryId !== debt.categoryId) return false;
        if (e.debtId && e.debtId !== debt.id) return false;
        return Math.abs(e.amount - debt.monthlyPayment) < 5;
      });
      const matchedTransaction = strictMatch || fuzzyMatch;
      return { ...debt, isPaid: !!matchedTransaction, matchedTransaction };
    });
  }, [debts, filteredExpenses]);

  const pendingBillsAmount = billStatus.filter(b => !b.isPaid).reduce((sum, b) => sum + b.amount, 0);

  const pendingDebtAmount = useMemo(() => {
    const today = new Date();
    if (selectedMonth > today && selectedMonth.getMonth() !== today.getMonth()) {
      return debtStatus.reduce((sum, d) => sum + d.monthlyPayment, 0);
    }
    if (selectedMonth < today && selectedMonth.getMonth() !== today.getMonth()) return 0;
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
        if (cat?.isInvestment) days[e.date].invested += e.amount;
        else days[e.date].expense += e.amount;
      }
    });
    filteredIncomes.forEach(i => { if (days[i.date]) days[i.date].income += i.amount; });
    return Object.values(days);
  }, [filteredExpenses, filteredIncomes, dateRange, expenseCats]);

  const categoryBreakdown = useMemo(() => {
    const data: Record<string, { amount: number, id: string }> = {};
    filteredExpenses.forEach(e => {
      if (!data[e.categoryId]) data[e.categoryId] = { amount: 0, id: e.categoryId };
      data[e.categoryId].amount += e.amount;
    });
    return Object.values(data)
      .map(item => {
        const cat = expenseCats.find(c => c.id === item.id);
        return { id: item.id, name: cat?.name || 'Nezināma', amount: item.amount, isInvestment: !!cat?.isInvestment, monthlyBudget: cat?.monthlyBudget };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, expenseCats]);

  const detailTransactions = useMemo(() => {
    if (!viewCategory) return [];
    return filteredExpenses.filter(e => e.categoryId === viewCategory.id).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredExpenses, viewCategory]);

  const navigateMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
    setViewCategory(null);
  };

  const openPaymentModal = (bill: any) => {
    setSelectedBill(bill);
    setPaymentForm({ amount: bill.amount.toString(), date: getTodayStr(), note: bill.note || '' });
    setPaymentError(null);
  };

  const confirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || !paymentForm) return;
    const parsedAmount = parseAmount(paymentForm.amount);
    if (parsedAmount <= 0) { setPaymentError('Lūdzu ievadiet summu.'); return; }
    setPaymentError(null);
    try {
      await db.expenses.add({
        id: crypto.randomUUID(), amount: parsedAmount, currency: 'EUR', date: paymentForm.date,
        categoryId: selectedBill.categoryId, note: `[Rēķins] ${paymentForm.note}`.trim(),
        createdAt: Date.now(), updatedAt: Date.now()
      });
      await db.recurringExpenses.update(selectedBill.id, { lastGeneratedDate: paymentForm.date });
      setSelectedBill(null);
      setPaymentForm(null);
      setPaymentError(null);
    } catch (err) { setPaymentError('Kļūda reģistrējot maksājumu.'); }
  };

  const linkExistingTransaction = async (billId: string, transactionDate: string) => {
    await db.recurringExpenses.update(billId, { lastGeneratedDate: transactionDate });
    setSelectedBill(null);
  };

  const markBillAsUnpaid = async (billId: string) => {
    await db.recurringExpenses.update(billId, { lastGeneratedDate: '1970-01-01' });
    setSelectedBill(null);
  };

  const openDebtPaymentModal = (debt: any) => {
    setSelectedDebt(debt);
    setDebtPaymentForm({ amount: debt.monthlyPayment.toString(), date: getTodayStr() });
    setDebtPaymentError(null);
  };

  const confirmDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !debtPaymentForm) return;
    const parsedAmount = parseAmount(debtPaymentForm.amount);
    if (parsedAmount <= 0) { setDebtPaymentError('Lūdzu ievadiet summu.'); return; }
    setDebtPaymentError(null);
    try {
      const categoryId = await findDebtCategoryId(selectedDebt.title);
      await db.expenses.add({
        id: crypto.randomUUID(), amount: parsedAmount, currency: 'EUR', date: debtPaymentForm.date,
        categoryId: categoryId || selectedDebt.categoryId, debtId: selectedDebt.id,
        note: `Maksājums: ${selectedDebt.title}`, createdAt: Date.now(), updatedAt: Date.now()
      });
      const newRemaining = selectedDebt.remainingAmount - parsedAmount;
      await db.debts.update(selectedDebt.id, {
        remainingAmount: newRemaining < 0 ? 0 : newRemaining,
        isPaidOff: newRemaining <= 0.01,
        updatedAt: Date.now()
      });
      setSelectedDebt(null);
      setDebtPaymentForm(null);
      setDebtPaymentError(null);
    } catch (err) { setDebtPaymentError('Kļūda reģistrējot maksājumu.'); }
  };

  const saveInlineBudget = async (catId: string, value: string) => {
    const parsed = parseAmount(value);
    await db.categories.update(catId, { monthlyBudget: parsed > 0 ? parsed : undefined, updatedAt: Date.now() });
    setEditingBudgetCatId(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Mēneša Budžets</h2>
        <div className="flex items-center gap-2 rounded-full p-1" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <button onClick={() => navigateMonth(-1)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-tertiary)' }}>←</button>
          <span className="px-1 text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{selectedMonth.toLocaleString('lv-LV', { month: 'short', year: 'numeric' })}</span>
          <button onClick={() => navigateMonth(1)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: 'var(--text-tertiary)' }}>→</button>
        </div>
      </div>

      {/* Safe to Spend Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-8 rounded-2xl relative overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 8px 40px rgba(212, 168, 83, 0.08)'
        }}
      >
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase mb-2 tracking-[0.2em] flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            Brīvie līdzekļi
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: disposableIncome >= 0 ? 'var(--success)' : 'var(--danger)' }}></span>
          </p>
          <motion.p
            key={disposableIncome}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl lg:text-6xl font-black tracking-tighter"
            style={{ color: disposableIncome >= 0 ? 'var(--accent-primary)' : 'var(--danger)' }}
          >
            {formatCurrency(disposableIncome)}
          </motion.p>

          <div className="mt-8 pt-6 grid grid-cols-2 gap-8" style={{ borderTop: '1px solid var(--border)' }}>
            <div>
              <span className="block text-[9px] font-black uppercase mb-1 tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Faktiskā Bilance</span>
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{formatCurrency(balance)}</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-black uppercase mb-1 tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Rezervēts</span>
              <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-secondary)' }}>-{formatCurrency(totalReserved)}</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.04 }}></div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="p-4 rounded-2xl flex flex-col justify-between transition-transform hover:scale-105" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <span className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--success)' }}>Ienākumi</span>
          <p className="text-sm font-bold break-words tracking-tight" style={{ color: 'var(--success)' }}>{formatCurrency(totalIncome)}</p>
        </div>
        <div className="p-4 rounded-2xl flex flex-col justify-between transition-transform hover:scale-105" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <span className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Tēriņi</span>
          <p className="text-sm font-bold break-words tracking-tight" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalLiving)}</p>
        </div>
        <div className="p-4 rounded-2xl flex flex-col justify-between transition-transform hover:scale-105" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <span className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--info)' }}>Ieguldīts</span>
          <div>
            <p className="text-sm font-bold break-words tracking-tight" style={{ color: 'var(--info)' }}>{formatCurrency(totalInvested)}</p>
            {totalIncome > 0 && <p className="text-[9px] font-black mt-0.5 tracking-wide" style={{ color: 'var(--info)', opacity: 0.6 }}>{savingsRate}% no ien.</p>}
          </div>
        </div>
      </motion.div>

      {/* BUDGET SUMMARY CARD */}
      {budgetSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="p-6 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>Budžeta izpilde</h3>
          <div className="flex justify-between items-end mb-3">
            <div>
              <span className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{formatCurrency(budgetSummary.totalSpent)}</span>
              <span className="text-sm font-bold ml-1" style={{ color: 'var(--text-tertiary)' }}>/ {formatCurrency(budgetSummary.totalBudget)}</span>
            </div>
            <span className="text-sm font-black px-3 py-1 rounded-xl" style={{
              backgroundColor: budgetSummary.percentUsed > 100 ? 'rgba(248, 113, 113, 0.1)' : budgetSummary.percentUsed > 80 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(74, 222, 128, 0.1)',
              color: budgetSummary.percentUsed > 100 ? 'var(--danger)' : budgetSummary.percentUsed > 80 ? 'var(--warning)' : 'var(--success)',
              border: `1px solid ${budgetSummary.percentUsed > 100 ? 'rgba(248, 113, 113, 0.2)' : budgetSummary.percentUsed > 80 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(74, 222, 128, 0.2)'}`
            }}>
              {budgetSummary.percentUsed}%
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(budgetSummary.percentUsed, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                backgroundColor: budgetSummary.percentUsed > 100 ? 'var(--danger)' : budgetSummary.percentUsed > 80 ? 'var(--warning)' : 'var(--success)'
              }}
            />
          </div>
          <p className="text-xs font-bold mt-3" style={{ color: budgetSummary.remaining >= 0 ? 'var(--text-secondary)' : 'var(--danger)' }}>
            {budgetSummary.remaining >= 0
              ? `Atlikums: ${formatCurrency(budgetSummary.remaining)}`
              : `Pārtērēts par ${formatCurrency(Math.abs(budgetSummary.remaining))}`
            }
          </p>
        </motion.div>
      )}

      {/* TREND INDICATORS */}
      {trendData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="space-y-4">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Tendences (vs iepr. mēn.)</h3>
            <button
              onClick={() => setShowAllTrends(!showAllTrends)}
              className="text-[9px] font-black tracking-wider px-3 py-1.5 rounded-full transition-colors"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
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
                  className="p-4 rounded-2xl flex justify-between items-center"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                      {item.name}
                      {item.isInvestment && <span className="text-[8px] px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--info)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>IEG</span>}
                    </p>
                    <p className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.current)}</p>
                  </div>

                  {!item.isNeutral && (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{
                        backgroundColor: item.isGood ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                        color: item.isGood ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${item.isGood ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                      }}>
                        <span className="text-[10px]">{item.percent > 0 ? '▲' : '▼'}</span>
                        <span>{Math.abs(item.percent)}%</span>
                      </div>
                      <span className="text-[10px] font-bold tracking-wide mt-1.5" style={{ color: item.isGood ? 'var(--success)' : 'var(--danger)', opacity: 0.7 }}>
                        {item.diff > 0 ? '+' : ''}{formatCurrency(item.diff)}
                      </span>
                    </div>
                  )}
                  {item.isNeutral && (
                    <div className="px-3 py-1 rounded-lg text-xs font-black" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                      -
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* Bill Tracker */}
      {billStatus.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Mēneša Rēķini</h3>
            <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {billStatus.filter(b => b.isPaid).length}/{billStatus.length} Apmaksāti
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {billStatus.filter(b => !b.isPaid).length === 0 ? (
                <motion.div
                  key="bills-done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl text-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)' }}
                >
                  <div className="text-3xl mb-2">✓</div>
                  <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>Visi rēķini apmaksāti</p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--success)', opacity: 0.6 }}>{billStatus.length} no {billStatus.length}</p>
                </motion.div>
              ) : (
                billStatus.filter(b => !b.isPaid).map(bill => (
                  <motion.div
                    key={bill.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    onClick={() => openPaymentModal(bill)}
                    className="flex justify-between items-center p-4 rounded-2xl cursor-pointer active:scale-[0.98] transition-all overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm" style={{
                        backgroundColor: 'rgba(212, 168, 83, 0.1)',
                        color: 'var(--accent-primary)'
                      }}>
                        ⚡
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {bill.note || bill.categoryName}
                        </p>
                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                          Termiņš: {bill.expectedDay}. datums
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(bill.amount)}
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Debt Payments */}
      {debtStatus.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-end px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Kredītu Maksājumi</h3>
            <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {debtStatus.filter(d => d.isPaid).length}/{debtStatus.length} Apmaksāti
            </span>
          </div>
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {debtStatus.filter(d => !d.isPaid).length === 0 ? (
                <motion.div
                  key="debts-done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl text-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)' }}
                >
                  <div className="text-3xl mb-2">✓</div>
                  <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>Visi kredīti apmaksāti</p>
                  <p className="text-[10px] font-medium mt-1" style={{ color: 'var(--success)', opacity: 0.6 }}>{debtStatus.length} no {debtStatus.length}</p>
                </motion.div>
              ) : (
                debtStatus.filter(d => !d.isPaid).map(debt => (
                  <motion.div
                    key={debt.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex justify-between items-center p-4 rounded-2xl transition-all overflow-hidden"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-accent)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm" style={{
                        backgroundColor: 'rgba(248, 113, 113, 0.1)',
                        color: 'var(--danger)'
                      }}>
                        !
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {debt.title}
                        </p>
                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Atlikums: {formatCurrency(debt.remainingAmount)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(debt.monthlyPayment)}
                      </span>
                      <button
                        onClick={() => openDebtPaymentModal(debt)}
                        className="px-3 py-1.5 rounded-xl font-bold text-xs active:scale-95 transition-all"
                        style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
                      >
                        Maksāt
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-xs font-black mb-6 uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Naudas plūsma</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#4a4a4e', fontWeight: 600 }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#232327', color: '#f5f5f0', fontWeight: 'bold', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                formatter={(val: number) => formatCurrency(val)}
              />
              <Bar name="Ienākumi" dataKey="income" fill="#4ade80" radius={[6, 6, 0, 0]} />
              <Bar name="Tēriņi" dataKey="expense" stackId="a" fill="#d4a853" radius={[0, 0, 6, 6]} />
              <Bar name="Ieguldīts" dataKey="invested" stackId="a" fill="#60a5fa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* TOP CATEGORIES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="p-6 rounded-2xl"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        <h3 className="text-xs font-black mb-6 uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Top Kategorijas</h3>
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
                    className="flex justify-between items-center cursor-pointer p-2 -mx-2 rounded-xl transition-colors"
                    style={{ }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-10 rounded-full" style={{ backgroundColor: item.isInvestment ? '#60a5fa' : COLORS[idx % COLORS.length] }} />
                      <div>
                        <span className="block text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                        {item.isInvestment && <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: 'var(--info)' }}>Uzkrājums</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-sm font-black tracking-tight" style={{ color: item.isInvestment ? 'var(--info)' : 'var(--text-primary)' }}>
                          {formatCurrency(item.amount)}
                        </span>
                        {budget && (
                          <span className="block text-[10px] font-bold" style={{ color: 'var(--text-tertiary)' }}>
                            / {formatCurrency(budget)}
                          </span>
                        )}
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <span className="text-xs font-black" style={{ color: 'var(--text-tertiary)' }}>›</span>
                      </div>
                    </div>
                  </div>

                  {budget && percentUsed !== null && (
                    <div className="px-2 -mx-2 mt-1 mb-1">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentUsed, 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: isOverBudget ? 'var(--danger)' : isNearBudget ? 'var(--warning)' : 'var(--success)' }}
                        />
                      </div>
                      {isOverBudget && (
                        <p className="text-[10px] font-bold mt-1" style={{ color: 'var(--danger)' }}>
                          Pārsniegts par {formatCurrency(item.amount - budget)}
                        </p>
                      )}
                    </div>
                  )}

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
                            className="w-24 text-xs p-1.5 rounded-lg outline-none font-bold"
                            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          />
                          <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>€/mēn</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingBudgetCatId(item.id); }}
                          className="text-[10px] font-bold transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}
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
          {categoryBreakdown.length === 0 && <p className="text-center font-bold py-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Nav datu par šo mēnesi.</p>}
        </div>
      </motion.div>

      {/* Bill Management Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedBill(null)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden p-6 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedBill.note || selectedBill.categoryName}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Mēneša rēķins: <span className="font-bold">{formatCurrency(selectedBill.amount)}</span></p>
              </div>
              <button onClick={() => setSelectedBill(null)} className="text-2xl leading-none" style={{ color: 'var(--text-tertiary)' }}>&times;</button>
            </div>

            {!selectedBill.isPaid && paymentForm ? (
              <div>
                {paymentError && (
                  <div className="mb-3 p-3 rounded-xl text-sm font-bold" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                    {paymentError}
                  </div>
                )}
                {selectedBill.matchedTransaction && (
                  <div className="mb-4 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                    <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--success)' }}>Atrasts līdzīgs maksājums</p>
                    <div className="text-sm flex justify-between font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      <span>{formatDateLV(selectedBill.matchedTransaction.date)}</span>
                      <span>{formatCurrency(selectedBill.matchedTransaction.amount)}</span>
                    </div>
                    <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{selectedBill.matchedTransaction.note || 'Bez piezīmes'}</div>
                    <button
                      onClick={() => linkExistingTransaction(selectedBill.id, selectedBill.matchedTransaction.date)}
                      className="w-full font-bold py-3 rounded-xl text-xs transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid rgba(74, 222, 128, 0.2)', color: 'var(--success)' }}
                    >
                      Piesaistīt šo ierakstu
                    </button>
                  </div>
                )}

                <form onSubmit={confirmPayment} className="space-y-4">
                  <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-bold mb-3 uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Jauns maksājums</p>
                    <div className="mb-4">
                      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Faktiskā Summa</label>
                      <input
                        type="text" inputMode="decimal"
                        value={paymentForm.amount}
                        onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full text-3xl font-bold p-2 bg-transparent outline-none"
                        style={{ color: 'var(--accent-primary)', borderBottom: '2px solid var(--border-accent)' }}
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Datums</label>
                        <input type="date" value={paymentForm.date} onChange={e => setPaymentForm({ ...paymentForm, date: e.target.value })} className="w-full p-2 rounded-lg outline-none font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Piezīme</label>
                        <input type="text" value={paymentForm.note} onChange={e => setPaymentForm({ ...paymentForm, note: e.target.value })} className="w-full p-2 rounded-lg outline-none font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} placeholder="..." />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="w-full font-bold py-4 rounded-2xl active:scale-95 transition-all" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}>
                    Apstiprināt & Samaksāt
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="p-5 rounded-2xl text-center" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                  <p className="font-bold" style={{ color: 'var(--success)' }}>Rēķins Apmaksāts</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--success)', opacity: 0.7 }}>
                    {selectedBill.lastGeneratedDate ? `Datums: ${formatDateLV(selectedBill.lastGeneratedDate)}` : 'Apstiprināts manuāli'}
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  {selectedBill.matchedTransaction && (
                    <button onClick={() => { setEditingTransaction(selectedBill.matchedTransaction); setSelectedBill(null); }} className="w-full font-bold py-3 rounded-xl transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      Rediģēt saistīto ierakstu
                    </button>
                  )}
                  <button onClick={() => markBillAsUnpaid(selectedBill.id)} className="w-full font-bold py-3 rounded-xl transition-colors text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Atzīmēt kā nesamaksātu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debt Payment Modal */}
      {selectedDebt && debtPaymentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => { setSelectedDebt(null); setDebtPaymentError(null); }}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden p-6 space-y-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedDebt.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Atlikums: <span className="font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(selectedDebt.remainingAmount)}</span></p>
              </div>
              <button onClick={() => { setSelectedDebt(null); setDebtPaymentError(null); }} className="text-2xl leading-none" style={{ color: 'var(--text-tertiary)' }}>&times;</button>
            </div>
            <form onSubmit={confirmDebtPayment} className="space-y-4">
              <div className="p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                <div className="mb-4">
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Summa</label>
                  <input
                    type="text" inputMode="decimal"
                    value={debtPaymentForm.amount}
                    onChange={e => setDebtPaymentForm({ ...debtPaymentForm, amount: e.target.value })}
                    className="w-full text-3xl font-bold p-2 bg-transparent outline-none"
                    style={{ color: 'var(--accent-primary)', borderBottom: '2px solid var(--border-accent)' }}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Datums</label>
                  <input type="date" value={debtPaymentForm.date} onChange={e => setDebtPaymentForm({ ...debtPaymentForm, date: e.target.value })} className="w-full p-2 rounded-lg outline-none font-medium" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
                </div>
              </div>
              {debtPaymentError && (
                <div className="p-3 rounded-xl text-sm font-bold" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                  {debtPaymentError}
                </div>
              )}
              <button type="submit" className="w-full font-bold py-4 rounded-2xl active:scale-95 transition-all" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}>
                Apstiprināt Maksājumu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Category Detail Modal */}
      {viewCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setViewCategory(null)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col max-h-[70vh]" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="p-6 flex justify-between items-center sticky top-0 z-10" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <h3 className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>{viewCategory.name}</h3>
                <p className="text-xs font-bold uppercase mt-1 tracking-wide" style={{ color: 'var(--text-secondary)' }}>Kopā: {formatCurrency(viewCategory.amount)}</p>
              </div>
              <button onClick={() => setViewCategory(null)} className="p-2 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                ✕
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-2">
              {detailTransactions.map(t => (
                <div key={t.id} className="flex justify-between items-start p-3 rounded-xl transition-colors" style={{ }}>
                  <div className="pr-4">
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{t.note || 'Bez piezīmes'}</div>
                    <div className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-tertiary)' }}>{formatDateLV(t.date)}</div>
                  </div>
                  <div className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--accent-primary)' }}>
                    {formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingTransaction && (
        <EditExpenseModal transaction={editingTransaction} type="expense" onClose={() => setEditingTransaction(null)} />
      )}
    </div>
  );
};

export default ReportsView;
