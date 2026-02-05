'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getEvents, createEvent } from '@/lib/api';
import { Plus, ArrowRight, Loader2, Calendar, Wallet, TrendingUp } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function DashboardPage() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        // Auth Check
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token || !userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));
        fetchEvents();
    }, [router]);

    const fetchEvents = async () => {
        try {
            const userData = localStorage.getItem('user');
            if (!userData) return;
            const currentUser = JSON.parse(userData);

            const data = await getEvents();

            // FILTER: Show events where user is creator OR participant
            const userEvents = data.filter((event: any) => {
                // Show if user created the event
                if (event.created_by === currentUser.id) return true;

                // Show if user is a participant
                if (event.participants && event.participants.some((p: any) => p.id === currentUser.id)) return true;

                return false;
            });

            setEvents(userEvents);
        } catch (err: any) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                router.push('/login');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventName.trim()) return;

        setIsCreating(true);
        try {
            await createEvent({ name: newEventName, created_by: user.id });
            setNewEventName('');
            fetchEvents();
        } catch (err) {
            alert('Failed to create event');
        } finally {
            setIsCreating(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex justify-center items-center">
                <Loader2 className="animate-spin h-10 w-10 text-blue-600" />
            </div>
        </div>
    );

    return (
        <div className="flex h-screen">
            <Sidebar />

            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Dashboard</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">Manage shared expenses with friends effortlessly</p>
                    </div>

                    {/* Summary Cards */}
                    {events.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                            {/* Total Pool Balance */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                        <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Pool Balance</h3>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                    ${events.reduce((sum, evt) => sum + evt.pool_balance, 0).toFixed(2)}
                                </p>
                            </div>

                            {/* Active Events */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                                        <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Active Events</h3>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                    {events.filter(e => e.status === 'ACTIVE').length}
                                </p>
                            </div>

                            {/* Total Events */}
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                        <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Total Events</h3>
                                </div>
                                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                    {events.length}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Create Event Form */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Create New Event</h2>
                        <form onSubmit={handleCreate} className="flex gap-3">
                            <input
                                type="text"
                                placeholder="e.g. Ski Trip 2024"
                                className="border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2.5 flex-1 max-w-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                value={newEventName}
                                onChange={(e) => setNewEventName(e.target.value)}
                            />
                            <button
                                disabled={isCreating}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2"
                            >
                                {isCreating ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                Create Event
                            </button>
                        </form>
                    </div>

                    {/* Event List */}
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">All Events</h2>
                        {events.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="bg-slate-50 dark:bg-slate-700 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">No events yet</h3>
                                <p className="text-slate-600 dark:text-slate-400 mt-2">Create your first event to get started</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {events.map((evt) => (
                                    <Link key={evt.id} href={`/events/${evt.id}`} className="group block bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 overflow-hidden">
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                                                    <Wallet className="h-6 w-6" />
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold tracking-wide ${evt.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                    {evt.status}
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{evt.name}</h3>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                                                {evt.description || 'No description provided.'}
                                            </p>

                                            <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-700 pt-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pool Balance</p>
                                                    <p className={`font-mono text-xl font-bold ${evt.pool_balance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        ${evt.pool_balance.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all text-slate-400 dark:text-slate-500">
                                                    <ArrowRight className="h-5 w-5" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
