import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; 
import { fetchClient } from '../../api/fetchClient';
import { useModal } from '../../context/ModalContext';
import { generateQuestionPaperPDF } from '../../utils/pdfGenerator';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnalysisData {
  summary: string;
  curiosity: string;
  mastery: string;
  question_count: number;
}

interface ChatDetailsResponse {
  messages: ChatMessage[];
  analysis?: AnalysisData; 
}

const StudentReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showModal } = useModal();
  const queryClient = useQueryClient();
  
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeData, setActiveData] = useState<ChatDetailsResponse | null>(null);

  // --- HOOKS MUST BE AT THE TOP LEVEL ---

  // 1. Fetch Student Info
  const { data: student } = useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      const allKids = await fetchClient<any[]>('/users/my-students');
      return allKids.find(k => k.id === id);
    }
  });

  // 2. Fetch History
  const { 
    data: history = [], 
    isLoading, 
    refetch: refreshHistory 
  } = useQuery({
    queryKey: ['studentHistory', id],
    queryFn: async () => {
      const res = await fetchClient<any>(`/chat/dashboard/student-history/${id}`);
      return Array.isArray(res) ? res : (res.history || []);
    },
    enabled: !!id,
    staleTime: 0,
  });

  // 3. Refresh Summary Mutation (The Logic You Requested)
  const refreshSummaryMutation = useMutation({
    mutationFn: async (chatId: string) => {
      return await fetchClient<AnalysisData>(`/chat/dashboard/refresh-summary/${chatId}`, { method: 'POST' });
    },
    onSuccess: (newAnalysis) => {
      // Synchronously update the UI with the fresh DB data
      setActiveData(prev => prev ? { ...prev, analysis: newAnalysis } : null);
      showModal({ title: 'Sync Complete', message: 'Latest AI analysis saved to database!', type: 'success' });
    },
    onError: (err: any) => showModal({ title: 'Sync Failed', message: err.message, type: 'error' })
  });

  // 4. Generate QP Mutation
  const generateQPMutation = useMutation({
    mutationFn: async (chatIds: string[]) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat/dashboard/generate-paper`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ conversation_ids: chatIds })
      });
      if (!response.ok) throw new Error('Failed to generate paper');
      return await response.text();
    },
    onSuccess: (text) => {
      if (student && text) {
        generateQuestionPaperPDF(student.full_name, text);
        showModal({ title: 'Success', message: 'Question Paper downloaded!', type: 'success' });
        setSelectedChats([]);
      }
    }
  });

  // 5. Fetch Details Mutation
  const fetchDetailsMutation = useMutation({
    mutationFn: async (chatId: string) => {
      return await fetchClient<ChatDetailsResponse>(`/chat/dashboard/details/${chatId}`);
    },
    onSuccess: (data) => setActiveData(data),
  });

  // --- HANDLERS ---

  const handleRowClick = (chatId: string) => {
    setActiveChatId(chatId);
    setActiveData(null); 
    fetchDetailsMutation.mutate(chatId);
  };

  const toggleSelectAll = () => {
    if (selectedChats.length === history.length) setSelectedChats([]);
    else setSelectedChats(history.map((c: ChatSession) => c.id));
  };

  const toggleSelection = (e: React.ChangeEvent<HTMLInputElement>, chatId: string) => {
    e.stopPropagation(); 
    if (selectedChats.includes(chatId)) setSelectedChats(prev => prev.filter(curr => curr !== chatId));
    else setSelectedChats(prev => [...prev, chatId]);
  };

  // --- CONDITIONAL RENDERING AFTER HOOKS ---
  if (isLoading || !student) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
             <h1 className="text-2xl font-black text-slate-900">{student.full_name}'s Report</h1>
             <p className="text-slate-500 text-sm">Review learning analysis and generate quizzes</p>
          </div>
        </div>
        
        <div className="flex gap-3">
            <button onClick={() => refreshHistory()} className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>

            <button
              onClick={() => generateQPMutation.mutate(selectedChats)}
              disabled={generateQPMutation.isPending || selectedChats.length === 0}
              className={`px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${
                selectedChats.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {generateQPMutation.isPending ? "Generating..." : `Generate Question Paper (${selectedChats.length})`}
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
           <div className="flex items-center p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="w-12 flex justify-center">
                <input type="checkbox" checked={selectedChats.length === history.length} onChange={toggleSelectAll} className="w-5 h-5 rounded" />
              </div>
              <div className="flex-1 font-bold text-slate-400 text-xs uppercase tracking-wider">Conversation Topic</div>
              <div className="w-32 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">Date</div>
           </div>

           <div className="divide-y divide-slate-50">
             {history.map((chat: ChatSession) => (
               <div key={chat.id} onClick={() => handleRowClick(chat.id)} className={`flex items-center p-6 cursor-pointer border-l-4 transition-all ${activeChatId === chat.id ? 'bg-blue-50 border-blue-600' : 'border-transparent hover:bg-slate-50'}`}>
                 <div className="w-12 flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedChats.includes(chat.id)} onChange={(e) => toggleSelection(e, chat.id)} className="w-5 h-5 rounded text-blue-600" />
                 </div>
                 <div className="flex-1 font-bold text-slate-800">{chat.title}</div>
                 <div className="w-32 text-right text-sm text-slate-500">{new Date(chat.created_at).toLocaleDateString()}</div>
               </div>
             ))}
           </div>
        </div>

        {/* Analysis Side Panel */}
        <div className="lg:col-span-1">
          {activeChatId ? (
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl p-8 sticky top-8">
               <div className="flex justify-between items-start mb-6">
                 <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Topic Insights</h3>
                 {/* REFRESH BUTTON ADDED HERE */}
                 <button 
                    onClick={() => activeChatId && refreshSummaryMutation.mutate(activeChatId)}
                    disabled={refreshSummaryMutation.isPending}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase flex items-center gap-1"
                  >
                    {refreshSummaryMutation.isPending ? "Syncing..." : "🔄 Sync AI"}
                 </button>
               </div>
               
               {fetchDetailsMutation.isPending ? (
                 <div className="animate-pulse space-y-4">
                   <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                   <div className="h-24 bg-slate-50 rounded"></div>
                 </div>
               ) : activeData ? (
                 <div className="space-y-8">
                    <section>
                      <h4 className="font-bold text-slate-900 mb-2">AI Summary</h4>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {activeData.analysis?.summary || "No analysis stored. Click 'Sync AI' to generate."}
                      </p>
                    </section>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-400 uppercase">Curiosity</p>
                          <p className="text-xl font-black text-blue-700">{activeData.analysis?.curiosity || "..."}</p>
                       </div>
                       <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-400 uppercase">Mastery</p>
                          <p className="text-xl font-black text-emerald-700">{activeData.analysis?.mastery || "..."}</p>
                       </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl text-center">
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Questions Asked</p>
                       <p className="text-lg font-black text-slate-700">{activeData.analysis?.question_count || 0}</p>
                    </div>
                 </div>
               ) : null}
            </div>
          ) : (
            <div className="h-64 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center text-slate-400 font-medium text-center px-4">
              Select a chat from the left to view the AI student report
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReport;