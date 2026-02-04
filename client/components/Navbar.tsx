import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="bg-slate-900 border-b border-slate-800 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-emerald-400">
                            <Wallet className="h-8 w-8" />
                            <span>Cooper</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="hover:text-emerald-400 text-sm font-medium">Dashboard</Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
