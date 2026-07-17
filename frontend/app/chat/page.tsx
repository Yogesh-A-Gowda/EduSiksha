"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Paperclip, Mic, Menu, Plus, MessageSquare, LogOut, Upload, FileText, X } from 'lucide-react';
import { useSocket } from '@/components/SocketProvider';
import SocketProvider from '@/components/SocketProvider';
import api from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/atom-one-dark.css';

function ChatInterface() {
    const socket = useSocket();
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [kidId, setKidId] = useState<number | null>(null);
    const [chats, setChats] = useState<any[]>([]);
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        const userType = localStorage.getItem('user_type');
        const userId = localStorage.getItem('user_id');

        if (!userId || (userType && userType !== 'kid')) {
            router.replace(userType === 'parent' ? '/dashboard' : '/login');
            return;
        }

        const id = parseInt(userId);
        setKidId(id);
        fetchChats(id);
        setIsAuthChecking(false);
    }, [router]);

    const fetchChats = async (id: number) => {
        try {
            const res = await api.get('/kid/chats');
            setChats(res.data);
            if (res.data.length > 0) {
                // Load latest chat
                loadChat(res.data[0].id);
            }
        } catch (e: any) {
            console.error("Failed to fetch chats", e);
            if (e.response?.status === 401) {
                localStorage.clear();
                router.push('/login');
            }
        }
    };

    const loadChat = async (chatId: number) => {
        setActiveChatId(chatId);
        try {
            const res = await api.get(`/kid/chats/${chatId}/messages`);
            setMessages(res.data);
        } catch (e) { console.error("Failed to load messages"); }
    };

    const handleNewChat = () => {
        setMessages([]);
        setActiveChatId(null); // Will trigger new session creation on next message
    };

    const handleLogout = async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_type');
        localStorage.removeItem('user_identifier');
        router.push('/login');
    };


    useEffect(() => {
        if (!socket) return;

        socket.on('response', (data: any) => {
            setMessages(prev => [...prev, { role: 'ai', content: data.data }]);
            if (data.session_id) {
                setActiveChatId(prevId => {
                    if (prevId !== data.session_id) {
                        if (kidId) fetchChats(kidId);
                        return data.session_id;
                    }
                    return prevId;
                });
            }
        });

        socket.on('upload_complete', (data: any) => {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `✅ **"${data.filename}"** is ready — ${data.chunks} chunks indexed. Ask me anything about it!`
            }]);
            setUploading(false);
        });

        socket.on('upload_error', (data: any) => {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `❌ Failed to process **"${data.filename}"**. Please try uploading again.`
            }]);
            setUploading(false);
        });

        return () => {
            socket.off('response');
            socket.off('upload_complete');
            socket.off('upload_error');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = () => {
        if (!input.trim() || !socket || !kidId) return;

        const msg = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, msg]);
        socket.emit('chat_message', {
            message: input,
            kid_id: kidId,
            session_id: activeChatId // Optional: Pass specific session if we want to continue old one
        });
        setInput('');
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file type
            const allowedTypes = [
                'image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/tiff',
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
                'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
                'text/plain'
            ];

            if (!allowedTypes.includes(file.type)) {
                alert('Unsupported file type. Please upload: Images, PDF, Word, Excel, PowerPoint, or Text files.');
                return;
            }

            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('File too large. Maximum size is 10MB.');
                return;
            }

            setSelectedFile(file);
        }
    };

    const uploadFile = async () => {
        if (!selectedFile || !activeChatId) {
            alert('Please select a file and ensure you have an active chat.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('session_id', activeChatId.toString());

            const response = await api.post('/chat/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setMessages(prev => [...prev, {
                role: 'ai',
                content: `⏳ Processing **"${selectedFile.name}"**... I'll let you know when it's ready to query.`
            }]);
            setSelectedFile(null);
        } catch (error: any) {
            alert('Upload failed: ' + (error.response?.data?.detail || 'Unknown error'));
        } finally {
            setUploading(false);
        }
    };

    // Show loading screen while checking authentication
    if (isAuthChecking) {
        return (
            <div className="flex h-screen bg-gray-900 text-white items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
            {/* Sidebar (Gemini style) */}
            <aside className="w-72 bg-gray-950 flex flex-col border-r border-gray-800 hidden md:flex">
                <div className="p-4">
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 w-full p-3 rounded-full text-gray-200 transition mb-6 shadow-lg"
                    >
                        <Plus className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">New chat</span>
                    </button>

                    <div className="space-y-1 overflow-y-auto">
                        <p className="px-4 text-xs font-semibold text-gray-500 mb-2">Recent</p>
                        {chats.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => loadChat(chat.id)}
                                className={`flex items-center gap-3 p-2 px-4 rounded-full cursor-pointer text-sm transition ${activeChatId === chat.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`}
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span className="truncate">{chat.title || `Chat ${chat.id}`}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-auto p-4 border-t border-gray-800">


                    {/* // ... (inside return) */}

                    <div className="mt-auto p-4 border-t border-gray-800">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400 cursor-pointer px-2 transition w-full"
                        >
                            <LogOut className="w-4 h-4" /> Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col relative">
                {/* Header */}
                <header className="p-4 flex items-center justify-between md:hidden">
                    <Menu className="w-6 h-6 text-gray-400" />
                    <span className="font-bold">EduGuard AI</span>
                    <div className="w-6" />
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 blur-xl animate-pulse"></div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 text-transparent bg-clip-text mb-2">Hello, Explorer!</h1>
                            <p className="text-xl text-gray-400">What do you want to learn today?</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-900/20'
                                : 'bg-gray-800 text-gray-100 rounded-bl-none shadow-md'
                                }`}>
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <div className="prose prose-invert max-w-none text-sm space-y-2">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex, rehypeHighlight]}
                                            components={{
                                                code({ node, inline, className, children, ...props }: any) {
                                                    return inline ? (
                                                        <code className="bg-gray-700 px-1 py-0.5 rounded text-red-300" {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <span className="block rounded-lg overflow-hidden my-2 w-full">
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        </span>
                                                    )
                                                }
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-gray-900">
                    {/* File Upload Preview */}
                    {selectedFile && (
                        <div className="max-w-4xl mx-auto mb-3 bg-gray-800 rounded-lg p-3 flex items-center justify-between border border-gray-700">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!uploading && !uploadSuccess && (
                                    <button
                                        onClick={uploadFile}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm flex items-center gap-2 transition"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Upload
                                    </button>
                                )}
                                {uploading && <span className="text-sm text-blue-400">Uploading...</span>}
                                {uploadSuccess && <span className="text-sm text-green-400">✓ Uploaded!</span>}
                                <button
                                    onClick={() => setSelectedFile(null)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto bg-gray-800 rounded-full p-2 flex items-center gap-2 border border-gray-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-xl">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,.pdf,.docx,.xlsx,.pptx,.txt"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition"
                            title="Upload file (Images, PDF, Word, Excel, PowerPoint)"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none text-white px-2 placeholder-gray-500"
                            placeholder="Ask anything about Math, Science, or History..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition">
                            <Mic className="w-5 h-5" />
                        </button>
                        <button
                            onClick={sendMessage}
                            className={`p-3 rounded-full transition ${input.trim() ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                            disabled={!input.trim()}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-600 mt-2">EduGuard may display inaccurate info, including about people, so double-check its responses.</p>
                </div>
            </main>
        </div>
    );
}

export default function ChatPage() {
    return (
        <SocketProvider>
            <ChatInterface />
        </SocketProvider>
    );
}
