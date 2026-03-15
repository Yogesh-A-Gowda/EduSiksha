import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClient } from '../../api/fetchClient';
import { useModal } from '../../context/ModalContext';

const AddKidOnboarding = () => {
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });
  const navigate = useNavigate();
  const { showModal } = useModal();
  const queryClient = useQueryClient();

  // 1. Fetch Students
  const { data: kids = [], isLoading } = useQuery({
    queryKey: ['kids'],
    queryFn: async () => {
      const data = await fetchClient<any[]>('/users/my-students');
      return data.filter(u => !u.is_admin);
    }
  });

  // 2. Create Student Mutation
  const createMutation = useMutation({
    mutationFn: (newKid: any) => fetchClient('/users/create-student', {
      method: 'POST',
      body: JSON.stringify(newKid),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      setFormData({ email: '', password: '', full_name: '' });
      showModal({ title: 'Success', message: 'Student account created successfully!', type: 'success' });
    },
    onError: (err: any) => {
      let sentence = err.message
      if(sentence.includes("email"))
      showModal({ title: 'Creation Failed', message: "Email is already in use", type: 'error' });
    }
  });

  // 3. Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchClient(`/users/delete-student/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kids'] });
      showModal({ title: 'Deleted', message: 'Account and history successfully cleared.', type: 'success' });
    },
    onError: (err: any) => showModal({ title: 'Delete Failed', message: err.message, type: 'error' })
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (kids.length >= 3) return;
    createMutation.mutate(formData);
  };

  const handleDeleteClick = (id: string, name: string) => {
    showModal({
      type: 'confirm',
      title: 'Delete Student?',
      message: `WARNING: Are you sure you want to delete ${name}? \nThis will permanently erase their entire chat history and analysis data.`,
      confirmText: 'Yes, Delete',
      onConfirm: () => deleteMutation.mutate(id),
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900">Account Onboarding</h1>
          <p className="text-slate-500 mt-1">Manage your student access and permissions</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Create Form */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h2 className="text-2xl font-bold mb-6 text-slate-800">Create Student Account</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase ml-2">Full Name</label>
               <input type="text" placeholder="John Doe" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase ml-2">Email Address</label>
               <input type="email" placeholder="kid@example.com" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase ml-2">Password</label>
               <input type="password" placeholder="••••••••" required className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            <button 
              disabled={createMutation.isPending || kids.length >= 3} 
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg ${
                kids.length >= 3 ? 'bg-slate-200 shadow-none cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              {createMutation.isPending ? "Creating..." : kids.length >= 3 ? "Limit (3) Reached" : "Create Account"}
            </button>
          </form>
        </div>

        {/* Management List */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-bold text-slate-800">Manage Access</h2>
            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{kids.length}/3 Accounts</span>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400">Loading students...</div>
            ) : kids.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-slate-400">
                No students added yet.
              </div>
            ) : (
              kids.map((kid: any) => (
                <div key={kid.id} className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-blue-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                      {kid.full_name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{kid.full_name}</p>
                      <p className="text-xs text-slate-400">{kid.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteClick(kid.id, kid.full_name)} 
                    className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddKidOnboarding;