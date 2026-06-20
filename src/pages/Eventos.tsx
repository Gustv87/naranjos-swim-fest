import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CapacityIndicator } from '@/components/ui/capacity-indicator';
import { Countdown } from '@/components/ui/countdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PaymentDetails } from '@/components/payment-details';
import { useRegistrations } from '@/context/registration-context';
import { getEventRegistrationStatus, type EventConfig } from '@/config/event';
import { AGE_BASED_REGISTRATION_FEE_TEXT } from '@/lib/registration-categories';
import type { ReactNode } from 'react';
import { ArrowLeft, Calendar, CheckCircle2, Clock, FileText, MapPin, Phone, Trophy, Users } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import heroImageJpg from '@/assets/lago-yojoa-hero.jpg';
import heroImageWebp from '@/assets/lago-yojoa-hero.webp';

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-HN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

const getRegistrationPriceLabel = (event: EventConfig) =>
  event.courseType === 'open_water' ? AGE_BASED_REGISTRATION_FEE_TEXT : `L. ${event.price}`;

const getEventRegistrationState = (event: EventConfig) => {
  const status = getEventRegistrationStatus(event);

  if (status.reason === 'inactive') {
    return {
      label: 'Finalizado',
      description: 'Este evento ya no acepta inscripciones.',
      isOpen: false,
    };
  }

  if (status.reason === 'manual') {
    return {
      label: 'Inscripciones bloqueadas',
      description: 'La organización cerró manualmente las inscripciones.',
      isOpen: false,
    };
  }

  if (status.reason === 'before') {
    return {
      label: 'Próximamente',
      description: `Inscripciones desde el ${formatDateTime(event.registrationOpenDateTime)}.`,
      isOpen: false,
    };
  }

  if (status.reason === 'after') {
    return {
      label: 'Inscripciones cerradas',
      description: `Cerraron el ${formatDateTime(event.registrationCloseDateTime)}.`,
      isOpen: false,
    };
  }

  return {
    label: 'Inscripciones abiertas',
    description: `Abiertas hasta el ${formatDateTime(event.registrationCloseDateTime)}.`,
    isOpen: true,
  };
};

const eventStatusVariant = (event: EventConfig) => {
  const state = getEventRegistrationState(event);
  if (state.isOpen) return 'default';
  if (event.status === 'past') return 'outline';
  return 'secondary';
};

