import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRegistrations } from '@/context/registration-context';
import { isEventRegistrationOpen } from '@/config/event';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Droplets,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Waves,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1920&q=80&auto=format&fit=crop';

// TODO: validar el número real de WhatsApp público de Swim Plus HN.
const WHATSAPP_NUMBER = '50433438768';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

const SECTION_EYEBROW_CLASS = 'text-[#088395] bg-[#e0f7fa] border-[#05bfdb]/30';

const programs = [
  {
    title: 'Eventos de aguas abiertas',
    level: 'Competencia',
    image:
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80&auto=format&fit=crop',
    description: 'Cruces, travesías y competencias fuera de piscina con logística y seguridad.',
    duration: 'Aguas abiertas',
    frequency: 'Inscripción digital',
  },
  {
    title: 'Torneos de piscina',
    level: 'Piscina',
    image:
      'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&q=80&auto=format&fit=crop',
    description: 'Heats, carriles, categorías y reportes para torneos de natación en piscina.',
    duration: 'Heats y carriles',
    frequency: 'Resultados por prueba',
  },
  {
    title: 'Inscripciones y pagos',
    level: 'Gestión',
    image:
      'https://images.unsplash.com/photo-1551434678-e076c223a692?w=900&q=80&auto=format&fit=crop',
    description: 'Registro de atletas, comprobantes, dorsales, categorías y estados de validación.',
    duration: 'Dorsales',
    frequency: 'Control administrativo',
  },
  {
    title: 'Cronometraje y resultados',
    level: 'Operación',
    image:
      'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=900&q=80&auto=format&fit=crop',
    description: 'Planillas para cronometristas, carga de tiempos y reportes por categoría.',
    duration: 'Planillas',
    frequency: 'Reportes finales',
  },
  {
    title: 'Seguridad y logística',
    level: 'Evento seguro',
    image:
      'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=900&q=80&auto=format&fit=crop',
    description: 'Coordinación de puntos de control, apoyo acuático y experiencia del participante.',
    duration: 'Ruta y staff',
    frequency: 'Check-in',
  },
  {
    title: 'Preparación para eventos',
    level: 'Soporte',
    image:
      'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?w=900&q=80&auto=format&fit=crop',
    description: 'Orientación técnica para nadadores que se preparan para competir.',
    duration: 'Acompañamiento',
    frequency: 'Según evento',
  },
];

const whyCards = [
  {
    icon: <Trophy className="h-7 w-7" aria-hidden="true" />,
    title: 'Eventos bien organizados',
    description: 'Planificamos competencias con estructura clara, categorías, dorsales, check-in y resultados.',
  },
  {
    icon: <Users className="h-7 w-7" aria-hidden="true" />,
    title: 'Experiencia para participantes',
    description: 'Flujo de inscripción, validación y comunicación pensado para nadadores, familias y clubes.',
  },
  {
    icon: <Waves className="h-7 w-7" aria-hidden="true" />,
    title: 'Piscina y aguas abiertas',
    description: 'Eventos adaptados al tipo de competencia: carriles y heats en piscina, rutas y seguridad en aguas abiertas.',
  },
  {
    icon: <ShieldCheck className="h-7 w-7" aria-hidden="true" />,
    title: 'Seguridad y control',
    description: 'Priorizamos logística, orden y acompañamiento para que el evento se sienta profesional.',
  },
];

const coaches = [
  {
    name: 'Eder',
    role: 'Entrenador Swim Plus HN',
    imageUrl: '/images/coaches/eder.jpeg',
  },
  {
    name: 'Luis',
    role: 'Entrenador Swim Plus HN',
    imageUrl: '/images/coaches/luis.jpeg',
  },
  {
    name: 'Carlos',
    role: 'Entrenador Swim Plus HN',
    imageUrl: '/images/coaches/carlos.jpeg',
  },
];

