import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRegistrations, type Registration } from '@/context/registration-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { calculateRegistrationCategory } from '@/lib/registration-categories';
import { SPECIAL_RESULT_TOKENS } from '@/lib/result-time';

const formatTime = (time: string | null) => {
  if (!time) return 'Pendiente';
  const normalized = time.toUpperCase();
  if (SPECIAL_RESULT_TOKENS.includes(normalized)) {
    return normalized;
  }
  return time;
};

const ALL_CATEGORIES_VALUE = '__all__';
const ALL_DISTANCES_VALUE = '__all_distances__';
const ALL_GENDERS_VALUE = '__all_genders__';
const RESULT_SEX_GROUPS = [
  { sex: 'F', label: 'Damas' },
  { sex: 'M', label: 'Varones' },
] as const;

type PublicResultGroup = {
  key: string;
  eventNumber: number;
  distance: string;
  distanceLabel: string;
  category: string;
  sex: 'F' | 'M';
  sexLabel: string;
  participants: Registration[];
};

const formatEventDate = (value: string) =>
  new Date(value).toLocaleDateString('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const registrationDistances = (value: string) =>
  value.split(',').map((item) => item.trim()).filter(Boolean);

const getResultForDistance = (participant: Registration, distance: string) => {
  const stored = participant.resultsByDistance[distance];
  if (stored) return stored;

  const selectedDistances = registrationDistances(participant.distancia);
  if (selectedDistances.length <= 1) {
    return {
      time: participant.resultTime,
      seconds: participant.resultSeconds,
      recordedAt: participant.resultRecordedAt,
    };
  }

  return {
    time: null,
    seconds: null,
    recordedAt: null,
  };
};

const Resultados = () => {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedEventId = eventId ?? searchParams.get('evento');
  const { registrations, activeEvent, activeEventId, events, setActiveEventId, isLoading } = useRegistrations();
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_VALUE);
  const [distanceFilter, setDistanceFilter] = useState<string>(ALL_DISTANCES_VALUE);
  const [genderFilter, setGenderFilter] = useState<string>(ALL_GENDERS_VALUE);
  const selectedEvent = requestedEventId ? events.find((event) => event.id === requestedEventId) : activeEvent;
  const isMissingRequestedEvent = Boolean(requestedEventId && !selectedEvent);
  const isSwitchingEvent = Boolean(selectedEvent && activeEvent.id !== selectedEvent.id);

  useEffect(() => {
    if (selectedEvent && selectedEvent.id !== activeEventId) {
      setActiveEventId(selectedEvent.id);
      setCategoryFilter(ALL_CATEGORIES_VALUE);
      setDistanceFilter(ALL_DISTANCES_VALUE);
      setGenderFilter(ALL_GENDERS_VALUE);
    }
  }, [activeEventId, selectedEvent, setActiveEventId]);

  const getParticipantCategory = useCallback((participant: Registration, distanceValue = participant.distancia) =>
    calculateRegistrationCategory(participant.nacimiento, distanceValue, activeEvent) || participant.categoria || 'Sin categoría',
  [activeEvent]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    activeEvent.distances.forEach((distance) => {
      distance.categories.forEach((category) => set.add(category.label));
    });
    registrations.forEach((participant) => {
      set.add(getParticipantCategory(participant));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [activeEvent, getParticipantCategory, registrations]);

  const resultGroups = useMemo(() => {
    const specialOrder = new Map(SPECIAL_RESULT_TOKENS.map((token, index) => [token, index]));
    const sortParticipants = (distance: string, participants: Registration[]) =>
      [...participants].sort((a, b) => {
        const aResult = getResultForDistance(a, distance);
        const bResult = getResultForDistance(b, distance);
        const aHasTime = aResult.seconds !== null;
        const bHasTime = bResult.seconds !== null;

        if (aHasTime && bHasTime) return (aResult.seconds ?? 0) - (bResult.seconds ?? 0);
        if (aHasTime) return -1;
        if (bHasTime) return 1;

        const tokenA = aResult.time?.trim().toUpperCase() ?? '';
        const tokenB = bResult.time?.trim().toUpperCase() ?? '';
        const orderA = specialOrder.get(tokenA) ?? Number.MAX_SAFE_INTEGER;
        const orderB = specialOrder.get(tokenB) ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;

        return a.nombre.localeCompare(b.nombre, 'es');
      });

    let eventNumber = 0;
    const allDistances = activeEvent.distances.map((distance) => distance.value);
    const allGroups = allDistances.flatMap((distance) => {
      const distanceConfig = activeEvent.distances.find((item) => item.value === distance);
      const distanceLabel = distanceConfig?.label ?? distance;
      const participantsInDistance = registrations.filter((participant) =>
        participant.status !== 'rejected' && registrationDistances(participant.distancia).includes(distance)
      );

      if (!participantsInDistance.length) return [];

      const categoryOrder = distanceConfig?.categories.map((category) => category.label) ?? [];
      const presentCategories = Array.from(new Set(participantsInDistance.map((participant) => getParticipantCategory(participant, distance))));
      const orderedCategories = [
        ...categoryOrder.filter((category) => presentCategories.includes(category)),
        ...presentCategories.filter((category) => !categoryOrder.includes(category)).sort((a, b) => a.localeCompare(b, 'es')),
      ];

      return orderedCategories.flatMap((category) =>
        RESULT_SEX_GROUPS.map(({ sex, label }) => {
          const participants = participantsInDistance.filter((participant) =>
            participant.sexo === sex && getParticipantCategory(participant, distance) === category
          );

          if (!participants.length) return null;

          eventNumber += 1;

          return {
            key: `${distance}::${category}::${sex}`,
            eventNumber,
            distance,
            distanceLabel,
            category,
            sex,
            sexLabel: label,
            participants: sortParticipants(distance, participants),
          };
        }).filter((group): group is PublicResultGroup => Boolean(group))
      );
    });

    const publishedKeys = new Set(activeEvent.publishedResultEventKeys ?? []);
    if (publishedKeys.size === 0) return [];

    return allGroups.filter((group) =>
      publishedKeys.has(group.key) &&
      (distanceFilter === ALL_DISTANCES_VALUE || group.distance === distanceFilter) &&
      (categoryFilter === ALL_CATEGORIES_VALUE || group.category === categoryFilter) &&
      (genderFilter === ALL_GENDERS_VALUE || group.sex === genderFilter)
    );
  }, [activeEvent, getParticipantCategory, registrations, categoryFilter, distanceFilter, genderFilter]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mx-auto w-fit">Resultados oficiales publicados</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Resultados Oficiales</h1>
            {!isMissingRequestedEvent && (
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-primary">{selectedEvent?.name ?? activeEvent.name}</p>
                <p className="text-sm text-muted-foreground">{formatEventDate((selectedEvent ?? activeEvent).dateTime)}</p>
              </div>
            )}
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Los resultados aparecen cuando el equipo de administración finaliza cada evento.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Notación especial: <strong>NT</strong> = No Time, <strong>NS</strong> = No Show, <strong>DQ</strong> = descalificado. Estos atletas aparecen al final de la tabla.
            </p>
          </div>

          {isMissingRequestedEvent ? (
            <Card className="card-gradient shadow-card">
              <CardContent className="py-10 text-center space-y-4">
                <p className="text-lg font-semibold text-foreground">Evento no encontrado</p>
                <p className="text-muted-foreground">No encontramos una competencia publicada con ese enlace.</p>
                <Link to="/eventos" className="inline-flex text-primary font-semibold hover:underline">
                  Ver eventos
                </Link>
              </CardContent>
            </Card>
          ) : isSwitchingEvent ? (
            <Card className="card-gradient shadow-card">
              <CardContent className="py-10 text-center text-muted-foreground">
                Cargando resultados de la competencia...
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="card-gradient shadow-card">
                <CardContent className="py-6">
                  <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto text-left">
                    <div className="space-y-2">
                      <Label htmlFor="categoria">Filtrar por categoría</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="categoria">
                          <SelectValue placeholder="Todas las categorías" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_CATEGORIES_VALUE}>Todas</SelectItem>
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sexo">Filtrar por rama</Label>
                      <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger id="sexo">
                          <SelectValue placeholder="Todas las ramas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_GENDERS_VALUE}>Todas</SelectItem>
                          <SelectItem value="F">Damas</SelectItem>
                          <SelectItem value="M">Varones</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="distancia">Filtrar por distancia</Label>
                      <Select value={distanceFilter} onValueChange={setDistanceFilter}>
                        <SelectTrigger id="distancia">
                          <SelectValue placeholder="Todas las distancias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_DISTANCES_VALUE}>Todas</SelectItem>
                          {activeEvent.distances.map((distance) => (
                            <SelectItem key={distance.value} value={distance.value}>
                              {distance.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {resultGroups.length === 0 && !isLoading ? (
                <Card className="card-gradient shadow-card">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Aún no hay resultados publicados para esta competencia.
                  </CardContent>
                </Card>
              ) : resultGroups.map((group) => (
                <Card key={group.key} className="card-gradient shadow-card">
                  <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl text-primary">
                        Evento {group.eventNumber}: {group.sexLabel} · {group.category} · {group.distanceLabel}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {group.participants.length} nadador{group.participants.length === 1 ? '' : 'es'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <p className="text-center text-muted-foreground py-6">Cargando resultados...</p>
                    ) : group.participants.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">
                        Aún no hay participantes registrados en este evento.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm md:text-base">
                          <thead>
                            <tr className="border-b border-border text-left">
                              <th className="py-3 px-3">Posición</th>
                              <th className="py-3 px-3">Dorsal</th>
                              <th className="py-3 px-3">Nombre</th>
                              <th className="py-3 px-3">Categoría</th>
                              <th className="py-3 px-3">Tiempo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              let rank = 0;
                              return group.participants.map((participant) => {
                                const result = getResultForDistance(participant, group.distance);
                                const hasRank = result.seconds !== null;
                                if (hasRank) rank += 1;

                                return (
                                  <tr key={participant.id} className="border-b border-border">
                                    <td className="py-3 px-3 font-semibold">
                                      {hasRank ? rank : '—'}
                                    </td>
                                    <td className="py-3 px-3 font-mono text-xs md:text-sm whitespace-nowrap">
                                      #{participant.dorsal}
                                    </td>
                                    <td className="py-3 px-3">{participant.nombre}</td>
                                    <td className="py-3 px-3 text-muted-foreground">{getParticipantCategory(participant, group.distance) || 'N/A'}</td>
                                    <td className="py-3 px-3 font-medium">
                                      {formatTime(result.time)}
                                      {result.recordedAt && result.seconds !== null && (
                                        <span className="block text-xs text-muted-foreground">
                                          Actualizado {new Date(result.recordedAt).toLocaleString('es-HN')}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </main>

      <FooterGM />
    </div>
  );
};

export default Resultados;
