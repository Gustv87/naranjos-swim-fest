import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CapacityIndicator } from '@/components/ui/capacity-indicator';
import { Countdown } from '@/components/ui/countdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
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

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString('es-HN', {
    hour: '2-digit',
    minute: '2-digit',
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

          {selectedEvent.sponsorImageUrls && selectedEvent.sponsorImageUrls.length > 0 && (
            <section className="border-t bg-muted/30 px-4 py-14" aria-labelledby="event-sponsors-title">
              <div className="mx-auto max-w-6xl">
                <div className="mx-auto mb-8 max-w-2xl text-center">
                  <Badge variant="secondary" className="mb-3">Aliados del evento</Badge>
                  <h2 id="event-sponsors-title" className="text-3xl font-bold text-foreground">
                    Patrocinadores
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    Gracias a las organizaciones que hacen posible este evento.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {selectedEvent.sponsorImageUrls.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      className="flex h-32 min-h-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-5 shadow-sm lg:h-36"
                    >
                      <img
                        src={imageUrl}
                        alt={`Logo del patrocinador ${index + 1}`}
                        className="block h-full min-h-0 w-full min-w-0 object-contain"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <FooterGM />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        <section className="px-4 py-10 bg-gradient-to-b from-muted/40 to-background">
          <div className="max-w-6xl mx-auto space-y-4 text-center">
            <Badge variant="secondary" className="mx-auto w-fit">Calendario</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Eventos</h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Revisa los próximos encuentros, entra al evento que te interesa y completa tu inscripción cuando esté disponible.
            </p>
          </div>
        </section>

        <section className="px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-10">
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
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">Vista rápida para elegir el evento sin abrir cada detalle.</p>
      </div>
      {events.length > 0 && (
        <Badge variant="outline">{events.length} evento{events.length === 1 ? '' : 's'}</Badge>
      )}
    </div>
    {events.length === 0 ? (
      <Card className="card-gradient shadow-card">
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay eventos publicados en esta sección.
        </CardContent>
      </Card>
    ) : (
      <Carousel opts={{ align: 'start', dragFree: true }} className="px-0 sm:px-10">
        <CarouselContent className="-ml-4 pb-2">
          {events.map((event) => (
            <CarouselItem key={event.id} className="basis-[88%] pl-4 sm:basis-[430px] lg:basis-[390px]">
              <EventQuickCard event={event} setActiveEventId={setActiveEventId} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {events.length > 1 && (
          <>
            <CarouselPrevious className="hidden sm:inline-flex -left-1 border-primary/20 bg-background text-primary hover:bg-primary hover:text-primary-foreground" />
            <CarouselNext className="hidden sm:inline-flex -right-1 border-primary/20 bg-background text-primary hover:bg-primary hover:text-primary-foreground" />
          </>
        )}
      </Carousel>
    )}
  </div>
);

const EventQuickCard = ({
  event,
  setActiveEventId,
}: {
  event: EventConfig;
  setActiveEventId: (eventId: string) => void;
}) => {
  const state = getEventRegistrationState(event);
  const visibleDistances = event.distances.slice(0, 3);
  const extraDistanceCount = Math.max(event.distances.length - visibleDistances.length, 0);
  const handleSelectEvent = () => setActiveEventId(event.id);

  return (
    <Card className="h-full overflow-hidden border-border/70 bg-card shadow-card transition-smooth hover:-translate-y-0.5 hover:shadow-button">
      <div className="relative h-28 overflow-hidden bg-primary">
        <img
          src={event.posterImageUrl || heroImageJpg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/75 via-primary/30 to-transparent" />
        <Badge variant={eventStatusVariant(event)} className="absolute left-3 top-3 shadow-sm">
          {state.label}
        </Badge>
      </div>

      <CardContent className="space-y-4 p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase text-primary">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(event.dateTime)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatTime(event.dateTime)}
            </span>
          </div>
          <h3 className="min-h-[3.25rem] text-xl font-bold leading-tight text-foreground">
            {event.name}
          </h3>
          <p className="flex min-h-10 items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{event.locationShort}</span>
          </p>
        </div>

        <div className="flex min-h-7 flex-wrap gap-2">
          {visibleDistances.map((distance) => (
            <Badge key={distance.value} variant="outline" className="border-primary/25 text-primary">
              {distance.label}
            </Badge>
          ))}
          {extraDistanceCount > 0 && (
            <Badge variant="secondary">+{extraDistanceCount}</Badge>
          )}
        </div>

        <p className="min-h-10 text-sm text-muted-foreground">{state.description}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild size="sm" onClick={handleSelectEvent}>
            <Link to={`/eventos/${event.id}`}>Ver evento</Link>
          </Button>
          {state.isOpen ? (
            <Button asChild size="sm" variant="outline" onClick={handleSelectEvent}>
              <Link to={`/eventos/${event.id}/inscripcion`}>Inscribirme</Link>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              No disponible
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="sm:col-span-2" onClick={handleSelectEvent}>
            <Link to={`/eventos/${event.id}/resultados`}>Resultados</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Eventos;
