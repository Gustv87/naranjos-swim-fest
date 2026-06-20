import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from 'react';
import { ArrowUp, MessageCircle } from 'lucide-react';

const Index = lazy(() => import('./pages/Index'));
const Eventos = lazy(() => import('./pages/Eventos'));
const Inscripcion = lazy(() => import('./pages/Inscripcion'));
const Reglamento = lazy(() => import('./pages/Reglamento'));
const Resultados = lazy(() => import('./pages/Resultados'));
const Admin = lazy(() => import('./pages/Admin'));
const NotFound = lazy(() => import('./pages/NotFound'));

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#e0f7fa] text-sm text-[#0a4d68]">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-24 overflow-hidden rounded-full bg-white shadow-soft">
        <div className="wave-loader h-full w-[200%]" />
      </div>
      Cargando contenido...
    </div>
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

const SplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsVisible(false), 1100);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="splash-screen" aria-label="Cargando Swim Plus HN">
      <img
        src="/images/brand/swim-plus-logo.webp"
        alt="Swim Plus HN"
        width={84}
        height={84}
        className="rounded-full bg-white p-2 shadow-card"
      />
      <div className="mt-5 h-3 w-40 overflow-hidden rounded-full bg-white/60">
        <div className="wave-loader h-full w-[200%]" />
      </div>
      <p className="mt-4 text-sm font-semibold text-[#0a4d68]">Preparando tu experiencia acuática...</p>
    </div>
  );
};

const SiteUtilities = () => {
  const [showTop, setShowTop] = useState(false);
  const { pathname } = useLocation();
  const hidePublicActions = pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setShowTop(window.scrollY > 300);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (hidePublicActions) return null;

  return (
    <>
      <a
        href="https://wa.me/50433438768"
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp"
        aria-label="Contactar a Swim Plus HN por WhatsApp"
      >
        <MessageCircle className="h-7 w-7" aria-hidden="true" />
      </a>
      <button
        type="button"
        className={`scroll-top-button ${showTop ? 'is-visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
};

const adminEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_ADMIN === 'true';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Suspense fallback={<LoadingScreen />}>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <SplashScreen />
          <RedirectPersistence />
          <ScrollToTop />
          <SiteUtilities />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/eventos" element={<Eventos />} />
            <Route path="/eventos/:eventId" element={<Eventos />} />
            <Route path="/eventos/:eventId/inscripcion" element={<Inscripcion />} />
            <Route path="/eventos/:eventId/reglamento" element={<Reglamento />} />
            <Route path="/eventos/:eventId/resultados" element={<Resultados />} />
            <Route path="/inscripcion" element={<Inscripcion />} />
            <Route path="/reglamento" element={<Reglamento />} />
            <Route path="/resultados" element={<Resultados />} />
            {adminEnabled ? (
              <>
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/run" element={<Admin />} />
              </>
            ) : (
              <>
                <Route path="/admin" element={<NotFound />} />
                <Route path="/admin/run" element={<NotFound />} />
              </>
            )}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </Suspense>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
