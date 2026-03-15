import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (token) {
      const newSocket = io('http://localhost:5000', {
        auth: { token }, // Send token for handshake auth
        transports: ['websocket'], // Force WebSocket for performance
      });

      newSocket.on('connect', () => setIsConnected(true));
      newSocket.on('disconnect', () => setIsConnected(false));

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
        // If no token, ensure socket is closed
        if(socket) socket.disconnect();
        setSocket(null);
    }
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};