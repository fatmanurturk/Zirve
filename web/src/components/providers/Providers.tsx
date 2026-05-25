"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  const { fetchMe, token } = useAuthStore();

  // Token varsa uygulama açılışında bir kez kullanıcıyı doğrula
  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      useAuthStore.setState({ isInitialized: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
