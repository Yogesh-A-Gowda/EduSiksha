import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchClient } from '../../api/fetchClient';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import { io } from 'socket.io-client';

// Initialize socket outside component to prevent multiple connections on re-render
const socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
  query: { userId: JSON.parse(localStorage.getItem('user') || '{}').id },
  auth: { token: localStorage.getItem('token') }
});

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { showModal } = useModal();
  const [activeUserIds, setActiveUserIds] = useState<string[]>([]);

  // 1. Listen for Real-time Presence Updates
  useEffect(() => {
    // Initial fetch of who is online right now
    const fetchOnline = async () => {
      try {
        const data = await fetchClient<{ onlineIds: string[] }>('/chat/active-sessions');
        setActiveUserIds(data.onlineIds);
      } catch (e) { console.error("Could not fetch online status"); }
    };
    fetchOnline();

    // Listen for socket events
    socket.on('presence_update', (ids: string[]) => {
      console.log("Presence Update:", ids);
      setActiveUserIds(ids);
    });

    return () => {
      socket.off('presence_update');
    };
  }, []);

  // 2. Fetch Kids List
  const { data: kids = [], isLoading } = useQuery({
    queryKey: ['kids'],
    queryFn: async () => {
      const data = await fetchClient<any[]>('/users/my-students');
      return data.filter(u => !u.is_admin);
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  const handleLogout = () => {
    showModal({
      type: 'confirm',
      title: 'Sign Out',
      message: 'Are you sure you want to log out?',
      confirmText: 'Log Out',
      onConfirm: logout
    });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Parent Dashboard</h1>
          <p className="text-slate-500">Welcome back, {user?.fullName}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate('/onboarding/add-kid')}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Manage Students
          </button>
          <button 
            onClick={handleLogout}
            className="bg-white text-slate-600 border border-slate-200 px-6 py-2 rounded-xl font-bold hover:bg-slate-50 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {/* Total Students Metric */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Total Students</h3>
          <p className="text-4xl font-black text-slate-800">{kids.length}</p>
        </div>

        {/* Active Sessions Metric */}
        {/* <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
          <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Live Sessions</h3>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-black text-blue-600">
              {activeUserIds.length}
            </p>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Students currently chatting</p>
        </div> */}

        {/* Student Cards List */}
        <div className="md:col-span-3 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Your Students</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kids.map((kid: any) => {
              // Exact UUID match for the Green Border logic
              const isOnline = activeUserIds.includes(kid.id);
              
              return (
                <div 
                  key={kid.id} 
                  className={`p-6 rounded-2xl border transition-all relative bg-white ${
                    isOnline 
                      ? 'border-green-500 shadow-md shadow-green-50 ring-2 ring-green-50' 
                      : 'border-slate-100'
                  }`}
                >
                  {/* Blinking Live Indicator */}
                  {isOnline && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-[10px] font-black text-green-600 uppercase">Live</span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      isOnline ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {kid.full_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{kid.full_name}</h4>
                      <p className="text-xs text-slate-400">
                        {isOnline ? 'Active Now' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/report/${kid.id}`)}
                    className="w-full text-right mt-3 text-[10px] text-slate-400 uppercase font-bold hover:text-blue-600 flex items-center justify-end gap-1"
                  >
                    View Reports <span>→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;