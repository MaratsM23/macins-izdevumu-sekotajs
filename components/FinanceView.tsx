
import React, { useState } from 'react';
import DebtManager from './DebtManager';
import SavingsView from './SavingsView';

const FinanceView: React.FC = () => {
  const [view, setView] = useState<'savings' | 'debts'>('savings');

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-bold text-stone-800">Finanses</h2>
       </div>

       {/* Custom Toggle Switch */}
       <div className="bg-stone-200/50 p-1 rounded-2xl flex relative">
          <div 
             className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${view === 'savings' ? 'left-1' : 'left-[calc(50%)]'}`}
          ></div>
          <button 
             onClick={() => setView('savings')}
             className={`flex-1 relative z-10 py-2.5 text-sm font-bold rounded-xl transition-colors ${view === 'savings' ? 'text-stone-800' : 'text-stone-500 hover:text-stone-600'}`}
          >
             Uzkrājumi
          </button>
          <button 
             onClick={() => setView('debts')}
             className={`flex-1 relative z-10 py-2.5 text-sm font-bold rounded-xl transition-colors ${view === 'debts' ? 'text-stone-800' : 'text-stone-500 hover:text-stone-600'}`}
          >
             Parādi
          </button>
       </div>

       <div className="animation-fade-in">
          {view === 'savings' ? <SavingsView /> : <DebtManager />}
       </div>
    </div>
  );
};

export default FinanceView;
