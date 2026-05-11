'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { websocketManager } from '@/lib/websocket';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Connect WebSocket when authenticated
    if (isAuthenticated) {
      websocketManager.connect();
    } else {
      websocketManager.disconnect();
    }

    // Cleanup on unmount
    return () => {
      if (!isAuthenticated) {
        websocketManager.disconnect();
      }
    };
  }, [isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

