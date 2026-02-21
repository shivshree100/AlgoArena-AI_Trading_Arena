import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MarketProvider } from "@/store/MarketProvider";
import { useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import BacktestPage from "./pages/BacktestPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Login onLogin={login} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MarketProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index onLogout={logout} />} />
              <Route path="/backtest" element={<BacktestPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </MarketProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

