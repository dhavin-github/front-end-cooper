'use client';
import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getEvent, addParticipant, fundPool, createPayment, confirmPayment, addExpense } from '@/lib/api';
import {
    Users, Wallet, Receipt, ArrowLeft, Plus,
    DollarSign, UserPlus, CheckCircle, AlertCircle, Loader2, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [eventId, setEventId] = useState<string | null>(null);

    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showFund, setShowFund] = useState(false);
    const [showExpense, setShowExpense] = useState(false);
    const [showAddUser, setShowAddUser] = useState(false);

    // Payment States
    type PaymentStatus = 'idle' | 'initiating' | 'pending' | 'confirming' | 'success' | 'error';
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
    const [paymentMessage, setPaymentMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [fundAmount, setFundAmount] = useState('');
    const [fundUser, setFundUser] = useState('');

    const [expDesc, setExpDesc] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expSplits, setExpSplits] = useState<number[]>([]);

    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');

    useEffect(() => {
        params.then(p => {
            setEventId(p.id);
            fetchEvent(p.id);
        });
    }, [params]);

    // Check for pending payments on load
    useEffect(() => {
        if (!eventId) return;
        const pendingIntent = localStorage.getItem('pending_payment_intent');
        const pendingEventId = localStorage.getItem('pending_event_id');

        if (pendingIntent && pendingEventId === eventId) {
            setPaymentStatus('confirming');
            verifyPayment(pendingIntent);
        }
    }, [eventId]);

    const verifyPayment = async (intentId: string) => {
        try {
            const res = await confirmPayment({ intentId, eventId });
            if (res.success) {
                // Success
                localStorage.removeItem('pending_payment_intent');
                localStorage.removeItem('pending_event_id');
                setPaymentStatus('success');
                setPaymentMessage(`Payment confirmed! Pool balance updated by $${res.amount}`);
                fetchEvent(eventId!);

                // Auto-hide success message after 5 seconds
                setTimeout(() => setPaymentStatus('idle'), 5000);
            } else if (res.message === 'Already processed') {
                localStorage.removeItem('pending_payment_intent');
                localStorage.removeItem('pending_event_id');
                setPaymentStatus('idle');
            }
        } catch (err) {
            console.error('Payment verification failed', err);
            setPaymentStatus('error');
            setPaymentMessage('Payment confirmation failed. Please try again.');
        }
    };

    const fetchEvent = async (id: string) => {
        try {
            const data = await getEvent(id);
            setEvent(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId) return;
        try {
            await addParticipant(eventId, { name: newUserName, email: newUserEmail });
            setShowAddUser(false);
            setNewUserName('');
            setNewUserEmail('');
            fetchEvent(eventId);
        } catch (err) {
            alert('Failed to add user');
        }
    };

    // Unified Payment Function for all payment types
    const initiatePayment = async (paymentData: {
        amount: number;
        userId: number;
        type: 'FUND_POOL' | 'PAY_EXPENSE' | 'REFUND_USER';
        description: string;
    }) => {
        if (!eventId) return;

        setIsSubmitting(true);
        setPaymentStatus('initiating');
        setPaymentMessage(`Redirecting to payment...`);

        try {
            console.log(`[Payment] Initiating ${paymentData.type}:`, paymentData);

            const res = await createPayment({
                amount: paymentData.amount,
                eventId: eventId,
                userId: paymentData.userId,
                type: paymentData.type
            });

            console.log('[Payment] Response received:', res);

            if (res.intentId) {
                // Store intent for confirmation on return
                localStorage.setItem('pending_payment_intent', res.intentId);
                localStorage.setItem('pending_event_id', eventId);
                localStorage.setItem('pending_payment_type', paymentData.type);
                console.log('[Payment] Stored intentId:', res.intentId);

                if (res.paymentUrl) {
                    console.log('[Payment] Redirecting to:', res.paymentUrl);

                    // Close any open modals
                    setShowFund(false);
                    setShowExpense(false);

                    setPaymentStatus('pending');
                    setPaymentMessage(`Complete payment in the new tab`);

                    // Open payment in new tab
                    window.open(res.paymentUrl, '_blank');
                } else {
                    setPaymentStatus('error');
                    setPaymentMessage('Payment URL not received from server');
                }
            } else {
                console.error('[Payment] No intentId in response:', res);
                setPaymentStatus('error');
                setPaymentMessage('Payment initialization failed');
            }
        } catch (err) {
            console.error('[Payment] Error:', err);
            setPaymentStatus('error');
            setPaymentMessage('Payment failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFund = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId) return;

        // Clear form
        const amount = Number(fundAmount);
        const userId = Number(fundUser);
        setFundAmount('');
        setFundUser('');

        // Use unified payment function
        await initiatePayment({
            amount,
            userId,
            type: 'FUND_POOL',
            description: `Fund Pool for Event ${eventId}`
        });
    };

    const handleExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventId) return;
        if (expSplits.length === 0) {
            alert('Select at least one participant');
            return;
        }

        // Get current user from localStorage
        const userData = localStorage.getItem('user');
        if (!userData) {
            alert('User not found');
            return;
        }
        const user = JSON.parse(userData);

        // Store expense details for later processing
        const amount = Number(expAmount);
        const description = expDesc;
        const splits = [...expSplits];

        // Clear form
        setExpDesc('');
        setExpAmount('');
        setExpSplits([]);

        // Store expense metadata for processing after payment
        localStorage.setItem('pending_expense_data', JSON.stringify({
            description,
            amount,
            split_users: splits
        }));

        // Use Finternet payment gateway for expense
        await initiatePayment({
            amount,
            userId: user.id,
            type: 'PAY_EXPENSE',
            description: `Expense: ${description}`
        });
    };

    const toggleSplitUser = (uid: number) => {
        setExpSplits(prev => prev.includes(uid)
            ? prev.filter(id => id !== uid)
            : [...prev, uid]
        );
    };

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin h-10 w-10 text-blue-600" /></div>;
    if (!event) return <div className="p-20 text-center text-slate-500">Event not found</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">

            {/* Header */}
            <div>
                <Link href="/" className="text-slate-500 hover:text-blue-600 flex items-center gap-1 mb-4 text-sm font-medium transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{event.name}</h1>
                        <p className="text-slate-500 mt-1">{event.description || 'Shared event wallet'}</p>
                    </div>
                    <Link
                        href={`/events/${eventId}/settle`}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <CheckCircle className="h-5 w-5" />
                        Settle Event
                    </Link>
                </div>
            </div>

            {/* Payment Status Banner */}
            {paymentStatus !== 'idle' && (
                <div className={`rounded-xl p-4 flex items-center gap-3 shadow-lg animate-in slide-in-from-top duration-300 ${paymentStatus === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                    paymentStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                        paymentStatus === 'confirming' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                            'bg-amber-50 border border-amber-200 text-amber-800'
                    }`}>
                    {paymentStatus === 'success' && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
                    {paymentStatus === 'error' && <AlertCircle className="h-5 w-5 flex-shrink-0" />}
                    {(paymentStatus === 'initiating' || paymentStatus === 'confirming') && <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />}
                    {paymentStatus === 'pending' && <DollarSign className="h-5 w-5 flex-shrink-0" />}
                    <div className="flex-1">
                        <p className="font-semibold text-sm">
                            {paymentStatus === 'success' && '✓ Payment Successful'}
                            {paymentStatus === 'error' && '✗ Payment Error'}
                            {paymentStatus === 'initiating' && 'Initiating Payment...'}
                            {paymentStatus === 'confirming' && 'Confirming Payment...'}
                            {paymentStatus === 'pending' && 'Payment Pending'}
                        </p>
                        {paymentMessage && <p className="text-xs mt-0.5 opacity-90">{paymentMessage}</p>}
                    </div>
                    {paymentStatus !== 'initiating' && paymentStatus !== 'confirming' && (
                        <button
                            onClick={() => setPaymentStatus('idle')}
                            className="text-current opacity-60 hover:opacity-100 transition-opacity"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pool Balance Hero */}
                <div className="bg-white border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                    <p className="text-blue-700 font-semibold mb-1 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Wallet className="h-4 w-4" /> Pool Balance
                    </p>
                    <p className="text-5xl font-bold tracking-tight text-slate-900 mb-2">
                        ${event.pool_balance.toFixed(2)}
                    </p>
                    <p className="text-slate-600 text-sm">Available for expenses</p>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                    <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setShowFund(true)}
                            className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-100"
                        >
                            <DollarSign className="h-6 w-6 mb-2" />
                            <span className="font-semibold text-sm">Fund Pool</span>
                        </button>
                        <button
                            onClick={() => setShowExpense(true)}
                            className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors border border-slate-100"
                        >
                            <Receipt className="h-6 w-6 mb-2" />
                            <span className="font-semibold text-sm">Add Expense</span>
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-center space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Participants</p>
                                <p className="text-xl font-bold text-slate-900">{event.participants.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Expenses</p>
                                <p className="text-xl font-bold text-slate-900">{event.expenses.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Participants */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Participants</h2>
                        <button onClick={() => setShowAddUser(true)} className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            <Plus className="h-4 w-4" /> Add New
                        </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {event.participants.map((p: any) => (
                                <div key={p.id} className="p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                                        {p.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                                        <p className="text-xs text-slate-500">{p.email}</p>
                                    </div>
                                    <span className="ml-auto text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                        {p.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Transactions */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-bold text-slate-900">Transaction History</h2>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {event.transactions.length === 0 && (
                                <div className="p-12 text-center">
                                    <div className="bg-slate-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                                        <Receipt className="h-6 w-6" />
                                    </div>
                                    <p className="text-slate-500">No transactions recorded yet.</p>
                                </div>
                            )}
                            {event.transactions.map((txn: any) => (
                                <div key={txn.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${txn.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-600' :
                                            txn.type === 'REFUND' ? 'bg-blue-100 text-blue-600' :
                                                'bg-orange-100 text-orange-600'
                                            }`}>
                                            {txn.type === 'DEPOSIT' ? <ArrowUpRight className="h-5 w-5" /> :
                                                txn.type === 'REFUND' ? <ArrowDownLeft className="h-5 w-5" /> :
                                                    <ArrowUpRight className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{txn.description}</p>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-mono text-lg font-bold ${txn.type === 'DEPOSIT' ? 'text-emerald-600' :
                                            txn.type === 'REFUND' ? 'text-blue-600' :
                                                'text-slate-900'
                                            }`}>
                                            {txn.type === 'DEPOSIT' ? '+' : '-'}${txn.amount.toFixed(2)}
                                        </span>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{txn.type}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals - Cleaned UI */}
            {showFund && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Add Funds</h2>
                            <button onClick={() => setShowFund(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
                        </div>
                        <form onSubmit={handleFund} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-2">Participant</label>
                                <select
                                    className="w-full border-2 border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-900 font-medium"
                                    value={fundUser} onChange={e => setFundUser(e.target.value)} required
                                >
                                    <option value="">Select who is funding...</option>
                                    {event.participants.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-2">Amount</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-slate-700">$</span>
                                        <span className="text-sm font-semibold text-slate-500 uppercase">USD</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full border-2 border-slate-300 rounded-xl p-4 pl-24 pr-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-3xl font-bold text-slate-900"
                                        value={fundAmount}
                                        onChange={e => setFundAmount(e.target.value)}
                                        required
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">Enter the amount to add to the pool balance</p>
                            </div>
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <DollarSign className="h-5 w-5" />
                                            Deposit Funds
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showExpense && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add Expense</h2>
                            <button onClick={() => setShowExpense(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                <input
                                    type="text" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={expDesc} onChange={e => setExpDesc(e.target.value)} required placeholder="e.g. Dinner at Mario's"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount ($)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                                    <input
                                        type="number" step="0.01" className="w-full border border-slate-300 rounded-xl p-3 pl-7 focus:ring-2 focus:ring-orange-500 outline-none font-mono text-lg"
                                        value={expAmount} onChange={e => setExpAmount(e.target.value)} required placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Split Among</label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-slate-200 p-2 rounded-xl bg-slate-50">
                                    {event.participants.map((p: any) => (
                                        <label key={p.id} className={`flex items-center gap-3 text-sm cursor-pointer p-2 rounded-lg transition-all ${expSplits.includes(p.id) ? 'bg-orange-100 text-orange-800 ring-1 ring-orange-200' : 'hover:bg-slate-100'
                                            }`}>
                                            <input
                                                type="checkbox"
                                                checked={expSplits.includes(p.id)}
                                                onChange={() => toggleSplitUser(p.id)}
                                                className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4"
                                            />
                                            {p.name}
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-slate-500 mt-2 text-right">
                                    {expSplits.length > 0
                                        ? `~${(Number(expAmount || 0) / expSplits.length).toFixed(2)} per person`
                                        : 'Select participants to calculate split'
                                    }
                                </p>
                            </div>

                            <div className="pt-4">
                                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all">
                                    Pay Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddUser && (
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add Participant</h2>
                            <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
                                <input
                                    type="text" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUserName} onChange={e => setNewUserName(e.target.value)} required placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                                <input
                                    type="email" className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required placeholder="john@example.com"
                                />
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all">
                                    Add Participant
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