const Eventos = () => {
  const { eventId } = useParams();
  const { events, activeEvent, activeEventId, setActiveEventId, stats, isLoading } = useRegistrations();

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    [events]
  );

  const selectedEvent = eventId ? events.find((event) => event.id === eventId) : null;

  useEffect(() => {
    if (selectedEvent && selectedEvent.id !== activeEventId) {
      setActiveEventId(selectedEvent.id);
    }
  }, [activeEventId, selectedEvent, setActiveEventId]);

  const upcomingEvents = sortedEvents.filter((event) => event.status !== 'past');
  const pastEvents = sortedEvents.filter((event) => event.status === 'past');

  if (eventId && !selectedEvent) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 px-4 py-16">
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <CardTitle>Evento no encontrado</CardTitle>
              <CardDescription>No encontramos un evento publicado con ese enlace.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/eventos">Ver eventos</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <FooterGM />
      </div>
    );
  }

  if (selectedEvent) {
    const registrationState = getEventRegistrationState(selectedEvent);
    const isSelectedEventLoaded = activeEvent.id === selectedEvent.id;
    const isCapacityFull = isSelectedEventLoaded && stats.capacityFull;
    const canRegister = registrationState.isOpen && !isCapacityFull;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />

        <main className="flex-1">
          <section className="relative min-h-[520px] overflow-hidden">
            {selectedEvent.posterImageUrl ? (
              <>
                <img
                  src={selectedEvent.posterImageUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover opacity-35 blur-sm scale-105"
                  loading="eager"
                />
                <img
                  src={selectedEvent.posterImageUrl}
                  alt={selectedEvent.name}
                  className="absolute inset-y-4 right-0 h-[calc(100%-2rem)] w-full object-contain object-center opacity-75 md:right-8 md:w-[58%] md:object-right"
                  loading="eager"
                />
              </>
            ) : (
              <picture className="absolute inset-0">
                <source srcSet={heroImageWebp} type="image/webp" />
                <img
                  src={heroImageJpg}
                  alt={selectedEvent.name}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </picture>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/55" />

            <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 text-white">
              <Button asChild variant="outline" className="mb-8 bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Link to="/eventos">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Eventos
                </Link>
              </Button>

              <div className="max-w-4xl space-y-6">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  {registrationState.label}
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">{selectedEvent.name}</h1>
                <p className="text-lg md:text-2xl text-white/90 max-w-3xl">
                  {formatDate(selectedEvent.dateTime)} en {selectedEvent.locationShort}.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    asChild={canRegister}
                    disabled={!canRegister}
                    size="lg"
                    className="button-gradient shadow-button text-base px-7 py-6 h-auto font-semibold disabled:opacity-60"
                  >
                    {canRegister ? (
                      <Link to={`/eventos/${selectedEvent.id}/inscripcion`}>Inscribirme</Link>
                    ) : (
                      <span>{isCapacityFull ? 'Cupo agotado' : registrationState.label}</span>
                    )}
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-base px-7 py-6 h-auto">
                    <Link to={`/eventos/${selectedEvent.id}/reglamento`}>
                      <FileText className="mr-2 h-5 w-5" />
                      Reglamento
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-base px-7 py-6 h-auto">
                    <Link to={`/eventos/${selectedEvent.id}/resultados`}>
                      <Trophy className="mr-2 h-5 w-5" />
                      Ver resultados
                    </Link>
                  </Button>
                </div>
                <div className="max-w-md rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="mb-3 text-sm font-semibold text-white/90">Cuenta regresiva</p>
                  <Countdown targetDate={new Date(selectedEvent.dateTime)} />
                </div>
              </div>
            </div>
          </section>

          <section className="px-4 py-14">
            <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                <Card className="card-gradient shadow-card">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary">Información del evento</CardTitle>
                    <CardDescription>{registrationState.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <EventFact icon={<Calendar className="h-5 w-5" />} label="Fecha" value={formatDate(selectedEvent.dateTime)} />
                      <EventFact icon={<Clock className="h-5 w-5" />} label="Hora" value={new Date(selectedEvent.dateTime).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })} />
                      <EventFact icon={<MapPin className="h-5 w-5" />} label="Ubicación" value={selectedEvent.location} />
                      <EventFact icon={<Users className="h-5 w-5" />} label="Inscripción" value={getRegistrationPriceLabel(selectedEvent)} />
                      <EventFact icon={<Phone className="h-5 w-5" />} label="Más información" value="+504 3343-8768" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-gradient shadow-card">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary">
                      {selectedEvent.allowMultipleDistances ? 'Pruebas y categorías' : 'Distancias y categorías'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-5 md:grid-cols-3">
                    {selectedEvent.distances.map((distance) => (
                      <div key={distance.value} className="rounded-lg border bg-card p-5">
                        <p className="text-3xl font-bold text-primary">{distance.value}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{distance.label}</p>
                        <div className="mt-4 space-y-2">
                          {distance.categories.map((category) => (
                            <div key={category.label} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{category.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-6">
                <Card className="card-gradient shadow-card">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">Disponibilidad</CardTitle>
                    <CardDescription>
                      {isSelectedEventLoaded ? 'Cupos registrados para este evento.' : 'Cargando cupos del evento.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isSelectedEventLoaded && !isLoading ? (
                      <CapacityIndicator current={stats.total} max={stats.max} />
                    ) : (
                      <p className="text-sm text-muted-foreground">Cargando disponibilidad...</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-primary text-primary-foreground shadow-card border-0">
                  <CardHeader>
                    <CardTitle className="text-xl">Pago</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <p>{getRegistrationPriceLabel(selectedEvent)}</p>
                    <PaymentDetails paymentInfo={selectedEvent.paymentInfo} variant="inverse" />
                  </CardContent>
                </Card>
              </aside>
            </div>
          </section>
        </main>

        <FooterGM />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="px-4 py-16 bg-gradient-to-b from-muted/40 to-background">
          <div className="max-w-6xl mx-auto space-y-5 text-center">
            <Badge variant="secondary" className="mx-auto w-fit">Calendario</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Eventos</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Revisa los próximos encuentros, entra al evento que te interesa y completa tu inscripción cuando esté disponible.
            </p>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="max-w-6xl mx-auto space-y-12">
            <EventSection title="Próximos eventos" events={upcomingEvents} setActiveEventId={setActiveEventId} />
            {pastEvents.length > 0 && (
              <EventSection title="Eventos anteriores" events={pastEvents} setActiveEventId={setActiveEventId} />
            )}
          </div>
        </section>
      </main>

      <FooterGM />
    </div>
  );
};

const EventFact = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-lg border bg-card p-4">
    <div className="text-primary mb-2">{icon}</div>
    <p className="text-sm font-semibold text-foreground">{label}</p>
    <p className="text-sm text-muted-foreground">{value}</p>
  </div>
);

const EventSection = ({
  title,
  events,
  setActiveEventId,
}: {
  title: string;
  events: EventConfig[];
  setActiveEventId: (eventId: string) => void;
}) => (
  <div className="space-y-5">
    <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
    {events.length === 0 ? (
      <Card className="card-gradient shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay eventos publicados en esta sección.
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {events.map((event) => {
          const state = getEventRegistrationState(event);

          return (
            <Card
              key={event.id}
              className={`relative overflow-hidden shadow-card transition-smooth hover:shadow-button ${event.posterImageUrl ? 'border-0 bg-primary text-white' : 'card-gradient'}`}
              style={event.posterImageUrl ? {
                backgroundImage: `linear-gradient(90deg, hsl(200 85% 14% / 0.92), hsl(200 70% 20% / 0.74), hsl(200 85% 14% / 0.48)), url("${event.posterImageUrl}")`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              } : undefined}
            >
              <CardHeader className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={event.posterImageUrl ? 'secondary' : eventStatusVariant(event)}>{state.label}</Badge>
                  <span className={`text-sm ${event.posterImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>{formatDate(event.dateTime)}</span>
                </div>
                <CardTitle className={`text-2xl ${event.posterImageUrl ? 'text-white' : 'text-primary'}`}>{event.name}</CardTitle>
                <CardDescription className={event.posterImageUrl ? 'text-white/80' : undefined}>{event.locationShort}</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {event.distances.map((distance) => (
                    <Badge key={distance.value} variant="outline" className={event.posterImageUrl ? 'border-white/40 bg-white/10 text-white' : undefined}>{distance.label}</Badge>
                  ))}
                </div>
                <p className={`text-sm ${event.posterImageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>{state.description}</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild onClick={() => setActiveEventId(event.id)} className={event.posterImageUrl ? 'bg-white text-primary hover:bg-white/90' : undefined}>
                    <Link to={`/eventos/${event.id}`}>Ver evento</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    onClick={() => setActiveEventId(event.id)}
                    className={event.posterImageUrl ? 'border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white' : undefined}
                  >
                    <Link to={`/eventos/${event.id}/resultados`}>Ver resultados</Link>
                  </Button>
                  <Button
                    asChild={state.isOpen}
                    disabled={!state.isOpen}
                    variant="outline"
                    onClick={() => setActiveEventId(event.id)}
                    className={event.posterImageUrl ? 'border-white/50 bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:text-white/60' : undefined}
                  >
                    {state.isOpen ? (
                      <Link to={`/eventos/${event.id}/inscripcion`}>Inscribirme</Link>
                    ) : (
                      <span>No disponible</span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

export default Eventos;
