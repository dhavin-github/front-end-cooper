'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Activity as ActivityIcon, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function ActivityPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (!token || !userData) {
            router.push('/login');
            return;
        }
        setUser(JSON.parse(userData));
    }, [router]);

    return (
        <div className="flex h-screen">
            <Sidebar />

            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Activity</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">Track your transactions and contributions</p>
                    </div>

                    {/* Placeholder content */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                        <div className="bg-slate-50 dark:bg-slate-700 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                            <ActivityIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Activity Feed Coming Soon</h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            Your transaction history and activity timeline will appear here
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
