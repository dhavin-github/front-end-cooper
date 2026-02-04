'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSettlement, executeRefunds } from '@/lib/api';
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle, Info, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function SettlePage({ params }: { params: Promise<{ id: string }> }) {
    const [eventId, setEventId] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refunding, setRefunding] = useState(false);

    useEffect(() => {
        params.then(p => {
            setEventId(p.id);
            fetchSettlement(p.id);
        });
    }, [params]);

    const fetchSettlement = async (id: string) => {
        try {
            const res = await getSettlement(id);
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async () => {
        if (!eventId) return;
        if (!confirm('This will distribute the pool balance to users with positive net positions. Continue?')) return;

        setRefunding(true);
        try {
            await executeRefunds(eventId);
            fetchSettlement(eventId);
        } catch (err) {
            alert('Refund execution failed');
        } finally {
            setRefunding(false);
        }
    };

    if (loading) return <div className="flex justify-center h-screen items-center"><Loader2 className="animate-spin h-10 w-10 text-slate-500" /></div>;
    if (!data) return <div className="p-20 text-center text-slate-500">Failed to load settlement data</div>;

    const hasShortfall = data.settlement.some((u: any) => u.net < -0.01);
    const totalRefundable = data.settlement.filter((u: any) => u.net > 0).reduce((acc: number, u: any) => acc + u.net, 0);

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <Link href={`/events/${eventId}`} className="text-slate-500 hover:text-emerald-600 flex items-center gap-1 mb-6 text-sm font-medium transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Event
            </Link>

            <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Settlement & Refunds</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Status Card */}
                    <div className={`p-6 rounded-2xl border ${hasShortfall ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <div className="flex items-start gap-4">
                            {hasShortfall ?
                                <AlertTriangle className="h-8 w-8 text-red-600 mt-1" /> :
                                <CheckCircle className="h-8 w-8 text-emerald-600 mt-1" />
                            }
                            <div>
                                <h2 className={`text-xl font-bold ${hasShortfall ? 'text-red-900' : 'text-emerald-900'}`}>
                                    {hasShortfall ? 'Unsettled Shortfall' : 'Ready for Refunds'}
                                </h2>
                                <p className={`text-sm mt-1 mb-3 ${hasShortfall ? 'text-red-700' : 'text-emerald-700'}`}>
                                    {hasShortfall
                                        ? 'Some participants owe money to the pool. Please settle these debts manually before processing refunds.'
                                        : 'All expenses are covered. The remaining pool balance can now be safely distributed back to participants.'}
                                </p>
                                <div className="inline-flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-lg border border-black/5">
                                    <span className="text-xs font-bold uppercase tracking-wide opacity-50">Pool Balance</span>
                                    <span className="font-mono font-bold text-lg">${data.pool_balance.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900">Breakdown by Participant</h3>
                            <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded">Net Position = Deposit - Used - Refunded</span>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                                <tr>
                                    <th className="p-5">Participant</th>
                                    <th className="p-5 text-right">Deposited</th>
                                    <th className="p-5 text-right">Fair Share</th>
                                    <th className="p-5 text-right">Refunded</th>
                                    <th className="p-5 text-right">Net Position</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.settlement.map((u: any) => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-5 font-medium text-slate-900">{u.name}</td>
                                        <td className="p-5 text-right font-mono text-slate-600">${u.deposited.toFixed(2)}</td>
                                        <td className="p-5 text-right font-mono text-slate-600">${u.used.toFixed(2)}</td>
                                        <td className="p-5 text-right font-mono text-slate-600">${u.refunded.toFixed(2)}</td>
                                        <td className="p-5 text-right">
                                            <span className={`font-mono font-bold px-2 py-1 rounded ${u.net >= 0
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-red-50 text-red-600'
                                                }`}>
                                                {u.net >= 0 ? '+' : ''}{u.net.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold">
                            <Info className="h-5 w-5 text-slate-400" />
                            <h3>How this works</h3>
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                                <span>The pool pays for all expenses directly. No one pays out of pocket.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                                <span>"Fair Share" is the amount of expenses allocated to the user.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                                <span>At the end, unused funds are returned to those who overpaid relative to their usage.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-lg">
                        <div className="flex items-center gap-2 mb-2 font-bold text-emerald-400">
                            <ShieldCheck className="h-5 w-5" />
                            <h3>Final Action</h3>
                        </div>
                        <p className="text-sm text-slate-300 mb-6">
                            {hasShortfall
                                ? "Refunds are disabled because the pool has a shortfall. Please ask negative-balance users to fund the pool."
                                : `You can now refund the remaining $${data.pool_balance.toFixed(2)} to participants with positive balances.`
                            }
                        </p>

                        {hasShortfall ? (
                            <button disabled className="w-full bg-slate-700 text-slate-400 px-6 py-3 rounded-xl cursor-not-allowed font-semibold border border-slate-600">
                                Resolve Shortfall First
                            </button>
                        ) : (
                            <button
                                onClick={handleRefund}
                                disabled={refunding || totalRefundable < 0.01}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {refunding && <Loader2 className="animate-spin h-5 w-5" />}
                                Process All Refunds
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
