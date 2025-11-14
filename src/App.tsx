import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import ProtectedByRole from "@/routes/ProtectedByRole";
import ProdutorDashboard from "@/pages/Produtor/Dashboard";
import Admin from "./pages/Admin";
import Fazendas from "@/pages/Produtor/Fazendas";
import Cultivos from "@/pages/Produtor/Cultivos";
import Estoque from "@/pages/Produtor/Estoque";
import Ofertas from "@/pages/Produtor/Ofertas";
import RelatoriosProdutor from "@/pages/Produtor/Relatorios";
import ClienteDashboard from "@/pages/Cliente/Dashboard";
import Marketplace from "@/pages/Cliente/Marketplace";
import Carrinho from "@/pages/Cliente/Carrinho";
import Compra from "@/pages/Cliente/Compra";
import Historico from "@/pages/Cliente/Historico";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Hook de inatividade - desconecta após 5 minutos
  useInactivityLogout();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    setHasToken(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Carregando...</p>
    </div>;
  }

  if (!hasToken) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route
            path="/produtor/dashboard"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["PRODUTOR"]}>
                  <ProdutorDashboard />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtor/fazendas"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["PRODUTOR"]}>
                  <Fazendas />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtor/cultivos"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["PRODUTOR"]}>
                  <Cultivos />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtor/estoque"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["PRODUTOR"]}>
                  <Estoque />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtor/ofertas"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["PRODUTOR"]}>
                  <Ofertas />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/produtor/relatorios"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["PRODUTOR"]}>
                  <RelatoriosProdutor />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente/dashboard"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["CLIENTE"]}>
                  <ClienteDashboard />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente/marketplace"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["CLIENTE"]}>
                  <Marketplace />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente/carrinho"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["CLIENTE"]}>
                  <Carrinho />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente/compra"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["CLIENTE"]}>
                  <Compra />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cliente/historico"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["CLIENTE"]}>
                  <Historico />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <ProtectedByRole allow={["ADMIN"]}>
                  <Admin />
                </ProtectedByRole>
              </ProtectedRoute>
            }
          />
