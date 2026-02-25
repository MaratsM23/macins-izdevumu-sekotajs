
import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, getTodayStr, parseAmount } from '../utils';
import { Category } from '../types';

interface SavingsBalance {
  deposited: number;
  withdrawn: number;
  current: number;
  progress: number;
}

const SavingsView: React.FC = () => {
  // --- View State ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Category | null>(null);

  // --- Form State ---
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formInitial, setFormInitial] = useState('');
  const [formArchived, setFormArchived] = useState(false);

  // --- Withdrawal Modal State ---
  const [withdrawForm, setWithdrawForm] = useState<{
    categoryId: string;
    categoryName: string;
    amount: string;
    date: string;
    maxAmount: number;
  } | null>(null);

  // 1. Get Investment Categories
  const categories = useLiveQuery(() => 
    db.categories
      .filter(c => !!c.isInvestment)
      .toArray()
  ) || [];

  const activeCategories = categories.filter(c => !c.isArchived).sort((a, b) => a.name.localeCompare(b.name));
  const archivedCategories = categories.filter(c => c.isArchived);

  // 2. Calculate Balances
  const balances = useLiveQuery<Record<string, SavingsBalance>>(async () => {
    if (categories.length === 0) return {};
    
    const bal: Record<string, SavingsBalance> = {};
    
    // Process each savings category
    for (const cat of categories) {
      // Deposits = Expenses in this category
      const expenses = await db.expenses.where('categoryId').equals(cat.id).toArray();
      const deposited = expenses.reduce((sum, e) => sum + e.amount, 0);

      // Withdrawals = Incomes linked to this category via sourceCategoryId
      const incomes = await db.incomes.where('sourceCategoryId').equals(cat.id).toArray();
      const withdrawn = incomes.reduce((sum, i) => sum + i.amount, 0);

      const initial = cat.initialBalance || 0;
      const current = initial + deposited - withdrawn;
      
      let progress = 0;
      if (cat.targetAmount && cat.targetAmount > 0) {
        progress = Math.min(100, Math.max(0, (current / cat.targetAmount) * 100));
      }

      bal[cat.id] = {
        deposited,
        withdrawn,
        current,
        progress
      };
    }
    return bal;
  }, [categories]);

  // --- Actions ---

  const openForm = (account: Category | null = null) => {
    if (account) {
      setEditingAccount(account);
      setFormName(account.name);
      setFormDesc(account.description || '');
      setFormTarget(account.targetAmount ? account.targetAmount.toString() : '');
      setFormInitial(account.initialBalance ? account.initialBalance.toString() : '');
      setFormArchived(account.isArchived);
    } else {
      setEditingAccount(null);
      setFormName('');
      setFormDesc('');
      setFormTarget('');
      setFormInitial('');
      setFormArchived(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
  };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const data = {
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      targetAmount: parseAmount(formTarget),
      initialBalance: parseAmount(formInitial),
      isInvestment: true,
      isArchived: formArchived,
      updatedAt: Date.now()
    };

    try {
      if (editingAccount) {
        await db.categories.update(editingAccount.id, data);
      } else {
        await db.categories.add({
          id: crypto.randomUUID(),
          ...data,
          createdAt: Date.now()
        });
      }
      closeForm();
    } catch (err) {
      console.error(err);
      alert('Kļūda saglabājot kontu.');
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawForm) return;

    const amount = parseAmount(withdrawForm.amount);
    if (amount <= 0) {
        alert("Summai jābūt lielākai par 0");
        return;
    }
    if (amount > withdrawForm.maxAmount) {
        alert("Nepietiek līdzekļu šajā kontā!");
        return;
    }

    try {
        const incomeCats = await db.incomeCategories.toArray();
        const targetIncomeCat = incomeCats.find(c => c.name === 'Citi') || incomeCats[0];
        if (!targetIncomeCat) {
            alert('Nav pieejamu ienākumu kategoriju. Izveidojiet vismaz vienu kategoriju iestatījumos.');
            return;
        }

        await db.incomes.add({
            id: crypto.randomUUID(),
            amount,
            currency: 'EUR',
            date: withdrawForm.date,
            categoryId: targetIncomeCat.id,
            sourceCategoryId: withdrawForm.categoryId,
            note: `Izņemts no: ${withdrawForm.categoryName}`,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        
        setWithdrawForm(null);
    } catch (err) {
        console.error(err);
        alert("Kļūda saglabājot izmaksu");
    }
  };

  const totalSaved = balances ? Object.values(balances).reduce((sum, b) => sum + b.current, 0) : 0;

  return (
    <div className="space-y-6 pb-8">
      
      {/* Header & Total */}
      <div className="flex justify-between items-center px-1">
         <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Kopējie Uzkrājumi</p>
            <p className="text-3xl font-black text-stone-800 tracking-tight">{formatCurrency(totalSaved)}</p>
         </div>
         <button 
           onClick={() => openForm()}
           className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all text-sm"
         >
           + Jauns Konts
         </button>
      </div>

      {/* Account List */}
      <div className="space-y-4">
        {activeCategories.map(cat => {
            const stats = balances?.[cat.id] || { deposited: 0, withdrawn: 0, current: 0, progress: 0 };
            return (
                <div key={cat.id} className="bg-white p-5 rounded-[1.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <h4 className="font-bold text-lg text-stone-800 leading-tight">{cat.name}</h4>
                            {cat.description && <p className="text-xs text-stone-400 font-medium">{cat.description}</p>}
                        </div>
                        <button 
                          onClick={() => openForm(cat)}
                          className="text-stone-300 hover:text-stone-500 p-1"
                        >
                          ✏️
                        </button>
                    </div>

                    <div className="mb-4 relative z-10">
                        <p className="text-2xl font-black text-blue-600 tracking-tight">{formatCurrency(stats.current)}</p>
                        {cat.targetAmount ? (
                           <div className="flex justify-between items-end mt-1">
                              <p className="text-[10px] font-bold text-stone-400 uppercase">Mērķis: {formatCurrency(cat.targetAmount)}</p>
                              <p className="text-[10px] font-bold text-blue-500">{Math.round(stats.progress)}%</p>
                           </div>
                        ) : (
                           <p className="text-[10px] font-bold text-stone-400 uppercase mt-1">Nav mērķa</p>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden mb-4 relative z-10">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000" 
                          style={{ width: `${cat.targetAmount ? stats.progress : (stats.current > 0 ? 100 : 0)}%` }}
                        ></div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 relative z-10">
                        <button 
                            onClick={() => {
                                setWithdrawForm({
                                    categoryId: cat.id,
                                    categoryName: cat.name,
                                    amount: '',
                                    date: getTodayStr(),
                                    maxAmount: stats.current
                                });
                            }}
                            disabled={stats.current <= 0}
                            className="flex-1 bg-stone-50 text-stone-600 py-2.5 rounded-xl font-bold text-xs hover:bg-white hover:shadow-md transition-all disabled:opacity-50 border border-transparent hover:border-stone-100"
                        >
                            Izņemt
                        </button>
                    </div>
                </div>
            );
        })}

        {activeCategories.length === 0 && (
            <div className="text-center py-12 bg-stone-50 rounded-[2rem] border-2 border-dashed border-stone-200">
                <p className="text-stone-400 font-bold mb-2">Nav aktīvu krājkontu</p>
                <button onClick={() => openForm()} className="text-blue-600 text-sm font-bold hover:underline">
                  Izveidot jaunu
                </button>
            </div>
        )}
      </div>

      {/* Archived Section */}
      {archivedCategories.length > 0 && (
         <div className="pt-8 border-t border-stone-100">
            <h3 className="text-xs font-bold text-stone-300 uppercase mb-4 pl-2 tracking-widest">Arhīvs / Pabeigtie</h3>
            <div className="space-y-2 opacity-60">
               {archivedCategories.map(cat => {
                 const stats = balances?.[cat.id] || { current: 0 };
                 return (
                   <div key={cat.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div>
                        <span className="font-bold text-stone-500 text-sm">{cat.name}</span>
                        <p className="text-[10px] text-stone-400">Atlikums: {formatCurrency(stats.current)}</p>
                      </div>
                      <button onClick={() => openForm(cat)} className="text-stone-300 hover:text-stone-500 px-2">✏️</button>
                   </div>
                 );
               })}
            </div>
         </div>
      )}

      {/* Account Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animation-fade-in" onClick={closeForm}>
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-stone-800 mb-4">
                {editingAccount ? 'Rediģēt Kontu' : 'Jauns Krājkonts'}
              </h3>
              
              <form onSubmit={saveAccount} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Nosaukums</label>
                    <input 
                      type="text" required placeholder="Piem. Ceļojums"
                      value={formName} onChange={e => setFormName(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 font-bold text-stone-700"
                      autoFocus
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Apraksts (neobligāti)</label>
                    <input 
                      type="text" placeholder="Krājam Itālijai..."
                      value={formDesc} onChange={e => setFormDesc(e.target.value)}
                      className="w-full p-3 bg-stone-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 text-sm font-medium"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Mērķa Summa</label>
                        <input 
                        type="text" inputMode="decimal" placeholder="0.00"
                        value={formTarget} onChange={e => setFormTarget(e.target.value)}
                        className="w-full p-3 bg-stone-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 font-bold text-stone-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Sākuma Bilance</label>
                        <input 
                        type="text" inputMode="decimal" placeholder="0.00"
                        value={formInitial} onChange={e => setFormInitial(e.target.value)}
                        className="w-full p-3 bg-stone-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-200 font-bold text-stone-700"
                        />
                    </div>
                 </div>

                 {editingAccount && (
                    <div className="pt-2">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formArchived} 
                            onChange={e => setFormArchived(e.target.checked)}
                            className="w-5 h-5 accent-stone-600 rounded"
                          />
                          <span className="text-sm font-bold text-stone-500">Arhivēt / Pabeigts</span>
                       </label>
                    </div>
                 )}

                 <div className="flex gap-3 pt-3">
                    <button 
                      type="button" onClick={closeForm}
                      className="flex-1 py-3 text-stone-400 font-bold hover:bg-stone-50 rounded-xl transition-colors"
                    >
                      Atcelt
                    </button>
                    <button 
                      type="submit"
                      className="flex-[2] bg-stone-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-stone-900 active:scale-95 transition-all"
                    >
                      Saglabāt
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {withdrawForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-md animation-fade-in" onClick={() => setWithdrawForm(null)}>
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6" onClick={e => e.stopPropagation()}>
               <h3 className="text-xl font-bold text-stone-800 mb-1">Izņemt naudu</h3>
               <p className="text-sm text-stone-500 mb-6">No konta: <span className="font-bold text-stone-700">{withdrawForm.categoryName}</span></p>
               
               <form onSubmit={handleWithdraw} className="space-y-5">
                  <div>
                     <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Summa (Max {formatCurrency(withdrawForm.maxAmount)})</label>
                     <input 
                       type="text" inputMode="decimal"
                       value={withdrawForm.amount}
                       onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                       className="w-full text-4xl font-black p-2 border-b-2 border-stone-100 focus:border-blue-500 outline-none text-stone-800 bg-transparent"
                       autoFocus
                     />
                  </div>
                  
                  <div>
                     <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Datums</label>
                     <input 
                       type="date"
                       value={withdrawForm.date}
                       onChange={e => setWithdrawForm({...withdrawForm, date: e.target.value})}
                       className="w-full p-3 bg-stone-50 rounded-xl border-none outline-none font-medium text-stone-600"
                     />
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-xl text-xs text-blue-800 font-medium">
                     ℹ️ Šī summa parādīsies Tavā bilancē kā pieejamie līdzekļi (ienākums).
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button 
                       type="button" 
                       onClick={() => setWithdrawForm(null)}
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

export default SavingsView;
