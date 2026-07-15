import { Navigation } from '@/components/layout/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { CountryCombobox } from '@/components/country-combobox';
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRegistrations, type Registration, type RegistrationStatus, type RegistrationEditableFields, type RegistrationResult } from '@/context/registration-context';
import { Lock, Shield, Users, QrCode, Search, Clock, XCircle, CheckCircle2, Pencil, Plus, AlertCircle, FileText, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import logoImage from '@/assets/Logo.webp';
import { auth, storage } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationCreateInput } from '@/schema/registration';
import {
  DEFAULT_DISTANCES,
  OFFICIAL_MASTER_CATEGORIES_TEXT,
  getEventRegistrationStatus,
  shouldUseOfficialMasterCategories,
  type EventConfig,
} from '@/config/event';
import {
  calculateAgeOnEvent,
  calculateRegistrationFee,
  calculateRegistrationCategory,
  formatRegistrationFee,
  getParticipantDocumentLabel,
  isHonduranParticipant,
  parseAgeCategories,
  splitRegistrationDistances,
} from '@/lib/registration-categories';
import { SPECIAL_RESULT_TOKENS, normalizeResultTimeInput } from '@/lib/result-time';
import { convertPdfFirstPageToImage, isPdfFile } from '@/lib/pdf-to-image';

type HeatLaneAssignment = {
  lane: number;
  participant: Registration | null;
};

type HeatAssignment = {
  heatNumber: number;
  heatCount: number;
  lanes: HeatLaneAssignment[];
};

type CategoryHeatAssignment = {
  eventNumber: number;
  category: string;
  sex: 'F' | 'M';
  sexLabel: string;
  participantCount: number;
  heats: HeatAssignment[];
};

type DistanceHeatAssignment = {
  distance: string;
  label: string;
  categories: CategoryHeatAssignment[];
};

type ResultEventGroup = {
  key: string;
  eventNumber: number;
  distance: string;
  distanceLabel: string;
  category: string;
  sex: 'F' | 'M';
  sexLabel: string;
  participants: Registration[];
};

type RunEventOption = {
  key: string;
  eventNumber: number;
  distance: string;
  distanceLabel: string;
  sex: 'F' | 'M';
  category: string;
  sexLabel: string;
  participantCount: number;
};

type RunHeatOption = RunEventOption & {
  heatKey: string;
  label: string;
  heatNumber: number;
  heatCount: number;
  lanes: HeatLaneAssignment[];
};

type ReportType =
  | 'csv'
  | 'pdf'
  | 'name-age'
  | 'name-age-general'
  | 'name-age-team'
  | 'results-event'
  | 'results-general'
  | 'competition-program'
  | 'timekeeper-sheets'
  | 'lane-timekeeper-sheets';

type NameAgeReportMode = 'category' | 'general' | 'team';

const REPORTS_REQUIRING_LANES: ReportType[] = [
  'competition-program',
  'timekeeper-sheets',
  'lane-timekeeper-sheets',
];

