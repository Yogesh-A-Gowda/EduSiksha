"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Download, PieChart, CheckCircle, BookOpen, Quote, RefreshCw, FileText, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ChatStatsPage() {
    const params = useParams();
    const [stats, setStats] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [reportUrls, setReportUrls] = useState<{ qp: string, key: string } | null>(null);
    const { t, i18n } = useTranslation();

    const fetchStats = async () => {
        try {
            const langMap: Record<string, string> = {
                en: "English",
                hi: "Hindi",
                es: "Spanish",
                kn: "Kannada",
                ta: "Tamil",
                te: "Telugu",
                ml: "Malayalam"
            };
            const langName = langMap[i18n.language] || "English";

            const res = await api.get(`/parent/chat/${params.id}/stats?language=${langName}`);
            setStats(res.data);
        } catch (e) {
            console.error("Failed to fetch stats");
        }
    };

    useEffect(() => {
        if (params.id) fetchStats();
    }, [params.id, i18n.language]);

    const refreshStats = async () => {
        setRefreshing(true);
        try {
            const langMap: Record<string, string> = {
                en: "English",
                hi: "Hindi",
                es: "Spanish",
                kn: "Kannada",
                ta: "Tamil",
                te: "Telugu",
                ml: "Malayalam"
            };
            const langName = langMap[i18n.language] || "English";

            const res = await api.post(`/parent/chat/${params.id}/stats/refresh?language=${langName}`);
            setStats(res.data);
        } catch (e) {
            alert("Failed to refresh stats");
        } finally {
            setRefreshing(false);
        }
    };

    const generateReport = async () => {
        setGenerating(true);
        try {
            const res = await api.post(`/reports/generate/${params.id}`);
            setReportUrls({
                qp: res.data.qp_url,
                key: res.data.key_url
            });
        } catch (e) {
            alert("Failed to generate report");
        } finally {
            setGenerating(false);
        }
    };

    if (!stats) return <div className="p-10 animate-pulse text-gray-400">Loading AI Insights...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">Chat Insight</h1>
                <button
                    onClick={generateReport}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition disabled:opacity-50"
                    disabled={generating}
                >
                    {generating ? <span className="animate-spin">🌀</span> : <FileText className="w-5 h-5" />}
                    Generate Practice Test
                </button>
            </div>

            {reportUrls && (
                <div className="bg-blue-900/30 border border-blue-700 p-4 rounded-lg flex items-center justify-between">
                    <p className="text-blue-300">Practice test generated successfully!</p>
                    <div className="flex gap-3">
                        <a
                            href={`http://localhost:8000${reportUrls.qp}`}
                            target="_blank"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <FileText className="w-4 h-4" />
                            Question Paper
                        </a>
                        <a
                            href={`http://localhost:8000${reportUrls.key}`}
                            target="_blank"
                            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <Key className="w-4 h-4" />
                            Answer Key
                        </a>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4 text-blue-400">
                        <BookOpen className="w-6 h-6" />
                        <h3 className="font-semibold">Details</h3>
                    </div>
                    <p className="text-4xl font-bold">{stats.message_count}</p>
                    <p className="text-gray-500 mt-1">Total Messages</p>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4 text-green-400">
                        <PieChart className="w-6 h-6" />
                        <h3 className="font-semibold">Mastery</h3>
                    </div>
                    <p className="text-4xl font-bold">{stats.mastery_score}%</p>
                    <div className="w-full bg-gray-800 h-2 mt-3 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${stats.mastery_score}%` }}></div>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4 text-yellow-400">
                        <CheckCircle className="w-6 h-6" />
                        <h3 className="font-semibold">Topics Covered</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {stats.topics?.slice(0, 5).map((topic: string) => (
                            <span key={topic} className="bg-gray-800 px-3 py-1 rounded-full text-sm border border-gray-700">{topic}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Summary Section */}
            <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Quote className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 text-purple-400">
                        <Quote className="w-6 h-6" />
                        <h3 className="font-semibold text-lg">AI Summary</h3>
                        {stats.cached && <span className="text-xs bg-purple-900/50 px-2 py-1 rounded">Cached</span>}
                    </div>
                    <button
                        onClick={refreshStats}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
                <div className="text-gray-300 leading-relaxed text-lg prose prose-invert max-w-none">
                    {stats.summary}
                </div>
            </div>
        </div>
    );
}
