
import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
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
import PrivacyPolicy from './components/PrivacyPolicy';
import Onboarding from './components/Onboarding';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [session, setSession] = useState<Session | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(!import.meta.env.VITE_SUPABASE_URL);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('macins_onboarding_done'));

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL) return;

    // Clean hash tokens from URL after Supabase processes them
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

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

  const completeOnboarding = () => {
    localStorage.setItem('macins_onboarding_done', '1');
    setShowOnboarding(false);
  };

  if ((session || isDemoMode) && showOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  if (!session && !isDemoMode) {
    return (
      <div className="flex flex-col min-h-screen max-w-lg mx-auto relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <header className="sticky top-0 z-20 px-6 py-4 flex justify-between items-end" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
          <h1 className="text-2xl font-display font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--accent-primary)' }}>.</span>Maciņš
          </h1>
        </header>
        {showPrivacy ? (
          <div className="flex-1 overflow-y-auto p-5">
            <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
          </div>
        ) : (
          <Auth onLoginSuccess={() => { }} onDemoMode={() => setIsDemoMode(true)} onShowPrivacy={() => setShowPrivacy(true)} />
        )}
      </div>
    );
  }

  const handleLogout = async () => {
    if (isDemoMode) {
      setIsDemoMode(false);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'add': return <AddExpenseForm key="add" onSaveSuccess={() => setActiveTab('history')} />;
      case 'history': return <HistoryView key="history" />;
      case 'finance': return <FinanceView key="finance" />;
      case 'reports': return <ReportsView key="reports" />;
      case 'settings': return <SettingsView key="settings" onLogout={handleLogout} isDemoMode={isDemoMode} userEmail={session?.user?.email} onShowPrivacy={() => setShowPrivacy(true)} />;
      default: return <AddExpenseForm key="default" onSaveSuccess={() => setActiveTab('history')} />;
    }
  };

  const navItems: { id: TabType; label: string }[] = [
    { id: 'add', label: 'Jauns' },
    { id: 'history', label: 'Vēsture' },
    { id: 'finance', label: 'Finanses' },
    { id: 'reports', label: 'Budžets' },
    { id: 'settings', label: 'Iestat.' },
  ];

  const Icons = {
    add: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
    history: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>,
    finance: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    reports: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>,
    settings: (active: boolean) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.115 1.115 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.212 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.115 1.115 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.115 1.115 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.581-.495.644-.869l.212-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  };

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header - Dark Luxury */}
      <header className="sticky top-0 z-40 px-6 py-4 flex justify-between items-end" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          <span style={{ color: 'var(--accent-primary)' }}>.</span>Maciņš
        </motion.h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--success)', boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)' }}></div>
            <span className="text-[9px] font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>SYNCED</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden hide-scrollbar pb-28">
        {showPrivacy ? (
          <div className="w-full h-full p-5">
            <PrivacyPolicy onBack={() => setShowPrivacy(false)} />
          </div>
        ) : (
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
        )}
      </main>

      {/* Bottom Navigation - Dark Luxury */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 z-30 max-w-lg mx-auto pointer-events-none">
        <nav className="rounded-2xl flex justify-around p-1.5 pointer-events-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.4)' }}>
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
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-xl -z-10"
                    style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <div className="mb-1 transition-colors duration-300" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>
                  {Icons[item.id as keyof typeof Icons](isActive)}
                </div>

                <span className="text-[9px] font-bold tracking-wider transition-all duration-300" style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-tertiary)', opacity: isActive ? 1 : 0.6 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <SpeedInsights />
      <Analytics />
    </div>
  );
};

export default App;
