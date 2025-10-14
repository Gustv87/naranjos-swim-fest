import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const registrationClosed = useMemo(() => new Date() >= new Date('2025-10-08T23:59:59-06:00'), []);
  const registrationClosedMessage = 'Las inscripciones cerraron el 8 de octubre de 2025 a las 23:59:59 (UTC-06).';

  const navigation = [
    { name: 'Inicio', href: '/' },
    { name: 'Inscribirme', href: '/inscripcion', disabled: false, tooltip: registrationClosed ? registrationClosedMessage : undefined },
    { name: 'Resultados', href: '/resultados' },
    { name: 'Reglamento', href: '/reglamento' },
  ];

  return (
    <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Waves className="h-8 w-8 text-primary" />
              <span className="font-bold text-lg text-primary">Los Naranjos</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              item.disabled ? (
                <span
                  key={item.name}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                  title={item.tooltip}
                >
                  {item.name}
                </span>
              ) : (
                <Link key={item.name} to={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    className="transition-smooth"
                    title={item.tooltip}
                  >
                    {item.name}
                  </Button>
                </Link>
              )
            ))}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border bg-card">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                item.disabled ? (
                  <Button
                    key={item.name}
                    variant="ghost"
                    className="w-full justify-start cursor-not-allowed text-muted-foreground"
                    disabled
                    title={item.tooltip}
                  >
                    {item.name}
                  </Button>
                ) : (
                  <Link key={item.name} to={item.href} onClick={() => setIsOpen(false)}>
                    <Button
                      variant={isActive(item.href) ? "default" : "ghost"}
                      className="w-full justify-start"
                      title={item.tooltip}
                    >
                      {item.name}
                    </Button>
                  </Link>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
