import React, { useState } from 'react';
import { supabase } from '../supabase';

interface AuthProps {
    onLoginSuccess: () => void;
    onDemoMode?: () => void;
    onShowPrivacy?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onDemoMode, onShowPrivacy }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isRegistering) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Pārbaudiet savu e-pastu, lai apstiprinātu reģistrāciju!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onLoginSuccess();
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Radās kļūda' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-[70vh] px-4">
            <div className="w-full max-w-sm p-8 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <h2 className="text-2xl font-display font-bold text-center mb-6" style={{ color: 'var(--text-primary)' }}>
                    {isRegistering ? 'Izveidot Kontu' : 'Pieslēgties'}
                </h2>

                {message && (
                    <div className="p-3 mb-4 text-sm font-medium rounded-xl text-center" style={{
                        backgroundColor: message.type === 'error' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                        color: message.type === 'error' ? 'var(--danger)' : 'var(--success)',
                        border: `1px solid ${message.type === 'error' ? 'rgba(248, 113, 113, 0.2)' : 'rgba(74, 222, 128, 0.2)'}`
                    }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>E-pasts</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 rounded-xl outline-none transition-all"
                            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            placeholder="vards@epasts.lv"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>Parole</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded-xl outline-none transition-all"
                            style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full font-bold py-3.5 px-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
                        style={{ backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', boxShadow: '0 4px 20px rgba(212, 168, 83, 0.3)' }}
                    >
                        {loading ? 'Lūdzu uzgaidiet...' : (isRegistering ? 'Reģistrēties' : 'Pieslēgties')}
                    </button>

                    {isRegistering && (
                        <p className="text-[11px] text-center mt-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                            Reģistrējoties jūs piekrītat Maciņš{' '}
                            <button
                                type="button"
                                onClick={onShowPrivacy}
                                className="underline font-bold"
                                style={{ color: 'var(--accent-primary)' }}
                            >
                                Privātuma politikai
                            </button>.
                        </p>
                    )}
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setMessage(null);
                        }}
                        className="text-sm font-bold transition-colors mb-6 block w-full"
                        style={{ color: 'var(--accent-primary)' }}
                    >
                        {isRegistering ? 'Jau ir konts? Pieslēdzies' : 'Nav konta? Reģistrējies'}
                    </button>

                    {onDemoMode && (
                        <div className="pt-5" style={{ borderTop: '1px solid var(--border)' }}>
                            <button
                                onClick={onDemoMode}
                                type="button"
                                className="w-full font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                            >
                                Pārbaudīt Bez Reģistrācijas (Demo)
                            </button>
                            <p className="text-[10px] mt-2" style={{ color: 'var(--text-tertiary)' }}>Ja saskaraties ar Supabase rate limitiem, izmantojiet šo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
