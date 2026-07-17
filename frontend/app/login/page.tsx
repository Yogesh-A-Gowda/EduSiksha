"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { User, Lock, ArrowRight, Gamepad2, GraduationCap } from 'lucide-react';

export default function UnifiedLoginPage() {
    const [activeTab, setActiveTab] = useState<'parent' | 'kid'>('parent');
    const [identifier, setIdentifier] = useState(''); // Email for Parent, Username for Kid
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const userId = localStorage.getItem('user_id');
        const userType = localStorage.getItem('user_type');
        if (userId && userType) {
            if (userType === 'parent') router.replace('/dashboard');
            else if (userType === 'kid') router.replace('/chat');
        } else {
            setIsCheckingAuth(false);
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let endpoint = '';
            let payload = {};

            if (activeTab === 'parent') {
                endpoint = '/auth/parent/login';
                payload = { email: identifier, password };
            } else {
                endpoint = '/auth/kid/login';
                payload = { username: identifier, password };
            }

            const res = await api.post(endpoint, payload);
            // Token is set as httpOnly cookie by the backend — don't store it in JS.
            // Store only non-sensitive identity info for client-side routing checks.
            localStorage.setItem('user_id', String(res.data.user_id));
            localStorage.setItem('user_type', res.data.user_type);
            if (res.data.username) {
                localStorage.setItem('user_identifier', res.data.username);
            }
            if (activeTab === 'parent') {
                router.push('/dashboard');
            } else {
                router.push('/chat');
            }
        } catch (err: any) {
            alert('Login failed: ' + (err.response?.data?.detail || 'Invalid credentials'));
        } finally {
            setLoading(false);
        }
    };

    // Show loading screen while checking if user is already logged in
    if (isCheckingAuth) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className={`absolute top-0 left-0 w-full h-full transition-colors duration-1000 ${activeTab === 'kid' ? 'bg-gradient-to-br from-gray-900 to-purple-900/40' : 'bg-gradient-to-br from-gray-900 to-blue-900/40'}`}></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-500 rounded-full blur-[128px] opacity-20"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-purple-500 rounded-full blur-[128px] opacity-20"></div>

            <div className="bg-gray-900/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-800 relative z-10 transition-all">

                {/* Header Tabs */}
                <div className="flex bg-gray-800/50 p-1 rounded-xl mb-8">
                    <button
                        onClick={() => { setActiveTab('parent'); setIdentifier(''); setPassword(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'parent' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <GraduationCap className="w-4 h-4" /> Parent
                    </button>
                    <button
                        onClick={() => { setActiveTab('kid'); setIdentifier(''); setPassword(''); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${activeTab === 'kid' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Gamepad2 className="w-4 h-4" /> Student
                    </button>
                </div>

                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {activeTab === 'parent' ? 'Welcome Back' : 'Ready to Learn?'}
                    </h1>
                    <p className="text-gray-400">
                        {activeTab === 'parent' ? 'Monitor your child\'s progress safely.' : 'Your AI tutor is waiting for you!'}
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative group">
                        <User className={`absolute left-3 top-3.5 w-5 h-5 transition-colors ${activeTab === 'parent' ? 'text-blue-500' : 'text-purple-500'}`} />
                        <input
                            type={activeTab === 'parent' ? 'email' : 'text'}
                            placeholder={activeTab === 'parent' ? 'Parent Email' : 'Secret Username'}
                            className="w-full bg-gray-800 border-2 border-gray-800 rounded-xl py-3 pl-10 pr-4 focus:bg-gray-900 outline-none transition-all placeholder-gray-500 focus:border-gray-700"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            required
                        />
                    </div>

                    <div className="relative group">
                        <Lock className={`absolute left-3 top-3.5 w-5 h-5 transition-colors ${activeTab === 'parent' ? 'text-blue-500' : 'text-purple-500'}`} />
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full bg-gray-800 border-2 border-gray-800 rounded-xl py-3 pl-10 pr-4 focus:bg-gray-900 outline-none transition-all placeholder-gray-500 focus:border-gray-700"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100
                ${activeTab === 'parent'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                                : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'}`}
                    >
                        {loading ? 'Logging in...' : 'Login'} <ArrowRight className="w-5 h-5" />
                    </button>
                </form>

                {activeTab === 'parent' && (
                    <p className="mt-6 text-center text-gray-400">
                        New to EduGuard? <Link href="/signup" className="text-blue-400 hover:underline">Create Parent Account</Link>
                    </p>
                )}

            </div>
        </div>
    );
}
