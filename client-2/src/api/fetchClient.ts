/**
 * fetchClient.ts
 * Centralized fetch utility for EDU-AI
 * Handles: Auth headers, Base URL, and Global Error Triage
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

// export const fetchClient = async <T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<T> => {
//   const token = localStorage.getItem('token');

//   // Define headers as a plain object for easy manipulation
//   const headers: Record<string, string> = {
//     'Content-Type': 'application/json',
//     ...(options.headers as Record<string, string> || {}),
//   };

//   // Attach Bearer token if it exists (Matches your Postman logic)
//   if (token) {
//     headers['Authorization'] = `Bearer ${token}`;
//   }

//   const config: RequestInit = {
//     ...options,
//     headers,
//   };

//   try {
//     const response = await fetch(`${BASE_URL}${endpoint}`, config);

//     // 1. Log response for Web-triage purposes
//     if (!response.ok) {
//       console.error(`[API Error] ${response.status} ${response.statusText} at ${endpoint}`);
//     }

//     // 2. Handle 401 Unauthorized (Session Expired or Bad Login)
//     if (response.status === 401) {
//       // If it's not the login endpoint itself, clear storage
//       if (endpoint !== '/users/login') {
//         localStorage.clear();
//         window.location.href = '/login';
//       }
//     }

//     const data = await response.json();

//     // 3. Throw formatted error so catch blocks can read the message
//     if (!response.ok) {
//       throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
//     }

//     return data as T;
//   } catch (err: any) {
//     console.error("Fetch Execution Error:", err.message);
//     throw err;
//   }
// };



export async function fetchClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If uploading a file, remove Content-Type so browser sets boundary automatically
  if (options.body instanceof FormData) {
    delete (headers as any)['Content-Type'];
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Subscription Required: Please upgrade to use this feature.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  if (response.status === 401) {
    // If we get a 401, the token is dead in the eyes of the server (NeonDB)
    localStorage.removeItem('token');
    
    // Only redirect if we aren't already on the login page
    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?reason=expired';
    }
    throw new Error("Unauthorized: Please login again.");
}

  return response.json();
}