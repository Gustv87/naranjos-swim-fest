import { Navigation } from '@/components/layout/navigation';
import { FooterGM } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRegistrations, type Registration, type RegistrationStatus, type RegistrationEditableFields } from '@/context/registration-context';
import { Lock, Shield, Users, Download, QrCode, Search, Clock, XCircle, CheckCircle2, Pencil, Plus, AlertCircle, FileText } from 'lucide-react';
import logoImage from '@/assets/Logo.webp';
import { auth } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, type RegistrationCreateInput } from '@/schema/registration';

const Admin = () => {
const SPECIAL_RESULT_TOKENS = ['NT', 'NS', 'DNS', 'DNF'];
const DISTANCE_LABELS: Record<string, string> = {
  '800m': '800 metros',
  '2km': '2 kilómetros',
  '5km': '5 kilómetros',
};
const SHIRT_SIZES = ['12', '14', '16', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
const EVENT_DATE = new Date('2025-10-12');
const { toast } = useToast();
const { registrations, stats, updateRegistrationStatus, toggleCheckIn, updateRegistrationResult, updateRegistrationData, addRegistration, isLoading: registrationsLoading, error } = useRegistrations();

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
  const [resultEdits, setResultEdits] = useState<Record<string, string>>({});
  const [resultSaving, setResultSaving] = useState<Record<string, boolean>>({});
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editParticipant, setEditParticipant] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState<RegistrationEditableFields>({});
  const [resultEdit, setResultEdit] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSavingCreate, setIsSavingCreate] = useState(false);
  const [createError, setCreateError] = useState('');

  const hasCapacityLimit = typeof stats.max === 'number' && Number.isFinite(stats.max) && stats.max > 0;
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
      email: '',
      telefono: '',
      club: '',
      distancia: '800m',
      sexo: 'M',
      emergenciaNombre: '',
      emergenciaTel: '',
      medico: '',
      banco: 'BAC Honduras',
      monto: '300',
      referencia: '',
      tallaCamisa: '',
    },
  });

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
  const showReadOnlyWarning = () => {
    toast({
      variant: 'destructive',
      title: 'Modo de solo lectura',
      description: 'Inicia sesión con una cuenta autorizada de Firebase para editar y gestionar inscripciones.',
    });
  };
  const readOnlyTooltip = isReadOnlyMode ? 'Modo de solo lectura. Inicia sesión con una cuenta autorizada para editar.' : undefined;

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
      .sort((a, b) => {
        const dorsalA = parseInt(a.dorsal ?? '0', 10);
        const dorsalB = parseInt(b.dorsal ?? '0', 10);
        if (Number.isFinite(dorsalA) && Number.isFinite(dorsalB) && dorsalA !== dorsalB) {
          return dorsalA - dorsalB;
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [registrations, searchTerm, statusFilter, distanceFilter, categoryFilter]);

  const formatDateTime = (iso: string) => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? iso
      : date.toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getResultInputValue = (participant: Registration) => {
    if (participant.id in resultEdits) {
      return resultEdits[participant.id];
    }
    return participant.resultTime ?? '';
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatOfficialResult = (time: string | null) => {
    if (!time) return 'Pendiente';
    const normalized = time.toUpperCase();
    if (SPECIAL_RESULT_TOKENS.includes(normalized)) {
      return normalized;
    }
    return time;
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

    const preferredDistances = ['800m', '2km', '5km'];
    const distancesToExport = (() => {
      if (distanceFilter) {
        return filteredParticipants.some((participant) => participant.distancia === distanceFilter)
          ? [distanceFilter]
          : [];
      }

      const present = Array.from(new Set(filteredParticipants.map((participant) => participant.distancia)));
      const ordered = preferredDistances.filter((distance) => present.includes(distance));
      const extras = present.filter((distance) => !preferredDistances.includes(distance));
      return [...ordered, ...extras];
    })();

    const sections = distancesToExport.map((distance) => {
      const participants = filteredParticipants
        .filter((participant) => participant.distancia === distance)
        .sort((a, b) => {
          const aHasTime = a.resultSeconds !== null;
          const bHasTime = b.resultSeconds !== null;

          if (aHasTime && bHasTime) {
            return (a.resultSeconds ?? 0) - (b.resultSeconds ?? 0);
          }

          if (aHasTime) return -1;
          if (bHasTime) return 1;

          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      if (!participants.length) return '';

      let rank = 0;
      const rows = participants.map((participant) => {
        let position = '—';
        if (participant.resultSeconds !== null) {
          rank += 1;
          position = String(rank);
        }

        return `
          <tr>
            <td>${position}</td>
            <td>${escapeHtml(participant.dorsal)}</td>
            <td>${escapeHtml(participant.nombre)}</td>
            <td>${escapeHtml(participant.categoria || 'N/A')}</td>
            <td>${escapeHtml(formatOfficialResult(participant.resultTime))}</td>
          </tr>`;
      }).join('');

      const label = DISTANCE_LABELS[distance] ?? distance;

      return `
        <section class="distance">
          <h2>${escapeHtml(label)}</h2>
          <p class="distance-meta">${participants.length} participante${participants.length === 1 ? '' : 's'}</p>
          <table>
            <thead>
              <tr>
                <th>Posición</th>
                <th>Dorsal</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Tiempo oficial</th>
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
      distanceFilter ? `Distancia: ${escapeHtml(DISTANCE_LABELS[distanceFilter] ?? distanceFilter)}` : null,
      categoryFilter ? `Categoría: ${escapeHtml(categoryFilter)}` : null,
    ].filter(Boolean).join(' • ');

    const summaryBlock = filtersSummary
      ? `<p class="filters">Filtros aplicados: ${filtersSummary}</p>`
      : '<p class="filters">Sin filtros adicionales. Mostrando todos los participantes disponibles.</p>';

    const heading = `Resultados filtrados (${filteredParticipants.length})`;
    const logoMarkup = `<div class="logo"><img src="${logoImage}" alt="Swim Plus" /></div>`;

    exportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(heading)}</title>
          <style>
            :root { color-scheme: only light; }
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              margin: 32px;
              color: #111827;
            }
            h1 {
              margin: 0 0 4px;
              font-size: 24px;
            }
            .meta {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 16px;
            }
            .filters {
              font-size: 12px;
              background: #f3f4f6;
              padding: 8px 12px;
              border-radius: 6px;
              margin-bottom: 16px;
            }
            .logo {
              text-align: center;
              margin-bottom: 16px;
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
              margin-bottom: 24px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
              font-weight: 600;
            }
            tbody tr:nth-child(even) {
              background: #f9fafb;
            }
            .distance {
              margin-bottom: 32px;
            }
            .distance h2 {
              margin: 0 0 4px;
              font-size: 18px;
              color: #2563eb;
            }
            .distance-meta {
              margin: 0 0 12px;
              font-size: 12px;
              color: #6b7280;
            }
            @media print {
              body { margin: 24px; }
              .meta, .filters { color: #4b5563; background: none; }
              .distance h2 { color: #1f2937; }
            }
          </style>
        </head>
        <body>
          ${logoMarkup}
          <h1>${escapeHtml(heading)}</h1>
          <p class="meta">Generado: ${escapeHtml(formattedNow)}</p>
          ${summaryBlock}
          ${sections}
        </body>
      </html>
    `);
    exportWindow.document.close();
    exportWindow.focus();
    setTimeout(() => {
      exportWindow.print();
      exportWindow.close();
    }, 250);

    toast({
      title: 'Vista lista para imprimir',
      description: 'Selecciona "Guardar como PDF" en el diálogo de impresión.',
    });
  };

  const handleResultInputChange = (id: string, value: string) => {
    setResultEdits((prev) => ({ ...prev, [id]: value }));
  };

  const handleResultSave = async (participant: Registration) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
      return;
    }

    const rawValue = resultEdits[participant.id] ?? participant.resultTime ?? '';
    const trimmedValue = rawValue.trim();
    const sanitizedValue = trimmedValue
      ? (SPECIAL_RESULT_TOKENS.includes(trimmedValue.toUpperCase())
          ? trimmedValue.toUpperCase()
          : trimmedValue)
      : '';

    setResultSaving((prev) => ({ ...prev, [participant.id]: true }));

    try {
      await updateRegistrationResult(participant.id, sanitizedValue || null, adminEmail || 'admin');
      setResultEdits((prev) => ({ ...prev, [participant.id]: sanitizedValue }));
      toast({
        title: 'Resultado actualizado',
        description: sanitizedValue ? `Tiempo guardado: ${sanitizedValue}` : 'Resultado eliminado',
      });
    } catch (err) {
      const description = err instanceof Error ? err.message : 'No se pudo guardar el resultado.';
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description,
      });
    } finally {
      setResultSaving((prev) => ({ ...prev, [participant.id]: false }));
    }
  };

  const handleStatusChange = async (id: string, status: RegistrationStatus) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
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
    if (isReadOnlyMode) {
      showReadOnlyWarning();
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

    setEditParticipant(participant);
    const initial: RegistrationEditableFields = {
      nombre: participant.nombre,
      dni: participant.dni,
      dorsal: participant.dorsal,
      nacimiento: participant.nacimiento,
      email: participant.email,
      telefono: participant.telefono,
      club: participant.club,
      distancia: participant.distancia || '800m',
      sexo: participant.sexo || 'M',
      categoria: participant.categoria,
      emergenciaNombre: participant.emergenciaNombre,
      emergenciaTel: participant.emergenciaTel,
      medico: participant.medico,
      banco: participant.banco,
      monto: participant.monto,
      referencia: participant.referencia,
      tallaCamisa: participant.tallaCamisa,
    };

    if (!initial.distancia) {
      initial.distancia = '800m';
    }

    initial.categoria = calculateCategory(initial.nacimiento ?? '', initial.distancia ?? '');

    setEditForm(initial);
    setResultEdit(participant.resultTime ?? '');
    setEditError('');
    setIsEditOpen(true);
  };

  const closeEditDialog = () => {
    setIsEditOpen(false);
    setEditParticipant(null);
    setEditForm({});
    setResultEdit('');
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
      return next;
    });
  };

  const handleEditSave = async () => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
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

      await updateRegistrationData(editParticipant.id, editForm);

      const trimmed = resultEdit.trim();
      const currentResult = editParticipant.resultTime ?? '';

      const hasResultChanged = trimmed !== currentResult.trim();

      if (hasResultChanged) {
        let sanitized: string | null = null;
        if (trimmed) {
          const upper = trimmed.toUpperCase();
          if (SPECIAL_RESULT_TOKENS.includes(upper)) {
            sanitized = upper;
          } else {
            const parts = trimmed.split(':').map((p) => p.trim());
            if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) {
              throw new Error('Formato de tiempo inválido. Usa mm:ss, hh:mm:ss o los códigos NT/NS.');
            }
            if (parts.length !== 2 && parts.length !== 3) {
              throw new Error('Formato de tiempo inválido. Usa mm:ss o hh:mm:ss.');
            }
            sanitized = trimmed;
          }
        }

        await updateRegistrationResult(editParticipant.id, sanitized, adminEmail || 'admin');
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

  const handleCreateSubmit = createForm.handleSubmit(async (values) => {
    if (isReadOnlyMode) {
      showReadOnlyWarning();
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
        monto: values.monto.trim(),
        referencia: values.referencia.trim(),
        tallaCamisa: values.tallaCamisa?.trim() ?? '',
        comprobanteFile: null,
      });

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
      'URL comprobante',
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

        {isReadOnlyMode && (
          <Alert className="mb-8 border-warm-accent/40 bg-warm-accent/10">
            <AlertTitle>Modo de solo lectura</AlertTitle>
            <AlertDescription>
              Puedes revisar información, pero las operaciones de edición están deshabilitadas. Inicia sesión con una cuenta autorizada para administrar inscripciones.
            </AlertDescription>
          </Alert>
        )}

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
              <CardTitle className="text-2xl text-primary">{remainingLabel}</CardTitle>
              <CardDescription>{remainingDescription}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button className="button-gradient shadow-button" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button className="button-gradient shadow-button" variant="outline" onClick={handleExportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
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
              setIsCreateOpen(true);
            }}
            disabled={isReadOnlyMode}
            title={readOnlyTooltip}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva inscripción
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
            <p className="text-xs text-muted-foreground mt-4">
              Registra tiempos en formato <strong>mm:ss</strong> o <strong>hh:mm:ss</strong>. También puedes usar los códigos
              <strong> NT</strong> (No Time) y <strong>NS</strong> (No Show) cuando corresponda.
            </p>
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
                    <th className="text-left py-4 px-3">Tiempo</th>
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
                      <td className="py-6 text-center text-muted-foreground" colSpan={14}>
                        Cargando inscripciones...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td className="py-6 text-center text-destructive" colSpan={14}>
                        {error}
                      </td>
                    </tr>
                  ) : filteredParticipants.length === 0 ? (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={14}>
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
                        <td className="py-4 px-3 min-w-[220px]">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Input
                                value={getResultInputValue(participant)}
                                onChange={(e) => handleResultInputChange(participant.id, e.target.value)}
                                placeholder="mm:ss o NT/NS"
                                className="h-9"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="flex items-center gap-1"
                                disabled={isReadOnlyMode || resultSaving[participant.id]}
                                title={readOnlyTooltip}
                                onClick={() => handleResultSave(participant)}
                              >
                                <Clock className="h-4 w-4" />
                                Guardar
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {participant.resultTime ? (
                                <span className="flex items-center gap-1 text-primary">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {participant.resultTime}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Pendiente
                                </span>
                              )}
                              {participant.resultRecordedAt && (
                                <span>
                                  · {new Date(participant.resultRecordedAt).toLocaleString('es-HN')}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
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
                              className="gap-1"
                              onClick={() => openEditDialog(participant)}
                              disabled={isReadOnlyMode}
                              title={readOnlyTooltip}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={participant.checkedInAt ? 'bg-lake-green/10 text-lake-green' : ''}
                              onClick={() => handleCheckIn(participant)}
                              disabled={isReadOnlyMode || participant.status === 'rejected'}
                              title={readOnlyTooltip}
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
                                  disabled={isReadOnlyMode}
                                  title={readOnlyTooltip}
                                >
                                  ✓
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive"
                                  onClick={() => handleStatusChange(participant.id, 'rejected')}
                                  disabled={isReadOnlyMode}
                                  title={readOnlyTooltip}
                                >
                                  ✗
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(participant.id, 'pending')}
                                disabled={isReadOnlyMode}
                                title={readOnlyTooltip}
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

        <Dialog open={isEditOpen} onOpenChange={(open) => (open ? setIsEditOpen(true) : closeEditDialog())}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] p-0">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleEditSave();
              }}
              className="flex h-full flex-col"
            >
              <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 space-y-5">
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
                        <Label>DNI (13 dígitos)</Label>
                        <Input
                          value={editForm.dni ?? ''}
                          onChange={(e) => handleEditFieldChange('dni', e.target.value.replace(/\D/g, '').slice(0, 13))}
                          maxLength={13}
                          inputMode="numeric"
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
                      <div className="space-y-1.5">
                        <Label>Distancia</Label>
                        <Select
                          value={editForm.distancia ?? '800m'}
                          onValueChange={(value) => handleEditFieldChange('distancia', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona distancia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="800m">800 metros</SelectItem>
                            <SelectItem value="2km">2 kilómetros</SelectItem>
                            <SelectItem value="5km">5 kilómetros</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Label>Monto (L)</Label>
                        <Input
                          value={editForm.monto ?? ''}
                          onChange={(e) => handleEditFieldChange('monto', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <Label>Número de referencia</Label>
                        <Input
                          value={editForm.referencia ?? ''}
                          onChange={(e) => handleEditFieldChange('referencia', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
                        <Label>Tiempo oficial (mm:ss, hh:mm:ss, NT/NS/DNS/DNF)</Label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            value={resultEdit}
                            onChange={(e) => setResultEdit(e.target.value)}
                            placeholder="mm:ss"
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
                          Usa NT (No Time), NS (No Show), DNS o DNF para casos especiales.
                        </p>
                      </div>
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

              <DialogFooter className="border-t border-border px-4 py-4 md:px-6">
                <Button variant="outline" type="button" onClick={closeEditDialog} disabled={isSavingEdit}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSavingEdit || isReadOnlyMode} title={readOnlyTooltip}>
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
          <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] p-0">
            <form onSubmit={handleCreateSubmit} className="flex h-full flex-col">
              <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6 md:py-6 space-y-5">
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
                    <Label htmlFor="create-dni">DNI (13 dígitos) *</Label>
                    <Input
                      id="create-dni"
                      maxLength={13}
                      inputMode="numeric"
                      {...createForm.register('dni')}
                      onChange={(e) => createForm.setValue('dni', e.target.value.replace(/\D/g, '').slice(0, 13))}
                    />
                    {createForm.formState.errors.dni && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.dni.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-nacimiento">Fecha de nacimiento *</Label>
                    <Input type="date" id="create-nacimiento" {...createForm.register('nacimiento')} />
                    {createForm.formState.errors.nacimiento && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.nacimiento.message}</p>
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
                    <Label>Distancia *</Label>
                    <Select value={createForm.watch('distancia')} onValueChange={(value) => createForm.setValue('distancia', value as '800m' | '2km' | '5km')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona distancia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="800m">800 metros</SelectItem>
                        <SelectItem value="2km">2 kilómetros</SelectItem>
                        <SelectItem value="5km">5 kilómetros</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Label>Monto (L) *</Label>
                    <Input {...createForm.register('monto')} />
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

              <DialogFooter className="border-t border-border px-4 py-4 md:px-6">
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
                <Button type="submit" disabled={isSavingCreate || isReadOnlyMode} title={readOnlyTooltip}>
                  {isSavingCreate ? 'Guardando…' : 'Crear inscripción'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <FooterGM />
      </div>
    </div>
  );
};

export default Admin;