const testimonials = [
  {
    initials: 'OS',
    name: '@osmanurbinasantos',
    role: '@swim.plushn',
    text: 'Excelente salió el evento. Esperemos se repita pronto 🔥',
  },
  {
    initials: 'MQ',
    name: '@marlenquiroz',
    role: '@swim.plushn',
    text: 'Muchas felicidades, el evento Gracias a Dios fue todo un exito!',
  },
  {
    initials: 'ME',
    name: '@mariaeugeniameca',
    role: '@swim.plushn',
    text: 'Muchas felicidades! Calidad de evento, mis mayores respetos. Gracias gracias a todo el equipo de la cruz roja que nos cuidaron en cada momento. Desde ya espero el próximo evento.',
  },
];

const galleryImages = [
  { src: '/images/moments/1.jpg', alt: 'Nadadores de Swim Plus HN durante un evento' },
  { src: '/images/moments/2.jpg', alt: 'Comunidad Swim Plus HN en competencia' },
  { src: '/images/moments/3.jpg', alt: 'Participantes de Swim Plus HN en aguas abiertas' },
  { src: '/images/moments/4.jpg', alt: 'Momento de celebración de Swim Plus HN' },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const SectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => (
  <div className="mx-auto mb-12 max-w-3xl text-center reveal-on-scroll">
    <Badge variant="outline" className={`mb-4 ${SECTION_EYEBROW_CLASS}`}>
      {eyebrow}
    </Badge>
    <h2 className="text-3xl font-extrabold tracking-tight text-[#0d1b2a] sm:text-4xl lg:text-5xl">
      {title}
    </h2>
    <p className="mt-4 text-base leading-7 text-[#6b7280] sm:text-lg">{description}</p>
  </div>
);

const WaveDivider = ({ className = 'text-white' }: { className?: string }) => (
  <svg
    className={`absolute bottom-[-1px] left-0 h-20 w-full ${className}`}
    viewBox="0 0 1440 120"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      fill="currentColor"
      d="M0,64L80,69.3C160,75,320,85,480,74.7C640,64,800,32,960,32C1120,32,1280,64,1360,80L1440,96L1440,120L0,120Z"
    />
  </svg>
);

const StatBadge = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
    <div className="text-2xl font-extrabold text-white">{value}</div>
    <div className="text-xs font-medium uppercase tracking-wide text-white/75">{label}</div>
  </div>
);

const CountUpStat = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDisplayValue(value);
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1200;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isVisible, value]);

  return (
    <div ref={ref} className="reveal-on-scroll rounded-3xl border border-white/15 bg-white/10 p-6 text-center backdrop-blur-md">
      <div className="text-5xl font-extrabold text-white">
        {displayValue}
        {suffix}
      </div>
      <p className="mt-2 text-sm font-medium uppercase tracking-wide text-white/75">{label}</p>
    </div>
  );
};

const ProgramMeta = ({ icon, text }: { icon: ReactNode; text: string }) => (
  <div className="flex items-center gap-2 text-sm text-[#6b7280]">
    <span className="text-[#088395]">{icon}</span>
    {text}
  </div>
);

