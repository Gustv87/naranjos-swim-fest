import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { FirebaseError } from 'firebase/app';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CapacityIndicator } from '@/components/ui/capacity-indicator';
import { useRegistrations } from '@/context/registration-context';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Inscripcion = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { toast } = useToast();
  const { addRegistration, stats, isLoading: isRegistrationsLoading } = useRegistrations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);

  const currentParticipants = stats.total;
  const maxParticipants = stats.max;
  const isRegistrationOpen = new Date() < new Date('2025-10-08T23:59:59-06:00');
  const isCapacityFull = stats.capacityFull;
  const isCapacityDataLoading = isRegistrationsLoading;

  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    nacimiento: '',
    email: '',
    telefono: '',
    club: '',
    distancia: '',
    sexo: '',
    emergenciaNombre: '',
    emergenciaTel: '',
    medico: '',
    banco: '',
    monto: '',
    referencia: '',
    tallaCamisa: '',
    comprobante: null as File | null
  });
  const [birthDateError, setBirthDateError] = useState('');

  const bancos = [
    'BAC Honduras',
  ];

  const tallasCamisa = [
    '12','14','16','XS', 'S', 'M', 'L', 'XL', 'XXL'
  ];

  const MIN_AGE_BY_DISTANCE: Record<string, number> = {
    '800m': 9,
    '2km': 15,
    '5km': 15,
  };

  const EVENT_DATE = new Date('2025-10-12');

  const getAgeOnEvent = (birthDate: string): number | null => {
    if (!birthDate) return null;

    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;

    let age = EVENT_DATE.getFullYear() - birth.getFullYear();
    const hasHadBirthday =
      EVENT_DATE.getMonth() > birth.getMonth() ||
      (EVENT_DATE.getMonth() === birth.getMonth() && EVENT_DATE.getDate() >= birth.getDate());

    if (!hasHadBirthday) {
      age -= 1;
    }

    return age;
  };

  const calculateCategory = (birthDate: string, distance: string): string => {
    if (!birthDate || !distance) return '';

    const age = getAgeOnEvent(birthDate);
    if (age === null) return '';

    if (distance === '800m') {
      if (age >= 9 && age <= 10) return 'Infantiles A (9-10)';
      if (age >= 11 && age <= 12) return 'Infantiles B (11-12)';
      if (age >= 13 && age <= 14) return 'Juveniles A (13-14)';
      if (age >= 15) return 'Masters';
      return '';
    }

    if (age >= 15 && age <= 17) return 'Juveniles B (15-17)';
    if (age >= 18 && age <= 30) return '20-30';
    if (age >= 31 && age <= 40) return '30-40';
    return '40+';
  };

  const validateAgeForInputs = (birthDate: string, distance: string) => {
    if (!birthDate) {
      setBirthDateError('');
      return;
    }

    const age = getAgeOnEvent(birthDate);

    if (age === null) {
      setBirthDateError('');
      return;
    }

    if (age < 9) {
      setBirthDateError('La edad mínima para participar es 9 años.');
      return;
    }

    if (age <= 10 && distance && distance !== '800m') {
      setBirthDateError('Con 9 y 10 años solo puedes inscribirte en 800 metros.');
      return;
    }

    const minAge = distance ? (MIN_AGE_BY_DISTANCE[distance] ?? 9) : 9;

    if (age < minAge) {
      setBirthDateError('Esta edad no es permitida para participar.');
      return;
    }

    setBirthDateError('');
  };

  const handleBirthDateChange = (value: string) => {
    setFormData(prev => {
      const next = { ...prev, nacimiento: value };
      const age = getAgeOnEvent(value);

      if (age !== null) {
        if (age < 9) {
          next.distancia = '';
        } else if (next.distancia) {
          if (age <= 10 && next.distancia !== '800m') {
            next.distancia = '';
          } else {
            const minAgeForDistance = MIN_AGE_BY_DISTANCE[next.distancia] ?? 9;
            if (age < minAgeForDistance) {
              next.distancia = '';
            }
          }
        }
      }

      validateAgeForInputs(next.nacimiento, next.distancia);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedRules) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes aceptar el reglamento para continuar",
      });
      return;
    }

    if (!formData.tallaCamisa) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona la talla de camisa.",
      });
      return;
    }

    const age = getAgeOnEvent(formData.nacimiento);
    const distance = formData.distancia;

    if (age === null) {
      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: "Verifica tu fecha de nacimiento.",
      });
      return;
    }

    if (age < 9) {
      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: "La edad mínima para participar es 9 años.",
      });
      setBirthDateError('La edad mínima para participar es 9 años.');
      return;
    }

    if (age <= 10 && distance && distance !== '800m') {
      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: "Con 9 y 10 años solo puedes inscribirte en la distancia de 800 metros.",
      });
      setBirthDateError('Con 9 y 10 años solo puedes inscribirte en 800 metros.');
      return;
    }

    const minAge = distance ? (MIN_AGE_BY_DISTANCE[distance] ?? 9) : 9;

    if (age < minAge) {
      const distanceLabel =
        distance === '800m' ? '800 metros' :
        distance === '2km' ? '2 kilómetros' :
        distance === '5km' ? '5 kilómetros' :
        'esta distancia';

      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: `La edad mínima para ${distanceLabel} es de ${minAge} años.`,
      });
      setBirthDateError('Esta edad no es permitida para participar.');
      return;
    }

    setBirthDateError('');

    if (!isRegistrationOpen) {
      toast({
        variant: "destructive",
        title: "Inscripciones cerradas",
        description: "El período de inscripciones ha terminado",
      });
      return;
    }

    if (!navigator.onLine) {
      toast({
        variant: "destructive",
        title: "Sin conexión",
        description: "Verifica tu conexión a internet antes de continuar.",
      });
      return;
    }

    if (isCapacityDataLoading) {
      toast({
        title: "Cargando información",
        description: "Espera a que se actualice la disponibilidad de cupos antes de continuar.",
      });
      return;
    }

    if (isCapacityFull) {
      toast({
        variant: "destructive",
        title: "Cupo agotado",
        description: "Ya no hay cupos disponibles para este evento",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const categoria = calculateCategory(formData.nacimiento, formData.distancia);

      if (!categoria) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No pudimos determinar tu categoría. Verifica tu fecha de nacimiento y distancia.",
        });
        return;
      }

      const registration = await addRegistration({
        nombre: formData.nombre.trim(),
        dni: formData.dni.trim(),
        nacimiento: formData.nacimiento,
        email: formData.email.trim(),
        telefono: formData.telefono.trim(),
        club: formData.club.trim(),
        distancia: formData.distancia,
        sexo: formData.sexo,
        categoria,
        emergenciaNombre: formData.emergenciaNombre.trim(),
        emergenciaTel: formData.emergenciaTel.trim(),
        medico: formData.medico.trim(),
        banco: formData.banco,
        monto: formData.monto.trim(),
        referencia: formData.referencia.trim(),
        tallaCamisa: formData.tallaCamisa,
        comprobanteFile: formData.comprobante,
      });

      toast({
        title: "¡Inscripción registrada!",
        description: `Te contactaremos para validar tu pago.`,
      });

      setFormData({
        nombre: '',
        dni: '',
        nacimiento: '',
        email: '',
        telefono: '',
        club: '',
        distancia: '',
        sexo: '',
        emergenciaNombre: '',
        emergenciaTel: '',
        medico: '',
        banco: '',
        monto: '',
        referencia: '',
        tallaCamisa: '',
        comprobante: null
      });
      setBirthDateError('');
      setAcceptedRules(false);
    } catch (error) {
      let description = 'No se pudo procesar tu inscripción. Intenta nuevamente.';

      if (error instanceof FirebaseError) {
        if (error.code.includes('network') || error.code === 'unavailable') {
          description = 'No pudimos conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.';
        } else if (error.code === 'storage/unauthorized') {
          description = 'No tienes permisos para subir el comprobante. Contacta al administrador.';
        } else {
          description = error.message;
        }
      } else if (error instanceof Error) {
        description = error.message === 'No hay cupos disponibles'
          ? 'Ya no hay cupos disponibles para este evento.'
          : error.message;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const participantAge = getAgeOnEvent(formData.nacimiento);
  const isDistanceDisabled = (distanceValue: string) => {
    const minAge = MIN_AGE_BY_DISTANCE[distanceValue] ?? 9;
    return participantAge !== null && participantAge < minAge;
  };

  if (!isRegistrationOpen && !isCapacityFull) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="text-center">
            <CardHeader>
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl">Inscripciones Cerradas</CardTitle>
              <CardDescription className="text-lg">
                El período de inscripciones terminó el 8 de octubre de 2025
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isCapacityFull) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <Card className="text-center">
            <CardHeader>
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl">Cupo Agotado</CardTitle>
              <CardDescription className="text-lg">
                Ya no hay cupos disponibles para este evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CapacityIndicator current={currentParticipants} max={maxParticipants} className="mb-6" />
              <Link to="/">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

        <Card className="card-gradient shadow-card mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-primary">Formulario de Inscripción</CardTitle>
            <CardDescription className="text-lg">
              Completa todos los campos para inscribirte al Encuentro de Aguas Abiertas Los Naranjos
            </CardDescription>
            <CapacityIndicator current={currentParticipants} max={maxParticipants} className="mt-4" />
          </CardHeader>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Datos Personales */}
          <Card className="card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Datos Personales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  required
                  placeholder="Tu nombre completo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dni">Identidad/DNI *</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                  required
                  placeholder="0801-1990-12345"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nacimiento">Fecha de Nacimiento *</Label>
                <Input
                  id="nacimiento"
                  type="date"
                  value={formData.nacimiento}
                  onChange={(e) => handleBirthDateChange(e.target.value)}
                  required
                />
                {birthDateError && (
                  <p className="text-sm text-destructive">{birthDateError}</p>
                )}
              </div>
               <div className="space-y-2">
                <Label htmlFor="tallaCamisa">Talla de Camisa *</Label>
                <Select
                  value={formData.tallaCamisa}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tallaCamisa: value }))}
                >
                  <SelectTrigger id="tallaCamisa">
                    <SelectValue placeholder="Selecciona la talla" />
                  </SelectTrigger>
                  <SelectContent>
                    {tallasCamisa.map((talla) => (
                      <SelectItem key={talla} value={talla}>
                        {talla}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="tu@email.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono *</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  required
                  placeholder="9999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="club">Club/Equipo *</Label>
                <Input
                  id="club"
                  value={formData.club}
                  onChange={(e) => setFormData(prev => ({ ...prev, club: e.target.value }))}
                  required
                  placeholder="Nombre de tu club o equipo"
                />
              </div>
            </CardContent>
          </Card>

          {/* Competencia */}
          <Card className="card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Datos de Competencia</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="distancia">Distancia *</Label>
                <Select
                  value={formData.distancia}
                  onValueChange={(value) =>
                    setFormData(prev => {
                      const next = { ...prev, distancia: value };
                      validateAgeForInputs(next.nacimiento, next.distancia);
                      return next;
                    })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la distancia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="800m" disabled={isDistanceDisabled('800m')}>
                      800 metros
                    </SelectItem>
                    <SelectItem value="2km" disabled={isDistanceDisabled('2km')}>
                      2 kilómetros
                    </SelectItem>
                    <SelectItem value="5km" disabled={isDistanceDisabled('5km')}>
                      5 kilómetros
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo *</Label>
                <Select
                  value={formData.sexo}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sexo: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tu sexo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="F">Femenino</SelectItem>
                    <SelectItem value="M">Masculino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.distancia && formData.nacimiento && (
                <div className="md:col-span-2">
                  <Label>Categoría</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="font-semibold text-primary">
                      {calculateCategory(formData.nacimiento, formData.distancia)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergencia */}
          <Card className="card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Contacto de Emergencia</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="emergenciaNombre">Nombre *</Label>
                <Input
                  id="emergenciaNombre"
                  value={formData.emergenciaNombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergenciaNombre: e.target.value }))}
                  required
                  placeholder="Nombre del contacto"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergenciaTel">Teléfono *</Label>
                <Input
                  id="emergenciaTel"
                  value={formData.emergenciaTel}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergenciaTel: e.target.value }))}
                  required
                  placeholder="9999-9999"
                />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="medico">Condición médica relevante (opcional)</Label>
                <Textarea
                  id="medico"
                  value={formData.medico}
                  onChange={(e) => setFormData(prev => ({ ...prev, medico: e.target.value }))}
                  placeholder="Medicamentos, alergias, condiciones médicas importantes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pago */}
          <Card className="card-gradient shadow-card">
            <CardHeader>
              <CardTitle className="text-xl text-primary">Información de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="banco">Banco/Plataforma *</Label>
                  <Select
                    value={formData.banco}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, banco: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {bancos.map((banco) => (
                        <SelectItem key={banco} value={banco}>{banco}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (L) *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData(prev => ({ ...prev, monto: e.target.value }))}
                    required
                    placeholder="300.00"
                  />
                </div>
                
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="referencia">Número de referencia/transacción *</Label>
                  <Input
                    id="referencia"
                    value={formData.referencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, referencia: e.target.value }))}
                    required
                    placeholder="Número de confirmación del pago"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="comprobante">Comprobante de pago * (PDF, JPG, PNG - máx. 5MB)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <Input
                    id="comprobante"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData(prev => ({ ...prev, comprobante: e.target.files?.[0] || null }))}
                    required
                    className="max-w-sm mx-auto"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Sube tu comprobante de pago
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reglamento */}
          <Card className="card-gradient shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="rules"
                  checked={acceptedRules}
                  onCheckedChange={(checked) => setAcceptedRules(checked === true)}
                  required
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="rules"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Acepto el reglamento y deslinde de responsabilidad *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Al inscribirme acepto las normas del evento y eximo de responsabilidad a los organizadores.{' '}
                    <Link to="/reglamento" className="text-primary hover:underline">
                      Leer reglamento completo
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="text-center">
            <Button
              type="submit"
              size="lg"
              className="button-gradient shadow-button text-lg px-12 py-6"
              disabled={isSubmitting || !acceptedRules || Boolean(birthDateError)}
            >
              {isSubmitting ? (
                <>Procesando inscripción...</>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Completar Inscripción
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Inscripcion;
