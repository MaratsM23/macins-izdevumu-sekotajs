
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseAmount, formatCurrency, getTodayStr, formatDateLV } from '../utils';
import { Debt } from '../types';

const DebtManager: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [hasInstallments, setHasInstallments] = useState(true);
  const [createIncomeRecord, setCreateIncomeRecord] = useState(false);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayStr());

  const debts = useLiveQuery(() => db.debts.toArray()) || [];
  const activeDebts = debts.filter(d => !d.isPaidOff);
  const recurringDebts = activeDebts.filter(d => d.monthlyPayment > 0);
  const irregularDebts = activeDebts.filter(d => d.monthlyPayment === 0);
  const paidDebts = debts.filter(d => d.isPaidOff);

  const resetForm = () => {
    setTitle(''); setTotalAmount(''); setRemainingAmount(''); setMonthlyPayment('');
    setHasInstallments(true); setCreateIncomeRecord(false); setEditingId(null); setIsFormOpen(false);
  };

  const startEditing = (debt: Debt) => {
    setEditingId(debt.id); setTitle(debt.title); setTotalAmount(debt.totalAmount.toString());
    setRemainingAmount(debt.remainingAmount.toString());
    setMonthlyPayment(debt.monthlyPayment > 0 ? debt.monthlyPayment.toString() : '');
    setHasInstallments(debt.monthlyPayment > 0); setCreateIncomeRecord(false); setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTotal = parseAmount(totalAmount);
    const parsedMonthly = hasInstallments ? parseAmount(monthlyPayment) : 0;
    const parsedRemaining = remainingAmount ? parseAmount(remainingAmount) : parsedTotal;
    if (!title || parsedTotal <= 0) return;
    try {
      const debtData = {
        title, totalAmount: parsedTotal, remainingAmount: parsedRemaining, monthlyPayment: parsedMonthly,
        dueDateDay: 10, categoryId: undefined, isPaidOff: parsedRemaining <= 0.01, updatedAt: Date.now()
      };
      if (editingId) { await db.debts.update(editingId, debtData); }
      else {
        const debtId = crypto.randomUUID();
        const now = Date.now();
        await db.debts.add({ id: debtId, ...debtData, createdAt: now });
        if (createIncomeRecord) {
          const cats = await db.incomeCategories.toArray();
          let incCat = cats.find(c => c.name.toLowerCase().includes('citi'));
          if (!incCat && cats.length > 0) incCat = cats[0];
          if (incCat) {
            await db.incomes.add({ id: crypto.randomUUID(), amount: parsedTotal, currency: 'EUR', date: getTodayStr(), categoryId: incCat.id, note: `Aizņēmums: ${title}`, createdAt: now, updatedAt: now });
          }
        }
      }
      resetForm();
    } catch (err) { console.error(err); alert('Kļūda saglabājot'); }
  };

  const handleDelete = async () => {
    if (editingId && window.confirm('Vai tiešām dzēst šo parādu?')) {
      await db.debts.delete(editingId); resetForm();
    }
  };

  const handleRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const amount = parseAmount(paymentAmount);
    if (amount <= 0) return;
    try {
      const cats = await db.categories.toArray();
      let expCat = cats.find(c => c.name.toLowerCase().includes('kred') || c.name.toLowerCase().includes('līz'));
      if (!expCat && cats.length > 0) expCat = cats.find(c => c.name === 'Citi') || cats[0];
      await db.expenses.add({
        id: crypto.randomUUID(), amount, currency: 'EUR', date: paymentDate,
        categoryId: expCat?.id || null, debtId: payingDebt.id, note: `Maksājums: ${payingDebt.title}`,
        createdAt: Date.now(), updatedAt: Date.now()
      });
      const newRemaining = payingDebt.remainingAmount - amount;
      await db.debts.update(payingDebt.id, {
        remainingAmount: newRemaining < 0 ? 0 : newRemaining, isPaidOff: newRemaining <= 0.01, updatedAt: Date.now()
      });
      setPayingDebt(null); setPaymentAmount('');
    } catch (err) { console.error(err); alert('Kļūda reģistrējot maksājumu'); }
  };

  const openPaymentModal = (debt: Debt) => {
    setPayingDebt(debt);
    const suggest = debt.monthlyPayment > 0 ? Math.min(debt.monthlyPayment, debt.remainingAmount) : '';
    setPaymentAmount(suggest.toString());
    setPaymentDate(getTodayStr());
  };

  const onTotalChange = (val: string) => {
    setTotalAmount(val);
    if (!editingId && !remainingAmount) setRemainingAmount(val);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Parādi & Kredīti</h2>
        <button
          onClick={() => { if (isFormOpen) resetForm(); else { resetForm(); setIsFormOpen(true); } }}
          className="px-5 py-2 rounded-full font-bold text-sm active:scale-95 transition-all"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)' }}
        >
          {isFormOpen ? 'Aizvērt' : '+ Jauns'}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSave} className="p-6 rounded-2xl space-y-5 relative overflow-hidden animation-fade-in" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
          <h3 className="text-lg font-bold mb-2 pl-2" style={{ color: 'var(--text-primary)' }}>
            {editingId ? 'Rediģēt Parādu' : 'Jauns Ieraksts'}
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Nosaukums</label>
            <input type="text" placeholder="Piem. Auto Līzings" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 rounded-2xl outline-none font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Kopējā Summa</label>
              <input type="text" inputMode="decimal" placeholder="0.00" value={totalAmount} onChange={e => onTotalChange(e.target.value)} className="w-full p-4 rounded-2xl outline-none font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Atlikums</label>
              <input type="text" inputMode="decimal" placeholder="0.00" value={remainingAmount} onChange={e => setRemainingAmount(e.target.value)} className="w-full p-4 rounded-2xl outline-none font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--danger)' }} />
            </div>
          </div>

          <div className="pt-2">
             <div className="flex gap-3 mb-4">
                 <label className="flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl flex-1 transition-all" style={hasInstallments ? { backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border-accent)', color: 'var(--accent-primary)' } : { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
                    <input type="radio" name="debtType" checked={hasInstallments} onChange={() => setHasInstallments(true)} className="hidden" />
                    <span className="text-xs font-bold">Regulārs (Līzings)</span>
                 </label>
                 <label className="flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl flex-1 transition-all" style={!hasInstallments ? { backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border-accent)', color: 'var(--accent-primary)' } : { backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}>
                    <input type="radio" name="debtType" checked={!hasInstallments} onChange={() => setHasInstallments(false)} className="hidden" />
                    <span className="text-xs font-bold">Vienreizējs</span>
                 </label>
             </div>
             {hasInstallments && (
                 <div className="animation-fade-in">
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Mēneša maksājums</label>
                    <input type="text" inputMode="decimal" placeholder="0.00" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} className="w-full p-4 rounded-2xl outline-none font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                 </div>
             )}
          </div>

          {!editingId && (
            <div className="pt-2 space-y-1.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={createIncomeRecord} onChange={e => setCreateIncomeRecord(e.target.checked)} className="w-5 h-5 rounded" style={{ accentColor: 'var(--accent-primary)' }} />
                <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text-secondary)' }}>Pievienot saņemto summu bilancei šodien?</span>
              </label>
              <p className="text-[10px] leading-snug pl-8" style={{ color: 'var(--text-tertiary)' }}>
                (Aizņēmuma summa tiks reģistrēta kā naudas ieplūde, bet nav uzskatāma par ienākumu — tā būs jāatdod)
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {editingId && (
              <button type="button" onClick={handleDelete} className="flex-1 py-4 font-bold rounded-2xl transition-colors" style={{ backgroundColor: 'rgba(248, 113, 113, 0.1)', color: 'var(--danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}>Dzēst</button>
            )}
            <button type="submit" className="flex-[2] font-bold py-4 rounded-2xl active:scale-95 transition-all" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}>Saglabāt</button>
          </div>
        </form>
      )}

      {/* RECURRING */}
      {recurringDebts.length > 0 && (
          <div>
              <h3 className="text-xs font-bold uppercase mb-3 ml-2 tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Regulārie (Līzings, Kredīti)</h3>
              <div className="space-y-4">
                {recurringDebts.map(debt => (
                <div key={debt.id} className="p-6 rounded-2xl relative overflow-hidden group" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-start mb-3">
                        <div>
                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{debt.title}</h3>
                        <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Kopā: {formatCurrency(debt.totalAmount)}</p>
                        </div>
                        <div className="text-right">
                        <p className="text-[10px] font-bold uppercase mb-0.5" style={{ color: 'var(--text-tertiary)' }}>Atlikums</p>
                        <p className="text-xl font-black tracking-tight" style={{ color: 'var(--danger)' }}>{formatCurrency(debt.remainingAmount)}</p>
                        </div>
                    </div>

                    <div className="w-full h-3 rounded-full overflow-hidden mb-5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (1 - debt.remainingAmount / debt.totalAmount) * 100)}%`, background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))' }}></div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => openPaymentModal(debt)} className="flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.2)' }}>
                        <span>Maksāt</span>
                        <span className="opacity-70 font-medium text-xs">({formatCurrency(debt.monthlyPayment)})</span>
                        </button>
                        <button onClick={() => startEditing(debt)} className="w-12 rounded-xl font-bold text-lg active:scale-95 transition-all" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>✏️</button>
                    </div>
                </div>
                ))}
            </div>
        </div>
      )}

      {/* ONE-TIME */}
      {irregularDebts.length > 0 && (
          <div className="pt-4">
               <h3 className="text-xs font-bold uppercase mb-3 ml-2 tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Citi Parādi</h3>
               <div className="space-y-3">
                   {irregularDebts.map(debt => (
                       <div key={debt.id} className="flex justify-between items-center p-5 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                           <div>
                               <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{debt.title}</h3>
                               <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Atlikums: <span className="font-bold" style={{ color: 'var(--danger)' }}>{formatCurrency(debt.remainingAmount)}</span></p>
                           </div>
                           <div className="flex gap-2">
                                <button onClick={() => openPaymentModal(debt)} className="px-4 py-2 rounded-xl font-bold text-xs transition-colors" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Atmaksāt</button>
                                <button onClick={() => startEditing(debt)} className="px-2" style={{ color: 'var(--text-tertiary)' }}>✏️</button>
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      )}

      {activeDebts.length === 0 && !isFormOpen && (
        <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <p className="font-medium">Tev nav aktīvu parādu.</p>
        </div>
      )}

      {/* Paid History */}
      {paidDebts.length > 0 && (
        <div className="pt-8 mt-4" style={{ borderTop: '1px solid var(--border)' }}>
           <h3 className="text-xs font-bold uppercase mb-4 ml-2 tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Vēsture</h3>
           <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
             {paidDebts.map(debt => (
               <div key={debt.id} className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <span className="font-bold line-through text-sm" style={{ color: 'var(--text-secondary)' }}>{debt.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', color: 'var(--success)' }}>Nomaksāts</span>
                    <button onClick={() => startEditing(debt)} className="px-2" style={{ color: 'var(--text-tertiary)' }}>✏️</button>
                  </div>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setPayingDebt(null)}>
           <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Maksājums</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Parāds: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{payingDebt.title}</span></p>

              <form onSubmit={handleRepayment} className="space-y-5">
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Summa</label>
                    <input type="text" inputMode="decimal" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full text-4xl font-black p-2 bg-transparent outline-none" style={{ color: 'var(--accent-primary)', borderBottom: '2px solid var(--border-accent)' }} autoFocus />
                 </div>
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Datums</label>
                    <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-3 rounded-xl outline-none font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                 </div>
                 <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setPayingDebt(null)} className="flex-1 py-4 font-bold rounded-2xl transition-colors" style={{ color: 'var(--text-tertiary)' }}>Atcelt</button>
                    <button type="submit" className="flex-[2] font-bold py-4 rounded-2xl active:scale-95 transition-all" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}>Apstiprināt</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default DebtManager;
