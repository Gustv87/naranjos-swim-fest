import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRegistrations, type Registration, type RegistrationStatus } from '@/context/registration-context';
import { Lock, Shield, Users, Download, QrCode, Search } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';

const Admin = () => {
  const { toast } = useToast();
  const { registrations, stats, updateRegistrationStatus, toggleCheckIn, isLoading: registrationsLoading, error } = useRegistrations();

  const allowedAdmins = useMemo(() => (import.meta.env.VITE_ADMIN_EMAILS || 'admin@losnaranjos.com')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean), []);
  const localAdminPassword = import.meta.env.VITE_ADMIN_LOCAL_PASSWORD?.trim();

  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [localSession, setLocalSession] = useState<{ email: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [distanceFilter, setDistanceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const email = credentials.email.trim().toLowerCase();

      if (!allowedAdmins.includes(email)) {
        throw new Error('Este correo no está autorizado para acceder al panel.');
      }

      if (localAdminPassword && credentials.password === localAdminPassword) {
        setUser(null);
        setLocalSession({ email });
        setAuthLoading(false);
        toast({
          title: 'Acceso autorizado',
          description: 'Sesión iniciada en modo local',
        });
        return;
      }

      await signInWithEmailAndPassword(auth, email, credentials.password);
      toast({
        title: 'Acceso autorizado',
        description: 'Bienvenido al panel de administración',
      });
    } catch (error) {
      let description = 'No se pudo autenticar. Intenta nuevamente.';

      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/wrong-password':
            description = 'Contraseña incorrecta.';
            break;
          case 'auth/user-not-found':
            description = 'No existe un usuario con ese correo.';
            break;
          case 'auth/too-many-requests':
            description = 'Demasiados intentos. Espera unos minutos antes de volver a intentar.';
            break;
          default:
            description = error.message;
        }
      } else if (error instanceof Error) {
        description = error.message;
      }

      setAuthError(description);
      toast({
        variant: 'destructive',
        title: 'Error',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

    useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setAuthError(null);

      if (currentUser) {
        const email = currentUser.email?.toLowerCase() ?? '';

        if (!allowedAdmins.includes(email)) {
          await signOut(auth);
          setUser(null);
          setLocalSession(null);
          toast({
            variant: 'destructive',
            title: 'Acceso denegado',
            description: 'Tu cuenta no tiene permiso para acceder al panel de administración.',
          });
        } else {
          setUser(currentUser);
          setLocalSession(null);
        }
      } else {
        setUser(null);
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [allowedAdmins, toast]);

  const adminEmail = (user?.email ?? localSession?.email) ?? '';

  const handleLogout = async () => {
    try {
      if (user) {
        await signOut(auth);
      }
      setLocalSession(null);
      setUser(null);
      toast({
        title: 'Sesión cerrada',
        description: 'Has salido del panel de administración.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cerrar la sesión. Intenta nuevamente.',
      });
    }
  };

const filteredParticipants = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return registrations
      .filter((participant) => {
        const matchesSearch =
          !search ||
          [
            participant.nombre,
            participant.dni,
            participant.email,
            participant.telefono,
            participant.referencia,
            participant.dorsal,
          ]
            .map((value) => String(value || '').toLowerCase())
            .some((value) => value.includes(search));

        const matchesStatus = !statusFilter || participant.status === statusFilter;
        const matchesDistance = !distanceFilter || participant.distancia === distanceFilter;
        const matchesCategory = !categoryFilter || participant.categoria === categoryFilter;

        return matchesSearch && matchesStatus && matchesDistance && matchesCategory;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [registrations, searchTerm, statusFilter, distanceFilter, categoryFilter]);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const handleStatusChange = async (id: string, status: RegistrationStatus) => {
    const messages: Record<RegistrationStatus, { title: string; description: string }> = {
      validated: {
        title: 'Inscripción validada',
        description: 'El participante aparece ahora como validado en el panel.',
      },
      rejected: {
        title: 'Inscripción rechazada',
        description: 'Recuerda comunicar al participante el motivo del rechazo.',
      },
      pending: {
        title: 'Inscripción pendiente',
        description: 'El registro volvió al estado pendiente para revisión.',
      },
    };

    try {
      const overrides = status === 'pending' ? { checkedInAt: null, checkedInBy: null } : {};
      await updateRegistrationStatus(id, status, overrides);
      toast(messages[status]);
    } catch (err) {
      console.error('Error al actualizar estado', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el estado. Intenta nuevamente.',
      });
    }
  };

  const handleView = (participant: Registration) => {
    toast({
      title: participant.nombre,
      description: `DNI: ${participant.dni} | Email: ${participant.email} | Tel: ${participant.telefono || 'No indicado'} | Talla: ${participant.tallaCamisa || 'No indicada'} | Comprobante: ${participant.comprobanteNombre ?? 'No adjuntado'}`
    });
  };

  const handleOpenReceipt = (participant: Registration) => {
    if (!participant.comprobanteUrl) {
      toast({
        variant: 'destructive',
        title: 'Sin comprobante',
        description: 'Este registro no tiene un comprobante adjunto.',
      });
      return;
    }

    window.open(participant.comprobanteUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCheckIn = async (participant: Registration) => {
    try {
      const shouldCheckIn = !participant.checkedInAt;
      await toggleCheckIn(participant.id, shouldCheckIn, adminEmail || 'admin@losnaranjos.com');
      toast({
        title: shouldCheckIn ? 'Check-in registrado' : 'Check-in revertido',
        description: shouldCheckIn
          ? `El participante ${participant.nombre} quedó marcado como presente.`
          : `El check-in de ${participant.nombre} fue revertido.`,
      });
    } catch (err) {
      console.error('Error al registrar check-in', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo registrar el check-in. Intenta nuevamente.',
      });
    }
  };

  const handleExport = () => {
    if (!registrations.length) {
      toast({
        title: 'Sin datos',
        description: 'Aún no hay inscripciones para exportar.',
      });
      return;
    }

    const header = [
      'Dorsal',
      'Nombre',
      'DNI',
      'Email',
      'Teléfono',
      'Distancia',
      'Categoría',
      'Talla',
      'Banco',
      'Monto',
      'Referencia',
      'Estado',
      'Check-in',
      'Check-in por',
      'Fecha registro',
    ];

    const rows = registrations.map((participant) => [
      participant.dorsal,
      participant.nombre,
      participant.dni,
      participant.email,
      participant.telefono,
      participant.distancia,
      participant.categoria,
      participant.tallaCamisa,
      participant.banco,
      participant.monto,
      participant.referencia,
      participant.status,
      participant.checkedInAt ? participant.checkedInAt : '',
      participant.checkedInBy ?? '',
      participant.createdAt,
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inscripciones-${new Date().toISOString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Exportación lista',
      description: 'El archivo CSV se descargó correctamente.',
    });
  };

  if (authLoading && !localSession) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center px-4 py-32">
          <Card className="card-gradient shadow-card max-w-sm w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Cargando autenticación...</CardTitle>
              <CardDescription>Por favor espera un momento.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (!user && !localSession) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />

        <div className="max-w-md mx-auto px-4 py-16">
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
              <CardDescription>Panel de administración del Encuentro de Aguas Abiertas Los Naranjos</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="admin@losnaranjos.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    placeholder="••••••••"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full button-gradient shadow-button"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>Verificando...</>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Iniciar Sesión
                    </>
                  )}
                </Button>

                {authError && (
                  <p className="text-sm text-destructive text-center">{authError}</p>
                )}
              </form>
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Ingresa con una cuenta autorizada.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestión de inscripciones - Los Naranjos 2025</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-primary">{stats.total}</CardTitle>
              <CardDescription>Total Inscritos</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-warm-accent">{stats.pending}</CardTitle>
              <CardDescription>Pendientes</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-lake-green">{stats.validated}</CardTitle>
              <CardDescription>Validados</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-secondary">{stats.checkedIn}</CardTitle>
              <CardDescription>Check-in</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-destructive">{stats.rejected}</CardTitle>
              <CardDescription>Rechazados</CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center pb-3">
              <CardTitle className="text-2xl text-primary">{stats.remaining}</CardTitle>
              <CardDescription>Cupos Restantes</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button className="button-gradient shadow-button" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            Lector QR
          </Button>
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Check-in
          </Button>
        </div>

        {/* Filters */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="DNI, nombre, referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Estado</Label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="validated">Validados</option>
                  <option value="rejected">Rechazados</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Distancia</Label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={distanceFilter}
                  onChange={(e) => setDistanceFilter(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="800m">800m</option>
                  <option value="2km">2km</option>
                  <option value="5km">5km</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="Infantiles A (9-10)">Infantiles A (9-10)</option>
                  <option value="Infantiles B (11-12)">Infantiles B (11-12)</option>
                  <option value="Juveniles A (13-14)">Juveniles A (13-14)</option>
                  <option value="Juveniles B (15-17)">Juveniles B (15-17)</option>
                  <option value="20-30">20-30</option>
                  <option value="30-40">30-40</option>
                  <option value="40+">40+</option>
                  <option value="Masters">Masters</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Table */}
        <Card className="card-gradient shadow-card">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Inscripciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm md:text-base">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-4 px-3">Fecha</th>
                    <th className="text-left py-4 px-3">Dorsal</th>
                    <th className="text-left py-4 px-3">Nombre</th>
                    <th className="text-left py-4 px-3">DNI</th>
                    <th className="text-left py-4 px-3">Distancia</th>
                    <th className="text-left py-4 px-3">Categoría</th>
                    <th className="text-left py-4 px-3">Talla</th>
                    <th className="text-left py-4 px-3">Banco</th>
                    <th className="text-left py-4 px-3">Monto</th>
                    <th className="text-left py-4 px-3">Referencia</th>
                    <th className="text-left py-4 px-3">Check-in</th>
                    <th className="text-left py-4 px-3">Estado</th>
                    <th className="text-left py-4 px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationsLoading ? (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={13}>
                        Cargando inscripciones...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="py-6 text-center text-destructive" colSpan={13}>
                        {error}
                      </td>
                    </tr>
                  ) : filteredParticipants.length === 0 ? (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={13}>
                        No hay inscripciones que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((participant) => (
                      <tr key={participant.id} className="border-b border-border hover:bg-muted/30">
                        <td className="py-4 px-3">{formatDateTime(participant.createdAt)}</td>
                        <td className="py-4 px-3 font-mono whitespace-nowrap">#{participant.dorsal}</td>
                        <td className="py-4 px-3 font-medium whitespace-normal">{participant.nombre}</td>
                        <td className="py-4 px-3 font-mono text-xs md:text-sm whitespace-nowrap">{participant.dni}</td>
                        <td className="py-4 px-3">{participant.distancia}</td>
                        <td className="py-4 px-3">{participant.categoria || 'N/A'}</td>
                        <td className="py-4 px-3">{participant.tallaCamisa || 'N/A'}</td>
                        <td className="py-4 px-3">{participant.banco || 'N/A'}</td>
                        <td className="py-4 px-3">{participant.monto ? `L ${participant.monto}` : 'N/A'}</td>
                        <td className="py-4 px-3 font-mono text-xs md:text-sm whitespace-nowrap">{participant.referencia || 'N/A'}</td>
                        <td className="py-4 px-3">{participant.checkedInAt ? formatDateTime(participant.checkedInAt) : 'Pendiente'}</td>
                        <td className="py-4 px-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              participant.status === 'validated'
                                ? 'bg-lake-green/20 text-lake-green'
                                : participant.status === 'pending'
                                  ? 'bg-warm-accent/20 text-warm-accent'
                                  : 'bg-destructive/20 text-destructive'
                            }`}
                          >
                            {participant.status === 'validated'
                              ? 'Validado'
                              : participant.status === 'pending'
                                ? 'Pendiente'
                                : 'Rechazado'}
                          </span>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleView(participant)}>Ver</Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenReceipt(participant)}
                              disabled={!participant.comprobanteUrl}
                            >
                              Comprobante
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={participant.checkedInAt ? 'bg-lake-green/10 text-lake-green' : ''}
                              onClick={() => handleCheckIn(participant)}
                              disabled={participant.status === 'rejected' || (participant.status === 'pending' && !participant.checkedInAt)}
                            >
                              {participant.checkedInAt ? 'Revertir' : 'Check-in'}
                            </Button>
                            {participant.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-lake-green"
                                  onClick={() => handleStatusChange(participant.id, 'validated')}
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(participant.id, 'rejected')}
                                >
                                  ✗
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(participant.id, 'pending')}
                              >
                                Pend.
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
