import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
if (!res.ok) throw new Error(data.error || 'Login failed');

// FIX: Pass BOTH arguments as defined in your Context
login(data.token, data.user); 

// Logic to navigate based on the user object you just received
if (data.user.isAdmin || data.user.is_admin) {
  navigate('/dashboard');
} else {
  navigate('/chat');
}
    } catch (err: any) {
      setError(err.message);
    }
  };
  return (
    <div className="flex h-screen items-center justify-center bg-[#131314] text-white">
      <form onSubmit={handleSubmit} className="bg-[#1e1f20] p-8 rounded-xl w-96 border border-gray-800">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-500">Sign In</h2>
        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#131314] border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none" required />
          </div>
          <div>
            <label className="text-sm text-gray-400">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#131314] border border-gray-700 rounded p-2 mt-1 focus:border-blue-500 outline-none" required />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded mt-4 transition-all">Login</button>
        </div>
      </form>
    </div>
  );
};

export default Login;