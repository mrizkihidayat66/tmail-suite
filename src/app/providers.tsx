"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";
import { ConfirmModalProvider } from "@/hooks/useConfirmModal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmModalProvider>
        {children}
      </ConfirmModalProvider>
      <Toaster
        position="top-right"
        toastOptions={{ duration: 4000, style: { fontSize: "14px" } }}
      />
    </QueryClientProvider>
  );
}
