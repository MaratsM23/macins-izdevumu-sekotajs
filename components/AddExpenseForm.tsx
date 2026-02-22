import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { TransactionType, Category, IncomeCategory } from '../types';
import { getTodayStr, formatCurrency, getRemainingDaysInMonth } from '../utils';
import { Check, X, Delete, Sparkles } from 'lucide-react';

interface Props {
  onSaveSuccess: () => void;
}

const AddTransactionForm: React.FC<Props> = ({ onSaveSuccess }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const expenseCategories = useLiveQuery(() => db.categories.toArray()) || [];
  const incomeCategories = useLiveQuery(() => db.incomeCategories.toArray()) || [];

  const todayTotal = useLiveQuery(async () => {
    const today = getTodayStr();
    const exps = await db.expenses.where('date').equals(today).toArray();
    return exps.reduce((sum, e) => sum + e.amount, 0);
  }, []);

  // Daily allowance based on total remaining budget / remaining days
  const dailyAllowance = useLiveQuery(async () => {
    const categories = await db.categories.toArray();
    const budgetedCats = categories.filter(c => c.monthlyBudget && c.monthlyBudget > 0 && !c.isInvestment);
    if (budgetedCats.length === 0) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const monthExpenses = await db.expenses
      .where('date')
      .between(start, end, true, true)
      .toArray();

    const totalBudget = budgetedCats.reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);
    const budgetedCatIds = new Set(budgetedCats.map(c => c.id));
    const totalSpent = monthExpenses
      .filter(e => budgetedCatIds.has(e.categoryId))
      .reduce((sum, e) => sum + e.amount, 0);

    const remaining = totalBudget - totalSpent;
    const daysLeft = getRemainingDaysInMonth();
    return remaining / daysLeft;
  }, []);

  // Per-category budget info for selected category
  const selectedCategoryBudget = useLiveQuery(async () => {
    if (!categoryId) return null;
    const cat = await db.categories.get(categoryId);
    if (!cat || !cat.monthlyBudget || cat.isInvestment) return null;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const catExpenses = await db.expenses
      .where('date')
      .between(start, end, true, true)
      .toArray();

    const spent = catExpenses
      .filter(e => e.categoryId === categoryId)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      catName: cat.name,
      budget: cat.monthlyBudget,
      spent,
      remaining: cat.monthlyBudget - spent
    };
  }, [categoryId]);

  const activeCategories = (type === 'expense' ? expenseCategories : incomeCategories).filter(c => !c.isArchived);

  useEffect(() => {
    // Auto-select first category if none selected
    if (activeCategories.length > 0 && !categoryId) {
      setCategoryId(activeCategories[0].id);
    }
  }, [type, activeCategories.length, categoryId]);

  const handleNumpadClick = (val: string) => {
    if (navigator.vibrate) navigator.vibrate(10); // Subtle haptic

    if (val === 'clear') {
      setAmountStr('0');
      setError('');
      return;
    }

    if (val === 'backspace') {
      setAmountStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      setError('');
      return;
    }

    if (val === '.') {
      if (!amountStr.includes('.')) setAmountStr(prev => prev + '.');
      return;
    }

    // Limit decimal places to 2
    if (amountStr.includes('.')) {
      const parts = amountStr.split('.');
      if (parts[1] && parts[1].length >= 2) return;
    }

    // Limit total digits before decimal
    if (!amountStr.includes('.') && amountStr.length >= 6) return;

    setAmountStr(prev => prev === '0' ? val : prev + val);
    setError('');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Ievadiet summu');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Error haptic
      return;
    }

    if (!categoryId) {
      setError('Izvēlieties kategoriju');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        id: crypto.randomUUID(),
        amount: parsedAmount,
        currency: 'EUR',
        date: getTodayStr(),
        categoryId,
        note: note.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (type === 'expense') {
        await db.expenses.add(data);
      } else {
        await db.incomes.add(data);
      }

      if (navigator.vibrate) navigator.vibrate([50, 50, 50]); // Success haptic

      setAmountStr('0');
      setNote('');
      setTimeout(() => {
        setIsSubmitting(false);
        onSaveSuccess();
      }, 500);

    } catch (err) {
      console.error(err);
      setError('Kļūda saglabājot');
      setIsSubmitting(false);
    }
  };

  const getEmojiForCategory = (name: string) => {
    const emojis: Record<string, string> = {
      'Pārtika': '🛒', 'Pusdienas': '🍽️', 'Kafejnīcas': '☕',
      'Transports': '🚌', 'Car sharing': '🚗', 'Veselība': '💊',
      'Abonementi': '📱', 'Izklaide': '🍿', 'Kompulsīvie pirkumi': '🥺',
      'Alko': '🍷', 'Māja': '🏠', 'Bērni': '🧸', 'Dāvanas': '🎁',
      'Kredīti': '💳', 'Līzings': '📄', 'Ieguldījumi': '📈', 'Uzkrājumi': '💰',
      'Alga': '💵', 'Komandējums': '✈️', 'Bonuss': '🎉', 'Pārdošana': '🤝',
      'Citi': '📦'
    };
    return emojis[name] || '📌';
  };

  // Numpad layout
  const padButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '.', '0', 'backspace'
  ];

  const amountColor = type === 'expense' ? 'text-stone-800' : 'text-teal-600';
  const typeBg = type === 'expense' ? 'bg-stone-800 text-white' : 'bg-teal-600 text-white';

  // NLP - Natural Language Parsing Logic
  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNote(val);

    if (val.trim().length === 0) return;

    // 1. Extract amount from beginning of text (e.g., "15 rimi" or "3.5 kafija")
    const amountMatch = val.match(/^(\d+(?:[.,]\d{1,2})?)\s+/);
    if (amountMatch) {
      const parsedAmount = amountMatch[1].replace(',', '.');
      setAmountStr(parsedAmount);

      // Remove amount from note visual for cleaner DB entry 
      // e.g. "15 rimi" -> note becomes just "rimi" in the UI later or keep it as is.
      // Let's keep it in the input so the user sees what they typed, but we've extracted the number.
    }

    // 2. Guess category based on keywords
    const lowerVal = val.toLowerCase();

    const keywords: Record<string, string[]> = {
      'Pārtika': ['rimi', 'maxima', 'lidl', 'pārtika', 'veikals', 'produkti', 'maize', 'piens', 'gaļa'],
      'Kafejnīcas': ['kafija', 'caffeine', 'costa', 'ezītis', 'kafejnīca', 'tēja'],
      'Pusdienas': ['pusdienas', 'lido', 'wolt', 'bolt food', 'restorāns', 'ēdnīca', 'pusdienu bļoda', 'bļoda'],
      'Transports': ['transports', 'biļete', 'vilciens', 'autobuss', 'rs', 'rigas satiksme', 'benzīns', 'cirkle k', 'neste', 'viada', 'degviela'],
      'Car sharing': ['citybee', 'carguru', 'bolt drive', 'fiqsy', 'ox drive', 'spark'],
      'Alko': ['alko', 'vīns', 'alus', 'spirits', 'lb', 'alkohols'],
      'Izklaide': ['kino', 'teātris', 'biļetes', 'koncerts', 'boulings', 'izklaide'],
      'Abonementi': ['netflix', 'spotify', 'youtube', 'bite', 'lmt', 'tele2', 'tet', 'elektrum'],
      // Add more as needed
    };

    // Find if the text contains any of the keywords
    outer: for (const [categoryName, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lowerVal.includes(word)) {
          // Find the category ID from active categories
          const cat = activeCategories.find((c: Category | IncomeCategory) => c.name === categoryName);
          if (cat) {
            setCategoryId(cat.id);
            // Highlight with haptic that AI caught something
            if (navigator.vibrate) navigator.vibrate(20);
            break outer;
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 overflow-hidden relative pb-6 -mt-4">

      {/* Type Toggle - Minimal Pill */}
      <div className="flex justify-center mt-4 mb-2 z-10 relative">
        <div className="flex bg-stone-200/50 p-1 rounded-full backdrop-blur-sm shadow-inner">
          <button
            onClick={() => { setType('expense'); setCategoryId(''); }}
            className={`px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 ${type === 'expense' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            Tēriņi
          </button>
          <button
            onClick={() => { setType('income'); setCategoryId(''); }}
            className={`px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 ${type === 'income' ? 'bg-white text-teal-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            Ienākumi
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 relative space-y-4 my-2">
        <div className={`text-6xl sm:text-7xl font-black tracking-tighter truncate w-full text-center transition-colors duration-300 ${amountColor}`}>
          {amountStr}
          <span className="text-3xl text-stone-300 ml-1">€</span>
        </div>

        {/* NLP quick entry / Note input */}
        <div className="relative w-full max-w-xs group">
          <input
            type="text"
            placeholder="Ātrā ievade (piem. '15 Rimi')"
            value={note}
            onChange={handleNoteChange}
            className="bg-white/80 text-stone-700 font-bold placeholder:text-stone-400 placeholder:font-medium text-center text-lg py-3 px-10 rounded-2xl w-full border-2 border-transparent focus:border-stone-200 outline-none shadow-sm transition-all focus:bg-white focus:shadow-md"
          />
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400 opacity-50 group-focus-within:opacity-100 transition-opacity" />
        </div>

        {error && <div className="text-red-500 font-bold bg-red-50 px-4 py-1 rounded-full text-sm animate-pulse absolute top-0">{error}</div>}
      </div>

      {/* Category Carousel */}
      <div className="w-full bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] pt-6 pb-2 z-20">
        <div className="flex gap-4 overflow-x-auto pb-4 px-6 hide-scrollbar snap-x">
          {activeCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryId(cat.id);
                if (navigator.vibrate) navigator.vibrate(10);
              }}
              className={`flex flex-col items-center justify-center min-w-[72px] p-3 rounded-2xl snap-start transition-all duration-200 ${categoryId === cat.id
                ? `${type === 'expense' ? 'bg-stone-800 text-white shadow-lg shadow-stone-800/30' : 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'} scale-110 -translate-y-2`
                : 'bg-stone-50 text-stone-500 hover:bg-stone-100'
                }`}
            >
              <span className="text-2xl mb-1">{getEmojiForCategory(cat.name)}</span>
              <span className={`text-[10px] font-bold truncate w-full text-center ${categoryId === cat.id ? 'opacity-100' : 'opacity-70'}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>

        {/* Per-category budget hint */}
        {type === 'expense' && selectedCategoryBudget && (
          <div className="px-6 pb-2">
            <p className={`text-[10px] font-bold text-center ${
              selectedCategoryBudget.remaining > 0 ? 'text-emerald-600' : 'text-red-500'
            }`}>
              {selectedCategoryBudget.catName}: {selectedCategoryBudget.remaining > 0
                ? `Atlikums ${formatCurrency(selectedCategoryBudget.remaining)}`
                : `Pārsniegts par ${formatCurrency(Math.abs(selectedCategoryBudget.remaining))}`
              } no {formatCurrency(selectedCategoryBudget.budget)}
            </p>
          </div>
        )}
      </div>

      {/* Numpad Section */}
      <div className="bg-white px-6 pb-8 z-20 relative">
        <div className="grid grid-cols-4 gap-3">
          {/* Numbers 3x4 grid taking up 3 cols */}
          <div className="col-span-3 grid grid-cols-3 gap-3">
            {padButtons.map((btn, i) => (
              <button
                key={i}
                onClick={() => handleNumpadClick(btn)}
                className="bg-stone-50 hover:bg-stone-100 text-stone-800 active:bg-stone-200 text-2xl font-bold py-4 rounded-2xl transition-colors flex items-center justify-center active:scale-95 touch-manipulation"
              >
                {btn === 'backspace' ? <Delete className="w-6 h-6" /> : btn}
              </button>
            ))}
          </div>

          {/* Action column right side */}
          <div className="col-span-1 grid grid-rows-2 gap-3">
            <button
              onClick={() => handleNumpadClick('clear')}
              className="bg-rose-50 hover:bg-rose-100 text-rose-500 active:bg-rose-200 font-bold rounded-2xl flex items-center justify-center transition-colors active:scale-95 touch-manipulation uppercase text-xs tracking-wider"
            >
              C
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || amountStr === '0' || !categoryId}
              className={`${typeBg} hover:opacity-90 active:opacity-100 shadow-xl disabled:opacity-50 disabled:shadow-none flex items-center justify-center rounded-2xl transition-all duration-300 active:scale-95 touch-manipulation`}
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Check className="w-10 h-10" />
              )}
            </button>
          </div>
        </div>

        {/* Budget-aware context indicator */}
        {type === 'expense' && (
          <div className="text-center mt-6 space-y-1.5">
            {dailyAllowance !== null && dailyAllowance !== undefined ? (
              <>
                <div className="flex items-center justify-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${dailyAllowance > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <p className={`text-sm font-black tracking-tight ${dailyAllowance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {formatCurrency(Math.max(dailyAllowance, 0))} / dienā
                  </p>
                  <span className={`w-1.5 h-1.5 rounded-full ${dailyAllowance > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                </div>
                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest">
                  Šodien iztērēts: {formatCurrency(todayTotal || 0)}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                  Šodien: {formatCurrency(todayTotal || 0)}
                </p>
                <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global CSS for hiding scrollbar */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default AddTransactionForm;
