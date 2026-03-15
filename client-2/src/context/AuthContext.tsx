  import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
  //import { jwtDecode } from 'jwt-decode';

  // Define the shape of the User inside the JWT
 interface UserPayload {
  id: string;
  email: string;
  fullName?: string; // Add this
  isAdmin?: boolean; 
  is_admin?: boolean;
  iat?: number;
  exp?: number;
}

  interface AuthContextType {
  token: string | null;
  user: UserPayload | null;
  loading: boolean;
  login: (token: string, userData: any) => void; // <--- Update this line
  logout: () => void;
  isAuthenticated: boolean;
}

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  // Initialize user from localStorage to survive refreshes
  const [user, setUser] = useState<any | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // Update login to accept both token and user object
  const login = (newToken: string, userData: any) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
  };