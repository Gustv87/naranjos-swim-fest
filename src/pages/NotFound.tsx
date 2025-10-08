import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { FooterGM } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/lago-yojoa-hero.jpg";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 relative">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Natación en el Lago de Yojoa"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center px-6 py-24 text-center text-white">
          <div className="max-w-2xl space-y-6 bg-black/40 rounded-3xl px-8 py-12 backdrop-blur">
            <span className="inline-flex items-center rounded-full bg-white/20 px-4 py-1 text-sm font-semibold uppercase tracking-wide">
              404 · Corriente desconocida
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">
              Navegaste fuera de las aguas del evento
            </h1>
            <p className="text-lg md:text-xl text-white/90">
              No encontramos la boya que estás buscando. Usa el radar y regresa al mapa principal para seguir explorando el Encuentro de Aguas Abiertas Los Naranjos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button asChild size="lg" className="button-gradient shadow-button text-lg px-8 py-6 h-auto font-semibold">
                <Link to="/">Volver al inicio</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 h-auto bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
                <Link to="/inscripcion">Ir a inscripciones</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <FooterGM dark />
    </div>
  );
};

export default NotFound;
