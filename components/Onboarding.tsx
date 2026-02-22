import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, PieChart, Check, Sparkles } from 'lucide-react';
import { db, DEFAULT_CATEGORIES } from '../db';
import { getTodayStr } from '../utils';
import { useLiveQuery } from 'dexie-react-hooks';

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'welcome' | 'quickwin'>('welcome');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const categories = useLiveQuery(() =>
    db.categories.filter(c => !c.isArchived && !c.isInvestment).toArray()
  ) || [];

  // Pick top 6 everyday categories
  const quickCategories = categories
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
    .slice(0, 6);

  useEffect(() => {
    if (quickCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(quickCategories[0].id);
    }
  }, [quickCategories.length]);

  const handleSave = async () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0 || !selectedCategory) return;

    setSaving(true);
    try {
      await db.expenses.add({
        id: crypto.randomUUID(),
        amount: parsed,
        currency: 'EUR',
        date: getTodayStr(),
        categoryId: selectedCategory,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setDone(true);
      setTimeout(onComplete, 1600);
    } catch {
      setSaving(false);
    }
  };

  const features = [
    { icon: Wallet, text: 'Fiksē izdevumus sekundēs' },
    { icon: TrendingUp, text: 'Izseko budžetu reāllaikā' },
    { icon: PieChart, text: 'Saproti, kur aiziet nauda' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-lg mx-auto h-full flex flex-col">
        <AnimatePresence mode="wait">
          {/* ── STEP 1: WELCOME ── */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col items-center justify-center px-8"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mb-2"
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto" style={{
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  boxShadow: '0 8px 40px rgba(212, 168, 83, 0.3)',
                }}>
                  <span className="text-3xl font-display font-bold" style={{ color: 'var(--bg-primary)' }}>M</span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
                className="text-3xl font-display font-bold text-center mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                Sveiki <span style={{ color: 'var(--accent-primary)' }}>.</span>Maciņā
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-center text-sm mb-10"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tavs personīgais finanšu palīgs
              </motion.p>

              {/* Feature highlights */}
              <div className="w-full space-y-3 mb-12">
                {features.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.45 + i * 0.1 }}
                    className="flex items-center gap-4 px-5 py-4 rounded-xl"
                    style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                      backgroundColor: 'var(--accent-glow)',
                      border: '1px solid var(--border-accent)',
                    }}>
                      <f.icon size={18} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full space-y-3"
              >
                <button
                  onClick={() => setStep('quickwin')}
                  className="w-full font-bold py-4 px-6 rounded-xl active:scale-[0.97] transition-all"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 24px rgba(212, 168, 83, 0.35)',
                  }}
                >
                  Sākt
                </button>
                <button
                  onClick={onComplete}
                  className="w-full py-3 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Izlaist →
                </button>
              </motion.div>
            </motion.div>
          )}

          {/* ── STEP 2: QUICK WIN ── */}
          {step === 'quickwin' && !done && (
            <motion.div
              key="quickwin"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col px-6 pt-16 pb-8"
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: 'var(--accent-glow)', border: '1px solid var(--border-accent)' }}
                >
                  <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                </motion.div>
                <h2 className="text-2xl font-display font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Pievieno pirmo izdevumu
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Sāksim ar šodienas pirkumu — tas aizņems 5 sekundes
                </p>
              </div>

              {/* Amount input */}
              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Summa
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold" style={{ color: 'var(--text-tertiary)' }}>€</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full pl-10 pr-4 py-4 rounded-xl text-2xl font-bold outline-none transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      caretColor: 'var(--accent-primary)',
                    }}
                    onFocus={e => (e.target.style.borderColor = 'var(--border-accent)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              </div>

              {/* Category picker */}
              <div className="mb-8 flex-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>
                  Kategorija
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {quickCategories.map((cat, i) => {
                    const isActive = selectedCategory === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15 + i * 0.05 }}
                        onClick={() => setSelectedCategory(cat.id)}
                        className="flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl transition-all active:scale-95"
                        style={{
                          backgroundColor: isActive ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                          border: `1px solid ${isActive ? 'var(--border-accent)' : 'var(--border)'}`,
                          boxShadow: isActive ? '0 0 20px rgba(212, 168, 83, 0.1)' : 'none',
                        }}
                      >
                        <span className="text-2xl">{cat.icon || '📦'}</span>
                        <span className="text-[10px] font-bold tracking-wide truncate w-full text-center" style={{
                          color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        }}>
                          {cat.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 mt-auto">
                <button
                  onClick={handleSave}
                  disabled={saving || !amount || parseFloat(amount.replace(',', '.')) <= 0}
                  className="w-full font-bold py-4 px-6 rounded-xl active:scale-[0.97] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--bg-primary)',
                    boxShadow: '0 4px 24px rgba(212, 168, 83, 0.35)',
                  }}
                >
                  {saving ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-5 h-5 border-2 rounded-full" style={{ borderColor: 'var(--bg-primary)', borderTopColor: 'transparent' }} />
                  ) : (
                    <>
                      <Check size={18} strokeWidth={3} />
                      Saglabāt
                    </>
                  )}
                </button>
                <button
                  onClick={onComplete}
                  className="w-full py-3 text-sm font-medium transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Izlaist →
                </button>
              </div>
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {done && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="flex-1 flex flex-col items-center justify-center px-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--success), #22c55e)',
                  boxShadow: '0 8px 40px rgba(74, 222, 128, 0.3)',
                }}
              >
                <Check size={36} strokeWidth={3} color="#fff" />
              </motion.div>

              <motion.h2
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-display font-bold mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Lieliski!
              </motion.h2>
              <motion.p
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tavs pirmais ieraksts ir saglabāts. Laipni lūgts Maciņā!
              </motion.p>

              {/* Decorative particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1,
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                  }}
                  transition={{ duration: 1, delay: 0.1 + i * 0.05 }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: i % 2 === 0 ? 'var(--accent-primary)' : 'var(--success)',
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
