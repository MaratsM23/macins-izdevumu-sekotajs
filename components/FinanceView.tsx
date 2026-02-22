
import React, { useState } from 'react';
import DebtManager from './DebtManager';
import SavingsView from './SavingsView';

const FinanceView: React.FC = () => {
  const [view, setView] = useState<'savings' | 'debts'>('savings');

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-display font-bold" style={{ color: 'var(--text-primary)' }}>Finanses</h2>
       </div>

       {/* Custom Toggle Switch */}
       <div className="p-1 rounded-2xl flex relative" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
          <div
             className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300 ease-out"
             style={{
               backgroundColor: 'var(--bg-elevated)',
               border: '1px solid var(--border-accent)',
               left: view === 'savings' ? '4px' : 'calc(50%)'
             }}
          ></div>
          <button
             onClick={() => setView('savings')}
             className="flex-1 relative z-10 py-2.5 text-sm font-bold rounded-xl transition-colors"
             style={{ color: view === 'savings' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}
          >
             Uzkrājumi
          </button>
          <button
             onClick={() => setView('debts')}
             className="flex-1 relative z-10 py-2.5 text-sm font-bold rounded-xl transition-colors"
             style={{ color: view === 'debts' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}
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
