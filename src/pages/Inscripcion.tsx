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
import { PaymentDetails } from '@/components/payment-details';
import { CountryCombobox } from '@/components/country-combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CapacityIndicator } from '@/components/ui/capacity-indicator';
import { useRegistrations } from '@/context/registration-context';
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AGE_BASED_REGISTRATION_FEE_TEXT,
  calculateAgeOnEvent,
  calculateRegistrationFee,
  calculateRegistrationCategory,
  formatRegistrationFee,
  getParticipantDocumentLabel,
  isHonduranParticipant,
  normalizeParticipantDocument,
  splitRegistrationDistances,
  validateParticipantDocument,
} from '@/lib/registration-categories';
import { getEventRegistrationStatus } from '@/config/event';

const MAX_COMPROBANTE_SIZE_MB = 15;
const MAX_COMPROBANTE_SIZE_BYTES = MAX_COMPROBANTE_SIZE_MB * 1024 * 1024;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('es-HN', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

const Inscripcion = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { eventId } = useParams();
  const { addRegistration, stats, activeEvent, setActiveEventId, events, isLoading: isRegistrationsLoading } = useRegistrations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [successRegistration, setSuccessRegistration] = useState<{
    dorsal: string;
    email: string;
    eventName: string;
  } | null>(null);

  const currentParticipants = stats.total;
  const maxParticipants = stats.max;
  const registrationStatus = getEventRegistrationStatus(activeEvent);
  const isRegistrationOpen = registrationStatus.isOpen;
  const isCapacityFull = stats.capacityFull;
  const isCapacityDataLoading = isRegistrationsLoading;
  const closedTitle = registrationStatus.reason === 'manual'
    ? 'Inscripciones Bloqueadas'
    : registrationStatus.reason === 'before'
      ? 'Inscripciones Próximamente'
      : 'Inscripciones Cerradas';
  const closedDescription = registrationStatus.reason === 'manual'
    ? 'La organización cerró manualmente las inscripciones para este evento.'
    : registrationStatus.reason === 'before'
      ? `Las inscripciones abrirán el ${formatDateTime(activeEvent.registrationOpenDateTime)}.`
      : registrationStatus.reason === 'after'
        ? `El período de inscripciones terminó el ${formatDateTime(activeEvent.registrationCloseDateTime)}.`
        : 'Este evento ya no acepta nuevas inscripciones.';

  const [formData, setFormData] = useState({
    nombre: '',
    dni: '',
    nacimiento: '',
    pais: 'Honduras',
    email: '',
    telefono: '',
    club: '',
    distancia: '',
    sexo: '',
    emergenciaNombre: '',
    emergenciaTel: '',
    medico: '',
    banco: '',
    monto: activeEvent.price,
    referencia: '',
    tallaCamisa: '',
    comprobante: null as File | null
  });
  const [birthDateError, setBirthDateError] = useState('');
  const [dniError, setDniError] = useState('');

  const goHomeAfterSuccess = () => {
    setSuccessRegistration(null);
    navigate(`/eventos/${activeEvent.id}`);
  };

  const bancos = [
    'BAC Honduras',
    'Promerica',
  ];

  const tallasCamisa = [
    '12','14','16','XS', 'S', 'M', 'L', 'XL', 'XXL'
  ];

  useEffect(() => {
    if (eventId && events.some((event) => event.id === eventId) && activeEvent.id !== eventId) {
      setActiveEventId(eventId);
    }
  }, [activeEvent.id, eventId, events, setActiveEventId]);

  const calculatePaymentAmount = useCallback((birthDate: string, country: string): string => {
    if (activeEvent.courseType !== 'open_water') return activeEvent.price;
    return calculateRegistrationFee(birthDate, activeEvent.date, activeEvent.price, country);
  }, [activeEvent.courseType, activeEvent.date, activeEvent.price]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, monto: calculatePaymentAmount(prev.nacimiento, prev.pais) }));
  }, [calculatePaymentAmount]);

  const getAgeOnEvent = (birthDate: string): number | null => {
    return calculateAgeOnEvent(birthDate, activeEvent.date);
  };

  const getSelectedDistances = splitRegistrationDistances;

  const getDistanceLabel = (distanceValue: string) =>
    activeEvent.distances.find((distance) => distance.value === distanceValue)?.label ?? distanceValue;

  const calculateCategory = (birthDate: string, distance = activeEvent.distances[0]?.value ?? ''): string => {
    return calculateRegistrationCategory(birthDate, distance, activeEvent);
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

    const minimumEventAge = Math.min(...activeEvent.distances.map((distance) => distance.minAge));

    if (age < minimumEventAge) {
      setBirthDateError(`La edad mínima para participar es ${minimumEventAge} años.`);
      return;
    }

    const selectedDistances = getSelectedDistances(distance);
    const invalidDistance = selectedDistances
      .map((selected) => activeEvent.distances.find((item) => item.value === selected))
      .find((item) => item && age < item.minAge);

    if (!invalidDistance) {
      setBirthDateError('');
      return;
    }

    setBirthDateError(`Tu edad no permite participar en ${invalidDistance.label}.`);
  };

  const handleBirthDateChange = (value: string) => {
    setFormData(prev => {
      const next = { ...prev, nacimiento: value, monto: calculatePaymentAmount(value, prev.pais) };
      const age = getAgeOnEvent(value);

      if (age !== null) {
        const minimumEventAge = Math.min(...activeEvent.distances.map((distance) => distance.minAge));
        const selectedDistances = getSelectedDistances(next.distancia);

        if (age < minimumEventAge) {
          next.distancia = '';
        } else if (selectedDistances.length) {
          next.distancia = selectedDistances
            .filter((selected) => {
              const distanceConfig = activeEvent.distances.find((distance) => distance.value === selected);
              return distanceConfig && age >= distanceConfig.minAge;
            })
            .join(', ');
        }
      }

      validateAgeForInputs(next.nacimiento, next.distancia);
      return next;
    });
  };

  const handleCountryChange = (value: string) => {
    setDniError('');
    setFormData((prev) => ({
      ...prev,
      pais: value,
      dni: isHonduranParticipant(value) ? prev.dni.replace(/\D/g, '').slice(0, 13) : prev.dni,
      monto: calculatePaymentAmount(prev.nacimiento, value),
    }));
  };

  const handleComprobanteChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_COMPROBANTE_SIZE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Archivo muy pesado',
        description: `El comprobante supera los ${MAX_COMPROBANTE_SIZE_MB} MB permitidos. Reduce el tamaño o utiliza un formato más liviano.`,
      });
      event.target.value = '';
      return;
    }

    setFormData((prev) => ({ ...prev, comprobante: file }));
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

    if (!activeEvent.allowMultipleDistances && !formData.tallaCamisa) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona la talla de camisa.",
      });
      return;
    }

    const documentError = validateParticipantDocument(formData.dni, formData.pais);

    if (documentError) {
      const message = documentError;
      setDniError(message);
      toast({
        variant: "destructive",
        title: "Documento inválido",
        description: message,
      });
      return;
    }

    setDniError('');
    const sanitizedDni = normalizeParticipantDocument(formData.dni, formData.pais);

    const age = getAgeOnEvent(formData.nacimiento);
    const selectedDistances = getSelectedDistances(formData.distancia);

    if (age === null) {
      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: "Verifica tu fecha de nacimiento.",
      });
      return;
    }

    const minimumEventAge = Math.min(...activeEvent.distances.map((item) => item.minAge));
    if (age < minimumEventAge) {
      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: `La edad mínima para participar es ${minimumEventAge} años.`,
      });
      setBirthDateError(`La edad mínima para participar es ${minimumEventAge} años.`);
      return;
    }

    const invalidDistances = selectedDistances
      .map((selected) => activeEvent.distances.find((item) => item.value === selected))
      .filter((item): item is typeof activeEvent.distances[number] => Boolean(item) && age < item.minAge);

    if (!selectedDistances.length || selectedDistances.some((selected) => !activeEvent.distances.some((item) => item.value === selected))) {
      toast({
        variant: "destructive",
        title: activeEvent.allowMultipleDistances ? "Pruebas inválidas" : "Distancia inválida",
        description: activeEvent.allowMultipleDistances ? "Selecciona al menos una prueba disponible." : "Selecciona una distancia disponible.",
      });
      return;
    }

    if (invalidDistances.length) {
      toast({
        variant: "destructive",
        title: "Edad no permitida",
        description: `Tu edad no permite participar en ${invalidDistances.map((item) => item.label).join(', ')}.`,
      });
      setBirthDateError('Esta edad no es permitida para participar.');
      return;
    }

    setBirthDateError('');

    if (!isRegistrationOpen) {
      toast({
        variant: "destructive",
        title: closedTitle,
        description: closedDescription,
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
      const categoria = calculateCategory(formData.nacimiento, selectedDistances[0]);

      if (!categoria) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No pudimos determinar tu categoría. Verifica tu fecha de nacimiento.",
        });
        return;
      }

      const registration = await addRegistration({
        nombre: formData.nombre.trim(),
        dni: sanitizedDni,
        nacimiento: formData.nacimiento,
        pais: formData.pais.trim(),
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
        monto: calculatePaymentAmount(formData.nacimiento, formData.pais),
        referencia: formData.referencia.trim(),
        tallaCamisa: formData.tallaCamisa,
        comprobanteFile: formData.comprobante,
      });

      toast({
        title: "¡Inscripción registrada!",
        description: `Enviamos la confirmación a ${formData.email.trim()}.`,
      });

      setSuccessRegistration({
        dorsal: registration.dorsal,
        email: formData.email.trim(),
        eventName: activeEvent.name,
      });

      setFormData({
        nombre: '',
        dni: '',
        nacimiento: '',
        pais: 'Honduras',
        email: '',
        telefono: '',
        club: '',
        distancia: '',
        sexo: '',
        emergenciaNombre: '',
        emergenciaTel: '',
        medico: '',
        banco: '',
        monto: calculatePaymentAmount('', 'Honduras'),
        referencia: '',
        tallaCamisa: '',
        comprobante: null
      });
      setBirthDateError('');
      setDniError('');
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
        if (error.message.toLowerCase().includes('dni') || error.message.toLowerCase().includes('documento')) {
          setDniError(error.message);
        }
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
  const paymentAmount = calculatePaymentAmount(formData.nacimiento, formData.pais);
  const isHonduran = isHonduranParticipant(formData.pais);
  const documentLabel = getParticipantDocumentLabel(formData.pais);
  const isDistanceDisabled = (distanceValue: string) => {
    const minAge = activeEvent.distances.find((distance) => distance.value === distanceValue)?.minAge ?? 9;
    return participantAge !== null && participantAge < minAge;
  };
  const selectedDistances = getSelectedDistances(formData.distancia);
  const selectedDistanceLabels = selectedDistances.map(getDistanceLabel);

  const handleDistanceToggle = (distanceValue: string, checked: boolean) => {
    setFormData((prev) => {
      const current = getSelectedDistances(prev.distancia);
      const nextDistances = checked
        ? Array.from(new Set([...current, distanceValue]))
        : current.filter((value) => value !== distanceValue);
      const next = { ...prev, distancia: nextDistances.join(', ') };
      validateAgeForInputs(next.nacimiento, next.distancia);
      return next;
    });
  };

  if (!isRegistrationOpen && !isCapacityFull) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16">
          <Card className="text-center">
            <CardHeader>
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl">{closedTitle}</CardTitle>
              <CardDescription className="text-lg">
                {closedDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={`/eventos/${activeEvent.id}`}>
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al evento
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <FooterGM />
      </div>
    );
  }

  if (isCapacityFull) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 max-w-2xl mx-auto px-4 py-16">
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
              <Link to={`/eventos/${activeEvent.id}`}>
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al evento
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        <FooterGM />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <Dialog open={Boolean(successRegistration)} onOpenChange={(open) => {
        if (!open && successRegistration) goHomeAfterSuccess();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl">Gracias por tu inscripción</DialogTitle>
            <DialogDescription className="text-base">
              Tu registro para {successRegistration?.eventName} fue recibido correctamente.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p>
              <span className="font-semibold">Dorsal:</span> #{successRegistration?.dorsal}
            </p>
            <p className="mt-2">
              Enviamos un correo de confirmación a{' '}
              <span className="font-semibold">{successRegistration?.email}</span>.
            </p>
            <p className="mt-2 text-muted-foreground">
              Tu inscripción queda pendiente de validación del pago. Te notificaremos cuando sea confirmada.
            </p>
          </div>

          <DialogFooter className="sm:justify-center">
            <Button type="button" onClick={goHomeAfterSuccess}>
              Entendido
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link to={`/eventos/${activeEvent.id}`}>Volver al evento</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to={`/eventos/${activeEvent.id}`}>
            <Button variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al evento
            </Button>
          </Link>
        </div>

        <Card className="card-gradient shadow-card mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-primary">Formulario de Inscripción</CardTitle>
            <CardDescription className="text-lg">
              Completa todos los campos para inscribirte a {activeEvent.name}
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
                <Label htmlFor="dni">{documentLabel} *</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => {
                    const value = isHonduran
                      ? e.target.value.replace(/\D/g, '').slice(0, 13)
                      : e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
                    setDniError('');
                    setFormData(prev => ({ ...prev, dni: value }));
                  }}
                  required
                  placeholder={isHonduran ? '0801199012345' : 'Pasaporte o documento'}
                  inputMode={isHonduran ? 'numeric' : 'text'}
                  maxLength={isHonduran ? 13 : 20}
                />
                {dniError && (
                  <p className="text-sm text-destructive">{dniError}</p>
                )}
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
                <Label htmlFor="pais">País *</Label>
                <CountryCombobox
                  id="pais"
                  value={formData.pais}
                  onValueChange={handleCountryChange}
                />
              </div>
              {!activeEvent.allowMultipleDistances && (
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
              )}
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
              <div className="space-y-3">
                <Label htmlFor="distancia">{activeEvent.allowMultipleDistances ? 'Pruebas *' : 'Distancia *'}</Label>
                {activeEvent.allowMultipleDistances ? (
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    {activeEvent.distances.map((distance) => {
                      const disabled = isDistanceDisabled(distance.value);
                      const checked = selectedDistances.includes(distance.value);

                      return (
                        <label
                          key={distance.value}
                          className={`flex items-start gap-3 text-sm ${disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(value) => handleDistanceToggle(distance.value, Boolean(value))}
                          />
                          <span>
                            <span className="font-medium text-foreground">{distance.label}</span>
                            {disabled && (
                              <span className="block text-xs text-muted-foreground">
                                Edad mínima: {distance.minAge} años
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
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
                      {activeEvent.distances.map((distance) => (
                        <SelectItem key={distance.value} value={distance.value} disabled={isDistanceDisabled(distance.value)}>
                          {distance.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {activeEvent.allowMultipleDistances && selectedDistanceLabels.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Pruebas seleccionadas: {selectedDistanceLabels.join(', ')}
                  </p>
                )}
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
              
              {formData.nacimiento && (
                <div className="md:col-span-2">
                  <Label>Categoría</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="font-semibold text-primary">
                      {calculateCategory(formData.nacimiento, selectedDistances[0]) || 'No hay categoría disponible para esta edad'}
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
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Deposita <strong className="text-foreground">{formatRegistrationFee(paymentAmount)}</strong> en cualquiera de estas cuentas.
                  {activeEvent.courseType === 'open_water' && (
                    <span className="block">
                      {AGE_BASED_REGISTRATION_FEE_TEXT}
                    </span>
                  )}
                </p>
                <PaymentDetails paymentInfo={activeEvent.paymentInfo} />
              </div>

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
                  <Label htmlFor="monto">Monto *</Label>
                  <Input
                    id="monto"
                    type="text"
                    value={formData.monto}
                    readOnly
                    className="bg-muted"
                    required
                    placeholder={paymentAmount}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se calcula automáticamente por la edad al día del evento.
                  </p>
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
                <Label htmlFor="comprobante">
                  Comprobante de pago * (PDF, JPG, PNG - máx. {MAX_COMPROBANTE_SIZE_MB}MB)
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <Input
                    id="comprobante"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleComprobanteChange}
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
                    <Link to={`/eventos/${activeEvent.id}/reglamento`} className="text-primary hover:underline">
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
      <FooterGM />
    </div>
  );
};

export default Inscripcion;
