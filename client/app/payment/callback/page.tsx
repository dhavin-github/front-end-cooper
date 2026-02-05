'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function PaymentCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processing your payment...');

    useEffect(() => {
        const handlePaymentCallback = async () => {
            try {
                // Get intentId from URL parameters
                const intentId = searchParams.get('intentId') || searchParams.get('payment_intent');
                const eventId = localStorage.getItem('pending_event_id');

                if (!intentId) {
                    setStatus('error');
                    setMessage('Invalid payment reference');
                    setTimeout(() => router.push('/dashboard'), 3000);
                    return;
                }

                if (!eventId) {
                    setStatus('error');
                    setMessage('Event information missing');
                    setTimeout(() => router.push('/dashboard'), 3000);
                    return;
                }

                console.log('🔄 Payment callback received:', { intentId, eventId });
                setMessage('Submitting delivery proof...');

                // Step 1: Submit delivery proof to Finternet API
                const proofResponse = await fetch(
                    `https://api.fmm.finternetlab.io/api/v1/payment-intents/${intentId}/escrow/delivery-proof`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': 'sk_hackathon_8e0f9027a2c34e163e44e2a3d10ef32c'
                        },
                        body: JSON.stringify({
                            proofHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                            proofURI: "https://example.com/delivery-proofs/ORD-123",
                            submittedBy: "0x5D478B369769183F05b70bb7a609751c419b4c04"
                        })
                    }
                );

                if (!proofResponse.ok) {
                    const errorData = await proofResponse.json().catch(() => ({}));
                    console.error('❌ Delivery proof submission failed:', errorData);
                    throw new Error(`Delivery proof failed: ${proofResponse.status}`);
                }

                const proofData = await proofResponse.json();
                console.log('✅ Delivery proof submitted:', proofData);

                setMessage('Confirming payment with backend...');

                // Step 2: Confirm payment with our backend
                const confirmResponse = await fetch('http://localhost:4000/api/payments/confirm', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ intentId, eventId })
                });

                if (!confirmResponse.ok) {
                    const errorData = await confirmResponse.json().catch(() => ({}));
                    console.error('❌ Backend confirmation failed:', errorData);
                    throw new Error('Payment confirmation failed');
                }

                const confirmData = await confirmResponse.json();
                console.log('✅ Payment confirmed:', confirmData);

                // Success!
                setStatus('success');
                setMessage(`Payment successful! $${confirmData.amount} added to pool.`);

                // Clean up localStorage
                localStorage.removeItem('pending_payment_intent');
                localStorage.removeItem('pending_event_id');

                // Redirect to event page
                setTimeout(() => {
                    router.push(`/events/${eventId}`);
                }, 2000);

            } catch (error: any) {
                console.error('❌ Payment callback error:', error);
                setStatus('error');
                setMessage(error.message || 'Payment processing failed');

                // Redirect to dashboard after delay
                setTimeout(() => router.push('/dashboard'), 5000);
            }
        };

        handlePaymentCallback();
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                {status === 'processing' && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                            Processing Payment
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {message}
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-500">
                            <div className="h-2 w-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
                            <span>Please wait...</span>
                        </div>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                            Payment Successful!
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {message}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
                            Redirecting to event page...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mb-6 flex justify-center">
                            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-3">
                            Payment Failed
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {message}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
                            Redirecting to dashboard...
                        </p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-6 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
