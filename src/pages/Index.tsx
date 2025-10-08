import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Countdown } from '@/components/ui/countdown';
import { CapacityIndicator } from '@/components/ui/capacity-indicator';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, Shield, FileText, Droplets, Award, Heart, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImageJpg from '@/assets/lago-yojoa-hero.jpg';
import heroImageWebp from '@/assets/lago-yojoa-hero.webp';
import { useRegistrations } from '@/context/registration-context';

const Index = () => {
  const eventDate = new Date('2025-10-12T06:00:00-06:00');
  const { stats, isLoading: isRegistrationsLoading } = useRegistrations();
  const isRegistrationOpen = new Date() < new Date('2025-10-07T23:59:59-06:00');
  const isCapacityFull = stats.capacityFull;
  const isHeroCtaDisabled = !isRegistrationOpen || isCapacityFull || isRegistrationsLoading;

  const distances = [
    {
      distance: '800m',
      categories: ['Infantiles A (9-10)', 'Infantiles B (11-12)', 'Juveniles A (13-14)', 'Masters'],
      description: 'Ideal para principiantes y nadadores jóvenes',
      icon: '🏊‍♀️',
      color: 'from-primary/20 to-primary/5'
    },
    {
      distance: '2km',
      categories: ['Juveniles B (15-17)', '20-30', '30-40', '40+'],
      description: 'Distancia intermedia para nadadores experimentados',
      icon: '🏊‍♂️',
      color: 'from-accent/20 to-accent/5'
    },
    {
      distance: '5km',
      categories: ['Juveniles B (15-17)', '20-30', '30-40', '40+'],
      description: 'Desafío de resistencia para atletas avanzados',
      icon: '🏆',
      color: 'from-primary/30 to-primary/10'
    }
  ];

  const features = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: 'Seguridad Garantizada',
      description: 'Salvavidas certificados, embarcaciones de apoyo, paramédicos y ambulancia en sitio.'
    },
    {
      icon: <Droplets className="h-8 w-8" />,
      title: 'Aguas Cristalinas',
      description: 'Nada en el lago natural más grande de Honduras, rodeado de naturaleza.'
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: 'Para Toda la Familia',
      description: 'Categorías desde infantiles hasta masters, todos son bienvenidos.'
    }
  ];

  const eventHighlights = [
    'Salida escalonada por categorías',
    'Medición de tiempoo',
    'Resultados oficiales publicados el mismo día'
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[700px] md:min-h-[800px] overflow-hidden">
          <picture className="absolute inset-0">
            <source srcSet={heroImageWebp} type="image/webp" />
            <img
              src={heroImageJpg}
              alt="Lago de Yojoa - Encuentro de Aguas Abiertas Los Naranjos"
              className="h-full w-full object-cover scale-105 animate-fade-in"
              loading="eager"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 via-primary/60 to-primary/90" />

          <div className="relative h-full flex items-center justify-center px-4 py-20">
            <div className="text-center text-white max-w-4xl mx-auto space-y-8 animate-fade-in">
              <Badge variant="secondary" className="mx-auto bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-base font-medium">
                <Calendar className="inline h-4 w-4 mr-2" />
                12 de Octubre 2025
              </Badge>
              
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight">
                Encuentro de Aguas Abiertas
                <span className="block text-accent mt-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  Los Naranjos
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl lg:text-3xl text-white/95 max-w-3xl mx-auto leading-relaxed font-light">
                Sumérgete en una experiencia única en las cristalinas aguas del Lago de Yojoa. 
                Un encuentro deportivo rodeado de la belleza natural de Honduras.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/inscripcion" className="hover-scale">
                  <Button
                    size="lg"
                    className="button-gradient shadow-button text-lg px-8 py-6 h-auto font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-smooth"
                    disabled={isHeroCtaDisabled}
                  >
                    {isCapacityFull ? '🚫 Cupo Agotado' : isRegistrationsLoading ? 'Cargando...' : '🏊‍♂️ Inscribirme Ahora'}
                  </Button>
                </Link>
                <Link to="/reglamento" className="hover-scale">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-6 h-auto bg-white/10 border-2 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition-smooth font-semibold"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Ver Reglamento
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-8">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <h3 className="text-lg font-semibold mb-4 text-white">Cuenta Regresiva</h3>
                  <Countdown targetDate={eventDate} />
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <h3 className="text-lg font-semibold mb-4 text-white">Disponibilidad</h3>
                  <CapacityIndicator current={stats.total} max={stats.max} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">¿Por qué participar?</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Una Experiencia Completa
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Más que una competencia, es un encuentro deportivo diseñado para todos los niveles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <Card 
                  key={index} 
                  className="card-gradient shadow-card hover:shadow-button transition-smooth hover-scale text-center"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Distances */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">Distancias Oficiales</Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Elige Tu Desafío
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Tres distancias diseñadas para diferentes niveles de experiencia
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {distances.map((item, index) => (
                <Card 
                  key={index} 
                  className={`card-gradient shadow-card hover:shadow-button transition-smooth hover-scale overflow-hidden relative`}
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-50`} />
                  <CardHeader className="text-center relative z-10">
                    <div className="text-5xl mb-4">{item.icon}</div>
                    <CardTitle className="text-4xl font-bold text-primary mb-2">{item.distance}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{item.description}</p>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground mb-3">Categorías:</p>
                      {item.categories.map((category, catIndex) => (
                        <div key={catIndex} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm text-foreground">{category}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Resultados visibles */}
        <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/20">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="mx-auto w-fit">Resultados públicos</Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">Consulta los tiempos oficiales</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Accede a la vista de resultados para revisar posiciones y tiempos por distancia y categoría, actualizados en tiempo real durante el evento.
            </p>
            <Link to="/resultados" className="inline-flex">
              <Button size="lg" className="button-gradient shadow-button text-lg px-8 py-6 h-auto font-semibold">
                Ver resultados publicados
              </Button>
            </Link>
          </div>
        </section>

        {/* Event Info */}
        <section className="py-20 px-4 bg-gradient-to-b from-muted/30 to-background">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-8">
                <div>
                  <Badge variant="secondary" className="mb-4">Sobre el Evento</Badge>
                  <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                    Un Encuentro Inolvidable
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    El <strong className="text-foreground">Encuentro de Aguas Abiertas Los Naranjos</strong> es organizado por 
                    los Entrenadores de Natación de San Pedro Sula, ofreciendo una experiencia única 
                    en las cristalinas aguas del Lago de Yojoa, el lago natural más grande de Honduras.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-card p-4 rounded-lg border shadow-sm">
                    <Calendar className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">Fecha del Evento</p>
                    <p className="text-sm text-muted-foreground">12 de octubre de 2025</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border shadow-sm">
                    <MapPin className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">Ubicación</p>
                    <p className="text-sm text-muted-foreground">Lago de Yojoa, Los Naranjos</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border shadow-sm">
                    <Users className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">Cupo Limitado</p>
                    <p className="text-sm text-muted-foreground">100 participantes</p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border shadow-sm">
                    <FileText className="h-6 w-6 text-primary mb-2" />
                    <p className="text-sm font-semibold text-foreground">Inscripción</p>
                    <p className="text-sm text-muted-foreground">L. 300.00</p>
                  </div>
                </div>

                <div className="pt-4">
                  <a
                    href="https://maps.app.goo.gl/qn5WW8wEpZQ9J7Jx6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block hover-scale"
                  >
                    <Button size="lg" className="button-gradient shadow-button">
                      <MapPin className="mr-2 h-5 w-5" />
                      Ver Ubicación en Mapa
                    </Button>
                  </a>
                </div>
              </div>

              <div className="space-y-6">
                <Card className="card-gradient shadow-card">
                  <CardHeader>
                    <CardTitle className="text-2xl text-primary flex items-center gap-2">
                      <Shield className="h-6 w-6" />
                      Lo Que Debes Saber
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Fechas Importantes
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Cierre de inscripciones: <strong className="text-foreground">7 de octubre, 2025</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Entrega de kits: <strong className="text-foreground">11 de octubre</strong> en Villa Santa Martha</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Día del evento: <strong className="text-foreground">12 de octubre, 2025</strong></span>
                        </li>
                      </ul>
                    </div>

                    

                    <div>
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Seguridad y Apoyo
                      </h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {eventHighlights.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-primary text-primary-foreground shadow-card border-0">
                  <CardContent className="p-6">
                    <h4 className="font-bold text-lg mb-2">💡 Información de Pago</h4>
                    <p className="text-sm opacity-90 mb-3">
                      Deposita <strong>L. 300.00</strong> en:
                    </p>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-1 text-sm">
                      <p><strong>Banco:</strong> BAC Honduras</p>
                      <p><strong>Cuenta:</strong> 743657881</p>
                      <p><strong>A nombre de:</strong> Carlos René Cerrato Osorio</p>
                    </div>
                  </CardContent>
                </Card>
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