const Admin = () => {
const SHIRT_SIZES = ['12', '14', '16', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
const HEAT_SEX_GROUPS = [
  { sex: 'F' as const, label: 'Damas' },
  { sex: 'M' as const, label: 'Varones' },
];
const MAX_POSTER_SIZE_MB = 10;
const MAX_POSTER_SIZE_BYTES = MAX_POSTER_SIZE_MB * 1024 * 1024;
const MAX_SPONSOR_SIZE_MB = 5;
const MAX_SPONSOR_SIZE_BYTES = MAX_SPONSOR_SIZE_MB * 1024 * 1024;
const MAX_SPONSOR_PDF_SIZE_MB = 15;
const MAX_SPONSOR_PDF_SIZE_BYTES = MAX_SPONSOR_PDF_SIZE_MB * 1024 * 1024;
const MAX_SPONSOR_LOGOS = 30;
const { toast } = useToast();
const location = useLocation();
const navigate = useNavigate();
const {
  events,
  activeEvent,
  activeEventId,
  setActiveEventId,
  registrations,
  stats,
  updateRegistrationStatus,
  toggleCheckIn,
  updateRegistrationResult,
  updateRegistrationData,
  addRegistration,
  createEvent,
  updateEvent,
  isLoading: registrationsLoading,
  error,
} = useRegistrations();

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
  const [heatLaneCount, setHeatLaneCount] = useState('5');
  const [selectedReport, setSelectedReport] = useState<ReportType>('pdf');
  const [selectedResultEventKey, setSelectedResultEventKey] = useState('');
  const [selectedRunEventKey, setSelectedRunEventKey] = useState('');
  const [selectedRunHeatKey, setSelectedRunHeatKey] = useState('');
  const [resultEdits, setResultEdits] = useState<Record<string, string>>({});
  const [resultSaving, setResultSaving] = useState<Record<string, boolean>>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editParticipant, setEditParticipant] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<RegistrationEditableFields>({});
  const [resultEdit, setResultEdit] = useState('');
  const [editResultEdits, setEditResultEdits] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventPosterFile, setEventPosterFile] = useState<File | null>(null);
  const [eventSponsorFiles, setEventSponsorFiles] = useState<File[]>([]);
  const [isConvertingSponsorPdfs, setIsConvertingSponsorPdfs] = useState(false);
  const [isTogglingRegistrationLock, setIsTogglingRegistrationLock] = useState(false);
  const [isClosingEvent, setIsClosingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    time: '06:00',
    registrationCloseDate: '',
    location: '',
    price: '600',
    paymentInfo: '',
    posterImageUrl: '',
    sponsorImageUrls: [] as string[],
    distancesText: '',
    categoriesText: '',
    courseType: (activeEvent.courseType ?? 'open_water') as 'open_water' | 'pool',
    registrationsManuallyClosed: Boolean(activeEvent.registrationsManuallyClosed),
    allowMultipleDistances: false,
  });

  const hasCapacityLimit = typeof stats.max === 'number' && Number.isFinite(stats.max) && stats.max > 0;
  const isRunMode = location.pathname.endsWith('/admin/run');
  const remainingLabel = hasCapacityLimit && typeof stats.remaining === 'number'
    ? stats.remaining
    : 'Sin límite';
  const remainingDescription = hasCapacityLimit ? 'Cupos Restantes' : 'Cupos disponibles';
  const manualCreateDescription = hasCapacityLimit
    ? `Usa este formulario para agregar participantes adicionales (hasta ${stats.max} en total). Los campos obligatorios están marcados con *.`
    : 'Usa este formulario para agregar participantes adicionales. No hay límite de cupos. Los campos obligatorios están marcados con *.';

  const createForm = useForm<RegistrationCreateInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      nombre: '',
      dni: '',
      nacimiento: '',
      pais: 'Honduras',
      email: '',
      telefono: '',
      club: '',
      distancia: activeEvent.distances[0]?.value ?? '',
      sexo: 'M',
      emergenciaNombre: '',
      emergenciaTel: '',
      medico: '',
      banco: 'BAC Honduras',
      monto: activeEvent.price,
      referencia: '',
      tallaCamisa: '',
    },
  });

  useEffect(() => {
    createForm.reset({
      nombre: '',
      dni: '',
      nacimiento: '',
      pais: 'Honduras',
      email: '',
      telefono: '',
      club: '',
      distancia: activeEvent.distances[0]?.value ?? '',
      sexo: 'M',
      emergenciaNombre: '',
      emergenciaTel: '',
      medico: '',
      banco: 'BAC Honduras',
      monto: activeEvent.price,
      referencia: '',
      tallaCamisa: '',
    });
  }, [activeEvent, createForm]);

  const getAgeOnEvent = (birthDate: string): number | null => {
    return calculateAgeOnEvent(birthDate, activeEvent.date);
  };

  const calculateCategory = (birthDate: string, distance: string): string => {
    return calculateRegistrationCategory(birthDate, distance, activeEvent);
  };

  const calculatePaymentAmount = useCallback((birthDate: string, country: string): string => {
    if (activeEvent.courseType !== 'open_water') return activeEvent.price;
    return calculateRegistrationFee(birthDate, activeEvent.date, activeEvent.price, country);
  }, [activeEvent.courseType, activeEvent.date, activeEvent.price]);

  const normalizePaymentAmount = (value: string | null | undefined): number | null => {
    const normalized = String(value ?? '').replace(/[^\d.]/g, '');
    if (!normalized) return null;

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  };

  const hasPaymentAmountMismatch = (storedAmount: string, expectedAmount: string) => {
    const stored = normalizePaymentAmount(storedAmount);
    const expected = normalizePaymentAmount(expectedAmount);
    return stored !== null && expected !== null && stored !== expected;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);

    try {
      const email = credentials.email.trim().toLowerCase();

      if (!allowedAdmins.includes(email)) {
        throw new Error('Este correo no está autorizado para acceder al panel.');
      }

      const startLocalSession = () => {
        setUser(null);
        setLocalSession({ email });
        setAuthLoading(false);
        toast({
          title: 'Acceso autorizado (solo lectura)',
          description: 'Sesión iniciada sin autenticarse en Firebase. Algunas acciones estarán deshabilitadas.',
        });
      };

      try {
        await signInWithEmailAndPassword(auth, email, credentials.password);
        setLocalSession(null);
        toast({
          title: 'Acceso autorizado',
          description: 'Bienvenido al panel de administración',
        });
      } catch (error) {
        const fallbackEnabled = Boolean(localAdminPassword && credentials.password === localAdminPassword);

        if (fallbackEnabled) {
          startLocalSession();
          return;
        }

        throw error;
      }
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

  const adminEmail = (user?.email ?? localSession?.email)?.toLowerCase() ?? '';
  const isReadOnlyMode = !user && Boolean(localSession);
  const registrationStatus = getEventRegistrationStatus(activeEvent);
  const isHistoricalEvent = !activeEvent.acceptsRegistrations || activeEvent.status === 'past';
  const registrationsManuallyClosed = Boolean(activeEvent.registrationsManuallyClosed);
  const canCreateInActiveEvent = !isReadOnlyMode && !isHistoricalEvent;
  const mutationDisabled = isReadOnlyMode || isHistoricalEvent;
  const showReadOnlyWarning = () => {
    toast({
      variant: 'destructive',
      title: 'Modo de solo lectura',
      description: 'Inicia sesión con una cuenta autorizada de Firebase para editar y gestionar inscripciones.',
    });
  };
  const showHistoricalWarning = () => {
    toast({
      variant: 'destructive',
      title: 'Evento histórico',
      description: 'Este evento está en modo historial. Cambia al evento activo para crear o modificar inscripciones.',
    });
  };
  const readOnlyTooltip = isReadOnlyMode ? 'Modo de solo lectura. Inicia sesión con una cuenta autorizada para editar.' : undefined;
  const createRegistrationTooltip = readOnlyTooltip || (isHistoricalEvent ? 'Evento histórico: creación deshabilitada.' : undefined);
  const mutationTooltip = readOnlyTooltip || (isHistoricalEvent ? 'Evento histórico: edición deshabilitada.' : undefined);

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

  const handleEventChange = (eventId: string) => {
    setActiveEventId(eventId);
    setSearchTerm('');
    setStatusFilter('');
    setDistanceFilter('');
    setCategoryFilter('');
    setResultEdits({});
    setSelectedRunEventKey('');
    setSelectedRunHeatKey('');
  };

  const openLastMinuteRegistration = (distance: string, sex: 'F' | 'M') => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }
    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    createForm.reset({
      nombre: '',
      dni: '',
      nacimiento: '',
      pais: 'Honduras',
      email: '',
      telefono: '',
      club: '',
      distancia: distance,
      sexo: sex,
      emergenciaNombre: '',
      emergenciaTel: '',
      medico: '',
      banco: 'BAC Honduras',
      monto: activeEvent.price,
      referencia: '',
      tallaCamisa: '',
    });
    setCreateError('');
    setIsCreateOpen(true);
    toast({
      title: 'Carril libre seleccionado',
      description: `Completa la inscripción de último momento para ${getDistanceLabel(distance)} · ${sex === 'F' ? 'Damas' : 'Varones'}.`,
    });
  };

  const slugify = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

  const formatEventCategories = (eventConfig: EventConfig) =>
    (shouldUseOfficialMasterCategories(eventConfig)
      ? OFFICIAL_MASTER_CATEGORIES_TEXT
      : eventConfig.distances[0]?.categories.map((category) => {
      const range = category.maxAge === null ? `${category.minAge}+` : `${category.minAge}-${category.maxAge}`;
      return `${category.label}:${range}`;
    }).join(', ') ?? '');

  const inferEventCourseType = (eventConfig: EventConfig): 'open_water' | 'pool' => {
    if (eventConfig.courseType === 'pool' || eventConfig.courseType === 'open_water') {
      return eventConfig.courseType;
    }

    const eventText = `${eventConfig.name} ${eventConfig.location} ${eventConfig.locationShort}`.toLowerCase();
    const distanceText = eventConfig.distances.map((distance) => `${distance.value} ${distance.label}`).join(' ').toLowerCase();

    if (eventText.includes('piscina') || eventText.includes('pool')) return 'pool';
    if (eventConfig.allowMultipleDistances) return 'pool';
    if (/\b(libre|pecho|dorso|mariposa|combinado|relevo)\b/.test(distanceText)) return 'pool';
    if (eventText.includes('lago') || eventText.includes('aguas abiertas') || eventText.includes('cruce')) return 'open_water';

    return 'open_water';
  };

  const isPoolEvent = inferEventCourseType(activeEvent) === 'pool';
  const selectedReportRequiresLanes = REPORTS_REQUIRING_LANES.includes(selectedReport);

  useEffect(() => {
    if (!isPoolEvent && selectedReportRequiresLanes) {
      setSelectedReport('pdf');
    }
  }, [isPoolEvent, selectedReportRequiresLanes]);

  const getParticipantCategory = useCallback((participant: Registration, distanceValue = participant.distancia) =>
    calculateRegistrationCategory(participant.nacimiento, distanceValue, activeEvent) || participant.categoria || 'Sin categoría',
  [activeEvent]);

  const categoryOptions = useMemo(() => {
    const configuredCategories = activeEvent.distances.flatMap((distance) => distance.categories.map((category) => category.label));
    const participantCategories = registrations.map((participant) => getParticipantCategory(participant));
    return Array.from(new Set([...configuredCategories, ...participantCategories]))
      .filter(Boolean)
      .sort((a, b) => {
        const ageA = activeEvent.distances.flatMap((distance) => distance.categories).find((category) => category.label === a)?.minAge ?? Number.MAX_SAFE_INTEGER;
        const ageB = activeEvent.distances.flatMap((distance) => distance.categories).find((category) => category.label === b)?.minAge ?? Number.MAX_SAFE_INTEGER;
        if (ageA !== ageB) return ageA - ageB;
        return a.localeCompare(b, 'es');
      });
  }, [activeEvent, getParticipantCategory, registrations]);

  const openEventDialog = (mode: 'create' | 'edit' = 'create') => {
    const eventToEdit = mode === 'edit' ? activeEvent : null;
    const eventDateTime = eventToEdit ? new Date(eventToEdit.dateTime) : null;
    const eventDefaults = eventToEdit ?? activeEvent;

    setEditingEventId(eventToEdit?.id ?? null);
    setEventPosterFile(null);
    setEventSponsorFiles([]);
    setEventForm({
      name: eventToEdit?.name ?? '',
      date: eventToEdit?.date ?? '',
      time: eventDateTime && !Number.isNaN(eventDateTime.getTime())
        ? eventDateTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : '06:00',
      registrationCloseDate: eventToEdit?.registrationCloseDateTime.slice(0, 10) ?? '',
      location: eventToEdit?.location ?? activeEvent.location,
      price: eventToEdit?.price || activeEvent.price || '600',
      paymentInfo: eventToEdit?.paymentInfo ?? activeEvent.paymentInfo,
      posterImageUrl: eventToEdit?.posterImageUrl ?? '',
      sponsorImageUrls: eventToEdit?.sponsorImageUrls ?? [],
      distancesText: eventDefaults.distances.map((distance) => distance.value).join(', '),
      categoriesText: eventToEdit ? formatEventCategories(eventToEdit) : formatEventCategories(activeEvent),
      courseType: inferEventCourseType(eventDefaults),
      registrationsManuallyClosed: Boolean(eventToEdit?.registrationsManuallyClosed),
      allowMultipleDistances: Boolean(eventToEdit?.allowMultipleDistances),
    });
    setIsEventDialogOpen(true);
  };

  const parseCategories = (value: string) => {
    return parseAgeCategories(value);
  };

  const parseDistances = (value: string) => {
    const requested = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!requested.length) return DEFAULT_DISTANCES;

    const categories = parseCategories(eventForm.categoriesText || OFFICIAL_MASTER_CATEGORIES_TEXT);
    const minimumCategoryAge = Math.min(...categories.map((category) => category.minAge));

    return requested.map((distanceValue) => {
      const existing = DEFAULT_DISTANCES.find((distance) => distance.value.toLowerCase() === distanceValue.toLowerCase());
      return existing ? { ...existing, minAge: minimumCategoryAge, categories } : {
        value: distanceValue,
        label: distanceValue,
        minAge: minimumCategoryAge,
        categories,
      };
    });
  };

  const closeEventDialog = () => {
    setIsEventDialogOpen(false);
    setEditingEventId(null);
    setEventPosterFile(null);
    setEventSponsorFiles([]);
  };

  const handleEventPosterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setEventPosterFile(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Archivo inválido',
        description: 'Sube una imagen en formato JPG, PNG o WebP.',
      });
      event.target.value = '';
      setEventPosterFile(null);
      return;
    }

    if (file.size > MAX_POSTER_SIZE_BYTES) {
      toast({
        variant: 'destructive',
        title: 'Imagen muy pesada',
        description: `El afiche no puede superar ${MAX_POSTER_SIZE_MB} MB.`,
      });
      event.target.value = '';
      setEventPosterFile(null);
      return;
    }

    setEventPosterFile(file);
  };

  const uploadEventPoster = async (eventId: string) => {
    if (!eventPosterFile) return eventForm.posterImageUrl.trim();

    const extension = eventPosterFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const safeName = slugify(eventPosterFile.name.replace(/\.[^.]+$/, '')) || 'afiche';
    const posterRef = ref(storage, `event-posters/${eventId}/${Date.now()}-${safeName}.${extension}`);

    await uploadBytes(posterRef, eventPosterFile);
    return getDownloadURL(posterRef);
  };

  const handleEventSponsorsChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!selectedFiles.length) return;

    const invalidType = selectedFiles.find((file) => !file.type.startsWith('image/') && !isPdfFile(file));
    if (invalidType) {
      toast({
        variant: 'destructive',
        title: 'Archivo inválido',
        description: `${invalidType.name} no es compatible. Sube logos en formato JPG, PNG, WebP o PDF.`,
      });
      return;
    }

    const oversizedFile = selectedFiles.find((file) =>
      file.size > (isPdfFile(file) ? MAX_SPONSOR_PDF_SIZE_BYTES : MAX_SPONSOR_SIZE_BYTES)
    );
    if (oversizedFile) {
      toast({
        variant: 'destructive',
        title: 'Imagen muy pesada',
        description: isPdfFile(oversizedFile)
          ? `${oversizedFile.name} supera el límite de ${MAX_SPONSOR_PDF_SIZE_MB} MB para archivos PDF.`
          : `${oversizedFile.name} supera el límite de ${MAX_SPONSOR_SIZE_MB} MB para imágenes.`,
      });
      return;
    }

    if (eventForm.sponsorImageUrls.length + eventSponsorFiles.length + selectedFiles.length > MAX_SPONSOR_LOGOS) {
      toast({
        variant: 'destructive',
        title: 'Límite de patrocinadores alcanzado',
        description: `Puedes agregar hasta ${MAX_SPONSOR_LOGOS} logos por evento.`,
      });
      return;
    }

    setIsConvertingSponsorPdfs(true);

    try {
      const processedFiles = await Promise.all(selectedFiles.map((file) =>
        isPdfFile(file) ? convertPdfFirstPageToImage(file) : Promise.resolve(file)
      ));
      const oversizedConvertedFile = processedFiles.find((file) => file.size > MAX_SPONSOR_SIZE_BYTES);

      if (oversizedConvertedFile) {
        throw new Error(`La imagen generada desde ${oversizedConvertedFile.name} supera ${MAX_SPONSOR_SIZE_MB} MB.`);
      }

      setEventSponsorFiles((currentFiles) => {
        const knownFiles = new Set(currentFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
        const uniqueFiles = processedFiles.filter((file) => {
          const key = `${file.name}-${file.size}-${file.lastModified}`;
          if (knownFiles.has(key)) return false;
          knownFiles.add(key);
          return true;
        });
        return [...currentFiles, ...uniqueFiles];
      });

      const convertedCount = selectedFiles.filter(isPdfFile).length;
      if (convertedCount > 0) {
        toast({
          title: convertedCount === 1 ? 'PDF convertido' : 'PDF convertidos',
          description: convertedCount === 1
            ? 'La primera página quedó lista como imagen para el patrocinador.'
            : `Se convirtieron ${convertedCount} primeras páginas en imágenes.`,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo convertir el PDF',
        description: error instanceof Error ? error.message : 'Intenta con otro archivo PDF.',
      });
    } finally {
      setIsConvertingSponsorPdfs(false);
    }
  };

  const uploadEventSponsors = async (eventId: string) => {
    const uploadedUrls = await Promise.all(eventSponsorFiles.map(async (file, index) => {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const safeName = slugify(file.name.replace(/\.[^.]+$/, '')) || `patrocinador-${index + 1}`;
      const sponsorRef = ref(storage, `event-sponsors/${eventId}/${Date.now()}-${index}-${safeName}.${extension}`);

      await uploadBytes(sponsorRef, file);
      return getDownloadURL(sponsorRef);
    }));

    return [...eventForm.sponsorImageUrls, ...uploadedUrls];
  };

  const handleSaveEvent = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }

    if (isConvertingSponsorPdfs) {
      toast({
        title: 'Conversión en progreso',
        description: 'Espera a que los PDF terminen de convertirse antes de guardar.',
      });
      return;
    }

    setIsSavingEvent(true);

    try {
      if (!eventForm.name.trim() || !eventForm.date || !eventForm.registrationCloseDate) {
        throw new Error('Completa nombre, fecha del evento y cierre de inscripción.');
      }

      const id = editingEventId ?? `${slugify(eventForm.name)}-${eventForm.date.slice(0, 4)}`;
      if (!id) {
        throw new Error('No se pudo generar el identificador del evento.');
      }

      const [posterImageUrl, sponsorImageUrls] = await Promise.all([
        uploadEventPoster(id),
        uploadEventSponsors(id),
      ]);

      const eventData: EventConfig = {
        id,
        name: eventForm.name.trim(),
        date: eventForm.date,
        dateTime: `${eventForm.date}T${eventForm.time || '06:00'}:00-06:00`,
        registrationOpenDateTime: editingEventId ? activeEvent.registrationOpenDateTime : new Date().toISOString(),
        registrationCloseDateTime: `${eventForm.registrationCloseDate}T23:59:59-06:00`,
        location: eventForm.location.trim(),
        locationShort: eventForm.location.trim(),
        price: eventForm.price.trim(),
        paymentInfo: eventForm.paymentInfo.trim(),
        posterImageUrl,
        sponsorImageUrls,
        capacityLimit: editingEventId ? activeEvent.capacityLimit : null,
        distances: parseDistances(eventForm.distancesText),
        courseType: eventForm.courseType,
        status: editingEventId ? activeEvent.status : 'active',
        acceptsRegistrations: editingEventId ? activeEvent.acceptsRegistrations : true,
        registrationsManuallyClosed: eventForm.registrationsManuallyClosed,
        allowMultipleDistances: eventForm.allowMultipleDistances,
        legacyWithoutEventId: editingEventId ? Boolean(activeEvent.legacyWithoutEventId) : false,
      };

      if (editingEventId) {
        await updateEvent(editingEventId, eventData);
      } else {
        await createEvent(eventData);
      }

      toast({
        title: editingEventId ? 'Competencia actualizada' : 'Competencia creada',
        description: `${eventData.name} quedó guardada correctamente.`,
      });
      closeEventDialog();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: editingEventId ? 'Error al actualizar competencia' : 'Error al crear competencia',
        description: error instanceof Error ? error.message : 'No se pudo guardar la competencia.',
      });
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleRegistrationLockToggle = async () => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }

    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    setIsTogglingRegistrationLock(true);

    try {
      const nextClosedValue = !registrationsManuallyClosed;
      await updateEvent(activeEvent.id, {
        ...activeEvent,
        registrationsManuallyClosed: nextClosedValue,
      });

      toast({
        title: nextClosedValue ? 'Inscripciones bloqueadas' : 'Bloqueo manual retirado',
        description: nextClosedValue
          ? 'El formulario público y la creación de nuevas inscripciones quedan cerrados manualmente.'
          : 'Las inscripciones vuelven a depender del cierre automático por fecha.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo actualizar el bloqueo',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setIsTogglingRegistrationLock(false);
    }
  };

  const handleCloseCompetition = async () => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }

    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    const activeSwimmers = registrations.filter((participant) => participant.status !== 'rejected');
    const resultGroups = buildResultEventGroups(activeSwimmers, false);

    if (!activeSwimmers.length || !resultGroups.length) {
      toast({
        variant: 'destructive',
        title: 'No se puede cerrar',
        description: 'No hay nadadores activos para finalizar la competencia.',
      });
      return;
    }

    const { incomplete, description } = summarizeIncompleteResults(resultGroups);
    if (incomplete.length) {
      toast({
        variant: 'destructive',
        title: 'Resultados incompletos',
        description,
      });
      return;
    }

    setIsClosingEvent(true);

    try {
      await updateEvent(activeEvent.id, {
        ...activeEvent,
        status: 'past',
        acceptsRegistrations: false,
        registrationsManuallyClosed: true,
      });

      toast({
        title: 'Competencia finalizada',
        description: 'Todos los nadadores tienen resultado y el evento quedó cerrado.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo cerrar la competencia',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setIsClosingEvent(false);
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
            participant.pais,
            participant.email,
            participant.telefono,
            participant.referencia,
            participant.dorsal,
          ]
            .map((value) => String(value || '').toLowerCase())
            .some((value) => value.includes(search));

        const matchesStatus = !statusFilter || participant.status === statusFilter;
        const matchesDistance = !distanceFilter || splitRegistrationDistances(participant.distancia).includes(distanceFilter);
        const matchesCategory = !categoryFilter || getParticipantCategory(participant) === categoryFilter;

        return matchesSearch && matchesStatus && matchesDistance && matchesCategory;
      })
      .sort((a, b) => {
        const dorsalA = parseInt(a.dorsal ?? '0', 10);
        const dorsalB = parseInt(b.dorsal ?? '0', 10);
        if (Number.isFinite(dorsalA) && Number.isFinite(dorsalB) && dorsalA !== dorsalB) {
          return dorsalA - dorsalB;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [registrations, searchTerm, statusFilter, distanceFilter, categoryFilter, getParticipantCategory]);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const formatRegistrationDate = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatRegistrationTime = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventLongDate = (eventConfig: EventConfig) => {
    const source = eventConfig.dateTime || eventConfig.date;
    const date = new Date(source.includes('T') ? source : `${source}T12:00:00-06:00`);

    if (Number.isNaN(date.getTime())) return eventConfig.date;

    return date
      .toLocaleDateString('es-HN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Tegucigalpa',
      })
      .replace(',', '')
      .replace(/ de (\d{4})$/, ' del $1');
  };

  const sortDistanceValues = (values: string[]) => {
    const distanceOrder = activeEvent.distances.map((distance) => distance.value);

    return [...values].sort((a, b) => {
      const indexA = distanceOrder.indexOf(a);
      const indexB = distanceOrder.indexOf(b);
      if (indexA >= 0 && indexB >= 0) return indexA - indexB;
      if (indexA >= 0) return -1;
      if (indexB >= 0) return 1;
      return a.localeCompare(b, 'es');
    });
  };

  const getParticipantDistances = (participant: Registration) => {
    const selected = splitRegistrationDistances(participant.distancia);
    const values = selected.length ? selected : activeEvent.distances.slice(0, 1).map((distance) => distance.value);
    return sortDistanceValues(values);
  };

  const emptyResult: RegistrationResult = {
    time: null,
    seconds: null,
    recordedAt: null,
    recordedBy: null,
  };

  const resultEditKey = (participantId: string, distance?: string) =>
    distance ? `${participantId}::${distance}` : participantId;

  const getParticipantResult = (participant: Registration, distance?: string): RegistrationResult => {
    if (distance && participant.resultsByDistance[distance]) {
      return participant.resultsByDistance[distance];
    }

    const selectedDistances = getParticipantDistances(participant);
    if (!distance || selectedDistances.length <= 1) {
      return {
        time: participant.resultTime,
        seconds: participant.resultSeconds,
        recordedAt: participant.resultRecordedAt,
        recordedBy: participant.resultRecordedBy,
      };
    }

    return emptyResult;
  };

  const isResultComplete = (result: RegistrationResult) => {
    if (result.seconds !== null) return true;
    const normalized = result.time?.trim().toUpperCase();
    return Boolean(normalized && SPECIAL_RESULT_TOKENS.includes(normalized));
  };

  const getResultInputValue = (participant: Registration, distance?: string) => {
    const key = resultEditKey(participant.id, distance);
    if (key in resultEdits) {
      return resultEdits[key];
    }
    return getParticipantResult(participant, distance).time ?? '';
  };

  const getDistanceLabel = (distance: string) =>
    activeEvent.distances.find((item) => item.value === distance)?.label ?? distance;

  const sortResultParticipants = (distance: string, participants: Registration[]) => {
    const specialOrder = new Map(SPECIAL_RESULT_TOKENS.map((token, index) => [token, index]));

    return [...participants].sort((a, b) => {
      const aResult = getParticipantResult(a, distance);
      const bResult = getParticipantResult(b, distance);
      const aHasTime = aResult.seconds !== null;
      const bHasTime = bResult.seconds !== null;

      if (aHasTime && bHasTime) {
        return (aResult.seconds ?? 0) - (bResult.seconds ?? 0);
      }
      if (aHasTime) return -1;
      if (bHasTime) return 1;

      const tokenA = aResult.time?.trim().toUpperCase() ?? '';
      const tokenB = bResult.time?.trim().toUpperCase() ?? '';
      const orderA = specialOrder.get(tokenA) ?? Number.MAX_SAFE_INTEGER;
      const orderB = specialOrder.get(tokenB) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;

      return a.nombre.localeCompare(b.nombre, 'es');
    });
  };

  const getStatusLabel = (status: RegistrationStatus) => {
    if (status === 'validated') return 'Validado';
    if (status === 'pending') return 'Pendiente';
    return 'Rechazado';
  };

  const getStatusBadgeClass = (status: RegistrationStatus) => {
    if (status === 'validated') return 'bg-lake-green/15 text-lake-green border-lake-green/20';
    if (status === 'pending') return 'bg-warm-accent/15 text-warm-accent border-warm-accent/20';
    return 'bg-destructive/15 text-destructive border-destructive/20';
  };

  const getCenterOutLaneOrder = (laneCount: number) => {
    if (laneCount <= 0) return [];

    const lanes: number[] = [];

    if (laneCount % 2 === 0) {
      const leftCenter = laneCount / 2;
      const rightCenter = leftCenter + 1;

      for (let offset = 0; lanes.length < laneCount; offset += 1) {
        const left = leftCenter - offset;
        const right = rightCenter + offset;

        if (left >= 1) lanes.push(left);
        if (right <= laneCount) lanes.push(right);
      }

      return lanes;
    }

    const center = Math.ceil(laneCount / 2);
    lanes.push(center);

    for (let offset = 1; lanes.length < laneCount; offset += 1) {
      const left = center - offset;
      const right = center + offset;

      if (left >= 1) lanes.push(left);
      if (right <= laneCount) lanes.push(right);
    }

    return lanes;
  };

  const splitParticipantsIntoHeats = (participants: Registration[], laneCount: number) => {
    if (laneCount <= 0) return [];

    const remainder = participants.length % laneCount;
    const fullHeatParticipants = remainder === 0 ? participants : participants.slice(0, -remainder);
    const fullHeats = Array.from(
      { length: Math.ceil(fullHeatParticipants.length / laneCount) },
      (_, heatIndex) => fullHeatParticipants.slice(heatIndex * laneCount, (heatIndex + 1) * laneCount),
    ).filter((heat) => heat.length > 0);

    return remainder === 0
      ? fullHeats
      : [participants.slice(-remainder), ...fullHeats];
  };

  const buildHeatAssignments = (
    swimmers: Registration[],
    laneCount: number,
    laneAssignmentOrder: number[],
    useCurrentFilters = true,
  ): DistanceHeatAssignment[] => {
    let eventNumber = 0;
    const orderedDistances = activeEvent.distances.map((distance) => distance.value);
    const distancesToExport = (() => {
      if (useCurrentFilters && distanceFilter) {
        return swimmers.some((participant) => getParticipantDistances(participant).includes(distanceFilter))
          ? [distanceFilter]
          : [];
      }

      const present = Array.from(new Set(swimmers.flatMap(getParticipantDistances)));
      const ordered = orderedDistances.filter((distance) => present.includes(distance));
      const extras = present.filter((distance) => !orderedDistances.includes(distance));
      return [...ordered, ...extras];
    })();

    return distancesToExport
      .map((distance) => {
        const participantsInDistance = swimmers
          .filter((participant) => getParticipantDistances(participant).includes(distance))
          .sort((a, b) => {
            const dorsalA = parseInt(a.dorsal ?? '0', 10);
            const dorsalB = parseInt(b.dorsal ?? '0', 10);
            if (Number.isFinite(dorsalA) && Number.isFinite(dorsalB) && dorsalA !== dorsalB) {
              return dorsalA - dorsalB;
            }
            return a.nombre.localeCompare(b.nombre, 'es');
          });

        if (!participantsInDistance.length) return null;

        const distanceConfig = activeEvent.distances.find((item) => item.value === distance);
        const categoryOrder = distanceConfig?.categories.map((category) => category.label) ?? [];
        const presentCategories = Array.from(new Set(participantsInDistance.map((participant) => getParticipantCategory(participant, distance))));
        const orderedCategories = [
          ...categoryOrder.filter((category) => presentCategories.includes(category)),
          ...presentCategories.filter((category) => !categoryOrder.includes(category)).sort((a, b) => a.localeCompare(b, 'es')),
        ];

        const categories = orderedCategories
          .flatMap((category) => {
            const categoryParticipants = participantsInDistance.filter((participant) => getParticipantCategory(participant, distance) === category);
            if (!categoryParticipants.length) return [];

            return HEAT_SEX_GROUPS
              .map(({ sex, label }) => {
                const sexParticipants = categoryParticipants.filter((participant) => participant.sexo === sex);
                if (!sexParticipants.length) return null;

                eventNumber += 1;

                const heatParticipantGroups = splitParticipantsIntoHeats(sexParticipants, laneCount);
                const heatCount = heatParticipantGroups.length;
                const heats = heatParticipantGroups.map((heatParticipants, heatIndex) => {
                  const participantsByLane = new Map<number, Registration>();

                  heatParticipants.forEach((participant, participantIndex) => {
                    const lane = laneAssignmentOrder[participantIndex];
                    if (lane) {
                      participantsByLane.set(lane, participant);
                    }
                  });

                  return {
                    heatNumber: heatIndex + 1,
                    heatCount,
                    lanes: Array.from({ length: laneCount }, (_, laneIndex) => {
                      const lane = laneIndex + 1;
                      return {
                        lane,
                        participant: participantsByLane.get(lane) ?? null,
                      };
                    }),
                  };
                });

                return {
                  eventNumber,
                  category,
                  sex,
                  sexLabel: label,
                  participantCount: sexParticipants.length,
                  heats,
                };
              })
              .filter((category): category is CategoryHeatAssignment => Boolean(category));
          });

        return {
          distance,
          label: getDistanceLabel(distance),
          categories,
        };
      })
      .filter((distance): distance is DistanceHeatAssignment => Boolean(distance) && distance.categories.length > 0);
  };

  const buildResultEventGroups = (participants: Registration[], useCurrentFilters = true): ResultEventGroup[] => {
    let eventNumber = 0;
    const orderedDistances = activeEvent.distances.map((distance) => distance.value);
    const distancesToExport = (() => {
      if (useCurrentFilters && distanceFilter) {
        return participants.some((participant) => getParticipantDistances(participant).includes(distanceFilter))
          ? [distanceFilter]
          : [];
      }

      const present = Array.from(new Set(participants.flatMap(getParticipantDistances)));
      const ordered = orderedDistances.filter((distance) => present.includes(distance));
      const extras = present.filter((distance) => !orderedDistances.includes(distance));
      return [...ordered, ...extras];
    })();

    return distancesToExport.flatMap((distance) => {
      const participantsInDistance = participants.filter((participant) => getParticipantDistances(participant).includes(distance));
      if (!participantsInDistance.length) return [];

      const distanceConfig = activeEvent.distances.find((item) => item.value === distance);
      const distanceLabel = distanceConfig?.label ?? distance;
      const categoryOrder = distanceConfig?.categories.map((category) => category.label) ?? [];
      const presentCategories = Array.from(new Set(participantsInDistance.map((participant) => getParticipantCategory(participant, distance))));
      const orderedCategories = [
        ...categoryOrder.filter((category) => presentCategories.includes(category)),
        ...presentCategories.filter((category) => !categoryOrder.includes(category)).sort((a, b) => a.localeCompare(b, 'es')),
      ];

      return orderedCategories.flatMap((category) =>
        HEAT_SEX_GROUPS.map(({ sex, label }) => {
          const eventParticipants = participantsInDistance.filter((participant) =>
            participant.sexo === sex && getParticipantCategory(participant, distance) === category
          );
          if (!eventParticipants.length) return null;

          eventNumber += 1;

          return {
            key: `${distance}::${category}::${sex}`,
            eventNumber,
            distance,
            distanceLabel,
            category,
            sex,
            sexLabel: label,
            participants: eventParticipants,
          };
        })
      ).filter((group): group is ResultEventGroup => Boolean(group));
    });
  };

  const resultReportEventOptions = buildResultEventGroups(registrations.filter((participant) => participant.status !== 'rejected'), false)
    .map((group) => ({
      key: group.key,
      label: `Evento ${group.eventNumber}: ${group.sexLabel} · ${group.category} · ${group.distanceLabel}`,
    }));

  const runLaneCount = (() => {
    const laneCount = Number(heatLaneCount);
    return Number.isInteger(laneCount) && laneCount >= 1 && laneCount <= 10 ? laneCount : 5;
  })();

  const runHeatGroups = buildHeatAssignments(
    registrations.filter((participant) => participant.status !== 'rejected'),
    runLaneCount,
    getCenterOutLaneOrder(runLaneCount),
    false,
  );

  const runEventOptions: RunEventOption[] = runHeatGroups.flatMap((distanceGroup) =>
    distanceGroup.categories.map((categoryGroup) => ({
      key: `${distanceGroup.distance}::${categoryGroup.category}::${categoryGroup.sex}`,
      eventNumber: categoryGroup.eventNumber,
      distance: distanceGroup.distance,
      distanceLabel: distanceGroup.label,
      sex: categoryGroup.sex,
      category: categoryGroup.category,
      sexLabel: categoryGroup.sexLabel,
      participantCount: categoryGroup.participantCount,
    }))
  );

  const runHeatOptions: RunHeatOption[] = runHeatGroups.flatMap((distanceGroup) =>
    distanceGroup.categories.flatMap((categoryGroup) => {
      const eventKey = `${distanceGroup.distance}::${categoryGroup.category}::${categoryGroup.sex}`;

      return categoryGroup.heats.map((heat) => ({
        key: eventKey,
        heatKey: `${eventKey}::heat-${heat.heatNumber}`,
        label: `Evento ${categoryGroup.eventNumber} · Heat ${heat.heatNumber} de ${heat.heatCount}`,
        eventNumber: categoryGroup.eventNumber,
        distance: distanceGroup.distance,
        distanceLabel: distanceGroup.label,
        sex: categoryGroup.sex,
        category: categoryGroup.category,
        sexLabel: categoryGroup.sexLabel,
        participantCount: categoryGroup.participantCount,
        heatNumber: heat.heatNumber,
        heatCount: heat.heatCount,
        lanes: heat.lanes,
      }));
    })
  );

  const selectedRunEvent = runEventOptions.find((option) => option.key === selectedRunEventKey) ?? runEventOptions[0] ?? null;
  const visibleRunHeats = selectedRunEvent
    ? runHeatOptions.filter((option) => option.key === selectedRunEvent.key)
    : [];
  const selectedRunHeat = visibleRunHeats.find((option) => option.heatKey === selectedRunHeatKey) ?? visibleRunHeats[0] ?? null;
  const selectedRunHeatIndex = selectedRunHeat
    ? runHeatOptions.findIndex((option) => option.heatKey === selectedRunHeat.heatKey)
    : -1;

  const handleRunHeatStep = (direction: -1 | 1) => {
    if (!runHeatOptions.length) return;

    const currentIndex = selectedRunHeatIndex >= 0 ? selectedRunHeatIndex : 0;
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), runHeatOptions.length - 1);
    const nextHeat = runHeatOptions[nextIndex];
    setSelectedRunEventKey(nextHeat.key);
    setSelectedRunHeatKey(nextHeat.heatKey);
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const printActionsMarkup = `
    <div class="report-actions">
      <button type="button" onclick="window.printReportWhenReady ? window.printReportWhenReady() : window.print()">Imprimir reporte</button>
    </div>`;

  const printActionsStyles = `
    .report-actions {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px 0;
      margin-bottom: 12px;
      background: #fff;
      border-bottom: 1px solid #e5e7eb;
    }
    .report-actions button {
      border: 0;
      border-radius: 8px;
      background: #0f5b78;
      color: #fff;
      cursor: pointer;
      font-size: 20px;
      font-weight: 700;
      padding: 9px 16px;
    }
    @media print {
      .report-actions {
        display: none !important;
      }
    }`;

  const printReadyScript = `
    <script>
      (() => {
        const waitForDocument = () => {
          if (document.readyState !== 'loading') return Promise.resolve();
          return new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
        };
        const withTimeout = (promise, timeoutMs) => Promise.race([
          promise,
          new Promise((resolve) => window.setTimeout(resolve, timeoutMs)),
        ]);
        const waitForFonts = () => {
          if (!document.fonts || !document.fonts.ready) return Promise.resolve();
          return document.fonts.ready.catch(() => undefined);
        };
        const waitForImages = () => Promise.all(
          Array.from(document.images).map((image) => {
            if (image.complete) return Promise.resolve();
            return new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            });
          })
        );
        const waitForPaint = () => new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        );

        window.printReportWhenReady = async () => {
          const button = document.querySelector('.report-actions button');
          const originalText = button ? button.textContent || 'Imprimir reporte' : 'Imprimir reporte';
          if (button) {
            button.disabled = true;
            button.textContent = 'Preparando impresion...';
          }

          try {
            await waitForDocument();
            await withTimeout(waitForFonts(), 1500);
            await withTimeout(waitForImages(), 1500);
            await waitForPaint();
            document.body.offsetHeight;
            window.focus();
            window.print();
          } finally {
            if (button) {
              button.disabled = false;
              button.textContent = originalText;
            }
          }
        };
      })();
    </script>`;

  const printAutoFitScript = `
    <script>
      (() => {
        const root = document.documentElement;
        const minSize = 10;
        const readSize = () => Number.parseFloat(getComputedStyle(root).getPropertyValue('--report-font-size')) || 20;
        const writeSize = (size) => root.style.setProperty('--report-font-size', size + 'px');
        const hasHorizontalOverflow = () => {
          const viewportWidth = document.documentElement.clientWidth || window.innerWidth || 1;
          const bodyOverflow = document.body.scrollWidth > viewportWidth + 2;
          const tableOverflow = Array.from(document.querySelectorAll('table')).some((table) =>
            table.scrollWidth > table.clientWidth + 2
          );
          return bodyOverflow || tableOverflow;
        };
        const fitReport = () => {
          let size = readSize();
          let attempts = 0;
          while (size > minSize && hasHorizontalOverflow() && attempts < 12) {
            size -= 1;
            writeSize(size);
            attempts += 1;
          }
        };
        window.addEventListener('load', fitReport);
        window.addEventListener('beforeprint', fitReport);
        window.addEventListener('resize', fitReport);
        if (document.fonts?.ready) {
          document.fonts.ready.then(fitReport);
        }
        setTimeout(fitReport, 100);
      })();
    </script>`;

  const formatOfficialResult = (time: string | null) => {
    if (!time) return 'Pendiente';
    const normalized = time.toUpperCase();
    if (SPECIAL_RESULT_TOKENS.includes(normalized)) {
      return normalized;
    }
    return time;
  };

  const formatParticipantResultsSummary = (participant: Registration) =>
    getParticipantDistances(participant)
      .map((distance) => `${getDistanceLabel(distance)}: ${formatOfficialResult(getParticipantResult(participant, distance).time)}`)
      .join(' | ');

  const getIncompleteResultEntries = (groups: ResultEventGroup[]) =>
    groups.flatMap((group) =>
      group.participants
        .filter((participant) => !isResultComplete(getParticipantResult(participant, group.distance)))
        .map((participant) => ({
          participant,
          eventLabel: `Evento ${group.eventNumber}: ${group.sexLabel} · ${group.category} · ${group.distanceLabel}`,
          distance: group.distance,
        }))
    );

  const summarizeIncompleteResults = (groups: ResultEventGroup[]) => {
    const incomplete = getIncompleteResultEntries(groups);
    const examples = incomplete.slice(0, 4).map((entry) =>
      `${entry.participant.nombre} (${entry.eventLabel})`
    ).join('; ');

    return {
      incomplete,
      description: examples
        ? `Faltan ${incomplete.length} resultado${incomplete.length === 1 ? '' : 's'}. Ej: ${examples}${incomplete.length > 4 ? '...' : ''}`
        : `Faltan ${incomplete.length} resultado${incomplete.length === 1 ? '' : 's'}.`,
    };
  };

  const handleExportResultsReport = (mode: 'event' | 'general', forcedEventKey?: string) => {
    const participants = registrations.filter((participant) => participant.status !== 'rejected');
    if (!participants.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay nadadores disponibles para generar resultados.',
      });
      return;
    }

    const allGroups = buildResultEventGroups(participants, false);
    const selectedKey = forcedEventKey || selectedResultEventKey || resultReportEventOptions[0]?.key || '';
    const groups = mode === 'event'
      ? allGroups.filter((group) => group.key === selectedKey)
      : allGroups;

    if (!groups.length) {
      toast({
        title: 'Sin eventos',
        description: 'No se encontró un evento de resultados.',
      });
      return;
    }

    const { incomplete, description } = summarizeIncompleteResults(groups);
    if (incomplete.length) {
      toast({
        variant: 'destructive',
        title: 'Resultados incompletos',
        description,
      });
      return;
    }

    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      toast({
        variant: 'destructive',
        title: 'No se pudo abrir la ventana',
        description: 'Permite ventanas emergentes en tu navegador para generar el reporte de resultados.',
      });
      return;
    }

    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;
    const formattedNow = new Date().toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
    const reportTitle = mode === 'event' ? 'Resultados por evento' : 'Resultados generales';

    const sections = groups.map((group) => {
      let rank = 0;
      const rows = sortResultParticipants(group.distance, group.participants).map((participant) => {
        const result = getParticipantResult(participant, group.distance);
        const hasRank = result.seconds !== null;
        if (hasRank) rank += 1;

        return `
          <tr>
            <td class="position-cell">${hasRank ? rank : '—'}</td>
            <td class="dorsal-cell">#${escapeHtml(participant.dorsal)}</td>
            <td>${escapeHtml(participant.nombre)}</td>
            <td class="age-cell">${escapeHtml(getAgeOnEvent(participant.nacimiento) ?? 'N/A')}</td>
            <td>${escapeHtml(participant.club?.trim() || 'IND')}</td>
            <td class="time-cell">${escapeHtml(formatOfficialResult(result.time))}</td>
          </tr>`;
      }).join('');

      return `
        <section class="result-event">
          <h2>Evento ${group.eventNumber}: ${escapeHtml(group.sexLabel)} · ${escapeHtml(group.category)} · ${escapeHtml(group.distanceLabel)}</h2>
          <p>${group.participants.length} participante${group.participants.length === 1 ? '' : 's'}</p>
          <table>
            <thead>
              <tr>
                <th>Pos.</th>
                <th>Dorsal</th>
                <th>Nombre</th>
                <th>Edad</th>
                <th>Equipo</th>
                <th>Tiempo</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    }).join('');

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(activeEvent.name)} - ${escapeHtml(reportTitle)}</title>
          <style>
            :root { color-scheme: only light; }
            @page {
              size: landscape;
              margin: 8mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 14px;
              color: #111827;
            }
            h1 {
              margin: 0 0 2px;
              text-align: center;
              font-size: 28px;
            }
            .subtitle, .meta {
              margin: 0 0 8px;
              text-align: center;
              font-size: 18px;
              color: #4b5563;
              font-weight: 700;
            }
            .meta {
              font-size: 14px;
              font-weight: 400;
            }
            .logo {
              text-align: center;
              margin-bottom: 8px;
            }
            .logo img {
              max-width: 240px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .result-event {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 18px;
              border-top: 2px solid #111827;
              padding-top: 6px;
            }
            .result-event h2 {
              margin: 0;
              font-size: 18px;
              text-transform: uppercase;
            }
            .result-event p {
              margin: 2px 0 8px;
              font-size: 14px;
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 15px;
              line-height: 1.2;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 5px 6px;
              text-align: left;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            th:nth-child(1), td:nth-child(1) { width: 7%; text-align: center; }
            th:nth-child(2), td:nth-child(2) { width: 10%; text-align: center; }
            th:nth-child(3), td:nth-child(3) { width: 32%; }
            th:nth-child(4), td:nth-child(4) { width: 8%; text-align: center; }
            th:nth-child(5), td:nth-child(5) { width: 27%; }
            th:nth-child(6), td:nth-child(6) { width: 16%; text-align: center; }
            .position-cell, .dorsal-cell, .age-cell, .time-cell {
              white-space: nowrap;
              font-weight: 700;
            }
            ${printActionsStyles}
            @media print {
              body { margin: 0; }
              .result-event {
                break-inside: auto;
                page-break-inside: auto;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${printActionsMarkup}
          ${logoMarkup}
          <h1>${escapeHtml(activeEvent.name)}</h1>
          <p class="subtitle">${escapeHtml(reportTitle)}</p>
          <p class="meta">Generado: ${escapeHtml(formattedNow)}</p>
          ${sections}
          ${printReadyScript}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();

    toast({
      title: `${reportTitle} listo`,
      description: 'Revisa el reporte y usa el botón "Imprimir reporte" cuando esté correcto.',
    });
  };

  const handlePublishSelectedRunEvent = async () => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }

    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    if (!selectedRunEvent) {
      toast({
        variant: 'destructive',
        title: 'Selecciona un evento',
        description: 'Elige el evento que quieres finalizar desde RUN.',
      });
      return;
    }

    const participants = registrations.filter((participant) => participant.status !== 'rejected');
    const resultGroup = buildResultEventGroups(participants, false)
      .find((group) => group.key === selectedRunEvent.key);

    if (!resultGroup) {
      toast({
        variant: 'destructive',
        title: 'Sin nadadores',
        description: 'No se encontró el evento seleccionado para publicar resultados.',
      });
      return;
    }

    const { incomplete, description } = summarizeIncompleteResults([resultGroup]);
    if (incomplete.length) {
      toast({
        variant: 'destructive',
        title: 'Resultados incompletos',
        description,
      });
      return;
    }

    setIsClosingEvent(true);

    try {
      const nextPublishedKeys = Array.from(new Set([
        ...(activeEvent.publishedResultEventKeys ?? []),
        resultGroup.key,
      ]));

      await updateEvent(activeEvent.id, {
        ...activeEvent,
        publishedResultEventKeys: nextPublishedKeys,
      });

      handleExportResultsReport('event', resultGroup.key);

      toast({
        title: 'Evento publicado',
        description: `Evento ${resultGroup.eventNumber} quedó finalizado y visible en resultados públicos.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo publicar el evento',
        description: error instanceof Error ? error.message : 'Intenta nuevamente.',
      });
    } finally {
      setIsClosingEvent(false);
    }
  };

  const handleExportPdf = () => {
    if (!filteredParticipants.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay registros que coincidan con los filtros actuales.',
      });
      return;
    }

    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      toast({
        variant: 'destructive',
        title: 'No se pudo abrir la ventana',
        description: 'Permite ventanas emergentes en tu navegador para generar el PDF.',
      });
      return;
    }

    const now = new Date();
    const formattedNow = now.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });

    const preferredDistances = activeEvent.distances.map((distance) => distance.value);
    const distancesToExport = (() => {
      if (distanceFilter) {
        return filteredParticipants.some((participant) => splitRegistrationDistances(participant.distancia).includes(distanceFilter))
          ? [distanceFilter]
          : [];
      }

      const present = Array.from(new Set(filteredParticipants.flatMap((participant) => splitRegistrationDistances(participant.distancia))));
      const ordered = preferredDistances.filter((distance) => present.includes(distance));
      const extras = present.filter((distance) => !preferredDistances.includes(distance));
      return [...ordered, ...extras];
    })();

    const sortOfficialParticipants = (distance: string, participants: Registration[]) =>
      [...participants].sort((a, b) => {
        const aResult = getParticipantResult(a, distance);
        const bResult = getParticipantResult(b, distance);
        const aHasTime = aResult.seconds !== null;
        const bHasTime = bResult.seconds !== null;

        if (aHasTime && bHasTime) {
          return (aResult.seconds ?? 0) - (bResult.seconds ?? 0);
        }

        if (aHasTime) return -1;
        if (bHasTime) return 1;

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

    const renderOfficialRows = (distance: string, participants: Registration[]) => {
      let rank = 0;
        return participants.map((participant) => {
          const result = getParticipantResult(participant, distance);
          let position = '—';
          if (result.seconds !== null) {
            rank += 1;
            position = String(rank);
          }
          const participantDetails = [
            participant.pais || 'País no indicado',
            participant.telefono ? `Tel. ${participant.telefono}` : 'Tel. no indicado',
          ].join(' · ');

          return `
            <tr>
              <td class="date-cell">
                <strong>${escapeHtml(formatRegistrationDate(participant.createdAt))}</strong>
                <span>${escapeHtml(formatRegistrationTime(participant.createdAt))}</span>
              </td>
              <td class="dorsal-cell">${escapeHtml(participant.dorsal ? `#${participant.dorsal}` : 'N/A')}</td>
              <td class="swimmer-cell">
                <strong>${escapeHtml(participant.nombre)}</strong>
                <span>${escapeHtml(participantDetails)}</span>
              </td>
              <td class="age-cell">${escapeHtml(getAgeOnEvent(participant.nacimiento) ?? 'N/A')}</td>
              <td class="size-cell">${escapeHtml(participant.tallaCamisa || 'N/A')}</td>
              <td class="category-cell">${escapeHtml(getParticipantCategory(participant, distance) || 'N/A')}</td>
              <td class="result-cell">
                <strong>${escapeHtml(formatOfficialResult(result.time))}</strong>
                <span>Pos. ${escapeHtml(position)}</span>
              </td>
            </tr>`;
        }).join('');
      };

    let poolEventNumber = 0;
    const sections = distancesToExport.flatMap((distance) => {
      const participantsInDistance = filteredParticipants
        .filter((participant) => splitRegistrationDistances(participant.distancia).includes(distance));

      if (!participantsInDistance.length) return [];

      const label = activeEvent.distances.find((item) => item.value === distance)?.label ?? distance;

      if (isPoolEvent) {
        const distanceConfig = activeEvent.distances.find((item) => item.value === distance);
        const categoryOrder = distanceConfig?.categories.map((category) => category.label) ?? [];
        const presentCategories = Array.from(new Set(participantsInDistance.map((participant) => getParticipantCategory(participant, distance))));
        const orderedCategories = [
          ...categoryOrder.filter((category) => presentCategories.includes(category)),
          ...presentCategories.filter((category) => !categoryOrder.includes(category)).sort((a, b) => a.localeCompare(b, 'es')),
        ];

        return orderedCategories.flatMap((category) =>
          HEAT_SEX_GROUPS.map(({ sex, label: sexLabel }) => {
            const eventParticipants = sortOfficialParticipants(
              distance,
              participantsInDistance.filter((participant) =>
                participant.sexo === sex && getParticipantCategory(participant, distance) === category
              )
            );
            if (!eventParticipants.length) return '';

            poolEventNumber += 1;
            const rows = renderOfficialRows(distance, eventParticipants);

            return `
              <section class="distance">
                <h2>Evento ${poolEventNumber}: ${escapeHtml(sexLabel)} · ${escapeHtml(category)} · ${escapeHtml(label)}</h2>
                <p class="distance-meta">${eventParticipants.length} participante${eventParticipants.length === 1 ? '' : 's'}</p>
                <table>
                  <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Dorsal</th>
                        <th>Nadador</th>
                        <th>Edad</th>
                        <th>Talla</th>
                        <th>Categoría</th>
                        <th>Resultado</th>
                      </tr>
                  </thead>
                  <tbody>${rows}</tbody>
                </table>
              </section>`;
          })
        );
      }

      const participants = sortOfficialParticipants(distance, participantsInDistance);
      const rows = renderOfficialRows(distance, participants);

      return `
        <section class="distance">
          <h2>${escapeHtml(label)}</h2>
          <p class="distance-meta">${participants.length} participante${participants.length === 1 ? '' : 's'}</p>
          <table>
            <thead>
              <tr>
                  <th>Fecha</th>
                  <th>Dorsal</th>
                  <th>Nadador</th>
                  <th>Edad</th>
                  <th>Talla</th>
                  <th>Categoría</th>
                  <th>Resultado</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    }).filter(Boolean).join('');

    if (!sections) {
      toast({
        title: 'Sin datos',
        description: 'No se encontraron registros con los filtros aplicados.',
      });
      exportWindow.close();
      return;
    }

    const filtersSummary = [
      searchTerm ? `Búsqueda: "${escapeHtml(searchTerm)}"` : null,
      statusFilter ? `Estado: ${escapeHtml(statusFilter)}` : null,
      distanceFilter ? `Distancia: ${escapeHtml(activeEvent.distances.find((item) => item.value === distanceFilter)?.label ?? distanceFilter)}` : null,
      categoryFilter ? `Categoría: ${escapeHtml(categoryFilter)}` : null,
    ].filter(Boolean).join(' • ');

    const summaryBlock = filtersSummary
      ? `<p class="filters">Filtros aplicados: ${filtersSummary}</p>`
      : '<p class="filters">Sin filtros adicionales. Mostrando todos los participantes disponibles.</p>';

    const heading = `Reporte de inscripciones (${filteredParticipants.length})`;
    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(heading)}</title>
          <style>
            :root { color-scheme: only light; }
              @page {
                size: letter landscape;
                margin: 8mm;
              }
              body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                margin: 14px;
                color: #111827;
              }
              h1 {
                margin: 0 0 4px;
                font-size: 24px;
              }
              .meta {
                font-size: 13px;
                color: #6b7280;
                margin-bottom: 8px;
              }
              .filters {
                font-size: 13px;
                background: #f3f4f6;
                padding: 6px 10px;
                border-radius: 6px;
                margin-bottom: 10px;
              }
              .logo {
                text-align: center;
                margin-bottom: 8px;
              }
              .logo img {
                max-width: 180px;
                height: auto;
                display: block;
                margin: 0 auto;
              background: transparent;
              border-radius: 0;
            }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                margin-bottom: 18px;
                table-layout: fixed;
                line-height: 1.25;
              }
              th, td {
                border: 1px solid #d1d5db;
                padding: 5px 6px;
                text-align: left;
                vertical-align: middle;
                overflow-wrap: anywhere;
              }
              th {
                background: #f3f4f6;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0;
              }
            tbody tr:nth-child(even) {
              background: #f9fafb;
            }
              .distance {
                margin-bottom: 20px;
                break-inside: auto;
                page-break-inside: auto;
              }
              .distance h2 {
                margin: 0 0 4px;
                font-size: 18px;
                color: #1f2937;
              }
              .distance-meta {
                margin: 0 0 8px;
                font-size: 13px;
                color: #6b7280;
              }
              table thead {
                display: table-header-group;
              }
              table tbody {
                display: table-row-group;
              }
              .date-cell,
              .dorsal-cell,
              .age-cell,
              .size-cell,
              .result-cell {
                text-align: center;
                white-space: nowrap;
              }
              .date-cell strong,
              .date-cell span,
              .result-cell strong,
              .result-cell span,
              .swimmer-cell strong,
              .swimmer-cell span {
                display: block;
              }
              .swimmer-cell strong {
                font-size: 12.5px;
                line-height: 1.2;
              }
              .swimmer-cell span,
              .date-cell span,
              .result-cell span {
                color: #4b5563;
                font-size: 10.5px;
              }
              .category-cell {
                font-size: 11.5px;
                line-height: 1.2;
              }
              .result-cell strong {
                font-size: 11.5px;
              }
              th:nth-child(1), td:nth-child(1) { width: 13%; }
              th:nth-child(2), td:nth-child(2) { width: 8%; }
              th:nth-child(3), td:nth-child(3) { width: 35%; }
              th:nth-child(4), td:nth-child(4) { width: 7%; }
              th:nth-child(5), td:nth-child(5) { width: 7%; }
              th:nth-child(6), td:nth-child(6) { width: 20%; }
              th:nth-child(7), td:nth-child(7) { width: 10%; }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
              ${printActionsStyles}
              @media print {
                body {
                  margin: 0;
                  font-size: 12px;
                }
                .meta, .filters { color: #4b5563; background: none; }
              }
          </style>
        </head>
        <body>
          ${printActionsMarkup}
          ${logoMarkup}
          <h1>${escapeHtml(heading)}</h1>
          <p class="meta">Generado: ${escapeHtml(formattedNow)}</p>
          ${summaryBlock}
          ${sections}
          ${printReadyScript}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();

    toast({
      title: 'Vista del reporte lista',
      description: 'Revisa el reporte y usa el botón "Imprimir reporte" cuando esté correcto.',
    });
  };

  const handleExportNameAgeReport = (mode: NameAgeReportMode = 'category') => {
    if (!filteredParticipants.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay registros que coincidan con los filtros actuales.',
      });
      return;
    }

    const participants = filteredParticipants.filter((participant) => participant.status !== 'rejected');
    if (!participants.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay participantes activos con los filtros actuales.',
      });
      return;
    }

    const preferredDistances = activeEvent.distances.map((distance) => distance.value);
    const distancesToExport = (() => {
      if (distanceFilter) {
        return participants.some((participant) => getParticipantDistances(participant).includes(distanceFilter))
          ? [distanceFilter]
          : [];
      }

      const present = Array.from(new Set(participants.flatMap(getParticipantDistances)));
      const ordered = preferredDistances.filter((distance) => present.includes(distance));
      const extras = present.filter((distance) => !preferredDistances.includes(distance));
      return [...ordered, ...extras];
    })();

    const sortNameAgeParticipants = (items: Registration[]) =>
      [...items].sort((a, b) => {
        const ageA = getAgeOnEvent(a.nacimiento) ?? Number.MAX_SAFE_INTEGER;
        const ageB = getAgeOnEvent(b.nacimiento) ?? Number.MAX_SAFE_INTEGER;

        if (ageA !== ageB) return ageA - ageB;
        return a.nombre.localeCompare(b.nombre, 'es');
      });

    const renderRows = (items: Registration[]) =>
      sortNameAgeParticipants(items).map((participant) => `
        <tr>
          <td>${escapeHtml(participant.nombre)}</td>
          <td>${escapeHtml(getAgeOnEvent(participant.nacimiento) ?? 'N/A')}</td>
          <td>${escapeHtml(participant.tallaCamisa || 'N/A')}</td>
        </tr>`
      ).join('');

    const renderSection = (heading: string, items: Registration[]) => {
      if (!items.length) return '';

      return `
        <section class="report-section">
          <h2>${escapeHtml(heading)}</h2>
          <p>${items.length} participante${items.length === 1 ? '' : 's'}</p>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Edad</th>
                <th>Talla</th>
              </tr>
            </thead>
            <tbody>${renderRows(items)}</tbody>
          </table>
        </section>`;
    };

    const renderGeneralSections = () =>
      HEAT_SEX_GROUPS.map(({ sex, label }) =>
        renderSection(label, participants.filter((participant) => participant.sexo === sex))
      ).filter(Boolean).join('');

    const getParticipantTeam = (participant: Registration) => participant.club?.trim() || 'Sin equipo';
    const renderTeamSections = () => {
      const teamNames = Array.from(new Set(participants.map(getParticipantTeam))).sort((a, b) => {
        if (a === 'Sin equipo') return 1;
        if (b === 'Sin equipo') return -1;
        return a.localeCompare(b, 'es');
      });

      return teamNames.flatMap((teamName) => {
        const teamParticipants = participants.filter((participant) => getParticipantTeam(participant) === teamName);

        return HEAT_SEX_GROUPS.map(({ sex, label }) =>
          renderSection(`${teamName} · ${label}`, teamParticipants.filter((participant) => participant.sexo === sex))
        );
      }).filter(Boolean).join('');
    };

    const renderCategorySections = () => {
      let eventNumber = 0;

      return distancesToExport.flatMap((distance) => {
        const participantsInDistance = participants.filter((participant) => getParticipantDistances(participant).includes(distance));
        if (!participantsInDistance.length) return [];

        const distanceConfig = activeEvent.distances.find((item) => item.value === distance);
        const label = distanceConfig?.label ?? distance;
        const categoryOrder = distanceConfig?.categories.map((category) => category.label) ?? [];
        const presentCategories = Array.from(new Set(participantsInDistance.map((participant) => getParticipantCategory(participant, distance))));
        const orderedCategories = [
          ...categoryOrder.filter((category) => presentCategories.includes(category)),
          ...presentCategories.filter((category) => !categoryOrder.includes(category)).sort((a, b) => a.localeCompare(b, 'es')),
        ];

        if (isPoolEvent) {
          return orderedCategories.flatMap((category) =>
            HEAT_SEX_GROUPS.map(({ sex, label: sexLabel }) => {
              const groupParticipants = participantsInDistance.filter((participant) =>
                participant.sexo === sex && getParticipantCategory(participant, distance) === category
              );
              if (!groupParticipants.length) return '';

              eventNumber += 1;

              return renderSection(`Evento ${eventNumber}: ${sexLabel} · ${category} · ${label}`, groupParticipants);
            })
          );
        }

        return orderedCategories.flatMap((category) =>
          HEAT_SEX_GROUPS.map(({ sex, label: sexLabel }) => {
            const groupParticipants = participantsInDistance.filter((participant) =>
              participant.sexo === sex && getParticipantCategory(participant, distance) === category
            );
            if (!groupParticipants.length) return '';

            return renderSection(`${label} · ${sexLabel} · ${category}`, groupParticipants);
          })
        );
      }).filter(Boolean).join('');
    };

    const sections = mode === 'general'
      ? renderGeneralSections()
      : mode === 'team'
        ? renderTeamSections()
        : renderCategorySections();

    if (!sections) {
      toast({
        title: 'Sin datos',
        description: 'No se encontraron participantes activos para los filtros aplicados.',
      });
      return;
    }

    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      toast({
        variant: 'destructive',
        title: 'No se pudo abrir la ventana',
        description: 'Permite ventanas emergentes en tu navegador para generar el reporte.',
      });
      return;
    }

    const now = new Date();
    const formattedNow = now.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;
    const reportTitle = mode === 'general'
      ? 'Reporte general de nombre, edad y talla'
      : mode === 'team'
        ? 'Reporte de nombre, edad y talla por equipo'
        : 'Reporte de nombre, edad y talla por categoría';
    const longestNameLength = participants.reduce((max, participant) => Math.max(max, participant.nombre.length), 0);
    const longestTeamLength = participants.reduce((max, participant) => Math.max(max, getParticipantTeam(participant).length), 0);
    const nameAgeFontSize = longestNameLength > 44 || longestTeamLength > 38
      ? 14
      : longestNameLength > 36 || longestTeamLength > 30
        ? 16
        : longestNameLength > 28 || longestTeamLength > 24
          ? 18
        : 20;

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(reportTitle)}</title>
          <style>
            :root {
              color-scheme: only light;
              --report-font-size: ${nameAgeFontSize}px;
            }
            @page {
              size: portrait;
              margin: 9mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 14px;
              color: #111827;
            }
            h1 {
              margin: 0 0 2px;
              text-align: center;
              font-size: 26px;
            }
            .meta {
              margin: 0 0 10px;
              text-align: center;
              font-size: var(--report-font-size);
              color: #6b7280;
            }
            .logo {
              text-align: center;
              margin-bottom: 6px;
            }
            .logo img {
              max-width: 240px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .report-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              column-gap: 14px;
              row-gap: 10px;
            }
            .report-section {
              break-inside: avoid;
              page-break-inside: avoid;
              border-top: 2px solid #111827;
              padding-top: 4px;
            }
            .report-section h2 {
              margin: 0;
              font-size: var(--report-font-size);
              line-height: 1.2;
              text-transform: uppercase;
            }
            .report-section p {
              margin: 2px 0 6px;
              font-size: var(--report-font-size);
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: var(--report-font-size);
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 5px 6px;
              text-align: left;
              vertical-align: middle;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            th:nth-child(2), td:nth-child(2),
            th:nth-child(3), td:nth-child(3) {
              width: 70px;
              text-align: center;
            }
            ${printActionsStyles}
            @media print {
              body { margin: 0; }
              .report-grid {
                display: block;
                column-count: 2;
                column-gap: 14px;
              }
              .report-section {
                display: inline-block;
                width: 100%;
                break-inside: avoid;
                page-break-inside: avoid;
                margin-bottom: 10px;
              }
              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${printActionsMarkup}
          ${logoMarkup}
          <h1>${escapeHtml(reportTitle)}</h1>
          <p class="meta">Generado: ${escapeHtml(formattedNow)}</p>
          <div class="report-grid">${sections}</div>
          ${printReadyScript}
          ${printAutoFitScript}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();

    toast({
      title: `${reportTitle} listo`,
      description: 'Revisa el reporte y usa el botón "Imprimir reporte" cuando esté correcto.',
    });
  };

  const handleExportHeats = () => {
    if (!isPoolEvent) {
      toast({
        title: 'No aplica para aguas abiertas',
        description: 'Los reportes de carriles y heats solo se generan para competencias de piscina.',
      });
      return;
    }

    const laneCount = Number(heatLaneCount);
    if (!Number.isInteger(laneCount) || laneCount < 1 || laneCount > 10) {
      toast({
        variant: 'destructive',
        title: 'Cantidad de carriles inválida',
        description: 'Ingresa un número de carriles entre 1 y 10.',
      });
      return;
    }

    const swimmers = filteredParticipants.filter((participant) => participant.status !== 'rejected');
    if (!swimmers.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay nadadores disponibles para generar heats con los filtros actuales.',
      });
      return;
    }

    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      toast({
        variant: 'destructive',
        title: 'No se pudo abrir la ventana',
        description: 'Permite ventanas emergentes en tu navegador para generar el programa de competencia.',
      });
      return;
    }

    const laneAssignmentOrder = getCenterOutLaneOrder(laneCount);
    const heatGroups = buildHeatAssignments(swimmers, laneCount, laneAssignmentOrder);
    const eventCards = heatGroups.flatMap((distanceGroup) =>
      distanceGroup.categories.map((categoryGroup) => {
        const heatTables = categoryGroup.heats.map((heat) => {
          const rows = heat.lanes.map(({ lane, participant }) => {
            if (!participant) {
              return `
                <tr class="empty-lane">
                  <td>${lane}</td>
                  <td colspan="4">Carril libre</td>
                </tr>`;
            }

            const teamName = participant.club?.trim() || 'IND';

            return `
              <tr>
                <td>${lane}</td>
                <td class="name-cell">${escapeHtml(participant.nombre)}</td>
                <td class="age-cell">${escapeHtml(getAgeOnEvent(participant.nacimiento) ?? 'N/A')}</td>
                <td class="team-cell">${escapeHtml(teamName)}</td>
                <td class="seed-cell">NT</td>
              </tr>`;
          }).join('');

          return `
            <div class="heat">
              <h3>Heat ${heat.heatNumber} de ${heat.heatCount}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Carril</th>
                    <th>Nombre</th>
                    <th>Edad</th>
                    <th>Equipo</th>
                    <th>Seed</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`;
        }).join('');

        return `
          <section class="event-card">
            <h2>Evento ${categoryGroup.eventNumber} ${escapeHtml(categoryGroup.sexLabel)} ${escapeHtml(categoryGroup.category)} ${escapeHtml(distanceGroup.label)}</h2>
            <p class="event-meta">${categoryGroup.participantCount} participante${categoryGroup.participantCount === 1 ? '' : 's'} · ${categoryGroup.heats.length} heat${categoryGroup.heats.length === 1 ? '' : 's'}</p>
            ${heatTables}
          </section>`;
      })
    ).join('');

    if (!eventCards) {
      toast({
        title: 'Sin datos',
        description: 'No se encontraron nadadores para los filtros aplicados.',
      });
      exportWindow.close();
      return;
    }

    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;
    const longestProgramNameLength = swimmers.reduce((max, participant) => Math.max(max, participant.nombre.length), 0);
    const longestProgramTeamLength = swimmers.reduce((max, participant) => Math.max(max, participant.club?.trim().length || 3), 0);
    const programFontSize = longestProgramNameLength > 44 || longestProgramTeamLength > 36
      ? 11
      : longestProgramNameLength > 36 || longestProgramTeamLength > 28
        ? 12
        : longestProgramNameLength > 26 || longestProgramTeamLength > 20
          ? 13
          : 14;
    const programEventDate = formatEventLongDate(activeEvent);

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(activeEvent.name)} - Programa de competencia</title>
          <style>
            :root {
              color-scheme: only light;
              --report-font-size: ${programFontSize}px;
            }
            @page {
              size: portrait;
              margin: 7mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 8px;
              color: #111827;
            }
            h1 {
              margin: 0 0 2px;
              text-align: center;
              font-size: 26px;
            }
            .program-title {
              margin: 0 0 8px;
              text-align: center;
              font-size: 18px;
              font-weight: 700;
              color: #4b5563;
              text-transform: uppercase;
            }
            .program-date {
              margin: 0 0 4px;
              text-align: center;
              font-size: 18px;
              font-weight: 700;
              color: #111827;
              text-transform: capitalize;
            }
            .program-grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              column-gap: 12px;
              row-gap: 14px;
            }
            .event-card {
              break-inside: avoid;
              page-break-inside: avoid;
              border-top: 2px solid #111827;
              padding-top: 5px;
            }
            .event-card h2 {
              margin: 0;
              font-size: var(--report-font-size);
              line-height: 1.2;
              color: #111827;
              text-transform: uppercase;
            }
            .event-meta {
              margin: 2px 0 7px;
              font-size: var(--report-font-size);
              color: #6b7280;
            }
            .heat {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 8px;
            }
            .heat h3 {
              margin: 5px 0 4px;
              font-size: var(--report-font-size);
              font-weight: 700;
            }
            .logo {
              text-align: center;
              margin-bottom: 6px;
            }
            .logo img {
              max-width: 240px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: var(--report-font-size);
              margin-bottom: 0;
              table-layout: fixed;
              line-height: 1.2;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 5px 7px;
              text-align: left;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th {
              background: #f3f4f6;
              font-weight: 600;
            }
            th:first-child, td:first-child {
              width: 10%;
              text-align: center;
            }
            th:nth-child(2), td:nth-child(2) {
              width: 35%;
            }
            th:nth-child(3), td:nth-child(3) {
              width: 9%;
              text-align: center;
            }
            th:nth-child(4), td:nth-child(4) {
              width: 32%;
            }
            th:nth-child(5), td:nth-child(5) {
              width: 14%;
              text-align: center;
            }
            th:first-child,
            th:nth-child(3),
            th:nth-child(5),
            td:first-child,
            td:nth-child(3),
            td:nth-child(5) {
              overflow-wrap: normal;
              word-break: normal;
              white-space: nowrap;
            }
            .name-cell {
              font-weight: 500;
              overflow-wrap: anywhere;
            }
            .team-cell {
              font-size: var(--report-font-size);
              overflow-wrap: anywhere;
            }
            .seed-cell {
              font-weight: 700;
            }
            .empty-lane td {
              color: #9ca3af;
              font-style: italic;
            }
            ${printActionsStyles}
            @media print {
              body { margin: 0; }
              .event-card {
                break-inside: auto;
                page-break-inside: auto;
              }
              .heat, tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          ${printActionsMarkup}
          ${logoMarkup}
          <h1>${escapeHtml(activeEvent.name)}</h1>
          <p class="program-date">${escapeHtml(programEventDate)}</p>
          <p class="program-title">Programa de competencia</p>
          <div class="program-grid">${eventCards}</div>
          ${printReadyScript}
          ${printAutoFitScript}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();

    toast({
      title: 'Programa de competencia listo',
      description: 'Revisa el reporte y usa el botón "Imprimir reporte" cuando esté correcto.',
    });
  };

  const handleExportTimekeeperSheets = () => {
    if (!isPoolEvent) {
      toast({
        title: 'No aplica para aguas abiertas',
        description: 'La planilla de cronometristas con carriles solo se genera para competencias de piscina.',
      });
      return;
    }

    const laneCount = Number(heatLaneCount);
    if (!Number.isInteger(laneCount) || laneCount < 1 || laneCount > 10) {
      toast({
        variant: 'destructive',
        title: 'Cantidad de carriles inválida',
        description: 'Ingresa un número de carriles entre 1 y 10.',
      });
      return;
    }

    const swimmers = filteredParticipants.filter((participant) => participant.status !== 'rejected');
    if (!swimmers.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay nadadores disponibles para generar planillas con los filtros actuales.',
      });
      return;
    }

    const laneAssignmentOrder = getCenterOutLaneOrder(laneCount);
    const heatGroups = buildHeatAssignments(swimmers, laneCount, laneAssignmentOrder);
    if (!heatGroups.length) {
      toast({
        title: 'Sin datos',
        description: 'No se encontraron nadadores para los filtros aplicados.',
      });
      return;
    }

    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      toast({
        variant: 'destructive',
        title: 'No se pudo abrir la ventana',
        description: 'Permite ventanas emergentes en tu navegador para generar la planilla de tiempos.',
      });
      return;
    }

    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;
    const sections = heatGroups.map((distanceGroup) => {
      const sheets = distanceGroup.categories.map((categoryGroup) =>
        categoryGroup.heats.map((heat) => {
          const rows = heat.lanes.map(({ lane, participant }) => {
            if (!participant) {
              return `
                <tr class="empty-lane">
                  <td class="lane-cell">${lane}</td>
                  <td colspan="6">Carril libre</td>
                </tr>`;
            }

            return `
              <tr>
                <td class="lane-cell">${lane}</td>
                <td>${escapeHtml(participant.nombre)}</td>
                <td>${escapeHtml(getAgeOnEvent(participant.nacimiento) ?? 'N/A')}</td>
                <td class="write-cell"></td>
                <td class="write-cell"></td>
                <td class="write-cell"></td>
                <td class="notes-cell"></td>
              </tr>`;
          }).join('');

          return `
            <section class="time-sheet">
              <div class="sheet-heading">
                <div>
                  <h3>Evento ${categoryGroup.eventNumber}: ${escapeHtml(categoryGroup.sexLabel)} · ${escapeHtml(distanceGroup.label)}</h3>
                  <p><strong>Categoría:</strong> ${escapeHtml(categoryGroup.category)} · <strong>Heat:</strong> ${heat.heatNumber} de ${heat.heatCount}</p>
                  <p class="hint">Formato sugerido: mm:ss.cc · Marcar NT/NS/DQ/DNS/DNF cuando aplique.</p>
                </div>
                <div class="timer-box">
                  <div>Cronometrista: ______________________________</div>
                  <div>Firma: ____________________ Fecha: __________</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Carril</th>
                    <th>Nadador</th>
                    <th>Edad</th>
                    <th>Tiempo 1</th>
                    <th>Tiempo 2</th>
                    <th>Tiempo 3</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </section>`;
        }).join('')
      ).join('');

      return `
        <section class="distance">
          <h2>${escapeHtml(distanceGroup.label)}</h2>
          ${sheets}
        </section>`;
    }).join('');

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Planilla de tiempos</title>
          <style>
            :root { color-scheme: only light; }
            @page {
              size: landscape;
              margin: 8mm;
            }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 18px;
              color: #111827;
            }
            h1 {
              margin: 0 0 4px;
              font-size: 30px;
            }
            h2 {
              margin: 22px 0 10px;
              font-size: 24px;
              color: #1f2937;
            }
            h3 {
              margin: 0 0 4px;
              font-size: 22px;
              color: #111827;
            }
            .meta, .filters, .hint {
              font-size: 20px;
              color: #6b7280;
            }
            .filters {
              background: #f3f4f6;
              padding: 8px 12px;
              border-radius: 6px;
              margin: 14px 0 18px;
            }
            .logo {
              text-align: center;
              margin-bottom: 12px;
            }
            .logo img {
              max-width: 240px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .time-sheet {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 18px;
            }
            .sheet-heading {
              display: flex;
              justify-content: space-between;
              gap: 18px;
              border: 1px solid #d1d5db;
              border-bottom: 0;
              background: #f8fafc;
              padding: 10px 12px;
            }
            .sheet-heading p {
              margin: 0;
            }
            .timer-box {
              min-width: 300px;
              font-size: 20px;
              line-height: 1.9;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 20px;
              table-layout: fixed;
              line-height: 1.15;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 7px 8px;
              text-align: left;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th {
              background: #e5e7eb;
              font-weight: 700;
            }
            th:nth-child(1), td:nth-child(1) { width: 5%; text-align: center; }
            th:nth-child(2), td:nth-child(2) { width: 28%; }
            th:nth-child(3), td:nth-child(3) { width: 6%; text-align: center; }
            th:nth-child(4), td:nth-child(4) { width: 12%; }
            th:nth-child(5), td:nth-child(5) { width: 12%; }
            th:nth-child(6), td:nth-child(6) { width: 12%; }
            th:nth-child(7), td:nth-child(7) { width: 25%; }
            .lane-cell {
              font-size: 22px;
              font-weight: 700;
            }
            .write-cell, .notes-cell {
              height: 34px;
              background: #fff;
            }
            .empty-lane td {
              color: #9ca3af;
              font-style: italic;
              height: 34px;
            }
            .nowrap {
              white-space: nowrap;
            }
            ${printActionsStyles}
            @media print {
              body { margin: 0; }
              .filters { background: none; }
            }
          </style>
        </head>
        <body>
          ${printActionsMarkup}
          ${logoMarkup}
          <h1>Planilla para cronometristas</h1>
          ${sections}
          ${printReadyScript}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();

    toast({
      title: 'Planilla de tiempos lista',
      description: 'Revisa la planilla y usa el botón "Imprimir reporte" cuando esté correcta.',
    });
  };

  const handleExportLaneTimekeeperSheets = () => {
    if (!isPoolEvent) {
      toast({
        title: 'No aplica para aguas abiertas',
        description: 'La planilla por carril solo se genera para competencias de piscina.',
      });
      return;
    }

    const laneCount = Number(heatLaneCount);
    if (!Number.isInteger(laneCount) || laneCount < 1 || laneCount > 10) {
      toast({
        variant: 'destructive',
        title: 'Cantidad de carriles inválida',
        description: 'Ingresa un número de carriles entre 1 y 10.',
      });
      return;
    }

    const swimmers = filteredParticipants.filter((participant) => participant.status !== 'rejected');
    if (!swimmers.length) {
      toast({
        title: 'Sin datos',
        description: 'No hay nadadores disponibles para generar planillas con los filtros actuales.',
      });
      return;
    }

    const laneAssignmentOrder = getCenterOutLaneOrder(laneCount);
    const heatGroups = buildHeatAssignments(swimmers, laneCount, laneAssignmentOrder);
    if (!heatGroups.length) {
      toast({
        title: 'Sin datos',
        description: 'No se encontraron nadadores para los filtros aplicados.',
      });
      return;
    }

    const exportWindow = window.open('', '_blank');
    if (!exportWindow) {
      toast({
        variant: 'destructive',
        title: 'No se pudo abrir la ventana',
        description: 'Permite ventanas emergentes en tu navegador para generar la planilla por carril.',
      });
      return;
    }

    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;
    const laneSections = Array.from({ length: laneCount }, (_, laneIndex) => {
      const laneNumber = laneIndex + 1;
      const assignments = heatGroups.flatMap((distanceGroup) =>
        distanceGroup.categories.flatMap((categoryGroup) =>
          categoryGroup.heats.flatMap((heat) => {
            const laneAssignment = heat.lanes.find((item) => item.lane === laneNumber);
            if (!laneAssignment?.participant) return [];

            return [{
              eventLabel: `Evento ${categoryGroup.eventNumber}: ${distanceGroup.label}`,
              category: `${categoryGroup.sexLabel} · ${categoryGroup.category}`,
              heatLabel: `${heat.heatNumber} de ${heat.heatCount}`,
              participant: laneAssignment.participant,
            }];
          })
        )
      );

      const rows = assignments.length
        ? assignments.map((assignment) => `
            <tr>
              <td>${escapeHtml(assignment.eventLabel)}</td>
              <td>${escapeHtml(assignment.category)}</td>
              <td class="heat-cell">${escapeHtml(assignment.heatLabel)}</td>
              <td>${escapeHtml(assignment.participant.nombre)}</td>
              <td class="age-cell">${escapeHtml(getAgeOnEvent(assignment.participant.nacimiento) ?? 'N/A')}</td>
              <td class="write-cell"></td>
              <td class="write-cell"></td>
              <td class="write-cell"></td>
              <td class="notes-cell"></td>
            </tr>`
          ).join('')
        : `
            <tr class="empty-lane">
              <td colspan="9">Sin nadadores asignados a este carril.</td>
            </tr>`;

      return `
        <section class="lane-sheet">
          <div class="sheet-heading">
            <div>
              <h2>Carril ${laneNumber}</h2>
              <p class="hint">Cronometrista: ______________________________</p>
            </div>
            <div class="timer-box">
              <div>Firma: ____________________</div>
              <div>Fecha: __________</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Categoría</th>
                <th>Heat</th>
                <th>Nadador</th>
                <th>Edad</th>
                <th>Tiempo 1</th>
                <th>Tiempo 2</th>
                <th>Tiempo 3</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    }).join('');

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Planilla por carril</title>
          <style>
            :root {
              color-scheme: only light;
              --report-font-size: 18px;
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
            html, body {
              width: 100%;
              min-width: 0;
            }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 18px;
              color: #111827;
              font-size: var(--report-font-size);
            }
            h1 {
              margin: 0 0 12px;
              font-size: 30px;
            }
            h2 {
              margin: 0 0 4px;
              font-size: 26px;
              color: #111827;
            }
            .hint {
              margin: 0;
              font-size: 0.95rem;
              color: #4b5563;
            }
            .logo {
              text-align: center;
              margin-bottom: 12px;
            }
            .logo img {
              max-width: 240px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .lane-sheet {
              break-inside: avoid;
              page-break-inside: avoid;
              page-break-before: always;
              break-before: page;
              margin-bottom: 12px;
            }
            .lane-sheet:first-of-type {
              page-break-before: auto;
              break-before: auto;
            }
            .logo, h1 {
              page-break-after: avoid;
              break-after: avoid;
            }
            .sheet-heading {
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;
              gap: 12px;
              border: 1px solid #d1d5db;
              border-bottom: 0;
              background: #f8fafc;
              padding: 10px 12px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .timer-box {
              min-width: 180px;
              font-size: 0.95rem;
              line-height: 1.8;
              color: #111827;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.95rem;
              table-layout: fixed;
              line-height: 1.15;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            table thead {
              display: table-header-group;
            }
            table tbody {
              display: table-row-group;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 6px 7px;
              text-align: left;
              vertical-align: middle;
              overflow-wrap: anywhere;
            }
            th {
              background: #e5e7eb;
              font-weight: 700;
            }
            th:nth-child(1), td:nth-child(1) { width: 13%; }
            th:nth-child(2), td:nth-child(2) { width: 13%; }
            th:nth-child(3), td:nth-child(3) { width: 6%; text-align: center; }
            th:nth-child(4), td:nth-child(4) { width: 24%; }
            th:nth-child(5), td:nth-child(5) { width: 5%; text-align: center; }
            th:nth-child(6), td:nth-child(6) { width: 9%; }
            th:nth-child(7), td:nth-child(7) { width: 9%; }
            th:nth-child(8), td:nth-child(8) { width: 9%; }
            th:nth-child(9), td:nth-child(9) { width: 12%; }
            .write-cell, .notes-cell {
              height: 32px;
              background: #fff;
            }
            .empty-lane td {
              color: #9ca3af;
              font-style: italic;
              height: 34px;
            }
            ${printActionsStyles}
            @media print {
              body {
                margin: 0;
                font-size: 0.9rem;
              }
              h1 {
                font-size: 24px;
              }
              .sheet-heading {
                padding: 8px 10px;
              }
              .timer-box {
                min-width: 140px;
              }
              table {
                font-size: 0.85rem;
              }
              .lane-sheet {
                page-break-after: auto;
                break-after: auto;
              }
              .lane-sheet table {
                page-break-inside: auto;
                break-inside: auto;
              }
            }
          </style>
        </head>
        <body>
          ${printActionsMarkup}
          ${logoMarkup}
          <h1>Planilla por carril</h1>
          ${laneSections}
          ${printReadyScript}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();

    toast({
      title: 'Planilla por carril lista',
      description: 'Revisa la planilla y usa el botón "Imprimir reporte" cuando esté correcta.',
    });
  };

  const handleGenerateSelectedReport = () => {
    switch (selectedReport) {
      case 'csv':
        handleExport();
        break;
      case 'pdf':
        handleExportPdf();
        break;
      case 'name-age':
        handleExportNameAgeReport('category');
        break;
      case 'name-age-general':
        handleExportNameAgeReport('general');
        break;
      case 'name-age-team':
        handleExportNameAgeReport('team');
        break;
      case 'results-event':
        handleExportResultsReport('event');
        break;
      case 'results-general':
        handleExportResultsReport('general');
        break;
      case 'competition-program':
        handleExportHeats();
        break;
      case 'timekeeper-sheets':
        handleExportTimekeeperSheets();
        break;
      case 'lane-timekeeper-sheets':
        handleExportLaneTimekeeperSheets();
        break;
      default:
        handleExportPdf();
    }
  };

  const handleResultInputChange = (id: string, value: string, distance?: string) => {
    setResultEdits((prev) => ({ ...prev, [resultEditKey(id, distance)]: value }));
  };

  const sanitizeResultInput = (value: string) => {
    return normalizeResultTimeInput(value).storedTime ?? '';
  };

  const handleResultSave = async (participant: Registration, distance?: string) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }
    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    const key = resultEditKey(participant.id, distance);
    setResultSaving((prev) => ({ ...prev, [key]: true }));

    try {
      const rawValue = resultEdits[key] ?? getParticipantResult(participant, distance).time ?? '';
      const sanitizedValue = sanitizeResultInput(rawValue);

      await updateRegistrationResult(participant.id, sanitizedValue || null, adminEmail || 'admin', distance);
      setResultEdits((prev) => ({ ...prev, [key]: sanitizedValue }));
      toast({
        title: 'Resultado actualizado',
        description: sanitizedValue
          ? `Tiempo guardado${distance ? ` en ${getDistanceLabel(distance)}` : ''}: ${sanitizedValue}`
          : `Resultado eliminado${distance ? ` en ${getDistanceLabel(distance)}` : ''}`,
      });
    } catch (err) {
      const description = err instanceof Error ? err.message : 'No se pudo guardar el resultado.';
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description,
      });
    } finally {
      setResultSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleStatusChange = async (id: string, status: RegistrationStatus) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }
    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

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
      await updateRegistrationStatus(id, status, adminEmail || 'admin', overrides);
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
      description: `Documento: ${participant.dni} | País: ${participant.pais || 'No indicado'} | Email: ${participant.email} | Tel: ${participant.telefono || 'No indicado'} | Talla: ${participant.tallaCamisa || 'No indicada'} | Comprobante: ${participant.comprobanteNombre ?? 'No adjuntado'}`
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
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }
    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

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

  const openEditDialog = (participant: Registration) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }
    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    setEditParticipant(participant);
    const initial: RegistrationEditableFields = {
      nombre: participant.nombre,
      dni: participant.dni,
      dorsal: participant.dorsal,
      nacimiento: participant.nacimiento,
      pais: participant.pais,
      email: participant.email,
      telefono: participant.telefono,
      club: participant.club,
      distancia: participant.distancia || activeEvent.distances[0]?.value || '',
      sexo: participant.sexo || 'M',
      categoria: getParticipantCategory(participant),
      emergenciaNombre: participant.emergenciaNombre,
      emergenciaTel: participant.emergenciaTel,
      medico: participant.medico,
      banco: participant.banco,
      monto: participant.monto,
      referencia: participant.referencia,
      tallaCamisa: participant.tallaCamisa,
    };

    if (!initial.distancia) {
      initial.distancia = activeEvent.distances[0]?.value || '';
    }

    initial.categoria = calculateCategory(initial.nacimiento ?? '', initial.distancia ?? '');

    setEditForm(initial);
    setResultEdit(getParticipantResult(participant, getParticipantDistances(participant)[0]).time ?? '');
    setEditResultEdits(Object.fromEntries(
      getParticipantDistances(participant).map((distance) => [
        distance,
        getParticipantResult(participant, distance).time ?? '',
      ])
    ));
    setEditError('');
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
    setEditParticipant(null);
    setEditForm({});
    setResultEdit('');
    setEditResultEdits({});
    setEditError('');
    setIsSavingEdit(false);
  };

  const handleEditFieldChange = (field: keyof RegistrationEditableFields, value: string) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'nacimiento' || field === 'distancia') {
        const birth = field === 'nacimiento' ? value : (next.nacimiento ?? '');
        const distance = field === 'distancia' ? value : (next.distancia ?? '');
        next.categoria = calculateCategory(birth ?? '', distance ?? '');
      }

      if (field === 'nacimiento' || field === 'pais') {
        next.monto = calculatePaymentAmount(next.nacimiento ?? '', next.pais ?? 'Honduras');
      }

      return next;
    });
  };

  const handleEditDistanceToggle = (distanceValue: string, checked: boolean) => {
    const selectedDistances = splitRegistrationDistances(editForm.distancia ?? '');
    const nextDistances = checked
      ? Array.from(new Set([...selectedDistances, distanceValue]))
      : selectedDistances.filter((distance) => distance !== distanceValue);

    handleEditFieldChange('distancia', nextDistances.join(', '));

    if (checked && editParticipant) {
      setEditResultEdits((prev) => ({
        ...prev,
        [distanceValue]: prev[distanceValue] ?? getParticipantResult(editParticipant, distanceValue).time ?? '',
      }));
    }
  };

  const handleEditSave = async () => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }
    if (isHistoricalEvent) {
      showHistoricalWarning();
      return;
    }

    if (!editParticipant) return;
    setIsSavingEdit(true);
    setEditError('');

    try {
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(true);
        } catch (tokenError) {
          console.warn('No se pudo refrescar el token antes de editar', tokenError);
        }
      }

      const selectedDistances = splitRegistrationDistances(editForm.distancia ?? editParticipant.distancia);
      if (!selectedDistances.length) {
        throw new Error('Selecciona al menos una prueba.');
      }

      await updateRegistrationData(editParticipant.id, editForm);

      if (activeEvent.allowMultipleDistances || selectedDistances.length > 1) {
        for (const distance of selectedDistances) {
          const trimmed = (editResultEdits[distance] ?? '').trim();
          const currentResult = getParticipantResult(editParticipant, distance).time ?? '';

          if (trimmed !== currentResult.trim()) {
            const sanitized = sanitizeResultInput(trimmed);
            await updateRegistrationResult(editParticipant.id, sanitized || null, adminEmail || 'admin', distance);
          }
        }
      } else {
        const trimmed = resultEdit.trim();
        const currentResult = editParticipant.resultTime ?? '';

        if (trimmed !== currentResult.trim()) {
          const sanitized = sanitizeResultInput(trimmed);
          await updateRegistrationResult(editParticipant.id, sanitized || null, adminEmail || 'admin', selectedDistances[0]);
        }
      }

      toast({
        title: 'Datos actualizados',
        description: 'La inscripción se actualizó correctamente.',
      });
      closeEditDialog();
    } catch (err) {
      let description = err instanceof Error ? err.message : 'No se pudo actualizar la inscripción.';

      if (err instanceof FirebaseError && err.code === 'permission-denied') {
        description = 'Firebase denegó la operación. Asegúrate de iniciar sesión con una cuenta autorizada y de tener App Check configurado correctamente.';
      }

      setEditError(description);
      toast({
        variant: 'destructive',
        title: 'Error al editar',
        description,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreateDistanceToggle = (distanceValue: string, checked: boolean) => {
    const selectedDistances = splitRegistrationDistances(createForm.getValues('distancia') ?? '');
    const nextDistances = checked
      ? Array.from(new Set([...selectedDistances, distanceValue]))
      : selectedDistances.filter((distance) => distance !== distanceValue);

    createForm.setValue('distancia', nextDistances.join(', '), { shouldValidate: true, shouldDirty: true });
  };

  const handleCreateSubmit = createForm.handleSubmit(async (values) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }

    if (isHistoricalEvent) {
      setCreateError('Este evento es histórico y no acepta nuevas inscripciones.');
      return;
    }

    setIsSavingCreate(true);
    setCreateError('');

    try {
      const categoria = calculateCategory(values.nacimiento, values.distancia);
      if (!categoria) {
        throw new Error('La fecha de nacimiento no es válida para la distancia seleccionada.');
      }

      await addRegistration({
        nombre: values.nombre.trim(),
        dni: values.dni.trim(),
        nacimiento: values.nacimiento,
        pais: values.pais.trim(),
        email: values.email.trim(),
        telefono: values.telefono.trim(),
        club: values.club?.trim() ?? '',
        distancia: values.distancia,
        sexo: values.sexo,
        categoria,
        emergenciaNombre: values.emergenciaNombre?.trim() ?? '',
        emergenciaTel: values.emergenciaTel?.trim() ?? '',
        medico: values.medico?.trim() ?? '',
        banco: values.banco.trim(),
        monto: calculatePaymentAmount(values.nacimiento, values.pais),
        referencia: values.referencia.trim(),
        tallaCamisa: values.tallaCamisa?.trim() ?? '',
        comprobanteFile: null,
      }, { bypassRegistrationStatus: true });

      toast({
        title: 'Inscripción creada',
        description: 'El participante fue agregado manualmente.',
      });
      createForm.reset();
      setIsCreateOpen(false);
    } catch (err) {
      let description = err instanceof Error ? err.message : 'No se pudo crear la inscripción.';

      if (err instanceof FirebaseError && err.code === 'permission-denied') {
        description = 'Firebase denegó la operación. Asegúrate de iniciar sesión con una cuenta autorizada y de tener App Check configurado correctamente.';
      }

      setCreateError(description);
      toast({
        variant: 'destructive',
        title: 'Error al crear inscripción',
        description,
      });
    } finally {
      setIsSavingCreate(false);
    }
  });

  const handleExport = () => {
    if (!registrations.length) {
      toast({
        title: 'Sin datos',
        description: 'Aún no hay inscripciones para exportar.',
      });
      return;
    }

    const header = [
      'Fecha inscripción',
      'Hora inscripción',
      'Nombre',
      'Edad',
      'País',
      'Dorsal',
      'Documento',
      'Email',
      'Teléfono',
      'Distancia',
      'Categoría',
      'Resultados por prueba',
      'Talla',
      'Banco',
      'Monto',
      'Monto esperado',
      'Referencia',
      'Estado',
      'Check-in',
      'Check-in por',
      'URL comprobante',
    ];

    const rows = registrations.map((participant) => [
      formatRegistrationDate(participant.createdAt),
      formatRegistrationTime(participant.createdAt),
      participant.nombre,
      getAgeOnEvent(participant.nacimiento) ?? '',
      participant.pais,
      participant.dorsal,
      participant.dni,
      participant.email,
      participant.telefono,
      participant.distancia,
      getParticipantCategory(participant),
      formatParticipantResultsSummary(participant),
      participant.tallaCamisa,
      participant.banco,
      participant.monto,
      calculatePaymentAmount(participant.nacimiento, participant.pais),
      participant.referencia,
      participant.status,
      participant.checkedInAt ? participant.checkedInAt : '',
      participant.checkedInBy ?? '',
      participant.comprobanteUrl ?? '',
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
      
      <div className={isRunMode ? 'mx-auto w-full px-3 py-6 sm:px-4 xl:px-8' : 'max-w-7xl mx-auto px-4 py-8'}>
        <div className="mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Panel de Administración</h1>
              <p className="text-muted-foreground">Gestión de inscripciones - {activeEvent.name}</p>
              <p className="text-xs text-muted-foreground">Evento activo: {activeEvent.id}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-[260px] space-y-1.5">
                <Label htmlFor="admin-event-selector">Ver evento</Label>
                <select
                  id="admin-event-selector"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={activeEventId}
                  onChange={(event) => handleEventChange(event.target.value)}
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout}
              >
                Cerrar Sesión
              </Button>
              <Button
                variant="outline"
                onClick={() => openEventDialog('edit')}
                disabled={isReadOnlyMode}
                title={readOnlyTooltip}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar competencia
              </Button>
              <Button
                className="button-gradient shadow-button"
                onClick={() => openEventDialog('create')}
                disabled={isReadOnlyMode}
                title={readOnlyTooltip}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva competencia
              </Button>
            </div>
          </div>
        </div>

        {isHistoricalEvent && (
          <Alert className="mb-8">
            <AlertTitle>Evento histórico</AlertTitle>
            <AlertDescription>
              Estás viendo registros de una edición anterior. La creación de nuevas inscripciones está deshabilitada para evitar mezclar datos.
            </AlertDescription>
          </Alert>
        )}

        {!isHistoricalEvent && registrationsManuallyClosed && (
          <Alert className="mb-8 border-warm-accent/40 bg-warm-accent/10">
            <Lock className="h-4 w-4" />
            <AlertTitle>Inscripciones bloqueadas manualmente</AlertTitle>
            <AlertDescription>
              El formulario público y la creación de nuevas inscripciones están cerrados. Puedes seguir editando inscritos, validando, haciendo check-in y registrando tiempos.
            </AlertDescription>
          </Alert>
        )}

        {!isHistoricalEvent && !registrationsManuallyClosed && registrationStatus.reason === 'after' && (
          <Alert className="mb-8">
            <AlertTitle>Inscripciones cerradas automáticamente</AlertTitle>
            <AlertDescription>
              El cierre automático se aplicó el {formatDateTime(activeEvent.registrationCloseDateTime)}. Puedes editar los registros existentes desde el panel.
            </AlertDescription>
          </Alert>
        )}

        {isReadOnlyMode && (
          <Alert className="mb-8 border-warm-accent/40 bg-warm-accent/10">
            <AlertTitle>Modo de solo lectura</AlertTitle>
            <AlertDescription>
              Puedes revisar información, pero las operaciones de edición están deshabilitadas. Inicia sesión con una cuenta autorizada para administrar inscripciones.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
        {!isRunMode && (
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
                <CardTitle className="text-2xl text-primary">{remainingLabel}</CardTitle>
                <CardDescription>{remainingDescription}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Label htmlFor="report-type" className="text-sm whitespace-nowrap">Reporte</Label>
            <Select value={selectedReport} onValueChange={(value) => setSelectedReport(value as ReportType)}>
              <SelectTrigger id="report-type" className="h-9 w-full sm:w-[300px]">
                <SelectValue placeholder="Selecciona un reporte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF completo</SelectItem>
                <SelectItem value="csv">CSV inscripciones</SelectItem>
                <SelectItem value="name-age">Nombre, edad y talla por categoría</SelectItem>
                <SelectItem value="name-age-general">Nombre, edad y talla general</SelectItem>
                <SelectItem value="name-age-team">Nombre, edad y talla por equipo</SelectItem>
                <SelectItem value="results-event">Resultados por evento</SelectItem>
                <SelectItem value="results-general">Resultados generales</SelectItem>
                {isPoolEvent && (
                  <>
                    <SelectItem value="competition-program">Programa de competencia</SelectItem>
                    <SelectItem value="timekeeper-sheets">Planilla tiempos</SelectItem>
                    <SelectItem value="lane-timekeeper-sheets">Planilla por carril</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            {(isRunMode || (isPoolEvent && selectedReportRequiresLanes)) && (
              <>
                <Label htmlFor="heat-lane-count" className="text-sm whitespace-nowrap">Carriles</Label>
                <Input
                  id="heat-lane-count"
                  type="number"
                  min={1}
                  max={10}
                  value={heatLaneCount}
                  onChange={(event) => setHeatLaneCount(event.target.value)}
                  className="h-9 w-20"
                />
              </>
            )}
            {selectedReport === 'results-event' && (
              resultReportEventOptions.length ? (
                <>
                  <Label htmlFor="result-event-report" className="text-sm whitespace-nowrap">Evento</Label>
                  <Select
                    value={selectedResultEventKey || resultReportEventOptions[0]?.key || ''}
                    onValueChange={setSelectedResultEventKey}
                  >
                    <SelectTrigger id="result-event-report" className="h-9 w-full sm:w-[340px]">
                      <SelectValue placeholder="Selecciona evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {resultReportEventOptions.map((option) => (
                        <SelectItem key={option.key} value={option.key}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Sin eventos de resultados</span>
              )
            )}
            <Button type="button" className="button-gradient shadow-button" onClick={handleGenerateSelectedReport}>
              <FileText className="mr-2 h-4 w-4" />
              Generar reporte
            </Button>
          </div>
          <Button
            type="button"
            variant={isRunMode ? 'default' : 'outline'}
            className={isRunMode ? 'button-gradient shadow-button' : undefined}
            onClick={() => navigate(isRunMode ? '/admin' : '/admin/run')}
          >
            <Play className="mr-2 h-4 w-4" />
            {isRunMode ? 'Ver inscripciones' : 'RUN'}
          </Button>
          <Button
            type="button"
            variant={registrationsManuallyClosed ? 'default' : 'outline'}
            onClick={handleRegistrationLockToggle}
            disabled={isReadOnlyMode || isHistoricalEvent || isTogglingRegistrationLock}
            title={readOnlyTooltip || (isHistoricalEvent ? 'Evento histórico: no se puede cambiar el estado de inscripciones.' : undefined)}
          >
            <Lock className="mr-2 h-4 w-4" />
            {isTogglingRegistrationLock
              ? 'Actualizando...'
              : registrationsManuallyClosed
                ? 'Reabrir inscripciones'
                : 'Bloquear inscripciones'}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={isRunMode ? handlePublishSelectedRunEvent : handleCloseCompetition}
            disabled={isReadOnlyMode || isHistoricalEvent || isClosingEvent || (isRunMode && !selectedRunEvent)}
            title={readOnlyTooltip || (isHistoricalEvent ? 'Evento histórico: ya está cerrado.' : undefined)}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isClosingEvent
              ? isRunMode ? 'Publicando...' : 'Cerrando...'
              : isRunMode ? 'Finalizar evento' : 'Finalizar competencia'}
          </Button>
          <Button variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            Lector QR
          </Button>
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" />
            Check-in
          </Button>
          <Button
            className="button-gradient shadow-button"
            onClick={() => {
              if (isReadOnlyMode) {
                showReadOnlyWarning();
                return;
              }
              if (isHistoricalEvent) {
                toast({
                  variant: 'destructive',
                  title: 'Evento histórico',
                  description: 'No se pueden crear inscripciones nuevas en una edición anterior.',
                });
                return;
              }
              setIsCreateOpen(true);
            }}
            disabled={!canCreateInActiveEvent}
            title={createRegistrationTooltip}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva inscripción
          </Button>
        </div>

        {isRunMode ? (
          <Card className="card-gradient shadow-card overflow-hidden">
            <CardHeader className="border-b border-border/70">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-2xl text-primary">RUN · Captura de resultados</CardTitle>
                  <CardDescription>
                    {activeEvent.name}. Selecciona evento y heat para guardar los tiempos por carril.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {runEventOptions.length} evento{runEventOptions.length === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground">
                    {runHeatOptions.length} heat{runHeatOptions.length === 1 ? '' : 's'}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin')}>
                    Lista de inscritos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4 md:p-6">
              {!runHeatOptions.length ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sin heats disponibles</AlertTitle>
                  <AlertDescription>
                    No hay nadadores activos para armar eventos y heats. Revisa que existan inscripciones no rechazadas.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <aside className="space-y-4">
                    <div className="rounded-lg border bg-background/80 p-4">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="run-event-selector">Evento</Label>
                          <Select
                            value={selectedRunEvent?.key ?? ''}
                            onValueChange={(value) => {
                              setSelectedRunEventKey(value);
                              setSelectedRunHeatKey('');
                            }}
                          >
                            <SelectTrigger id="run-event-selector">
                              <SelectValue placeholder="Selecciona evento" />
                            </SelectTrigger>
                            <SelectContent>
                              {runEventOptions.map((option) => (
                                <SelectItem key={option.key} value={option.key}>
                                  Evento {option.eventNumber}: {option.sexLabel} · {option.category} · {option.distanceLabel}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="run-heat-selector">Heat</Label>
                          <Select
                            value={selectedRunHeat?.heatKey ?? ''}
                            onValueChange={setSelectedRunHeatKey}
                          >
                            <SelectTrigger id="run-heat-selector">
                              <SelectValue placeholder="Selecciona heat" />
                            </SelectTrigger>
                            <SelectContent>
                              {visibleRunHeats.map((heat) => (
                                <SelectItem key={heat.heatKey} value={heat.heatKey}>
                                  Heat {heat.heatNumber} de {heat.heatCount}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background/80 p-4">
                      <p className="mb-3 text-sm font-semibold text-foreground">Lista de heats</p>
                      <div className="grid gap-2">
                        {visibleRunHeats.map((heat) => (
                          <Button
                            key={heat.heatKey}
                            type="button"
                            variant={selectedRunHeat?.heatKey === heat.heatKey ? 'default' : 'outline'}
                            className="justify-between"
                            onClick={() => setSelectedRunHeatKey(heat.heatKey)}
                          >
                            <span>Heat {heat.heatNumber}</span>
                            <span className="text-xs opacity-80">de {heat.heatCount}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRunHeatStep(-1)}
                        disabled={selectedRunHeatIndex <= 0}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleRunHeatStep(1)}
                        disabled={selectedRunHeatIndex < 0 || selectedRunHeatIndex >= runHeatOptions.length - 1}
                      >
                        Siguiente
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </aside>

                  <section className="min-w-0 rounded-lg border bg-background/80">
                    {selectedRunHeat && (
                      <>
                        <div className="border-b border-border/70 p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h2 className="text-xl font-bold text-primary">
                                Evento {selectedRunHeat.eventNumber} · Heat {selectedRunHeat.heatNumber} de {selectedRunHeat.heatCount}
                              </h2>
                              <p className="text-sm text-muted-foreground">
                                {selectedRunHeat.sexLabel} · {selectedRunHeat.category} · {selectedRunHeat.distanceLabel}
                              </p>
                            </div>
                            <span className="rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
                              {selectedRunHeat.participantCount} participante{selectedRunHeat.participantCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[820px] text-sm">
                            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                              <tr className="border-b border-border">
                                <th className="px-4 py-3 text-left font-semibold">Carril</th>
                                <th className="px-4 py-3 text-left font-semibold">Dorsal</th>
                                <th className="px-4 py-3 text-left font-semibold">Nadador</th>
                                <th className="px-4 py-3 text-left font-semibold">Edad</th>
                                <th className="px-4 py-3 text-left font-semibold">Equipo</th>
                                <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                <th className="px-4 py-3 text-left font-semibold">Tiempo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedRunHeat.lanes.map(({ lane, participant }) => {
                                if (!participant) {
                                  return (
                                    <tr key={`empty-${lane}`} className="border-b border-border/70 bg-muted/20 italic text-muted-foreground last:border-0">
                                      <td className="px-4 py-4 font-semibold">{lane}</td>
                                      <td className="px-4 py-4" colSpan={4}>Carril libre</td>
                                      <td className="px-4 py-4" colSpan={2}>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="not-italic"
                                          onClick={() => openLastMinuteRegistration(selectedRunHeat.distance, selectedRunHeat.sex)}
                                          disabled={mutationDisabled}
                                          title={mutationTooltip}
                                        >
                                          <Plus className="mr-1 h-4 w-4" />
                                          Agregar nadador
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                }

                                const participantAge = getAgeOnEvent(participant.nacimiento);
                                const result = getParticipantResult(participant, selectedRunHeat.distance);
                                const resultKey = resultEditKey(participant.id, selectedRunHeat.distance);

                                return (
                                  <tr key={`${lane}-${participant.id}`} className="border-b border-border/70 align-middle last:border-0">
                                    <td className="px-4 py-4 text-lg font-bold text-primary">{lane}</td>
                                    <td className="px-4 py-4 font-mono text-sm">#{participant.dorsal}</td>
                                    <td className="px-4 py-4">
                                      <p className="font-semibold text-foreground">{participant.nombre}</p>
                                      <p className="text-xs text-muted-foreground">{getParticipantCategory(participant, selectedRunHeat.distance)}</p>
                                    </td>
                                    <td className="px-4 py-4">{participantAge !== null ? participantAge : 'N/A'}</td>
                                    <td className="px-4 py-4">{participant.club || 'Sin equipo'}</td>
                                    <td className="px-4 py-4">
                                      {result.time ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                          <CheckCircle2 className="h-3 w-3" />
                                          {result.time}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                                          <XCircle className="h-3 w-3" />
                                          Pendiente
                                        </span>
                                      )}
                                      {result.recordedAt && (
                                        <p className="mt-1 text-[11px] text-muted-foreground">
                                          {new Date(result.recordedAt).toLocaleString('es-HN')}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-4 py-4">
                                      <div className="flex min-w-[220px] items-center gap-2">
                                        <Input
                                          value={getResultInputValue(participant, selectedRunHeat.distance)}
                                          onChange={(event) => handleResultInputChange(participant.id, event.target.value, selectedRunHeat.distance)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                              event.preventDefault();
                                              handleResultSave(participant, selectedRunHeat.distance);
                                            }
                                          }}
                                          placeholder="14520, 3045, NT, NS, DQ"
                                          className="h-10 w-40 text-base"
                                        />
                                        <Button
                                          type="button"
                                          className="h-10 shrink-0 px-3"
                                          disabled={mutationDisabled || resultSaving[resultKey]}
                                          title={mutationTooltip}
                                          onClick={() => handleResultSave(participant, selectedRunHeat.distance)}
                                        >
                                          <Clock className="mr-1 h-4 w-4" />
                                          Guardar
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </section>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
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
                    placeholder="Documento, nombre, referencia..."
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
                  {activeEvent.distances.map((distance) => (
                    <option key={distance.value} value={distance.value}>{distance.label}</option>
                  ))}
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
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Usa <strong>RUN</strong> para registrar resultados por evento y heat. Los formatos válidos incluyen
              <strong> 14520</strong> = 1:45.20, <strong>3045</strong> = 30.45, <strong>NT</strong>, <strong>NS</strong> y <strong>DQ</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Participants Table */}
        <Card className="card-gradient shadow-card overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <CardTitle className="text-xl text-primary">Inscripciones</CardTitle>
            <CardDescription>
              {filteredParticipants.length} registros visibles. Usa los filtros para reducir la lista.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-3 text-left font-semibold">Participante</th>
                    <th className="px-5 py-3 text-left font-semibold">Contacto</th>
                    <th className="px-5 py-3 text-left font-semibold">Pruebas</th>
                    <th className="px-5 py-3 text-left font-semibold">Pago</th>
                    <th className="px-5 py-3 text-left font-semibold">Check-in</th>
                    <th className="px-5 py-3 text-left font-semibold">Estado</th>
                    <th className="px-5 py-3 text-left font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {registrationsLoading ? (
                    <tr>
                      <td className="py-8 text-center text-muted-foreground" colSpan={7}>
                        Cargando inscripciones...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="py-8 text-center text-destructive" colSpan={7}>
                        {error}
                      </td>
                    </tr>
                  ) : filteredParticipants.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-muted-foreground" colSpan={7}>
                        No hay inscripciones que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((participant) => {
                      const participantDistances = getParticipantDistances(participant);
                      const participantAge = getAgeOnEvent(participant.nacimiento);
                      const participantCategory = getParticipantCategory(participant) || 'N/A';
                      const expectedPaymentAmount = calculatePaymentAmount(participant.nacimiento, participant.pais);
                      const paymentMismatch = hasPaymentAmountMismatch(participant.monto, expectedPaymentAmount);

                      return (
                      <tr key={participant.id} className="border-b border-border/70 align-top transition-colors hover:bg-muted/25 last:border-0">
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <div>
                              <p className="max-w-[250px] font-semibold leading-snug text-foreground">
                                {participant.nombre}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatRegistrationDate(participant.createdAt)} · {formatRegistrationTime(participant.createdAt)}
                              </p>
                            </div>
                            <div className="flex max-w-[260px] flex-wrap gap-1.5">
                              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">
                                #{participant.dorsal}
                              </span>
                              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
                                {participantAge !== null ? `${participantAge} años` : 'Edad N/A'}
                              </span>
                              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
                                {participantCategory}
                              </span>
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">Documento {participant.dni}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[230px] space-y-1 text-sm">
                            <p className="font-medium text-foreground">{participant.pais || 'No indicado'}</p>
                            <p className="truncate text-muted-foreground">{participant.email}</p>
                            <p className="text-muted-foreground">{participant.telefono || 'Sin teléfono'}</p>
                            {participant.club && (
                              <p className="truncate text-xs text-muted-foreground">Club: {participant.club}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex max-w-[230px] flex-wrap gap-1.5">
                            {participantDistances.map((distance) => (
                              <span
                                key={distance}
                                className="rounded-full border border-border bg-background px-2 py-1 text-xs font-medium text-foreground"
                              >
                                {getDistanceLabel(distance)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[190px] space-y-1 text-sm">
                            <p className="font-medium text-foreground">{participant.banco || 'N/A'}</p>
                            <p className={paymentMismatch ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                              {participant.monto ? formatRegistrationFee(participant.monto) : 'Monto N/A'}
                            </p>
                            <p className={paymentMismatch ? 'text-xs font-medium text-destructive' : 'text-xs text-muted-foreground'}>
                              Esperado: {formatRegistrationFee(expectedPaymentAmount)}
                            </p>
                            <p className="break-all font-mono text-xs text-muted-foreground">
                              {participant.referencia || 'Sin referencia'}
                            </p>
                            <p className="text-xs text-muted-foreground">Talla: {participant.tallaCamisa || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {participant.checkedInAt ? (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full border border-lake-green/20 bg-lake-green/10 px-2 py-1 text-xs font-medium text-lake-green">
                                Realizado
                              </span>
                              <p className="text-xs text-muted-foreground">{formatDateTime(participant.checkedInAt)}</p>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(participant.status)}`}>
                            {getStatusLabel(participant.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex w-[220px] flex-wrap gap-1.5">
                            <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => handleView(participant)}>Ver</Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => handleOpenReceipt(participant)}
                              disabled={!participant.comprobanteUrl}
                            >
                              Comprobante
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 px-2"
                              onClick={() => openEditDialog(participant)}
                              disabled={mutationDisabled}
                              title={mutationTooltip}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={`h-8 px-2 ${participant.checkedInAt ? 'bg-lake-green/10 text-lake-green' : ''}`}
                              onClick={() => handleCheckIn(participant)}
                              disabled={mutationDisabled || participant.status === 'rejected'}
                              title={mutationTooltip}
                            >
                              {participant.checkedInAt ? 'Revertir' : 'Check-in'}
                            </Button>
                            {participant.status === 'pending' ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-lake-green"
                                  onClick={() => handleStatusChange(participant.id, 'validated')}
                                  disabled={mutationDisabled}
                                  title={mutationTooltip}
                                >
                                  ✓
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2 text-destructive"
                                  onClick={() => handleStatusChange(participant.id, 'rejected')}
                                  disabled={mutationDisabled}
                                  title={mutationTooltip}
                                >
                                  ✗
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => handleStatusChange(participant.id, 'pending')}
                                disabled={mutationDisabled}
                                title={mutationTooltip}
                              >
                                Pend.
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        <Dialog open={isEventDialogOpen} onOpenChange={(open) => (open ? setIsEventDialogOpen(true) : closeEventDialog())}>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] p-0 overflow-hidden">
            <form onSubmit={handleSaveEvent} className="flex max-h-[90vh] flex-col">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>{editingEventId ? 'Editar competencia' : 'Nueva competencia'}</DialogTitle>
                <DialogDescription>
                  {editingEventId
                    ? 'Corrige los datos publicados de este evento. Los cambios se reflejan en la página de eventos, inscripción y resultados.'
                    : 'Crea un evento activo. La fecha alimenta el contador, el precio alimenta inscripción y reglamento, y las distancias se usan en formulario/resultados.'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2 overflow-y-auto px-6 py-2">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Nombre de la competencia</Label>
                  <Input value={eventForm.name} onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Fecha</Label>
                  <Input type="date" value={eventForm.date} onChange={(e) => setEventForm((prev) => ({ ...prev, date: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora de salida</Label>
                  <Input type="time" value={eventForm.time} onChange={(e) => setEventForm((prev) => ({ ...prev, time: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Cierre de inscripción</Label>
                  <Input type="date" value={eventForm.registrationCloseDate} onChange={(e) => setEventForm((prev) => ({ ...prev, registrationCloseDate: e.target.value }))} required />
                </div>
                <label className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:col-span-2">
                  <Checkbox
                    checked={eventForm.registrationsManuallyClosed}
                    onCheckedChange={(value) => setEventForm((prev) => ({ ...prev, registrationsManuallyClosed: Boolean(value) }))}
                  />
                  <span>
                    <span className="font-medium text-foreground">Bloquear inscripciones manualmente</span>
                    <span className="block text-muted-foreground">
                      Cierra el formulario y la creación de nuevas inscripciones sin cambiar la fecha automática de cierre.
                    </span>
                  </span>
                </label>
                <div className="space-y-1.5">
                  <Label>Precio (L)</Label>
                  <Input value={eventForm.price} onChange={(e) => setEventForm((prev) => ({ ...prev, price: e.target.value }))} required />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tipo de competencia</Label>
                  <Select
                    value={eventForm.courseType}
                    onValueChange={(value) => setEventForm((prev) => ({
                      ...prev,
                      courseType: value as 'open_water' | 'pool',
                      categoriesText: value === 'pool' ? OFFICIAL_MASTER_CATEGORIES_TEXT : prev.categoriesText,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo de competencia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open_water">Aguas abiertas</SelectItem>
                      <SelectItem value="pool">Piscina</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Las opciones de carriles y heats solo aparecen para competencias de piscina.
                  </p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Lugar</Label>
                  <Input value={eventForm.location} onChange={(e) => setEventForm((prev) => ({ ...prev, location: e.target.value }))} required />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>URL del afiche o imagen de fondo</Label>
                  <Input
                    type="url"
                    value={eventForm.posterImageUrl}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, posterImageUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Pega una URL pública de la imagen. Se usará como fondo en la tarjeta y en el detalle del evento.
                  </p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="eventPosterFile">Subir afiche desde tu computadora</Label>
                  <Input
                    id="eventPosterFile"
                    type="file"
                    accept="image/*"
                    onChange={handleEventPosterChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG o WebP hasta {MAX_POSTER_SIZE_MB} MB. Si subes una imagen, reemplaza la URL anterior al guardar.
                  </p>
                  {eventPosterFile && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                      Afiche listo para subir: <span className="font-medium text-foreground">{eventPosterFile.name}</span>
                    </div>
                  )}
                  {eventForm.posterImageUrl && !eventPosterFile && (
                    <img
                      src={eventForm.posterImageUrl}
                      alt="Vista previa del afiche"
                      className="mt-3 h-40 w-full rounded-lg border object-cover"
                    />
                  )}
                </div>
                <div className="space-y-3 rounded-lg border bg-muted/20 p-4 md:col-span-2">
                  <div>
                    <Label htmlFor="eventSponsorFiles">Patrocinadores de este evento</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Agrega los logos que aparecerán únicamente dentro del detalle de esta competencia.
                    </p>
                  </div>
                  <Input
                    id="eventSponsorFiles"
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    multiple
                    onChange={handleEventSponsorsChange}
                    disabled={isConvertingSponsorPdfs}
                  />
                  <p className="text-xs text-muted-foreground">
                    Hasta {MAX_SPONSOR_LOGOS} patrocinadores. Puedes seleccionar imágenes o PDF; cada PDF puede pesar hasta {MAX_SPONSOR_PDF_SIZE_MB} MB y su primera página se convertirá automáticamente en imagen.
                  </p>
                  {isConvertingSponsorPdfs && (
                    <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground" role="status">
                      Convirtiendo PDF a imagen…
                    </div>
                  )}

                  {eventForm.sponsorImageUrls.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Logos guardados</p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {eventForm.sponsorImageUrls.map((imageUrl, index) => (
                          <div key={`${imageUrl}-${index}`} className="relative flex aspect-[3/2] items-center justify-center rounded-lg border bg-white p-3">
                            <img
                              src={imageUrl}
                              alt={`Patrocinador ${index + 1}`}
                              className="max-h-full max-w-full object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                              onClick={() => setEventForm((prev) => ({
                                ...prev,
                                sponsorImageUrls: prev.sponsorImageUrls.filter((_, itemIndex) => itemIndex !== index),
                              }))}
                              aria-label={`Quitar patrocinador ${index + 1}`}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {eventSponsorFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Listos para subir al guardar</p>
                      <div className="space-y-2">
                        {eventSponsorFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                          >
                            <span className="min-w-0 truncate text-muted-foreground">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEventSponsorFiles((files) => files.filter((_, itemIndex) => itemIndex !== index))}
                              aria-label={`Quitar ${file.name}`}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Quitar
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Distancias separadas por coma</Label>
                  <Input value={eventForm.distancesText} onChange={(e) => setEventForm((prev) => ({ ...prev, distancesText: e.target.value }))} placeholder="800m, 2km, 5km" required />
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: 800m, 2km, 5km
                  </p>
                </div>
                <label className="md:col-span-2 flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
                  <Checkbox
                    checked={eventForm.allowMultipleDistances}
                    onCheckedChange={(value) => setEventForm((prev) => ({ ...prev, allowMultipleDistances: Boolean(value) }))}
                  />
                  <span>
                    <span className="font-medium text-foreground">Permitir escoger varias pruebas</span>
                    <span className="block text-muted-foreground">
                      Úsalo para eventos de piscina donde el nadador puede inscribirse en una o varias pruebas.
                    </span>
                  </span>
                </label>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Categorías por edad</Label>
                  <Textarea
                    value={eventForm.categoriesText}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, categoriesText: e.target.value }))}
                    placeholder={OFFICIAL_MASTER_CATEGORIES_TEXT}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Formato oficial master: {OFFICIAL_MASTER_CATEGORIES_TEXT}.
                  </p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Información de pago</Label>
                  <Textarea
                    value={eventForm.paymentInfo}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, paymentInfo: e.target.value }))}
                    rows={6}
                    placeholder={'Número de cuenta: 00000000\nBanco: Nombre del banco\nTipo de cuenta: Ahorros\nTitular: Nombre completo\nDNI: 0000-0000-00000'}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Para agregar varias cuentas, repite el bloque comenzando con “Número de cuenta:”. La página las mostrará por separado.
                  </p>
                </div>
              </div>

              <DialogFooter className="border-t bg-background px-6 py-4">
                <Button type="button" variant="outline" onClick={closeEventDialog} disabled={isSavingEvent}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingEvent || isConvertingSponsorPdfs}>
                  {isSavingEvent
                    ? editingEventId ? 'Guardando...' : 'Creando...'
                    : editingEventId ? 'Guardar cambios' : 'Crear competencia'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={(open) => (open ? setIsEditOpen(true) : closeEditDialog())}>
          <DialogContent className="flex w-[95vw] max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleEditSave();
              }}
              className="flex max-h-[90vh] min-h-0 w-full flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 space-y-5">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle>Editar inscripción</DialogTitle>
                  <DialogDescription>
                    Ajusta los datos del participante para corregir información suministrada por error.
                  </DialogDescription>
                </DialogHeader>

                {editParticipant && (
                  <div className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                        <Label>Nombre completo</Label>
                        <Input
                          value={editForm.nombre ?? ''}
                          onChange={(e) => handleEditFieldChange('nombre', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{getParticipantDocumentLabel(editForm.pais ?? 'Honduras')}</Label>
                        <Input
                          value={editForm.dni ?? ''}
                          onChange={(e) => {
                            const country = editForm.pais ?? 'Honduras';
                            const value = isHonduranParticipant(country)
                              ? e.target.value.replace(/\D/g, '').slice(0, 13)
                              : e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
                            handleEditFieldChange('dni', value);
                          }}
                          maxLength={isHonduranParticipant(editForm.pais ?? 'Honduras') ? 13 : 20}
                          inputMode={isHonduranParticipant(editForm.pais ?? 'Honduras') ? 'numeric' : 'text'}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Dorsal</Label>
                        <Input
                          value={editForm.dorsal ?? ''}
                          onChange={(e) => handleEditFieldChange('dorsal', e.target.value.replace(/\D/g, '').slice(0, 3))}
                          maxLength={3}
                          inputMode="numeric"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Fecha de nacimiento</Label>
                        <Input
                          type="date"
                          value={editForm.nacimiento ?? ''}
                          onChange={(e) => handleEditFieldChange('nacimiento', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>País</Label>
                        <CountryCombobox
                          value={editForm.pais ?? ''}
                          onValueChange={(value) => {
                            handleEditFieldChange('pais', value);
                            if (isHonduranParticipant(value)) {
                              handleEditFieldChange('dni', (editForm.dni ?? '').replace(/\D/g, '').slice(0, 13));
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editForm.email ?? ''}
                          onChange={(e) => handleEditFieldChange('email', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Teléfono</Label>
                        <Input
                          value={editForm.telefono ?? ''}
                          onChange={(e) => handleEditFieldChange('telefono', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                        <Label>Club / Equipo</Label>
                        <Input
                          value={editForm.club ?? ''}
                          onChange={(e) => handleEditFieldChange('club', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                        <Label>{activeEvent.allowMultipleDistances ? 'Pruebas inscritas' : 'Distancia'}</Label>
                        {activeEvent.allowMultipleDistances ? (
                          <div className="grid gap-2 rounded-md border bg-background/70 p-3 sm:grid-cols-2">
                            {activeEvent.distances.map((distance) => {
                              const selectedDistances = splitRegistrationDistances(editForm.distancia ?? '');
                              const isChecked = selectedDistances.includes(distance.value);
                              return (
                                <label key={distance.value} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(value) => handleEditDistanceToggle(distance.value, Boolean(value))}
                                  />
                                  <span>{distance.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <Select
                            value={editForm.distancia ?? activeEvent.distances[0]?.value ?? ''}
                            onValueChange={(value) => handleEditFieldChange('distancia', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona distancia" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeEvent.distances.map((distance) => (
                                <SelectItem key={distance.value} value={distance.value}>{distance.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Puedes agregar o retirar pruebas antes de guardar la inscripción.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Sexo</Label>
                        <Select
                          value={editForm.sexo ?? 'M'}
                          onValueChange={(value) => handleEditFieldChange('sexo', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona sexo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="F">Femenino</SelectItem>
                            <SelectItem value="M">Masculino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Categoría asignada</Label>
                        <Input value={editForm.categoria ?? ''} readOnly className="bg-muted" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Talla de camisa</Label>
                        <Input
                          value={editForm.tallaCamisa ?? ''}
                          onChange={(e) => handleEditFieldChange('tallaCamisa', e.target.value)}
                          list="shirt-sizes"
                        />
                        <datalist id="shirt-sizes">
                          {SHIRT_SIZES.map((size) => (
                            <option key={size} value={size} />
                          ))}
                        </datalist>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contacto de emergencia</Label>
                        <Input
                          value={editForm.emergenciaNombre ?? ''}
                          onChange={(e) => handleEditFieldChange('emergenciaNombre', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Teléfono de emergencia</Label>
                        <Input
                          value={editForm.emergenciaTel ?? ''}
                          onChange={(e) => handleEditFieldChange('emergenciaTel', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <Label>Condición médica</Label>
                        <Input
                          value={editForm.medico ?? ''}
                          onChange={(e) => handleEditFieldChange('medico', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Banco / Plataforma</Label>
                        <Input
                          value={editForm.banco ?? ''}
                          onChange={(e) => handleEditFieldChange('banco', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Monto</Label>
                        <Input
                          value={editForm.monto ?? ''}
                          onChange={(e) => handleEditFieldChange('monto', e.target.value)}
                          required
                        />
                        {editForm.nacimiento && (
                          <p className="text-xs text-muted-foreground">
                            Monto esperado: {formatRegistrationFee(calculatePaymentAmount(editForm.nacimiento, editForm.pais ?? 'Honduras'))}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <Label>Número de referencia</Label>
                        <Input
                          value={editForm.referencia ?? ''}
                          onChange={(e) => handleEditFieldChange('referencia', e.target.value)}
                          required
                        />
                      </div>
                      {activeEvent.allowMultipleDistances ? (
                        <div className="space-y-2 md:col-span-2 xl:col-span-3">
                          <Label>Tiempos oficiales por prueba</Label>
                          <div className="grid gap-2">
                            {sortDistanceValues(splitRegistrationDistances(editForm.distancia ?? '')).map((distance) => (
                              <div key={distance} className="rounded-md border bg-background/70 p-3">
                                <div className="mb-2 text-sm font-medium text-muted-foreground">
                                  {getDistanceLabel(distance)}
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Input
                                    value={editResultEdits[distance] ?? ''}
                                    onChange={(e) => setEditResultEdits((prev) => ({ ...prev, [distance]: e.target.value }))}
                                    placeholder="14520 = 1:45.20, 3045 = 30.45"
                                    className="sm:flex-1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditResultEdits((prev) => ({ ...prev, [distance]: '' }))}
                                  >
                                    Limpiar
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Escritura rápida: 14520 = 1:45.20 y 3045 = 30.45. También puedes usar NT, NS, DQ, DNS o DNF.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                          <Label>Tiempo oficial (14520 = 1:45.20, 3045 = 30.45)</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={resultEdit}
                              onChange={(e) => setResultEdit(e.target.value)}
                              placeholder="14520 = 1:45.20"
                              className="sm:flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setResultEdit('')}
                            >
                              Limpiar
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Escritura rápida: los últimos 2 dígitos son centésimas. También puedes usar NT, NS, DQ, DNS o DNF.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                      <p><strong>Dorsal:</strong> #{editParticipant.dorsal}</p>
                      <p><strong>Registrado:</strong> {formatDateTime(editParticipant.createdAt)}</p>
                      {editParticipant.comprobanteUrl && (
                        <p>
                          <strong>Comprobante:</strong>{' '}
                          <a
                            href={editParticipant.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            Ver comprobante
                          </a>
                        </p>
                      )}
                    </div>

                    {editError && <p className="text-sm text-destructive">{editError}</p>}
                  </div>
                )}
              </div>

              <DialogFooter className="shrink-0 border-t border-border bg-background px-4 py-4 md:px-6">
                <Button variant="outline" type="button" onClick={closeEditDialog} disabled={isSavingEdit}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingEdit || mutationDisabled} title={mutationTooltip}>
                  {isSavingEdit ? 'Guardando…' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setCreateError('');
            createForm.reset();
          } else {
            setIsCreateOpen(true);
          }
        }}>
          <DialogContent className="flex w-[95vw] max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <form onSubmit={handleCreateSubmit} className="flex max-h-[90vh] min-h-0 w-full flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 space-y-5">
                <DialogHeader className="space-y-1.5">
                  <DialogTitle>Nueva inscripción manual</DialogTitle>
                  <DialogDescription>
                    {manualCreateDescription}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-nombre">Nombre completo *</Label>
                    <Input id="create-nombre" {...createForm.register('nombre')} />
                    {createForm.formState.errors.nombre && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.nombre.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-dni">{getParticipantDocumentLabel(createForm.watch('pais'))} *</Label>
                    <Input
                      id="create-dni"
                      maxLength={isHonduranParticipant(createForm.watch('pais')) ? 13 : 20}
                      inputMode={isHonduranParticipant(createForm.watch('pais')) ? 'numeric' : 'text'}
                      {...createForm.register('dni')}
                      onChange={(e) => {
                        const country = createForm.getValues('pais');
                        const value = isHonduranParticipant(country)
                          ? e.target.value.replace(/\D/g, '').slice(0, 13)
                          : e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
                        createForm.setValue('dni', value, { shouldValidate: true, shouldDirty: true });
                      }}
                    />
                    {createForm.formState.errors.dni && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.dni.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-nacimiento">Fecha de nacimiento *</Label>
                    <Input
                      type="date"
                      id="create-nacimiento"
                      {...createForm.register('nacimiento')}
                      onChange={(event) => {
                        createForm.setValue('nacimiento', event.target.value, { shouldValidate: true, shouldDirty: true });
                        createForm.setValue('monto', calculatePaymentAmount(event.target.value, createForm.getValues('pais')), { shouldValidate: true, shouldDirty: true });
                      }}
                    />
                    {createForm.formState.errors.nacimiento && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.nacimiento.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-pais">País *</Label>
                    <CountryCombobox
                      id="create-pais"
                      value={createForm.watch('pais')}
                      onValueChange={(value) => {
                        createForm.setValue('pais', value, { shouldValidate: true, shouldDirty: true });
                        createForm.setValue('monto', calculatePaymentAmount(createForm.getValues('nacimiento'), value), { shouldValidate: true, shouldDirty: true });
                        if (isHonduranParticipant(value)) {
                          createForm.setValue('dni', createForm.getValues('dni').replace(/\D/g, '').slice(0, 13), { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                    />
                    {createForm.formState.errors.pais && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.pais.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                    <Label htmlFor="create-email">Email *</Label>
                    <Input type="email" id="create-email" {...createForm.register('email')} />
                    {createForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-telefono">Teléfono *</Label>
                    <Input id="create-telefono" {...createForm.register('telefono')} />
                    {createForm.formState.errors.telefono && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.telefono.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
                    <Label htmlFor="create-club">Club / Equipo</Label>
                    <Input id="create-club" {...createForm.register('club')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{activeEvent.allowMultipleDistances ? 'Pruebas *' : 'Distancia *'}</Label>
                    {activeEvent.allowMultipleDistances ? (
                      <div className="grid gap-2 rounded-md border bg-background/70 p-3">
                        {activeEvent.distances.map((distance) => {
                          const selectedDistances = splitRegistrationDistances(createForm.watch('distancia') ?? '');
                          const isChecked = selectedDistances.includes(distance.value);
                          return (
                            <label key={distance.value} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(value) => handleCreateDistanceToggle(distance.value, Boolean(value))}
                              />
                              <span>{distance.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <Select value={createForm.watch('distancia')} onValueChange={(value) => createForm.setValue('distancia', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona distancia" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeEvent.distances.map((distance) => (
                            <SelectItem key={distance.value} value={distance.value}>{distance.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {createForm.formState.errors.distancia && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.distancia.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sexo *</Label>
                    <Select value={createForm.watch('sexo')} onValueChange={(value) => createForm.setValue('sexo', value as 'F' | 'M')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona sexo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">Femenino</SelectItem>
                        <SelectItem value="M">Masculino</SelectItem>
                      </SelectContent>
                    </Select>
                    {createForm.formState.errors.sexo && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.sexo.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Talla de camisa</Label>
                    <Input list="shirt-sizes" {...createForm.register('tallaCamisa')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Contacto de emergencia</Label>
                    <Input {...createForm.register('emergenciaNombre')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Teléfono de emergencia</Label>
                    <Input {...createForm.register('emergenciaTel')} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                    <Label>Condición médica</Label>
                    <Input {...createForm.register('medico')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Banco / Plataforma *</Label>
                    <Input {...createForm.register('banco')} />
                    {createForm.formState.errors.banco && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.banco.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Monto *</Label>
                    <Input {...createForm.register('monto')} readOnly className="bg-muted" />
                    <p className="text-xs text-muted-foreground">
                      Se calcula automáticamente por la edad al día del evento.
                    </p>
                    {createForm.formState.errors.monto && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.monto.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                    <Label>Número de referencia *</Label>
                    <Input {...createForm.register('referencia')} />
                    {createForm.formState.errors.referencia && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.referencia.message}</p>
                    )}
                  </div>
                </div>

                {createError && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{createError}</span>
                  </div>
                )}
              </div>

              <DialogFooter className="shrink-0 border-t border-border bg-background px-4 py-4 md:px-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateError('');
                    createForm.reset();
                  }}
                  disabled={isSavingCreate}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingCreate || !canCreateInActiveEvent} title={createRegistrationTooltip}>
                  {isSavingCreate ? 'Guardando…' : 'Crear inscripción'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Admin;
