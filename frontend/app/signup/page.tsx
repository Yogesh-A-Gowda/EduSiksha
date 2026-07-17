"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { User, Lock, ArrowRight, Mail, Phone, Shield } from 'lucide-react';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/parent/signup', {
                email,
                password,
                phone: phone || null
            });
            alert('Account created successfully! Please login.');
            router.push('/login');
        } catch (err: any) {
            alert('Signup failed: ' + (err.response?.data?.detail || 'Something went wrong'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

            <div className="bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 relative z-10">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Join EduGuard</h1>
                    <p className="text-gray-400">Create a safe learning environment for your kids.</p>
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-gray-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-gray-800 border-2 border-gray-800 rounded-xl py-3 pl-10 pr-4 focus:bg-gray-900 outline-none transition-all placeholder-gray-500 focus:border-blue-500/50"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Phone className="absolute left-3 top-3.5 text-gray-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="tel"
                            placeholder="Phone Number (Optional)"
                            className="w-full bg-gray-800 border-2 border-gray-800 rounded-xl py-3 pl-10 pr-4 focus:bg-gray-900 outline-none transition-all placeholder-gray-500 focus:border-blue-500/50"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <div className="relative group">
                        <Lock className="absolute left-3 top-3.5 text-gray-500 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="password"
                            placeholder="Create Password"
                            className="w-full bg-gray-800 border-2 border-gray-800 rounded-xl py-3 pl-10 pr-4 focus:bg-gray-900 outline-none transition-all placeholder-gray-500 focus:border-blue-500/50"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? 'Creating Account...' : 'Get Started'} <ArrowRight className="w-5 h-5" />
                    </button>
                </form>

                <p className="mt-8 text-center text-gray-400">
                    Already have an account? <Link href="/login" className="text-blue-400 hover:underline font-medium">Log in</Link>
                </p>
            </div>
        </div>
    );
}
