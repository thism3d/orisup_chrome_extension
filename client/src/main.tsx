import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { ToastProvider } from "@/contexts/ToastContext";
import { OrlenbdThemeProvider } from "@/theme/OrlenbdThemeProvider";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, retry: 1 },
  },
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <OrlenbdThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </OrlenbdThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);
