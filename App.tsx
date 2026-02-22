
import React, { useState, useEffect } from 'react';
import { TabType } from './types';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import Auth from './components/Auth';
import AddExpenseForm from './components/AddExpenseForm';
import HistoryView from './components/History';
import ReportsView from './components/Reports';
import SettingsView from './components/Settings';
import FinanceView from './components/FinanceView';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [session, setSession] = useState<Session | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session && !isDemoMode) {
    return (
      <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-stone-50 shadow-2xl shadow-stone-200 relative">
        <header className="bg-stone-50/90 backdrop-blur-md sticky top-0 z-20 px-6 py-4 flex justify-between items-end border-b border-stone-100">
          <h1 className="text-2xl font-black tracking-tighter text-stone-800">
            <span className="text-orange-500">.</span>Maciņš
          </h1>
        </header>
        <Auth onLoginSuccess={() => { }} onDemoMode={() => setIsDemoMode(true)} />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'add': return <AddExpenseForm key="add" onSaveSuccess={() => setActiveTab('history')} />;
      case 'history': return <HistoryView key="history" />;
      case 'finance': return <FinanceView key="finance" />;
      case 'reports': return <ReportsView key="reports" />;
      case 'settings': return <SettingsView key="settings" />;
      default: return <AddExpenseForm key="default" onSaveSuccess={() => setActiveTab('history')} />;
    }
  };

  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'add', label: 'Jauns', icon: 'M' }, // Using a different visual or just the plus
    { id: 'history', label: 'Vēsture', icon: 'H' },
    { id: 'finance', label: 'Finanses', icon: 'P' },
    { id: 'reports', label: 'Budžets', icon: 'B' },
    { id: 'settings', label: 'Iestat.', icon: 'S' },
  ];

  // Custom icons for the warm theme (SVG)
  const Icons = {
    add: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
    history: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>,
    finance: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    reports: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>,
    settings: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.115 1.115 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.115 1.115 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.115 1.115 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.212-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  };

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-stone-50 shadow-2xl shadow-stone-200 relative">
      {/* Header - Minimalist Glassmorphism */}
      <header className="bg-white/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex justify-between items-end border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black tracking-tighter text-stone-800"
        >
          <span className="text-stone-400">.</span>Maciņš
        </motion.h1>
        <div className="flex items-center gap-3">
          {/* Small indicator of sync status */}
          <div className="flex items-center gap-1.5 bg-stone-100/50 px-2 py-1 rounded-full border border-white">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
            <span className="text-[9px] font-bold text-stone-500 tracking-wider">SYNCED</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden hide-scrollbar pb-28">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full h-full p-5"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation - Glassmorphism Floating styling */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-8 z-30 max-w-lg mx-auto pointer-events-none">
        <nav className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-3xl flex justify-around p-1.5 pointer-events-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (activeTab !== item.id && navigator.vibrate) navigator.vibrate(10);
                  setActiveTab(item.id);
                }}
                className="relative flex flex-col items-center flex-1 py-3 transition-all duration-300 active:scale-95 touch-manipulation group"
              >
                {/* Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-stone-800 rounded-2xl -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className={`mb-1 transition-colors duration-300 ${isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'}`}>
                  {Icons[item.id as keyof typeof Icons](isActive)}
                </div>

                <span className={`text-[9px] font-bold tracking-wider transition-all duration-300 ${isActive ? 'text-white opacity-100' : 'text-stone-400 opacity-60'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default App;