const Index = () => {
  const { events, setActiveEventId } = useRegistrations();

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => event.status !== 'past' && new Date(event.dateTime) >= new Date())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [events]
  );

  const ctaEvent = upcomingEvents.find((event) => isEventRegistrationOpen(event)) ?? upcomingEvents[0];
  const ctaPath = ctaEvent && isEventRegistrationOpen(ctaEvent)
    ? `/eventos/${ctaEvent.id}/inscripcion`
    : '/eventos';
  const ctaLabel = ctaEvent && isEventRegistrationOpen(ctaEvent) ? 'Inscribirme al evento' : 'Ver próximos eventos';

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('.reveal-on-scroll'));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -80px', threshold: 0.12 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const handleCtaClick = () => {
    if (ctaEvent) setActiveEventId(ctaEvent.id);
  };

  return (
    <div className="min-h-screen bg-white text-[#0d1b2a]">
      <Navigation />

      <main>
        <section id="inicio" className="home-hero relative flex min-h-[600px] items-center overflow-hidden lg:min-h-screen">
          <img
            src={HERO_IMAGE}
            alt="Evento de natación en piscina Swim Plus HN"
            width={1920}
            height={1080}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,77,104,0.88),rgba(8,131,149,0.72))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(5,191,219,0.32),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(224,247,250,0.2),transparent_28%)]" />

          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-28 pt-32 text-center text-white sm:px-6 lg:px-8">
            <Badge className="mb-6 border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Eventos de natación en Honduras
            </Badge>

            <h1 className="max-w-5xl text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
              Organizamos eventos de natación con experiencia profesional
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-white/88 sm:text-xl">
              Competencias de piscina y aguas abiertas · Inscripciones digitales · Heats, carriles, resultados y logística
            </p>

            <div className="mt-9 flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-full bg-[#05bfdb] px-7 text-base font-bold text-[#0d1b2a] shadow-2xl shadow-cyan-950/25 hover:bg-[#e0f7fa]">
                <Link to="/eventos">
                  Ver calendario de eventos
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-white/35 bg-white/10 px-7 text-base font-bold text-white backdrop-blur-md hover:bg-white hover:text-[#0a4d68]">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Contactar a Swim Plus HN por WhatsApp">
                  <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                  Organizar evento por WhatsApp
                </a>
              </Button>
            </div>

            {/* TODO: reemplazar estas cifras con datos reales auditados de Swim Plus HN. */}
            <div className="mt-12 grid w-full max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
              <StatBadge value="50+" label="Eventos" />
              <StatBadge value="500+" label="Participantes" />
              <StatBadge value="Piscina" label="y aguas abiertas" />
              <StatBadge value="HN" label="Honduras" />
            </div>
          </div>

          <WaveDivider />
        </section>

        <section id="nosotros" className="relative bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Por qué elegirnos"
              title="¿Por qué Swim Plus HN?"
              description="Diseñamos eventos ordenados, medibles y seguros para que atletas, familias y clubes vivan una competencia profesional."
            />

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {whyCards.map((card) => (
                <Card key={card.title} className="reveal-on-scroll group border-[#e0f7fa] bg-white shadow-[0_18px_60px_-30px_rgba(10,77,104,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(10,77,104,0.45)]">
                  <CardContent className="p-6">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0f7fa] text-[#088395] transition-all duration-300 group-hover:bg-[#05bfdb] group-hover:text-[#0d1b2a]">
                      {card.icon}
                    </div>
                    <h3 className="text-xl font-extrabold text-[#0d1b2a]">{card.title}</h3>
                    <p className="mt-3 leading-7 text-[#6b7280]">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f4fbfc] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Calendario"
              title="Próximos eventos"
              description="Consulta las competencias disponibles, revisa distancias y entra directo al formulario cuando las inscripciones estén abiertas."
            />

            {upcomingEvents.length ? (
              <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
                {upcomingEvents.slice(0, 3).map((event) => {
                  const eventOpen = isEventRegistrationOpen(event);
                  return (
                    <Card key={event.id} className="reveal-on-scroll overflow-hidden border-0 bg-white shadow-[0_18px_60px_-30px_rgba(10,77,104,0.35)]">
                      <div className="h-44 bg-[#0a4d68] bg-cover bg-center" style={{ backgroundImage: `url("${event.posterImageUrl || HERO_IMAGE}")` }} />
                      <CardContent className="space-y-5 p-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium text-[#088395]">
                            <CalendarDays className="h-4 w-4" aria-hidden="true" />
                            {formatDate(event.dateTime)}
                          </div>
                          <h3 className="text-2xl font-extrabold text-[#0d1b2a]">{event.name}</h3>
                          <p className="flex items-center gap-2 text-sm text-[#6b7280]">
                            <MapPin className="h-4 w-4 text-[#088395]" aria-hidden="true" />
                            {event.locationShort}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {event.distances.slice(0, 4).map((distance, index) => (
                            <Badge key={`${event.id}-${distance.value}-${index}`} variant="outline" className="border-[#05bfdb]/30 text-[#0a4d68]">
                              {distance.label}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button asChild onClick={() => setActiveEventId(event.id)} className="rounded-full bg-[#088395] text-white hover:bg-[#0a4d68]">
                            <Link to={`/eventos/${event.id}`}>Ver detalles</Link>
                          </Button>
                          <Button
                            asChild={eventOpen}
                            disabled={!eventOpen}
                            variant="outline"
                            onClick={() => setActiveEventId(event.id)}
                            className="rounded-full"
                          >
                            {eventOpen ? (
                              <Link to={`/eventos/${event.id}/inscripcion`}>Inscribirme</Link>
                            ) : (
                              <span>Inscripciones cerradas</span>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="reveal-on-scroll border-[#e0f7fa] bg-white text-center shadow-[0_18px_60px_-30px_rgba(10,77,104,0.35)]">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-extrabold text-[#0d1b2a]">Nuevo calendario en preparación</h3>
                  <p className="mt-2 text-[#6b7280]">Pronto publicaremos las próximas competencias de Swim Plus HN.</p>
                  <Button asChild className="mt-6 rounded-full bg-[#088395] text-white hover:bg-[#0a4d68]">
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section id="servicios" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Servicios"
              title="Servicios para eventos de natación"
              description="Desde la inscripción hasta los reportes finales, apoyamos la operación completa de competencias de piscina y aguas abiertas."
            />

            <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {programs.map((program) => (
                <Card key={program.title} className="reveal-on-scroll overflow-hidden border-0 bg-white shadow-[0_18px_60px_-30px_rgba(10,77,104,0.35)]">
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={program.image}
                      alt={program.title}
                      width={900}
                      height={560}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <Badge className="absolute left-4 top-4 bg-white/92 text-[#0a4d68] shadow-lg">
                      {program.level}
                    </Badge>
                  </div>
                  <CardContent className="space-y-5 p-6">
                    <div>
                      <h3 className="text-2xl font-extrabold text-[#0d1b2a]">{program.title}</h3>
                      <p className="mt-2 line-clamp-2 leading-7 text-[#6b7280]">{program.description}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <ProgramMeta icon={<Clock3 className="h-4 w-4" aria-hidden="true" />} text={program.duration} />
                      <ProgramMeta icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />} text={program.frequency} />
                    </div>
                    <Button asChild className="w-full rounded-full bg-[#088395] text-white hover:bg-[#0a4d68]">
                      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                        Consultar servicio
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0a4d68,#088395)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="absolute inset-0 opacity-25">
            <svg className="h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 180C190 90 290 300 500 190C720 75 860 230 1200 120V500H0Z" fill="#05bfdb" />
              <path d="M0 260C230 140 360 350 590 250C790 165 930 290 1200 210V500H0Z" fill="#e0f7fa" opacity="0.55" />
            </svg>
          </div>
          <div className="relative mx-auto max-w-7xl">
            {/* TODO: reemplazar estas cifras con métricas reales. */}
            <div className="grid gap-5 md:grid-cols-4">
              <CountUpStat value={50} suffix="+" label="Eventos realizados" />
              <CountUpStat value={500} suffix="+" label="Participantes gestionados" />
              <CountUpStat value={10} suffix="+" label="Años de experiencia" />
              <CountUpStat value={95} suffix="%" label="Satisfacción" />
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1400px]">
            <SectionHeading
              eyebrow="Entrenadores"
              title="Equipo técnico y organización"
              description="El equipo real de Swim Plus HN respalda la operación deportiva, técnica y logística de cada evento."
            />

            <div className="grid gap-8 md:grid-cols-3">
              {coaches.map((coach) => (
                <Card
                  key={coach.imageUrl}
                  className="reveal-on-scroll overflow-hidden border-0 bg-white shadow-[0_24px_80px_-35px_rgba(10,77,104,0.45)]"
                >
                  <div className="relative aspect-[4/5] min-h-[420px] overflow-hidden bg-[linear-gradient(135deg,#0a4d68,#05bfdb)]">
                    <img
                      src={coach.imageUrl}
                      alt={`${coach.name}, entrenador de Swim Plus HN`}
                      width={700}
                      height={875}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0d1b2a]/85 to-transparent p-6 text-white">
                      <p className="text-2xl font-extrabold">{coach.name}</p>
                      <p className="text-sm font-medium text-white/78">{coach.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="galeria" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Prueba social"
              title="Lo que dicen los participantes"
              description="Comentarios reales de la comunidad después de los eventos de Swim Plus HN."
            />

            <div className="flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:thin]">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name} className="reveal-on-scroll min-w-[300px] snap-center border-[#e0f7fa] bg-white shadow-[0_18px_60px_-30px_rgba(10,77,104,0.35)] sm:min-w-[380px]">
                  <CardContent className="p-6">
                    <div className="mb-5 flex gap-1 text-[#05bfdb]" aria-label="Cinco estrellas">
                      {[0, 1, 2, 3, 4].map((star) => (
                        <Star key={star} className="h-5 w-5 fill-current" aria-hidden="true" />
                      ))}
                    </div>
                    <p className="min-h-[112px] text-lg leading-8 text-[#0d1b2a]">“{testimonial.text}”</p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a4d68] text-sm font-extrabold text-white">
                        {testimonial.initials}
                      </div>
                      <div>
                        <p className="font-bold text-[#0d1b2a]">{testimonial.name}</p>
                        <p className="text-sm text-[#6b7280]">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-4" aria-label="Galería Swim Plus HN">
              {galleryImages.map((image) => (
                <div key={image.src} className="reveal-on-scroll group relative aspect-[4/5] overflow-hidden rounded-3xl bg-[#e0f7fa]">
                  <img
                    src={image.src}
                    alt={image.alt}
                    width={520}
                    height={650}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a]/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="relative overflow-hidden bg-[#e0f7fa] px-4 py-20 sm:px-6 lg:px-8">
          <div className="absolute inset-x-0 top-0 h-24 text-white">
            <svg className="h-full w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
              <path
                fill="currentColor"
                d="M0,0L80,16C160,32,320,64,480,58.7C640,53,800,11,960,10.7C1120,11,1280,53,1360,74.7L1440,96L1440,0Z"
              />
            </svg>
          </div>

          <div className="relative mx-auto max-w-5xl rounded-[2rem] bg-[linear-gradient(135deg,#0a4d68,#088395)] p-8 text-center text-white shadow-[0_30px_100px_-40px_rgba(10,77,104,0.7)] sm:p-12">
            <Badge className="mb-5 border-white/25 bg-white/15 text-white">Empieza hoy</Badge>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">¿Listo para tu próximo evento?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-white/82">
              Participa en el próximo evento o conversemos para organizar una competencia de natación.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" onClick={handleCtaClick} className="h-14 rounded-full bg-[#05bfdb] px-8 font-bold text-[#0d1b2a] hover:bg-white">
                <Link to={ctaPath}>
                  {ctaLabel}
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-white/35 bg-white/10 px-8 font-bold text-white hover:bg-white hover:text-[#0a4d68]">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
                  Llamar / WhatsApp
                </a>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-left text-sm text-white/82 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#05bfdb]" aria-hidden="true" />
                Categorías y dorsales
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
                <Droplets className="h-5 w-5 text-[#05bfdb]" aria-hidden="true" />
                Eventos de piscina y aguas abiertas
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-white/10 p-3">
                <MapPin className="h-5 w-5 text-[#05bfdb]" aria-hidden="true" />
                Honduras
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterGM />
    </div>
  );
};

export default Index;
