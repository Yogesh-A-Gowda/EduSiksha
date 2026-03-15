export interface User {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isPaid: boolean;
  parentId?: string;
}

// src/types.ts
export interface Message {
  id: string; // Add this line
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  file_url?: string; // Helpful for the source badges we discussed
  file_name?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

