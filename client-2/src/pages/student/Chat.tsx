import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '../../api/fetchClient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useModal } from '../../context/ModalContext';
import type { Message, Conversation } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { Paperclip, Send, Plus, LogOut, MessageSquare, Bot, User, FileText, X, Trash2 } from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
}

const Chat = () => {
  const [input, setInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const { socket } = useSocket();
  const { showModal } = useModal();
  const queryClient = useQueryClient();

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['chatHistory'],
    queryFn: () => fetchClient<Conversation[]>('/chat/history'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => fetchClient<Message[]>(`/chat/messages/${activeId}`),
    enabled: !!activeId,
  });

  useEffect(() => {
    refetchHistory();
  }, [refetchHistory]);

  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit('join_conversation', activeId);

    const handleChunk = (data: { conversation_id: string, content: string }) => {
      if (data.conversation_id !== activeId) return;
      queryClient.setQueryData(['messages', activeId], (old: Message[] = []) => {
        const lastMsg = old[old.length - 1];
        if (lastMsg?.role === 'assistant') {
          return [...old.slice(0, -1), { ...lastMsg, content: lastMsg.content + data.content }];
        }
        return [...old, { role: 'assistant', content: data.content, conversation_id: activeId }];
      });
    };

    const handleReceive = (msg: Message) => {
      if (msg.conversation_id !== activeId) return;
      queryClient.setQueryData(['messages', activeId], (old: Message[] = []) => {
        if (old.some(m => (m.content === msg.content && m.role === msg.role))) return old;
        return [...old, msg];
      });
    };

    socket.on('ai_stream_chunk', handleChunk);
    socket.on('receive_message', handleReceive);
    return () => {
      socket.off('ai_stream_chunk', handleChunk);
      socket.off('receive_message', handleReceive);
    };
  }, [socket, activeId, queryClient]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachment]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    let currentId = activeId;
    try {
      if (!currentId) {
        const newConv = await fetchClient<Conversation>('/chat/new', {
          method: 'POST',
          body: JSON.stringify({ title: `Discussion: ${file.name}` })
        });
        currentId = newConv.id;
        setActiveId(currentId);
        await refetchHistory();
        socket?.emit('join_conversation', currentId);
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversation_id', currentId);
      const data = await fetchClient<Attachment>('/chat/upload', { method: 'POST', body: formData });
      setAttachment(data);
    } catch (err: any) {
      showModal({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;
    let currentId = activeId;
    let aiContent = input;
    let displayContent = input;
    if (!currentId) {
      try {
        const newConv = await fetchClient<Conversation>('/chat/new', {
          method: 'POST',
          body: JSON.stringify({ title: input.substring(0, 30) || "New Chat" })
        });
        currentId = newConv.id;
        setActiveId(currentId);
        await refetchHistory();
        socket?.emit('join_conversation', currentId); 
      } catch (e: any) { return; }
    }
    if (attachment) {
      aiContent += `\n\n[CONTEXT_FILE: ${attachment.name}]`; 
      displayContent += `\n\n📎 **File:** [${attachment.name}](${attachment.url})`;
      setAttachment(null);
    }
    queryClient.setQueryData(['messages', currentId], (old: Message[] = []) => [
      ...old, { role: 'user', content: displayContent, created_at: new Date().toISOString(), conversation_id: currentId as string }
    ]);
    socket?.emit('send_message', { conversation_id: currentId, content: aiContent, displayContent: displayContent });
    setInput('');
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete chat?")) return;
    try {
      await fetchClient(`/chat/delete/${id}`, { method: 'DELETE' });
      await refetchHistory();
      if (activeId === id) setActiveId(null);
    } catch (err: any) { showModal({ title: 'Error', message: 'Delete failed', type: 'error' }); }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-white font-sans overflow-hidden">
      <aside className="w-72 bg-[#121214] border-r border-[#27272a] flex flex-col hidden md:flex">
        <div className="p-4 border-b border-[#27272a] flex items-center gap-2"><Bot className="text-blue-500" /><h1 className="text-xl font-bold">EDU-AI</h1></div>
        <div className="p-3"><button onClick={() => setActiveId(null)} className="w-full flex items-center justify-center gap-2 bg-blue-600 p-3 rounded-xl"><Plus size={18} /> New Chat</button></div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1">
            {history.map(c => (
              <div key={c.id} onClick={() => setActiveId(c.id)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer ${activeId === c.id ? 'bg-[#27272a] border border-[#3f3f46]' : 'text-gray-400 hover:bg-[#18181b]'}`}>
                <div className="flex items-center gap-3 truncate"><MessageSquare size={16} /><span className="truncate">{c.title}</span></div>
                <button onClick={(e) => handleDeleteChat(e, c.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
        </div>
        <div className="p-4 border-t border-[#27272a]"><button onClick={logout} className="flex items-center gap-3 text-gray-400 hover:text-red-400 w-full"><LogOut size={16} /> Sign Out</button></div>
      </aside>
      <main className="flex-1 flex flex-col bg-[#09090b]">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {(!messages || messages.length === 0) ? (
             <div className="h-full flex flex-col items-center justify-center opacity-60"><Bot size={32} className="text-blue-500 mb-4" /><h2 className="text-2xl font-bold">How can I help you today?</h2></div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center mt-1"><Bot size={16} /></div>}
                <div className={`px-5 py-4 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#18181b] border border-[#27272a] text-gray-200'}`}>
                   <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                       code({node, inline, className, children, ...props}: any) {
                         const match = /language-(\w+)/.exec(className || '');
                         return !inline && match ? (
                           <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                         ) : <code {...props} className="bg-black/30 px-1 rounded">{children}</code>;
                       }
                   }}>{m.content}</ReactMarkdown>
                </div>
                {m.role === 'user' && <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center mt-1"><User size={16} /></div>}
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
        <div className="p-4 md:p-6 bg-[#09090b]">
           {attachment && <div className="max-w-4xl mx-auto mb-3 bg-[#18181b] p-2 rounded-xl text-blue-300 flex justify-between"><span className="flex items-center gap-2"><FileText size={14}/> {attachment.name}</span><button onClick={() => setAttachment(null)}><X size={14}/></button></div>}
           <div className="max-w-4xl mx-auto flex items-end gap-2 bg-[#18181b] rounded-2xl p-2 border border-[#27272a]">
             <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
             <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-3 text-gray-400 hover:text-white">{isUploading ? "..." : <Paperclip size={20} />}</button>
             <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="flex-1 bg-transparent outline-none text-gray-200 py-3" placeholder="Ask anything..." />
             <button onClick={handleSend} disabled={!input.trim() && !attachment} className="p-3 bg-blue-600 rounded-xl"><Send size={20} /></button>
           </div>
        </div>
      </main>
    </div>
  );
};

export default Chat;