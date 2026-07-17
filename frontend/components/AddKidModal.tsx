"use client";
import { useState, useEffect } from 'react';
import { X, Gamepad2, Lock, CreditCard } from 'lucide-react';
import api from '@/lib/api';

interface AddKidModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    parentEmail: string;
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function AddKidModal({ isOpen, onClose, onSuccess, parentEmail }: AddKidModalProps) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load Razorpay Script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    if (!isOpen) return null;

    const handlePaymentAndCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Order
            const orderRes = await api.post('/payment/create-order', { amount: 49900 }); // 499 INR
            const { order_id, amount, currency, key_id } = orderRes.data;

            const options = {
                key: key_id,
                amount: amount,
                currency: currency,
                name: "EduGuard AI",
                description: "Kid Subscription (1 Month)",
                order_id: order_id,
                handler: async function (response: any) {
                    try {
                        // 2. Verify Payment
                        await api.post('/payment/verify', {
                            order_id: response.razorpay_order_id,
                            payment_id: response.razorpay_payment_id,
                            signature: response.razorpay_signature
                        });

                        // 3. Create Kid Account (Only if payment verified)
                        await api.post('/auth/kid/create', {
                            username,
                            password
                        });

                        alert('Subscription Active! Kid profile created.');
                        onSuccess();
                        onClose();
                    } catch (err: any) {
                        alert('Payment Verification Failed: ' + (err.response?.data?.detail || err.message));
                    }
                },
                prefill: {
                    email: parentEmail,
                    contact: ""
                },
                theme: {
                    color: "#9333ea"
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (err: any) {
            alert('Failed to initiate payment: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    <Gamepad2 className="text-purple-500" />
                    Subscribe & Add Kid
                </h2>
                <p className="text-gray-400 text-sm mb-6">Unlock AI features for ₹499/mo.</p>

                <form onSubmit={handlePaymentAndCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Kid's Username</label>
                        <input
                            type="text"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="e.g. SuperMario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Secret Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Make it easy to remember"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-900/20 disabled:opacity-50"
                        >
                            <CreditCard className="w-5 h-5" />
                            {loading ? 'Processing...' : 'Pay ₹499 & Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
