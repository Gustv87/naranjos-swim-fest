import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect } from 'react';

const Index = lazy(() => import('./pages/Index'));
const Inscripcion = lazy(() => import('./pages/Inscripcion'));
const Reglamento = lazy(() => import('./pages/Reglamento'));
const Resultados = lazy(() => import('./pages/Resultados'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
    Cargando contenido...
  </div>
);

const RedirectPersistence = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem('redirectPath');
    if (stored) {
      sessionStorage.removeItem('redirectPath');
      navigate(stored, { replace: true });
    }
  }, [navigate]);

  return null;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<LoadingScreen />}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <RedirectPersistence />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/inscripcion" element={<Inscripcion />} />
            <Route path="/reglamento" element={<Reglamento />} />
            <Route path="/resultados" element={<Resultados />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
