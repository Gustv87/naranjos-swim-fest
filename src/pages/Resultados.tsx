import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRegistrations } from '@/context/registration-context';
import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const distanceLabels: Record<string, string> = {
  '800m': '800 metros',
  '2km': '2 kilómetros',
  '5km': '5 kilómetros',
};

const SPECIAL_TOKENS = ['NT', 'NS', 'DNS', 'DNF'];

const formatTime = (time: string | null) => {
  if (!time) return 'Pendiente';
  const normalized = time.toUpperCase();
  if (SPECIAL_TOKENS.includes(normalized)) {
    return normalized;
  }
  return time;
};

const ALL_CATEGORIES_VALUE = '__all__';

const Resultados = () => {
  const { registrations, isLoading } = useRegistrations();
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_VALUE);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    registrations.forEach((participant) => {
      if (participant.categoria) {
        set.add(participant.categoria);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [registrations]);

  const groupedByDistance = useMemo(() => {
    const distances = ['800m', '2km', '5km'];

    return distances.map((distance) => {
      const participants = registrations
        .filter((participant) =>
          participant.distancia === distance &&
          (categoryFilter === ALL_CATEGORIES_VALUE || participant.categoria === categoryFilter)
        )
        .sort((a, b) => {
          if (a.resultSeconds === null && b.resultSeconds === null) return a.createdAt > b.createdAt ? 1 : -1;
          if (a.resultSeconds === null) return 1;
          if (b.resultSeconds === null) return -1;
          return a.resultSeconds - b.resultSeconds;
        });

      return {
        distance,
        participants,
      };
    });
  }, [registrations, categoryFilter]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 px-4 py-12">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mx-auto w-fit">Resultados en tiempo real</Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">Resultados Oficiales</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Los tiempos se actualizan automáticamente a medida que el equipo de administración los registra.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Notación especial: <strong>NT</strong> = No Time, <strong>NS</strong> = No Show. Estos atletas aparecen al final de la tabla.
            </p>
          </div>

          <Card className="card-gradient shadow-card">
            <CardContent className="py-6">
              <div className="max-w-sm mx-auto text-left space-y-2">
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
            </CardContent>
          </Card>

          {groupedByDistance.map(({ distance, participants }) => (
            <Card key={distance} className="card-gradient shadow-card">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle className="text-2xl text-primary">
                  {distanceLabels[distance] ?? distance}
                </CardTitle>
                <Badge variant="outline" className="text-sm">
                  {participants.length} nadador{participants.length === 1 ? '' : 'es'}
                </Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-6">Cargando resultados...</p>
                ) : participants.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    Aún no hay participantes registrados en esta distancia.
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
                        {participants.map((participant, index) => (
                          <tr key={participant.id} className="border-b border-border">
                            <td className="py-3 px-3 font-semibold">
                              {participant.resultSeconds !== null ? index + 1 : '—'}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs md:text-sm whitespace-nowrap">
                              #{participant.dorsal}
                            </td>
                            <td className="py-3 px-3">{participant.nombre}</td>
                            <td className="py-3 px-3 text-muted-foreground">{participant.categoria || 'N/A'}</td>
                            <td className="py-3 px-3 font-medium">
                              {formatTime(participant.resultTime)}
                              {participant.resultRecordedAt && participant.resultSeconds !== null && (
                                <span className="block text-xs text-muted-foreground">
                                  Actualizado {new Date(participant.resultRecordedAt).toLocaleString('es-HN')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <FooterGM />
    </div>
  );
};

export default Resultados;
