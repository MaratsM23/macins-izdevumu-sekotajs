
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formInitial, setFormInitial] = useState('');
  const [formArchived, setFormArchived] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState<{
    categoryId: string; categoryName: string; amount: string; date: string; maxAmount: number;
  } | null>(null);

  const categories = useLiveQuery(() =>
    db.categories.filter(c => !!c.isInvestment).toArray()
  ) || [];

  const activeCategories = categories.filter(c => !c.isArchived).sort((a, b) => a.name.localeCompare(b.name));
  const archivedCategories = categories.filter(c => c.isArchived);

  const balances = useLiveQuery<Record<string, SavingsBalance>>(async () => {
    if (categories.length === 0) return {};
    const bal: Record<string, SavingsBalance> = {};
    for (const cat of categories) {
      const expenses = await db.expenses.where('categoryId').equals(cat.id).toArray();
      const deposited = expenses.reduce((sum, e) => sum + e.amount, 0);
      const incomes = await db.incomes.where('sourceCategoryId').equals(cat.id).toArray();
      const withdrawn = incomes.reduce((sum, i) => sum + i.amount, 0);
      const initial = cat.initialBalance || 0;
      const current = initial + deposited - withdrawn;
      let progress = 0;
      if (cat.targetAmount && cat.targetAmount > 0) {
        progress = Math.min(100, Math.max(0, (current / cat.targetAmount) * 100));
      }
      bal[cat.id] = { deposited, withdrawn, current, progress };
    }
    return bal;
  }, [categories]);

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
      setFormName(''); setFormDesc(''); setFormTarget(''); setFormInitial(''); setFormArchived(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => { setIsFormOpen(false); setEditingAccount(null); };

  const saveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const data = {
      name: formName.trim(), description: formDesc.trim() || undefined,
      targetAmount: parseAmount(formTarget), initialBalance: parseAmount(formInitial),
      isInvestment: true, isArchived: formArchived, updatedAt: Date.now()
    };
    try {
      if (editingAccount) { await db.categories.update(editingAccount.id, data); }
      else { await db.categories.add({ id: crypto.randomUUID(), ...data, createdAt: Date.now() }); }
      closeForm();
    } catch (err) { console.error(err); alert('Kļūda saglabājot kontu.'); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawForm) return;
    const amount = parseAmount(withdrawForm.amount);
    if (amount <= 0) { alert("Summai jābūt lielākai par 0"); return; }
    if (amount > withdrawForm.maxAmount) { alert("Nepietiek līdzekļu šajā kontā!"); return; }
    try {
      const incomeCats = await db.incomeCategories.toArray();
      let targetIncomeCat = incomeCats.find(c => c.name === 'Citi') || incomeCats[0];
      await db.incomes.add({
        id: crypto.randomUUID(), amount, currency: 'EUR', date: withdrawForm.date,
        categoryId: targetIncomeCat.id, sourceCategoryId: withdrawForm.categoryId,
        note: `Izņemts no: ${withdrawForm.categoryName}`, createdAt: Date.now(), updatedAt: Date.now()
      });
      setWithdrawForm(null);
    } catch (err) { console.error(err); alert("Kļūda saglabājot izmaksu"); }
  };

  const totalSaved = balances ? Object.values(balances).reduce((sum, b) => sum + b.current, 0) : 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex justify-between items-center px-1">
         <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Kopējie Uzkrājumi</p>
            <p className="text-3xl font-black tracking-tight" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(totalSaved)}</p>
         </div>
         <button
           onClick={() => openForm()}
           className="px-4 py-2 rounded-xl font-bold active:scale-95 transition-all text-sm"
           style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: 'var(--info)', border: '1px solid rgba(96, 165, 250, 0.2)' }}
         >
           + Jauns Konts
         </button>
      </div>

      <div className="space-y-4">
        {activeCategories.map(cat => {
            const stats = balances?.[cat.id] || { deposited: 0, withdrawn: 0, current: 0, progress: 0 };
            return (
                <div key={cat.id} className="p-5 rounded-2xl relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                            <h4 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-primary)' }}>{cat.name}</h4>
                            {cat.description && <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{cat.description}</p>}
                        </div>
                        <button onClick={() => openForm(cat)} className="p-1" style={{ color: 'var(--text-tertiary)' }}>✏️</button>
                    </div>

                    <div className="mb-4 relative z-10">
                        <p className="text-2xl font-black tracking-tight" style={{ color: 'var(--info)' }}>{formatCurrency(stats.current)}</p>
                        {cat.targetAmount ? (
                           <div className="flex justify-between items-end mt-1">
                              <p className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-tertiary)' }}>Mērķis: {formatCurrency(cat.targetAmount)}</p>
                              <p className="text-[10px] font-bold" style={{ color: 'var(--info)' }}>{Math.round(stats.progress)}%</p>
                           </div>
                        ) : (
                           <p className="text-[10px] font-bold uppercase mt-1" style={{ color: 'var(--text-tertiary)' }}>Nav mērķa</p>
                        )}
                    </div>

                    <div className="h-2 w-full rounded-full overflow-hidden mb-4 relative z-10" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{ width: `${cat.targetAmount ? stats.progress : (stats.current > 0 ? 100 : 0)}%`, background: 'linear-gradient(to right, #60a5fa, #818cf8)' }}
                        ></div>
                    </div>

                    <div className="flex gap-2 relative z-10">
                        <button
                            onClick={() => {
                                setWithdrawForm({ categoryId: cat.id, categoryName: cat.name, amount: '', date: getTodayStr(), maxAmount: stats.current });
                            }}
                            disabled={stats.current <= 0}
                            className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-30"
                            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                        >
                            Izņemt
                        </button>
                    </div>
                </div>
            );
        })}

        {activeCategories.length === 0 && (
            <div className="text-center py-12 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '2px dashed var(--border)' }}>
                <p className="font-bold mb-2" style={{ color: 'var(--text-tertiary)' }}>Nav aktīvu krājkontu</p>
                <button onClick={() => openForm()} className="text-sm font-bold" style={{ color: 'var(--info)' }}>Izveidot jaunu</button>
            </div>
        )}
      </div>

      {archivedCategories.length > 0 && (
         <div className="pt-8" style={{ borderTop: '1px solid var(--border)' }}>
            <h3 className="text-xs font-bold uppercase mb-4 pl-2 tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Arhīvs / Pabeigtie</h3>
            <div className="space-y-2 opacity-60">
               {archivedCategories.map(cat => {
                 const stats = balances?.[cat.id] || { current: 0 };
                 return (
                   <div key={cat.id} className="flex justify-between items-center p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                      <div>
                        <span className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Atlikums: {formatCurrency(stats.current)}</p>
                      </div>
                      <button onClick={() => openForm(cat)} className="px-2" style={{ color: 'var(--text-tertiary)' }}>✏️</button>
                   </div>
                 );
               })}
            </div>
         </div>
      )}

      {/* Account Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={closeForm}>
           <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                {editingAccount ? 'Rediģēt Kontu' : 'Jauns Krājkonts'}
              </h3>

              <form onSubmit={saveAccount} className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Nosaukums</label>
                    <input type="text" required placeholder="Piem. Ceļojums" value={formName} onChange={e => setFormName(e.target.value)} className="w-full p-3 rounded-xl outline-none font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} autoFocus />
                 </div>
                 <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Apraksts (neobligāti)</label>
                    <input type="text" placeholder="Krājam Itālijai..." value={formDesc} onChange={e => setFormDesc(e.target.value)} className="w-full p-3 rounded-xl outline-none text-sm font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Mērķa Summa</label>
                        <input type="text" inputMode="decimal" placeholder="0.00" value={formTarget} onChange={e => setFormTarget(e.target.value)} className="w-full p-3 rounded-xl outline-none font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-tertiary)' }}>Sākuma Bilance</label>
                        <input type="text" inputMode="decimal" placeholder="0.00" value={formInitial} onChange={e => setFormInitial(e.target.value)} className="w-full p-3 rounded-xl outline-none font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                 </div>
                 {editingAccount && (
                    <div className="pt-2">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={formArchived} onChange={e => setFormArchived(e.target.checked)} className="w-5 h-5 rounded" style={{ accentColor: 'var(--accent-primary)' }} />
                          <span className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>Arhivēt / Pabeigts</span>
                       </label>
                    </div>
                 )}
                 <div className="flex gap-3 pt-3">
                    <button type="button" onClick={closeForm} className="flex-1 py-3 font-bold rounded-xl transition-colors" style={{ color: 'var(--text-tertiary)' }}>Atcelt</button>
                    <button type="submit" className="flex-[2] font-bold py-3 rounded-xl active:scale-95 transition-all" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}>Saglabāt</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {withdrawForm && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setWithdrawForm(null)}>
            <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
               <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Izņemt naudu</h3>
               <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>No konta: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{withdrawForm.categoryName}</span></p>

               <form onSubmit={handleWithdraw} className="space-y-5">
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Summa (Max {formatCurrency(withdrawForm.maxAmount)})</label>
                     <input type="text" inputMode="decimal" value={withdrawForm.amount} onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})} className="w-full text-4xl font-black p-2 bg-transparent outline-none" style={{ color: 'var(--accent-primary)', borderBottom: '2px solid var(--border-accent)' }} autoFocus />
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>Datums</label>
                     <input type="date" value={withdrawForm.date} onChange={e => setWithdrawForm({...withdrawForm, date: e.target.value})} className="w-full p-3 rounded-xl outline-none font-medium" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="p-3 rounded-xl text-xs font-medium" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: 'var(--info)', border: '1px solid rgba(96, 165, 250, 0.2)' }}>
                     Šī summa parādīsies Tavā bilancē kā pieejamie līdzekļi (ienākums).
                  </div>
                  <div className="flex gap-3 pt-2">
                     <button type="button" onClick={() => setWithdrawForm(null)} className="flex-1 py-4 font-bold rounded-2xl transition-colors" style={{ color: 'var(--text-tertiary)' }}>Atcelt</button>
                     <button type="submit" className="flex-[2] font-bold py-4 rounded-2xl active:scale-95 transition-all" style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}>Apstiprināt</button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default SavingsView;
