import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { fetchClient } from '../../../api/fetchClient';
import { useModal } from '../../../context/ModalContext';

const RegisterParent = () => {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showModal } = useModal();

  const registerMutation = useMutation({
    mutationFn: async (userData: typeof form) => {
      return await fetchClient<any>('/users/register-parent', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      showModal({
        title: 'Welcome!',
        message: 'Your parent account has been created. Let\'s set up your students.',
        type: 'success',
        confirmText: 'Let\'s Go',
        onConfirm: () => navigate('/onboarding/add-kid')
      });
    },
    onError: (err: any) => {
      showModal({
        title: 'Registration Failed',
        message: err.message,
        type: 'error'
      });
    }
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Parent Sign Up</h2>
          <p className="mt-2 text-sm text-gray-500">Create an account to manage student learning</p>
        </div>

        <form onSubmit={handleRegister} className="mt-8 space-y-4">
          <input 
            type="text" placeholder="Full Name" 
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
            required
            value={form.full_name}
            onChange={e => setForm({...form, full_name: e.target.value})} 
          />
          <input 
            type="email" placeholder="Email" 
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
            required
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} 
          />
          <input 
            type="password" placeholder="Password" 
            className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
            required
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} 
          />
          <button 
            disabled={registerMutation.isPending}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-300"
          >
            {registerMutation.isPending ? 'Creating Account...' : 'Next: Add Children'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500">
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterParent;