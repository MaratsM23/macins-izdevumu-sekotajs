import React, { useState } from 'react';
import { supabase } from '../supabase';

interface AuthProps {
    onLoginSuccess: () => void;
    onDemoMode?: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess, onDemoMode }) => {
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
            <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100">
                <h2 className="text-2xl font-black text-center mb-6 text-stone-800">
                    {isRegistering ? 'Izveidot Kontu' : 'Pieslēgties'}
                </h2>

                {message && (
                    <div className={`p-3 mb-4 text-sm font-medium rounded-xl text-center ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">E-pasts</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="vards@epasts.lv"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Parole</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl disabled:bg-stone-300 disabled:cursor-not-allowed hover:bg-stone-900 active:scale-95 transition-all shadow-md shadow-stone-300"
                    >
                        {loading ? 'Lūdzu uzgaidiet...' : (isRegistering ? 'Reģistrēties' : 'Pieslēgties')}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setMessage(null);
                        }}
                        className="text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors mb-6 block w-full"
                    >
                        {isRegistering ? 'Jau ir konts? Pieslēdzies' : 'Nav konta? Reģistrējies'}
                    </button>

                    {onDemoMode && (
                        <div className="border-t border-stone-100 pt-5">
                            <button
                                onClick={onDemoMode}
                                type="button"
                                className="w-full bg-stone-50 border border-stone-200 text-stone-600 font-bold py-3.5 px-4 rounded-xl hover:bg-stone-100 hover:text-stone-800 transition-all flex items-center justify-center gap-2"
                            >
                                <span>👀</span> Pārbaudīt Bez Reģistrācijas (Demo)
                            </button>
                            <p className="text-[10px] text-stone-400 mt-2">Ja saskaraties ar Supabase rate limitiem, izmantojiet šo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Auth;
