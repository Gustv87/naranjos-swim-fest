import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Lock, Shield, Users, Download, QrCode, Search } from 'lucide-react';

const Admin = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Mock authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (credentials.email === 'admin@losnaranjos.com' && credentials.password === 'admin123') {
        setIsAuthenticated(true);
        toast({
          title: "Acceso autorizado",
          description: "Bienvenido al panel de administración",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Credenciales incorrectas",
          description: "Email o contraseña incorrectos",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo autenticar. Intenta nuevamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data
  const stats = {
    total: 23,
    pending: 15,
    validated: 7,
    rejected: 1,
    remaining: 47
  };

  const mockParticipants = [
    {
      id: '001',
      date: '2024-09-20',
      dorsal: '001',
      name: 'María García',
      dni: '0801-1990-12345',
      distance: '2km',
      category: '30-40',
      bank: 'BAC Honduras',
      amount: '500.00',
      reference: 'TXN123456',
      status: 'validated'
    },
    {
      id: '002',
      date: '2024-09-21',
      dorsal: '002',
      name: 'Carlos López',
      dni: '0801-1985-67890',
      distance: '5km',
      category: '30-40',
      bank: 'Atlántida',
      amount: '500.00',
      reference: 'PAY789012',
      status: 'pending'
    },
    {
      id: '003',
      date: '2024-09-22',
      dorsal: '003',
      name: 'Ana Rodríguez',
      dni: '0801-1995-11111',
      distance: '800m',
      category: 'Masters',
      bank: 'FICOHSA',
      amount: '500.00',
      reference: 'REF345678',
      status: 'rejected'
    }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="max-w-md mx-auto px-4 py-16">
          <Card className="card-gradient shadow-card">
            <CardHeader className="text-center">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
              <CardDescription>
                Panel de administración del Encuentro de Aguas Abiertas Los Naranjos
              </CardDescription>
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
              </form>
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Demo: admin@losnaranjos.com / admin123</p>
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
              onClick={() => setIsAuthenticated(false)}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
          <Button className="button-gradient shadow-button">
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
                  <Input className="pl-10" placeholder="DNI, nombre, referencia..." />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Estado</Label>
                <select className="w-full px-3 py-2 border border-border rounded-md bg-background">
                  <option value="">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="validated">Validados</option>
                  <option value="rejected">Rechazados</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Distancia</Label>
                <select className="w-full px-3 py-2 border border-border rounded-md bg-background">
                  <option value="">Todas</option>
                  <option value="800m">800m</option>
                  <option value="2km">2km</option>
                  <option value="5km">5km</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select className="w-full px-3 py-2 border border-border rounded-md bg-background">
                  <option value="">Todas</option>
                  <option value="Infantiles B">Infantiles B</option>
                  <option value="Juveniles A">Juveniles A</option>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2">Fecha</th>
                    <th className="text-left py-3 px-2">Dorsal</th>
                    <th className="text-left py-3 px-2">Nombre</th>
                    <th className="text-left py-3 px-2">DNI</th>
                    <th className="text-left py-3 px-2">Distancia</th>
                    <th className="text-left py-3 px-2">Categoría</th>
                    <th className="text-left py-3 px-2">Banco</th>
                    <th className="text-left py-3 px-2">Monto</th>
                    <th className="text-left py-3 px-2">Referencia</th>
                    <th className="text-left py-3 px-2">Estado</th>
                    <th className="text-left py-3 px-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mockParticipants.map((participant) => (
                    <tr key={participant.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 px-2">{participant.date}</td>
                      <td className="py-3 px-2 font-mono">#{participant.dorsal}</td>
                      <td className="py-3 px-2 font-medium">{participant.name}</td>
                      <td className="py-3 px-2 font-mono text-sm">{participant.dni}</td>
                      <td className="py-3 px-2">{participant.distance}</td>
                      <td className="py-3 px-2">{participant.category}</td>
                      <td className="py-3 px-2">{participant.bank}</td>
                      <td className="py-3 px-2">L {participant.amount}</td>
                      <td className="py-3 px-2 font-mono text-sm">{participant.reference}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          participant.status === 'validated' ? 'bg-lake-green/20 text-lake-green' :
                          participant.status === 'pending' ? 'bg-warm-accent/20 text-warm-accent' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {participant.status === 'validated' ? 'Validado' :
                           participant.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">Ver</Button>
                          {participant.status === 'pending' && (
                            <>
                              <Button size="sm" variant="outline" className="text-lake-green">✓</Button>
                              <Button size="sm" variant="outline" className="text-destructive">✗</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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