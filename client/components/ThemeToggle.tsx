'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <>
                    <Moon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Dark Mode</span>
                </>
            ) : (
                <>
                    <Sun className="h-5 w-5 text-slate-200" />
                    <span className="text-sm font-medium text-slate-200">Light Mode</span>
                </>
            )}
        </button>
    );
}
