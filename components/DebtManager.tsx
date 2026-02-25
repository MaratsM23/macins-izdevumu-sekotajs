
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseAmount, formatCurrency, getTodayStr, formatDateLV } from '../utils';
import { Debt } from '../types';

const DebtManager: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState(''); // Editable balance
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [hasInstallments, setHasInstallments] = useState(true); // New toggle for type
  const [createIncomeRecord, setCreateIncomeRecord] = useState(false);
  
  // Payment Modal State
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayStr());

  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  
  const activeDebts = debts.filter(d => !d.isPaidOff);

  // Split logic: if monthlyPayment > 0, it's a recurring loan. Otherwise it's a flexible debt.
  const recurringDebts = activeDebts.filter(d => d.monthlyPayment > 0);
  const irregularDebts = activeDebts.filter(d => d.monthlyPayment === 0);
  const paidDebts = debts.filter(d => d.isPaidOff);

  const resetForm = () => {
    setTitle('');
    setTotalAmount('');
    setRemainingAmount('');
    setMonthlyPayment('');
    setHasInstallments(true);
    setCreateIncomeRecord(false);
    setEditingId(null);
    setIsFormOpen(false);
  };

  const startEditing = (debt: Debt) => {
    setEditingId(debt.id);
    setTitle(debt.title);
    setTotalAmount(debt.totalAmount.toString());
    setRemainingAmount(debt.remainingAmount.toString());
    setMonthlyPayment(debt.monthlyPayment > 0 ? debt.monthlyPayment.toString() : '');
    setHasInstallments(debt.monthlyPayment > 0);
    setCreateIncomeRecord(false);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTotal = parseAmount(totalAmount);
    // If "hasInstallments" is false, we force monthlyPayment to 0
    const parsedMonthly = hasInstallments ? parseAmount(monthlyPayment) : 0;
    const parsedRemaining = remainingAmount ? parseAmount(remainingAmount) : parsedTotal;

    if (!title.trim() || parsedTotal <= 0 || parsedMonthly < 0 || parsedRemaining < 0) return;
    if (parsedRemaining > parsedTotal) return;

    try {
      const debtData = {
        title,
        totalAmount: parsedTotal,
        remainingAmount: parsedRemaining,
        monthlyPayment: parsedMonthly, // 0 means irregular
        dueDateDay: 10, // Default, not heavily used yet
        categoryId: '',
        isPaidOff: parsedRemaining <= 0.01,
        updatedAt: Date.now()
      };

      if (editingId) {
        await db.debts.update(editingId, debtData);
      } else {
        const debtId = crypto.randomUUID();
        const now = Date.now();
        
        await db.debts.add({
          id: debtId,
          ...debtData,
          createdAt: now
        });

        if (createIncomeRecord) {
          const cats = await db.incomeCategories.toArray();
          let incCat = cats.find(c => c.name.toLowerCase().includes('citi'));
          if (!incCat && cats.length > 0) incCat = cats[0];

          if (incCat) {
            await db.incomes.add({
              id: crypto.randomUUID(),
              amount: parsedTotal,
              currency: 'EUR',
              date: getTodayStr(),
              categoryId: incCat.id,
              note: `Aizņēmums: ${title}`,
              createdAt: now,
              updatedAt: now
            });
          }
        }
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Kļūda saglabājot');
    }
  };

  const handleDelete = async () => {
    if (editingId && window.confirm('Vai tiešām dzēst šo parādu? Vēsturiskie maksājumi paliks, bet parāda kartīte tiks dzēsta.')) {
      await db.debts.delete(editingId);
      resetForm();
    }
  };

  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;

    const amount = parseAmount(paymentAmount);
    if (amount <= 0 || amount > payingDebt.remainingAmount) return;

    try {
      const cats = await db.categories.toArray();
      let expCat = cats.find(c => c.name.toLowerCase().includes('kred') || c.name.toLowerCase().includes('līz'));
      if (!expCat && cats.length > 0) expCat = cats.find(c => c.name === 'Citi') || cats[0];

      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: amount,
        currency: 'EUR',
        date: paymentDate,
        categoryId: expCat?.id || '',
        debtId: payingDebt.id,
        note: `Maksājums: ${payingDebt.title}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const newRemaining = payingDebt.remainingAmount - amount;
      await db.debts.update(payingDebt.id, {
        remainingAmount: newRemaining < 0 ? 0 : newRemaining,
        isPaidOff: newRemaining <= 0.01,
        updatedAt: Date.now()
      });

      setPayingDebt(null);
      setPaymentAmount('');
    } catch (err) {
      console.error(err);
      alert('Kļūda reģistrējot maksājumu');
    }
  };

  const openPaymentModal = (debt: Debt) => {
    setPayingDebt(debt);
    // If it has a monthly payment, suggest that. Otherwise suggest full amount or nothing.
    const suggest = debt.monthlyPayment > 0 
        ? Math.min(debt.monthlyPayment, debt.remainingAmount)
        : ''; 
    setPaymentAmount(suggest.toString());
    setPaymentDate(getTodayStr());
  };

  const onTotalChange = (val: string) => {
    setTotalAmount(val);
    if (!editingId && !remainingAmount) {
      setRemainingAmount(val);
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-stone-800">Parādi & Kredīti</h2>
        <button 
          onClick={() => {
            if (isFormOpen) resetForm();
            else { resetForm(); setIsFormOpen(true); }
          }}
          className="bg-stone-800 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md hover:bg-stone-900 active:scale-95 transition-all"
        >
          {isFormOpen ? 'Aizvērt' : '+ Jauns'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 space-y-5 relative overflow-hidden animation-fade-in">
          <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
          <h3 className="text-lg font-bold text-stone-800 mb-2 pl-2">
            {editingId ? 'Rediģēt Parādu' : 'Jauns Ieraksts'}
          </h3>
          
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Nosaukums</label>
            <input 
              type="text" 
              placeholder="Piem. Auto Līzings" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-200 transition-colors font-bold text-stone-700"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Kopējā Summa</label>
              <input 
                type="text" inputMode="decimal" placeholder="0.00" 
                value={totalAmount}
                onChange={e => onTotalChange(e.target.value)}
                className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-200 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Atlikums</label>
              <input 
                type="text" inputMode="decimal" placeholder="0.00" 
                value={remainingAmount}
                onChange={e => setRemainingAmount(e.target.value)}
                className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-200 text-orange-600 font-bold"
              />
            </div>
          </div>

          <div className="pt-2">
             <div className="flex gap-3 mb-4">
                 <label className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl border flex-1 transition-all ${hasInstallments ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-white border-stone-200 text-stone-500'}`}>
                    <input 
                        type="radio" 
                        name="debtType"
                        checked={hasInstallments}
                        onChange={() => setHasInstallments(true)}
                        className="hidden"
                    />
                    <span className="text-xs font-bold">Regulārs (Līzings)</span>
                 </label>
                 <label className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl border flex-1 transition-all ${!hasInstallments ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-white border-stone-200 text-stone-500'}`}>
                    <input 
                        type="radio" 
                        name="debtType"
                        checked={!hasInstallments}
                        onChange={() => setHasInstallments(false)}
                        className="hidden"
                    />
                    <span className="text-xs font-bold">Vienreizējs</span>
                 </label>
             </div>

             {hasInstallments && (
                 <div className="animation-fade-in">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Mēneša maksājums (Budžetam)</label>
                    <input 
                        type="text" inputMode="decimal" placeholder="0.00" 
                        value={monthlyPayment}
                        onChange={e => setMonthlyPayment(e.target.value)}
                        className="w-full p-4 bg-stone-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-orange-200 font-medium"
                    />
                 </div>
             )}
          </div>

          {!editingId && (
            <div className="flex items-center pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={createIncomeRecord}
                  onChange={e => setCreateIncomeRecord(e.target.checked)}
                  className="w-5 h-5 accent-orange-600 rounded"
                />
                <span className="text-xs font-bold text-stone-500 leading-tight">
                  Reģistrēt kā ienākumu šodien?
                </span>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {editingId && (
              <button 
                type="button" 
                onClick={handleDelete}
                className="flex-1 py-4 bg-red-50 text-red-500 font-bold rounded-2xl hover:bg-red-100 transition-colors"
              >
                Dzēst
              </button>
            )}
            <button 
              type="submit" 
              className="flex-[2] bg-stone-800 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-stone-900 active:scale-95 transition-all"
            >
              Saglabāt
            </button>
          </div>
        </form>
      )}

      {/* 1. SECTION: RECURRING (Leasing, Mortgage) */}
      {recurringDebts.length > 0 && (
          <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase mb-3 ml-2 tracking-widest">Regulārie (Līzings, Kredīti)</h3>
              <div className="space-y-4">
                {recurringDebts.map(debt => (
                <div key={debt.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-50 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                        <h3 className="font-bold text-stone-800 text-lg">{debt.title}</h3>
                        <p className="text-xs text-stone-400 font-medium mt-0.5">
                            Kopā: {formatCurrency(debt.totalAmount)}
                        </p>
                        </div>
                        <div className="text-right">
                        <p className="text-[10px] text-stone-400 font-bold uppercase mb-0.5">Atlikums</p>
                        <p className="text-xl font-black text-orange-600 tracking-tight">
                            {formatCurrency(debt.remainingAmount)}
                        </p>
                        </div>
                    </div>
                    
                    <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden mb-5">
                        <div 
                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${Math.min(100, (1 - debt.remainingAmount / debt.totalAmount) * 100)}%` }}
                        ></div>
                    </div>

                    <div className="flex gap-2">
                        <button 
                        onClick={() => openPaymentModal(debt)}
                        className="flex-1 bg-stone-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                        <span>Maksāt</span> 
                        <span className="opacity-70 font-medium text-xs">({formatCurrency(debt.monthlyPayment)})</span>
                        </button>
                        <button 
                        onClick={() => startEditing(debt)}
                        className="w-12 bg-stone-50 text-stone-400 rounded-xl font-bold text-lg hover:bg-stone-100 active:scale-95 transition-all"
                        >
                        ✏️
                        </button>
                    </div>
                </div>
                ))}
            </div>
        </div>
      )}

      {/* 2. SECTION: ONE-TIME (Private, Flexible) */}
      {irregularDebts.length > 0 && (
          <div className="pt-4">
               <h3 className="text-xs font-bold text-stone-400 uppercase mb-3 ml-2 tracking-widest">Citi Parādi</h3>
               <div className="space-y-3">
                   {irregularDebts.map(debt => (
                       <div key={debt.id} className="bg-white p-5 rounded-2xl border border-stone-100 flex justify-between items-center shadow-sm">
                           <div>
                               <h3 className="font-bold text-stone-700">{debt.title}</h3>
                               <p className="text-xs text-stone-400 mt-0.5">Atlikums: <span className="text-orange-600 font-bold">{formatCurrency(debt.remainingAmount)}</span></p>
                           </div>
                           <div className="flex gap-2">
                                <button 
                                    onClick={() => openPaymentModal(debt)}
                                    className="bg-stone-50 text-stone-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-stone-100 transition-colors"
                                >
                                    Atmaksāt
                                </button>
                                <button 
                                    onClick={() => startEditing(debt)}
                                    className="text-stone-300 hover:text-stone-500 px-2"
                                >
                                    ✏️
                                </button>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {activeDebts.length === 0 && !isFormOpen && (
        <div className="text-center py-16 text-stone-300">
            <div className="text-5xl mb-3 opacity-30">🙌</div>
            <p className="font-medium">Tev nav aktīvu parādu.</p>
        </div>
      )}

      {/* Paid Debts History */}
      {paidDebts.length > 0 && (
        <div className="pt-8 border-t border-stone-100 mt-4">
           <h3 className="text-xs font-bold text-stone-300 uppercase mb-4 ml-2 tracking-widest">Vēsture</h3>
           <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
             {paidDebts.map(debt => (
               <div key={debt.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <span className="font-bold text-stone-500 decoration-stone-300 line-through text-sm">{debt.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Nomaksāts</span>
                    <button 
                      onClick={() => startEditing(debt)} 
                      className="text-stone-300 hover:text-stone-500 px-2"
                    >
                      ✏️
                    </button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animation-fade-in" onClick={() => setPayingDebt(null)}>
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-stone-800 mb-1">Maksājums</h3>
              <p className="text-sm text-stone-500 mb-6">Parāds: <span className="font-bold text-stone-700">{payingDebt.title}</span></p>
              
              <form onSubmit={handleRepayment} className="space-y-5">
                 <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Summa</label>
                    <input 
                      type="text" inputMode="decimal"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full text-4xl font-black p-2 border-b-2 border-stone-100 focus:border-orange-500 outline-none text-stone-800 bg-transparent"
                      autoFocus
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Datums</label>
                    <input 
                      type="date"
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border-none outline-none font-medium text-stone-600"
                    />
                 </div>

                 <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setPayingDebt(null)}
                      className="flex-1 py-4 text-stone-400 font-bold hover:bg-stone-50 rounded-2xl transition-colors"
                    >
                      Atcelt
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] bg-stone-800 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-stone-900 active:scale-95 transition-all"
                    >
                      Apstiprināt
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default DebtManager;
