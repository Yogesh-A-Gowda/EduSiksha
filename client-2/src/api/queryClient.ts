import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes (prevents repeated calls)
      refetchOnWindowFocus: false,
    },
  },
});