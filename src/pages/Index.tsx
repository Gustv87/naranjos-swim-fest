import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Countdown } from '@/components/ui/countdown';
import { CapacityIndicator } from '@/components/ui/capacity-indicator';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, Trophy, Shield, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/lago-yojoa-hero.jpg';
import { useRegistrations } from '@/context/registration-context';
import Inscripcion from './Inscripcion';

const Index = () => {
  // Event data - these would come from Firebase en producción
  const eventDate = new Date('2025-10-12T07:00:00-06:00'); // Honduras timezone
  const { stats, isLoading: isRegistrationsLoading } = useRegistrations();
  const isRegistrationOpen = new Date() < new Date('2025-10-04T23:59:59-06:00');
  const isCapacityFull = stats.capacityFull;
  const isHeroCtaDisabled = !isRegistrationOpen || isCapacityFull || isRegistrationsLoading;

  const distances = [
    {
      distance: '800m',
      categories: ['Infantiles B (11-12)', 'Juveniles A (13-14)', 'Masters'],
      icon: '🏊‍♀️'
    },
    {
      distance: '2km',
      categories: ['Juveniles B (15-17)', '20-30', '30-40', '40+'],
      icon: '🏊‍♂️'
    },
    {
      distance: '5km',
      categories: ['Juveniles B (15-17)', '20-30', '30-40', '40+'],
      icon: '🏆'
    }
  ];

  const highlights = [
    {
      icon: <MapPin className="h-6 w-6" />,
      title: 'Lago de Yojoa',
      description: 'El lago natural más grande de Honduras'
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: '12 de Octubre',
      description: 'Evento deportivo y familiar'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Seguridad Total',
      description: 'Salvavidas y paramédicos certificados'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Inscripción',
      description: 'Costo: L 300. Por Participante Deposita en BAC Honduras 743657881 a nombre de CARLOS RENE CERRATO OSORIO.'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[90vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-transparent" />
        </div>
        
        <div className="relative h-full flex items-center justify-center px-4">
          <div className="text-center text-white max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30">
              12 de Octubre 2025
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              Encuentro de Aguas Abiertas
              <span className="block text-accent">Los Naranjos</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
              Una experiencia única en el Lago de Yojoa. Participa en este encuentro deportivo 
              rodeado de la belleza natural de Honduras.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/inscripcion">
                <Button 
                  size="lg" 
                  className="button-gradient shadow-button text-lg px-8 py-6 disabled:opacity-50"
                  disabled={isHeroCtaDisabled}
                >
                  {isCapacityFull ? 'Cupo Agotado' : isRegistrationsLoading ? 'Cargando cupos...' : 'Inscribirme Ahora'}
                </Button>
              </Link>
              <Link to="/reglamento">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <FileText className="mr-2 h-5 w-5" />
                  Ver Reglamento
                </Button>
              </Link>
            </div>

            {/* Countdown */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4 text-white">Faltan para el evento:</h3>
              <Countdown targetDate={eventDate} />
            </div>

            {/* Capacity Indicator */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-md mx-auto">
              <CapacityIndicator current={stats.total} max={stats.max} />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {highlights.map((item, index) => (
              <Card key={index} className="card-gradient shadow-card hover:shadow-button transition-smooth">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    {item.icon}
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Distances */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Distancias y Categorías
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Elige la distancia que mejor se adapte a tu nivel y experiencia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {distances.map((item, index) => (
              <Card key={index} className="card-gradient shadow-card hover:shadow-button transition-smooth">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <CardTitle className="text-2xl text-primary">{item.distance}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {item.categories.map((category, catIndex) => (
                      <Badge key={catIndex} variant="secondary" className="mr-2 mb-2">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Event Info */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
                Acerca del Evento
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
                  El <strong>Encuentro de Aguas Abiertas Los Naranjos</strong> es organizado por 
                  los Entrenadores de Natación San Pedro Sula, ofreciendo una experiencia única 
                  en las cristalinas aguas del Lago de Yojoa.
                </p>
                <p>
                  <strong>Fecha:</strong> 12 de octubre de 2025<br />
                  <strong>Lugar:</strong> Lago de Yojoa, Los Naranjos<br />
                  <strong>Cupo:</strong> 100 participantes<br />
                  <strong>Costo de Inscripcion por participante:</strong> Lps. 300.00<br />
                  <strong>Entrega de kit:</strong> 11 de octubre en Villa Santa Martha
                </p>
                <p>
                  El kit incluye gorro. El uso del gorro es obligatorio durante 
                  la competencia. Contamos con salvavidas, embarcaciones de apoyo, paramédicos 
                  y ambulancia para garantizar la seguridad de todos los participantes.
                </p>
              </div>
              <div className="mt-8">
                <a 
                  href="https://maps.app.goo.gl/qn5WW8wEpZQ9J7Jx6" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="lg">
                    <MapPin className="mr-2 h-5 w-5" />
                    Ver en Google Maps
                  </Button>
                </a>
              </div>
            </div>
            
            <Card className="card-gradient shadow-card">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">Información Importante</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Cierre de inscripciones</p>
                    <p className="text-sm text-muted-foreground">
                      Sábado 4 de octubre de 2025 o al completar el cupo
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-semibold">Seguridad</p>
                    <p className="text-sm text-muted-foreground">
                      Salvavidas certificados, embarcaciones de apoyo y equipo médico
                    </p>
                  </div>
                </div>
                
                
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">
            Encuentro de Aguas Abiertas Los Naranjos
          </h3>
          <p className="text-primary-foreground/80 mb-6">
            Organizado por Entrenadores de Natación San Pedro Sula
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/reglamento">
              <Button variant="outline" className="bg-transparent border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10">
                Reglamento
              </Button>
            </Link>
            <Link to="/inscripcion">
              <Button 
                variant="secondary" 
                disabled={!isRegistrationOpen || isCapacityFull}
              >
                {isCapacityFull ? 'Cupo Agotado' : 'Inscribirme'}
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;