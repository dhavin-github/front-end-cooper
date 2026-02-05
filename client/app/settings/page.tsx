'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { Settings as SettingsIcon, User, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400">Manage your account preferences</p>
                    </div>

                    {/* User Profile */}
                    {user && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full h-16 w-16 flex items-center justify-center">
                                    <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{user.name}</h2>
                                    <p className="text-slate-600 dark:text-slate-400">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings Sections */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Notification preferences coming soon</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Privacy & Security</h3>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Security settings coming soon</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
