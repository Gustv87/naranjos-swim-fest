import { Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from 'lucide-react';

interface FooterGMProps {
  dark?: boolean;
}

const logoPath = '/images/brand/swim-plus-logo.webp';

const WHATSAPP_URL = 'https://wa.me/50433438768';

const footerLinks = {
  Eventos: [
    { label: 'Calendario', href: '/eventos' },
    { label: 'Aguas abiertas', href: '/#servicios' },
    { label: 'Piscina', href: '/#servicios' },
    { label: 'Resultados', href: '/resultados' },
  ],
  Información: [
    { label: 'Eventos', href: '/eventos' },
    { label: 'Resultados', href: '/resultados' },
    { label: 'Reglamento', href: '/reglamento' },
    { label: 'Contacto', href: '/#contacto' },
  ],
};

export const FooterGM = ({ dark = true }: FooterGMProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={dark ? 'bg-[#0d1b2a] text-white' : 'bg-[#0d1b2a] text-white'}>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]">
          <div>
            <a href="/#inicio" className="inline-flex items-center gap-3" aria-label="Ir al inicio de Swim Plus HN">
              <img
                src={logoPath}
                alt="Swim Plus HN"
                width={52}
                height={52}
                loading="lazy"
                className="h-[52px] w-[52px] rounded-full bg-white object-contain p-1.5"
              />
              <span className="text-xl font-extrabold">Swim Plus HN</span>
            </a>
            <p className="mt-5 max-w-sm leading-7 text-white/70">
              Organización de eventos de natación en Honduras: competencias de piscina, aguas abiertas, inscripciones, logística y resultados.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook de Swim Plus HN"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#05bfdb] hover:text-[#0d1b2a]"
              >
                <span className="text-sm font-extrabold" aria-hidden="true">f</span>
              </a>
              <a
                href="https://www.instagram.com/swim.plushn"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Swim Plus HN"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#05bfdb] hover:text-[#0d1b2a]"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp de Swim Plus HN"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#10b981] hover:text-white"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="https://www.youtube.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube de Swim Plus HN"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#05bfdb] hover:text-[#0d1b2a]"
              >
                <Youtube className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#05bfdb]">{heading}</h2>
              <ul className="mt-5 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-white/72 transition hover:text-white">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#05bfdb]">Contacto</h2>
            <div className="mt-5 space-y-4 text-white/72">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 transition hover:text-white">
                <Phone className="mt-1 h-5 w-5 text-[#05bfdb]" aria-hidden="true" />
                <span>WhatsApp +504 3343-8768</span>
              </a>
              <a href="mailto:info@swimplushn.com" className="flex items-start gap-3 transition hover:text-white">
                <Mail className="mt-1 h-5 w-5 text-[#05bfdb]" aria-hidden="true" />
                <span>info@swimplushn.com</span>
              </a>
              <p className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 text-[#05bfdb]" aria-hidden="true" />
                <span>Honduras</span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Swim Plus HN. Todos los derechos reservados.</p>
          <p>
            Desarrollado por{' '}
            <a href="mailto:gustavomartinezh87@gmail.com" className="font-semibold text-white transition hover:text-[#05bfdb]">
              GM Dev Studio
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
