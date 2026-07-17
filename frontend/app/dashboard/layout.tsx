"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Activity, LogOut, Plus } from 'lucide-react';
import api from '@/lib/api';
import SocketProvider from '@/components/SocketProvider';
import AddKidModal from '@/components/AddKidModal';

import '@/lib/i18n'; // Init i18n
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { t, i18n } = useTranslation();
    const [kids, setKids] = useState<any[]>([]);
    const [activeKids, setActiveKids] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [parentEmail, setParentEmail] = useState('');
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const userType = localStorage.getItem('user_type');
        const userId = localStorage.getItem('user_id');
        const email = localStorage.getItem('user_identifier');
        if (email) setParentEmail(email);

        if (!userId || (userType && userType !== 'parent')) {
            router.replace(userType === 'kid' ? '/chat' : '/login');
            return;
        }

        const fetchKids = async () => {
            try {
                const res = await api.get('/parent/dashboard/kids');
                setKids(res.data);
                setIsAuthChecking(false);
            } catch (e: any) {
                console.error("Failed to fetch kids", e);
                console.error("Error response:", e.response?.data);
                console.error("Error status:", e.response?.status);

                // If unauthorized, clear storage and redirect to login
                if (e.response?.status === 401) {
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('user_type');
                    localStorage.removeItem('user_identifier');
                    router.replace('/login');
                } else {
                    setIsAuthChecking(false);
                }
            }
        };
        fetchKids();
    }, [isModalOpen]);

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_type');
        localStorage.removeItem('user_identifier');
        router.push('/login');
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    // Show loading screen while checking authentication
    if (isAuthChecking) {
        return (
            <div className="flex h-screen bg-gray-950 text-white items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <SocketProvider>
            <div className="flex h-screen bg-gray-950 text-white font-sans">
                {/* Sidebar */}
                <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
                    <div className="p-6 border-b border-gray-800">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
                            {t('dashboard_title')}
                        </h1>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {/* Language Switcher */}
                        <div className="bg-gray-800 rounded-lg p-2 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-400 text-xs">
                                <Globe className="w-4 h-4" />
                                {t('change_language')}
                            </div>
                            <select
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="bg-gray-700 text-xs rounded p-1 outline-none focus:ring-1 focus:ring-blue-500"
                                value={i18n.language}
                            >
                                <option value="en">English</option>
                                <option value="hi">हिंदी</option>
                                <option value="kn">ಕನ್ನಡ</option>
                                <option value="ta">தமிழ்</option>
                                <option value="te">తెలుగు</option>
                                <option value="ml">മലയാളം</option>
                                <option value="es">Español</option>
                            </select>
                        </div>


                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('your_kids')}</p>

                        {kids.map((kid) => (
                            <Link key={kid.id} href={`/dashboard/kid/${kid.id}`} className="block">
                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition group cursor-pointer">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold">
                                            {kid.username[0].toUpperCase()}
                                        </div>
                                        {/* Green Dot if Active */}
                                        {kid.is_active_session && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full"></span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium group-hover:text-blue-400 transition">{kid.username}</p>
                                        <p className="text-xs text-gray-500">{kid.subscription_status ? t('premium') : t('free')}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full mt-4 flex items-center justify-center gap-2 p-3 border border-gray-700 border-dashed rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition"
                        >
                            <Plus className="w-4 h-4" /> {t('add_kid')}
                        </button>
                    </div>

                    <div className="p-4 border-t border-gray-800">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition w-full p-2"
                        >
                            <LogOut className="w-5 h-5" /> {t('logout')}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    {children}
                </main>

                <AddKidModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => { }} // Reload kids list logic needed here, or just force reload
                    parentEmail={parentEmail}
                />
            </div>
        </SocketProvider>
    );
}
