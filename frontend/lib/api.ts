import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',
    withCredentials: true, // sends httpOnly cookie on every request
});

// Automatically redirect to login on expired/invalid session
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('user_id');
            localStorage.removeItem('user_type');
            localStorage.removeItem('user_identifier');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
