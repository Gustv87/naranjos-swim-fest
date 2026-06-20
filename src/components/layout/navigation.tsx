import { Button } from '@/components/ui/button';
import { getEventRegistrationStatus } from '@/config/event';
import { useRegistrations } from '@/context/registration-context';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const logoPath = '/images/brand/swim-plus-logo.webp';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { activeEvent, setActiveEventId } = useRegistrations();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.hash]);

  const registrationStatus = useMemo(() => getEventRegistrationStatus(activeEvent), [activeEvent]);
  const ctaHref = registrationStatus.isOpen
    ? `/eventos/${activeEvent.id}/inscripcion`
    : '/eventos';

  const navigation = [
    { name: 'Inicio', href: '/#inicio' },
    { name: 'Eventos', href: '/eventos' },
    { name: 'Servicios', href: '/#servicios' },
    { name: 'Nosotros', href: '/#nosotros' },
    { name: 'Galería', href: '/#galeria' },
    { name: 'Contacto', href: '/#contacto' },
  ];

  const transparent = isHome && !isScrolled && !isOpen;

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    if (href.startsWith('/#')) return location.pathname === '/' && location.hash === href.replace('/', '');
    return location.pathname === href || (href === '/eventos' && location.pathname.startsWith('/eventos'));
  };

  const renderNavLink = (item: { name: string; href: string }, mobile = false) => (
    <a
      key={item.name}
      href={item.href}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300',
        mobile ? 'block min-h-11 w-full' : 'inline-flex min-h-11 items-center',
        transparent
          ? 'text-white/88 hover:bg-white/12 hover:text-white'
          : 'text-[#0d1b2a]/78 hover:bg-[#e0f7fa] hover:text-[#0a4d68]',
        isActive(item.href) && (transparent ? 'bg-white/16 text-white' : 'bg-[#e0f7fa] text-[#0a4d68]')
      )}
    >
      {item.name}
    </a>
  );

  return (
    <nav
      className={cn(
        'top-0 z-50 w-full transition-all duration-300',
        isHome ? 'fixed' : 'sticky',
        transparent
          ? 'border-transparent bg-transparent'
          : 'border-b border-[#e0f7fa] bg-white/95 shadow-[0_12px_40px_-30px_rgba(10,77,104,0.7)] backdrop-blur-md'
      )}
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/#inicio" className="flex min-h-11 items-center gap-3" aria-label="Ir al inicio de Swim Plus HN">
          <img
            src={logoPath}
            alt="Swim Plus HN"
            width={44}
            height={44}
            className="h-11 w-11 rounded-full bg-white object-contain p-1 shadow-sm"
          />
          <span className={cn('text-lg font-extrabold tracking-tight', transparent ? 'text-white' : 'text-[#0a4d68]')}>
            Swim Plus HN
          </span>
        </a>

        <div className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => renderNavLink(item))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button
            asChild
            onClick={() => setActiveEventId(activeEvent.id)}
            className="h-11 rounded-full bg-[#088395] px-5 font-bold text-white shadow-lg shadow-cyan-950/10 hover:bg-[#0a4d68]"
          >
            <Link to={ctaHref}>{registrationStatus.isOpen ? 'Inscribirme al evento' : 'Ver eventos'}</Link>
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'min-h-11 min-w-11 rounded-full lg:hidden',
            transparent ? 'text-white hover:bg-white/12 hover:text-white' : 'text-[#0a4d68] hover:bg-[#e0f7fa]'
          )}
          onClick={() => setIsOpen((current) => !current)}
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </Button>
      </div>

      {isOpen && (
        <div className="border-t border-[#e0f7fa] bg-white px-4 pb-5 pt-2 shadow-xl lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map((item) => renderNavLink(item, true))}
            <Button
              asChild
              onClick={() => setActiveEventId(activeEvent.id)}
              className="mt-3 h-12 rounded-full bg-[#088395] font-bold text-white hover:bg-[#0a4d68]"
            >
              <Link to={ctaHref}>{registrationStatus.isOpen ? 'Inscribirme al evento' : 'Ver eventos'}</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
