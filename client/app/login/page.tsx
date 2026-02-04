'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, requestOtp, verifyOtp } from '@/lib/api';
import { Wallet, Loader2, Mail, Lock, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);

    // UI States
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await login({ email, password });
            handleAuthSuccess(res);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Please enter your email');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await requestOtp({ email });
            setOtpSent(true);
            setSuccessMsg(res.message || 'OTP sent! Check server console.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp) {
            setError('Please enter the OTP');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await verifyOtp({ email, otp });
            handleAuthSuccess(res);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleAuthSuccess = (res: any) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        router.push('/');
    };

    const toggleMode = (newMode: 'PASSWORD' | 'OTP') => {
        setMode(newMode);
        setError('');
        setSuccessMsg('');
        setOtpSent(false);
        setOtp('');
        setPassword('');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-200">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-3">
                        <Wallet className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500">Sign in to Cooper</p>
                </div>

                {/* Toggle */}
                <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => toggleMode('PASSWORD')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'PASSWORD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Password
                    </button>
                    <button
                        onClick={() => toggleMode('OTP')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${mode === 'OTP' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        OTP / Magic Link
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg mb-4 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                        {successMsg}
                    </div>
                )}

                {mode === 'PASSWORD' ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-10 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="password"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-10 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin h-5 w-5" />}
                            Sign In
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                <input
                                    type="email"
                                    className="w-full border border-slate-300 rounded-lg p-2.5 pl-10 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com"
                                    disabled={otpSent}
                                />
                            </div>
                        </div>

                        {otpSent && (
                            <div className="animate-in fade-in slide-in-from-top-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Enter OTP</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full border border-slate-300 rounded-lg p-2.5 pl-10 outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-lg tracking-widest"
                                        value={otp} onChange={e => setOtp(e.target.value)} required placeholder="123456"
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={otpSent ? handleVerifyOtp : handleRequestOtp}
                            disabled={loading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin h-5 w-5" />}
                            {otpSent ? 'Verify & Login' : 'Send Login Code'}
                        </button>

                        {otpSent && (
                            <button
                                onClick={() => { setOtpSent(false); setOtp(''); }}
                                className="w-full text-sm text-slate-500 hover:text-slate-700"
                            >
                                Use a different email
                            </button>
                        )}
                    </div>
                )}

                <p className="mt-6 text-center text-sm text-slate-500">
                    Don't have an account? <Link href="/register" className="text-emerald-600 hover:underline font-medium">Create one</Link>
                </p>
            </div>
        </div>
    );
}
