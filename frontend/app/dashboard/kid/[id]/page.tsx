"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { MessageSquare, Calendar, ChevronRight } from 'lucide-react';

export default function KidChatsPage() {
    const params = useParams();
    const [chats, setChats] = useState<any[]>([]);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await api.get(`/parent/kid/${params.id}/chats`);
                setChats(res.data);
            } catch (e) {
                console.error("Failed to fetch chats");
            }
        };
        if (params.id) fetchChats();
    }, [params.id]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Chat History</h1>

            <div className="grid gap-4">
                {chats.length === 0 ? (
                    <p className="text-gray-500">No chats found for this kid yet.</p>
                ) : (
                    chats.map((chat) => (
                        <Link key={chat.id} href={`/dashboard/chat/${chat.id}`}>
                            <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl flex items-center justify-between hover:bg-gray-800 transition cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{chat.title || "Untitled Chat"}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(chat.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                <ChevronRight className="text-gray-600 group-hover:text-white transition" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
