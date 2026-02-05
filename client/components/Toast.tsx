'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

let toastCount = 0;

// Global toast state
let globalToasts: Toast[] = [];
let globalListeners: Array<(toasts: Toast[]) => void> = [];

const addToast = (type: ToastType, message: string) => {
    const id = `toast-${toastCount++}`;
    const newToast: Toast = { id, type, message };

    globalToasts = [...globalToasts, newToast];
    globalListeners.forEach(listener => listener(globalToasts));

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        removeToast(id);
    }, 5000);

    return id;
};

const removeToast = (id: string) => {
    globalToasts = globalToasts.filter(t => t.id !== id);
    globalListeners.forEach(listener => listener(globalToasts));
};

// Export toast functions
export const toast = {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    warning: (message: string) => addToast('warning', message),
    info: (message: string) => addToast('info', message),
};

// Toast container component
export function Toaster() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        globalListeners.push(setToasts);
        return () => {
            globalListeners = globalListeners.filter(l => l !== setToasts);
        };
    }, []);

    if (!mounted) return null;

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle className="h-5 w-5" />;
            case 'error': return <XCircle className="h-5 w-5" />;
            case 'warning': return <AlertCircle className="h-5 w-5" />;
            case 'info': return <Info className="h-5 w-5" />;
        }
    };

    const getStyles = (type: ToastType) => {
        switch (type) {
            case 'success': return 'bg-emerald-500 text-white';
            case 'error': return 'bg-red-500 text-white';
            case 'warning': return 'bg-amber-500 text-white';
            case 'info': return 'bg-blue-500 text-white';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`${getStyles(toast.type)} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md pointer-events-auto`}
                >
                    {getIcon(toast.type)}
                    <p className="flex-1 text-sm font-medium">{toast.message}</p>
                    <button
                        onClick={() => removeToast(toast.id)}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}
