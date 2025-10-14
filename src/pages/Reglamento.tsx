import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Clock, Users, Shield, Trophy, MapPin, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import reglamentoPdf from '@/assets/Reglamento Open Water Los Naranjos.pdf';
import logoImage from '@/assets/Logo.webp';

const Reglamento = () => {
  const rules = [
    {
      icon: <Clock className="h-6 w-6" />,
      title: 'Salida Escalonada',
      description: 'Las salidas se realizarán por categorías de forma escalonada para garantizar la seguridad de todos los participantes.'
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Límite de Participantes',
      description: 'Máximo 100 participantes. Las inscripciones se cerrarán al completar el cupo o el 7 de octubre de 2025.'
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Equipo de Seguridad',
      description: 'Salvavidas certificados, embarcaciones de apoyo, paramédicos y ambulancia estarán presentes durante todo el evento.'
    },

  ];

  const categories = [
    {
      distance: '800m',
      groups: ['Infantiles A (9-10 años)', 'Infantiles B (11-12 años)', 'Juveniles A (13-14 años)', 'Masters (15+ años)']
    },
    {
      distance: '2km',
      groups: ['Juveniles B (15-17 años)', '20-30 años', '30-40 años', '40+ años']
    },
    {
      distance: '5km',
      groups: ['Juveniles B (15-17 años)', '20-30 años', '30-40 años', '40+ años']
    }
  ];

  const equipment = [
    "Gorro de natación",
    'Traje de baño adecuado',
    'Gafas de natación (recomendadas)'
  ];

  const prohibitions = [
    'Material de propulsión (aletas, paletas, etc.)',
    'Dispositivos de flotación artificiales',
    'Aparatos electrónicos no autorizados',
    'Elementos que puedan afectar la seguridad'
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader className="text-center">
            <Badge variant="secondary" className="mx-auto mb-4 w-fit">
              Documento Oficial
            </Badge>
            <CardTitle className="text-3xl text-primary">
              Reglamento Oficial
            </CardTitle>
            <CardDescription className="text-lg">
              Encuentro de Aguas Abiertas Los Naranjos 2025
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="button-gradient shadow-button" asChild>
                <a href={reglamentoPdf} download target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-5 w-5" />
                  Descargar PDF Completo
                </a>
              </Button>
              <Button size="lg" variant="outline" onClick={handleExportReglamentoPdf}>
                <FileText className="mr-2 h-5 w-5" />
                Imprimir Reglamento
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Event Info */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Información del Evento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-primary mb-2">Fecha y Hora</h4>
              <p className="text-muted-foreground mb-4">12 de octubre de 2025, 6:00 AM</p>

              <h4 className="font-semibold text-primary mb-2">Ubicación</h4>
              <p className="text-muted-foreground mb-4">
                Lago de Yojoa, Los Naranjos, Honduras
              </p>

              <h4 className="font-semibold text-primary mb-2">Organización</h4>
              <p className="text-muted-foreground">
                Swim + plus HN
              </p>
            </div>

            <div>

              <h4 className="font-semibold text-primary mb-2">Cupo</h4>
              <p className="text-muted-foreground">
                Máximo 100 participantes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Rules */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Normas Principales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="text-primary">{rule.icon}</div>
                  <div>
                    <h4 className="font-semibold text-primary mb-2">{rule.title}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
                <div className="text-primary"><Users className="h-6 w-6" /></div>
                <div>
                  <h4 className="font-semibold text-primary mb-2">Costo de Inscripción</h4>
                  <p className="text-sm text-muted-foreground">L 300.00. Por participante!!  Deposita en BAC Honduras 743657881 a nombre de CARLOS RENE CERRATO OSORIO.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Distancias y Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {categories.map((category, index) => (
                <div key={index} className="border-l-4 border-primary pl-6">
                  <h4 className="text-xl font-semibold text-primary mb-3">{category.distance}</h4>
                  <div className="flex flex-wrap gap-2">
                    {category.groups.map((group, groupIndex) => (
                      <Badge key={groupIndex} variant="secondary">
                        {group}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Equipment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className="card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Equipo Permitido</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {equipment.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl text-destructive">Equipo Prohibido</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {prohibitions.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-destructive rounded-full mt-2" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Safety */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Medidas de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-primary mb-2">Personal de Seguridad</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Salvavidas certificados</li>
                  <li>• Embarcaciones de apoyo</li>
                  <li>• Personal de rescate acuático</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-primary mb-2">Asistencia Médica</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Paramédicos en meta</li>
                  <li>• Ambulancia disponible</li>
                  <li>• Botiquín de primeros auxilios</li>
                </ul>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg">
              <h4 className="font-semibold text-primary mb-2">Retiro Voluntario</h4>
              <p className="text-sm text-muted-foreground">
                Los participantes pueden retirarse voluntariamente en cualquier momento,
                pero deben avisar inmediatamente al personal de seguridad más cercano.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weather */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Condiciones Climáticas y del Agua</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              La organización se reserva el derecho de suspender, posponer o modificar el evento
              en caso de condiciones climáticas adversas o calidad del agua que comprometan la
              seguridad de los participantes.
            </p>

            <div className="bg-lake-light/20 p-4 rounded-lg border border-lake-blue/20">
              <h4 className="font-semibold text-primary mb-2">Monitoreo Continuo</h4>
              <p className="text-sm text-muted-foreground">
                Las condiciones del lago y el clima serán monitoreadas constantemente.
                Cualquier cambio o decisión será comunicada a los participantes con la
                mayor anticipación posible.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Claims */}
        <Card className="card-gradient shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Reclamaciones y Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-primary mb-2">Tiempo para Reclamaciones</h4>
                <p className="text-sm text-muted-foreground">
                  Las reclamaciones sobre resultados deben presentarse hasta 30 minutos
                  después de la publicación de los resultados oficiales.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-primary mb-2">Publicación de Resultados</h4>
                <p className="text-sm text-muted-foreground">
                  Los resultados se publicarán en el sitio web oficial y en el área
                  de premiación el mismo día del evento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liability */}
        <Card className="bg-destructive/5 border-destructive/20 shadow-card mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">
              Aviso de Responsabilidad y Condiciones de Participación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>IMPORTANTE:</strong> Al inscribirse en este evento, el participante entiende y acepta que:
            </p>

            <ul className="text-sm text-muted-foreground space-y-2 pl-4">
              <li>• Ha leído y está de acuerdo con el reglamento del evento.</li>
              <li>• Los organizadores no se hacen responsables por accidentes, lesiones o daños.</li>
              <li>• Declara estar en buena condición física y sin problemas médicos que le impidan participar.</li>
              <li>• Autoriza a recibir atención médica en caso de emergencia.</li>
              <li>• Se compromete a usar el equipo de seguridad requerido y seguir todas las instrucciones del personal.</li>
              <li>• Acepta que la inscripción no es reembolsable.</li>
              <li>• Autoriza el uso de su imagen en fotografías o videos del evento.</li>
              <li>• Si es menor de edad, confirma que su padre, madre o tutor realizó la inscripción y asume la responsabilidad.</li>
            </ul>

            <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                La participación en este evento es bajo la total responsabilidad del participante.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Link to="/inscripcion">
            <Button size="lg" className="button-gradient shadow-button text-lg px-12 py-6">
              <FileText className="mr-2 h-5 w-5" />
              Proceder a Inscripción
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Reglamento;
  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const handleExportReglamentoPdf = () => {
    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      alert('Permite ventanas emergentes en tu navegador para generar el PDF.');
      return;
    }

    const now = new Date();
    const formattedNow = now.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;

    const rulesHtml = rules.map((rule) => `
      <div class="rule">
        <h3>${escapeHtml(rule.title)}</h3>
        <p>${escapeHtml(rule.description)}</p>
      </div>
    `).join('');

    const categoriesHtml = categories.map((category) => `
      <section class="category">
        <h3>${escapeHtml(category.distance)}</h3>
        <ul>
          ${category.groups.map((group) => `<li>${escapeHtml(group)}</li>`).join('')}
        </ul>
      </section>
    `).join('');

    const equipmentHtml = equipment.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    const prohibitionsHtml = prohibitions.map((item) => `<li>${escapeHtml(item)}</li>`).join('');

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Reglamento Oficial - Swim Plus</title>
          <style>
            :root { color-scheme: only light; }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 32px;
              color: #111827;
              line-height: 1.5;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 26px;
              text-align: center;
              color: #111827;
            }
            h2 {
              margin: 24px 0 12px;
              font-size: 20px;
              color: #2563eb;
            }
            h3 {
              margin: 16px 0 6px;
              font-size: 16px;
            }
            .meta {
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .logo {
              text-align: center;
              margin-bottom: 16px;
            }
            .logo img {
              max-width: 200px;
              height: auto;
              display: block;
              margin: 0 auto;
              background: transparent;
              border-radius: 0;
            }
            .intro, .section {
              margin-bottom: 20px;
            }
            .event-info {
              border: 1px solid #d1d5db;
              padding: 16px;
              border-radius: 8px;
              background: #f9fafb;
            }
            .event-info dl {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 12px 24px;
            }
            .event-info dt {
              font-weight: 600;
              color: #2563eb;
            }
            .event-info dd {
              margin: 0;
              color: #374151;
            }
            .rules {
              display: grid;
              gap: 12px;
            }
            .rule {
              border: 1px solid #e5e7eb;
              padding: 12px;
              border-radius: 8px;
              background: #f5f5f5;
            }
            .category {
              margin-bottom: 16px;
              border-left: 4px solid #2563eb;
              padding-left: 12px;
            }
            .category ul {
              margin: 8px 0 0;
              padding: 0;
              list-style: disc inside;
            }
            ul.standard {
              padding-left: 18px;
              margin: 8px 0 0;
            }
            .highlight {
              background: #fee2e2;
              border: 1px solid #f87171;
              border-radius: 8px;
              padding: 12px;
              color: #b91c1c;
              font-weight: 600;
            }
            @media print {
              body { margin: 24px; }
              .event-info {
                background: none;
              }
            }
          </style>
        </head>
        <body>
          ${logoMarkup}
          <h1>Reglamento Oficial</h1>
          <p class="meta">Generado: ${escapeHtml(formattedNow)} • Encuentro de Aguas Abiertas Los Naranjos 2025</p>

          <section class="intro">
            <h2>Información del Evento</h2>
            <div class="event-info">
              <dl>
                <div>
                  <dt>Fecha y hora</dt>
                  <dd>12 de octubre de 2025 • 6:00 AM</dd>
                </div>
                <div>
                  <dt>Ubicación</dt>
                  <dd>Lago de Yojoa, Los Naranjos, Honduras</dd>
                </div>
                <div>
                  <dt>Organiza</dt>
                  <dd>Swim+ HN</dd>
                </div>
                <div>
                  <dt>Cupo máximo</dt>
                  <dd>100 participantes</dd>
                </div>
                <div>
                  <dt>Costo de inscripción</dt>
                  <dd>L 300.00 • Depósito a BAC Honduras 743657881 (Carlos René Cerrato Osorio)</dd>
                </div>
              </dl>
            </div>
          </section>

          <section class="section">
            <h2>Normas Principales</h2>
            <div class="rules">${rulesHtml}</div>
          </section>

          <section class="section">
            <h2>Distancias y Categorías</h2>
            ${categoriesHtml}
          </section>

          <section class="section">
            <h2>Equipo Permitido</h2>
            <ul class="standard">${equipmentHtml}</ul>
          </section>

          <section class="section">
            <h2>Equipo Prohibido</h2>
            <ul class="standard">${prohibitionsHtml}</ul>
          </section>

          <section class="section">
            <h2>Medidas de Seguridad</h2>
            <p>El evento cuenta con salvavidas certificados, embarcaciones de apoyo, personal de rescate acuático, paramédicos en meta y ambulancia disponible durante toda la competencia.</p>
            <p>Los participantes pueden retirarse voluntariamente en cualquier momento, pero deben avisar inmediatamente al personal de seguridad más cercano.</p>
          </section>

          <section class="section">
            <h2>Condiciones Climáticas y del Agua</h2>
            <p>La organización se reserva el derecho de suspender, posponer o modificar el evento en caso de condiciones adversas que comprometan la seguridad de los participantes. El clima y la calidad del agua se monitorean constantemente.</p>
          </section>

          <section class="section">
            <h2>Reclamaciones y Resultados</h2>
            <p>Las reclamaciones sobre resultados deben presentarse hasta 30 minutos después de la publicación oficial. Los resultados se publicarán en el sitio web y el área de premiación el mismo día del evento.</p>
          </section>

          <section class="section">
            <h2>Responsabilidad</h2>
            <div class="highlight">
              <p>Al inscribirse, el participante declara estar en condiciones de salud adecuadas y acepta que la organización no se hace responsable por accidentes o daños. Si el participante es menor de edad, su tutor legal asume la responsabilidad correspondiente.</p>
            </div>
          </section>
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();
    setTimeout(() => {
      exportWindow.print();
      exportWindow.close();
    }, 250);
  };
