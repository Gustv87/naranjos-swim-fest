import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, type StorageReference } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { CURRENT_EVENT_ID, EVENTS, getEventById, type EventConfig } from '@/config/event';

export type RegistrationStatus = 'pending' | 'validated' | 'rejected';

export type RegistrationInput = {
  eventId?: string;
  nombre: string;
  dni: string;
  nacimiento: string;
  email: string;
  telefono: string;
  club: string;
  distancia: string;
  sexo: string;
  categoria: string;
  emergenciaNombre: string;
  emergenciaTel: string;
  medico: string;
  banco: string;
  monto: string;
  referencia: string;
  tallaCamisa: string;
  comprobanteFile?: File | null;
};

export type Registration = {
  id: string;
  eventId: string;
  createdAt: string;
  dorsal: string;
  status: RegistrationStatus;
  nombre: string;
  dni: string;
  dniNormalized: string | null;
  nacimiento: string;
  email: string;
  telefono: string;
  club: string;
  distancia: string;
  sexo: string;
  categoria: string;
  emergenciaNombre: string;
  emergenciaTel: string;
  medico: string;
  banco: string;
  monto: string;
  referencia: string;
  tallaCamisa: string;
  comprobanteNombre: string | null;
  comprobanteUrl: string | null;
  comprobantePath: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
  resultTime: string | null;
  resultSeconds: number | null;
  resultRecordedAt: string | null;
  resultRecordedBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type RegistrationEditableFields = Partial<{
  nombre: string;
  dni: string;
  nacimiento: string;
  email: string;
  telefono: string;
  club: string;
  distancia: string;
  sexo: string;
  categoria: string;
  emergenciaNombre: string;
  emergenciaTel: string;
  medico: string;
  banco: string;
  monto: string;
  referencia: string;
  tallaCamisa: string;
  dorsal: string;
}>; 

interface RegistrationContextValue {
  events: EventConfig[];
  activeEvent: EventConfig;
  activeEventId: string;
  setActiveEventId: (eventId: string) => void;
  createEvent: (event: EventConfig) => Promise<void>;
  updateEvent: (eventId: string, event: Partial<EventConfig>) => Promise<void>;
  registrations: Registration[];
  stats: {
    total: number;
    pending: number;
    validated: number;
    rejected: number;
    remaining: number | null;
    max: number | null;
    capacityFull: boolean;
    checkedIn: number;
  };
  isLoading: boolean;
  error: string | null;
  addRegistration: (data: RegistrationInput) => Promise<Registration>;
  updateRegistrationStatus: (id: string, status: RegistrationStatus, actor: string, overrides?: Partial<Record<'checkedInAt' | 'checkedInBy', unknown>>) => Promise<void>;
  toggleCheckIn: (id: string, shouldCheckIn: boolean, actor: string) => Promise<void>;
  updateRegistrationResult: (id: string, resultTime: string | null, actor: string) => Promise<void>;
  updateRegistrationData: (id: string, updates: RegistrationEditableFields) => Promise<void>;
}

const COLLECTION_NAME = 'registrations';
const EVENTS_COLLECTION_NAME = 'events';

const RegistrationContext = createContext<RegistrationContextValue | undefined>(undefined);

const getRegistrationsCollectionRef = (event: EventConfig) =>
  event.legacyWithoutEventId
    ? collection(db, COLLECTION_NAME)
    : collection(db, EVENTS_COLLECTION_NAME, event.id, COLLECTION_NAME);

const getRegistrationDocumentRef = (event: EventConfig, id: string) =>
  event.legacyWithoutEventId
    ? doc(db, COLLECTION_NAME, id)
    : doc(db, EVENTS_COLLECTION_NAME, event.id, COLLECTION_NAME, id);

const toRegistration = (id: string, data: Record<string, unknown>): Registration => {
  const createdAtValue = data.createdAt;
  let createdAt = new Date().toISOString();

  if (typeof createdAtValue === 'string') {
    createdAt = createdAtValue;
  } else if (createdAtValue && typeof createdAtValue === 'object' && 'toDate' in createdAtValue) {
    try {
      createdAt = (createdAtValue as { toDate: () => Date }).toDate().toISOString();
    } catch (error) {
      console.warn('Failed to parse createdAt timestamp', error);
    }
  }

  return {
    id,
    eventId: String(data.eventId ?? ''),
    createdAt,
    dorsal: String(data.dorsal ?? ''),
    status: (data.status as RegistrationStatus) ?? 'pending',
    nombre: String(data.nombre ?? ''),
    dni: String(data.dni ?? ''),
    nacimiento: String(data.nacimiento ?? ''),
    email: String(data.email ?? ''),
    telefono: String(data.telefono ?? ''),
    club: String(data.club ?? ''),
    distancia: String(data.distancia ?? ''),
    sexo: String(data.sexo ?? ''),
    categoria: String(data.categoria ?? ''),
    emergenciaNombre: String(data.emergenciaNombre ?? ''),
    emergenciaTel: String(data.emergenciaTel ?? ''),
    medico: String(data.medico ?? ''),
    banco: String(data.banco ?? ''),
    monto: String(data.monto ?? ''),
    referencia: String(data.referencia ?? ''),
    tallaCamisa: String(data.tallaCamisa ?? ''),
    comprobanteNombre: data.comprobanteNombre ? String(data.comprobanteNombre) : null,
    comprobanteUrl: data.comprobanteUrl ? String(data.comprobanteUrl) : null,
    comprobantePath: data.comprobantePath ? String(data.comprobantePath) : null,
    dniNormalized: data.dniNormalized ? String(data.dniNormalized) : null,
    checkedInAt: (() => {
      const value = data.checkedInAt;
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && 'toDate' in value) {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString();
        } catch (error) {
          console.warn('Failed to parse checkedInAt timestamp', error);
          return null;
        }
      }
      return null;
    })(),
    checkedInBy: data.checkedInBy ? String(data.checkedInBy) : null,
    resultTime: data.resultTime ? String(data.resultTime) : null,
    resultSeconds: typeof data.resultSeconds === 'number' ? Number(data.resultSeconds) : null,
    resultRecordedAt: (() => {
      const value = data.resultRecordedAt;
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && 'toDate' in value) {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString();
        } catch (error) {
          console.warn('Failed to parse resultRecordedAt timestamp', error);
          return null;
        }
      }
      return null;
    })(),
    resultRecordedBy: data.resultRecordedBy ? String(data.resultRecordedBy) : null,
    updatedAt: (() => {
      const value = data.updatedAt;
      if (!value) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && 'toDate' in value) {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString();
        } catch (error) {
          console.warn('Failed to parse updatedAt timestamp', error);
          return null;
        }
      }
      return null;
    })(),
    updatedBy: data.updatedBy ? String(data.updatedBy) : null,
  };
};

const getNextDorsal = (registrations: Registration[]) => {
  if (!registrations.length) return '001';

  const lastNumber = registrations
    .map((item) => parseInt(item.dorsal, 10))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 0;

  const next = lastNumber + 1;
  return String(next).padStart(3, '0');
};

const normalizeEvent = (id: string, data: Partial<EventConfig>): EventConfig => {
  const fallback = getEventById(id);
  return {
    ...fallback,
    ...data,
    id,
    distances: Array.isArray(data.distances) && data.distances.length > 0 ? data.distances : fallback.distances,
    capacityLimit: typeof data.capacityLimit === 'number' ? data.capacityLimit : null,
    acceptsRegistrations: Boolean(data.acceptsRegistrations),
    legacyWithoutEventId: Boolean(data.legacyWithoutEventId),
  };
};

export const RegistrationProvider = ({ children }: PropsWithChildren) => {
  const [activeEventId, setActiveEventId] = useState(CURRENT_EVENT_ID);
  const [events, setEvents] = useState<EventConfig[]>(EVENTS);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) ?? events[0] ?? getEventById(CURRENT_EVENT_ID),
    [activeEventId, events]
  );

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, EVENTS_COLLECTION_NAME),
      (snapshot) => {
        const remoteEvents = snapshot.docs.map((document) => normalizeEvent(document.id, document.data() as Partial<EventConfig>));
        const merged = [
          ...remoteEvents,
          ...EVENTS.filter((defaultEvent) => !remoteEvents.some((remoteEvent) => remoteEvent.id === defaultEvent.id)),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setEvents(merged);

        const liveEvent = merged.find((event) => event.status === 'active' && event.acceptsRegistrations);
        const selectedEvent = merged.find((event) => event.id === activeEventId);
        if (!selectedEvent || (activeEventId === CURRENT_EVENT_ID && liveEvent && liveEvent.id !== CURRENT_EVENT_ID)) {
          const nextEvent = liveEvent ?? merged[0];
          if (nextEvent) setActiveEventId(nextEvent.id);
        }
      },
      (err) => {
        console.warn('No se pudieron cargar los eventos desde Firestore. Usando eventos locales.', err);
      }
    );

    return () => unsubscribe();
  }, [activeEventId]);

  useEffect(() => {
    setIsLoading(true);
    const registrationsCollection = getRegistrationsCollectionRef(activeEvent);
    const registrationsRef = activeEvent.legacyWithoutEventId
      ? query(registrationsCollection)
      : query(registrationsCollection);

    const unsubscribe = onSnapshot(
      registrationsRef,
      (snapshot) => {
        const docs = snapshot.docs
          .map((document) => toRegistration(document.id, document.data()))
          .filter((registration) => {
            if (activeEvent.legacyWithoutEventId) {
              return !registration.eventId || registration.eventId === activeEvent.id;
            }

            return registration.eventId === activeEvent.id;
          });
        if (import.meta.env.DEV) {
          console.info(`[Firestore] ${activeEvent.id}: ${docs.length} registros recibidos`);
        }
        docs.sort((a, b) => {
          const dorsalA = parseInt(a.dorsal ?? '0', 10);
          const dorsalB = parseInt(b.dorsal ?? '0', 10);
          if (Number.isFinite(dorsalA) && Number.isFinite(dorsalB) && dorsalA !== dorsalB) {
            return dorsalA - dorsalB;
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setRegistrations(docs);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error al obtener inscripciones', err);
        setError('No se pudieron cargar las inscripciones.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeEvent]);

  const addRegistration = useCallback(async (data: RegistrationInput) => {
    if (!activeEvent.acceptsRegistrations) {
      throw new Error('Este evento es histórico y no acepta nuevas inscripciones.');
    }

    if (typeof activeEvent.capacityLimit === 'number' && registrations.length >= activeEvent.capacityLimit) {
      throw new Error('No hay cupos disponibles');
    }

    const normalizedDni = data.dni.replace(/\D/g, '');

    if (normalizedDni.length !== 13) {
      throw new Error('El DNI debe contener exactamente 13 dígitos sin guiones.');
    }

    const duplicateInState = registrations.some(
      (item) => item.dniNormalized ? item.dniNormalized === normalizedDni : item.dni.replace(/\D/g, '') === normalizedDni
    );
    if (duplicateInState) {
      throw new Error('Este DNI ya tiene una inscripción registrada.');
    }

    const existingSnapshot = await getDocs(
      query(
        getRegistrationsCollectionRef(activeEvent),
        where('dniNormalized', '==', normalizedDni),
        limit(1)
      )
    );

    if (!existingSnapshot.empty) {
      throw new Error('Este DNI ya tiene una inscripción registrada.');
    }

    const dorsal = getNextDorsal(registrations);
    const timestamp = Date.now();

    let comprobantePath: string | null = null;
    let comprobanteUrl: string | null = null;
    let comprobanteNombre: string | null = null;
    let storageRef: StorageReference | undefined;

    try {
      if (data.comprobanteFile) {
        comprobanteNombre = data.comprobanteFile.name;
        comprobantePath = `comprobantes/${activeEvent.id}/${dorsal}-${timestamp}-${comprobanteNombre}`;
        storageRef = ref(storage, comprobantePath);
        await uploadBytes(storageRef, data.comprobanteFile);
        comprobanteUrl = await getDownloadURL(storageRef);
      }

      const registro = {
        eventId: data.eventId || activeEvent.id,
        nombre: data.nombre,
        dni: normalizedDni,
        dniNormalized: normalizedDni,
        nacimiento: data.nacimiento,
        email: data.email,
        telefono: data.telefono,
        club: data.club,
        distancia: data.distancia,
        sexo: data.sexo,
        categoria: data.categoria,
        emergenciaNombre: data.emergenciaNombre,
        emergenciaTel: data.emergenciaTel,
        medico: data.medico,
        banco: data.banco,
        monto: data.monto,
        referencia: data.referencia,
        tallaCamisa: data.tallaCamisa,
        comprobanteNombre,
        comprobanteUrl,
        comprobantePath,
        checkedInAt: null,
        checkedInBy: null,
        dorsal,
        status: 'pending' as RegistrationStatus,
        createdAt: serverTimestamp(),
        resultTime: null,
        resultSeconds: null,
        resultRecordedAt: null,
        resultRecordedBy: null,
        updatedAt: serverTimestamp(),
        updatedBy: null,
      };

      const docRef = await addDoc(getRegistrationsCollectionRef(activeEvent), registro);

      return {
        id: docRef.id,
        ...registro,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Registration;
    } catch (error) {
      if (storageRef) {
        try {
          await deleteObject(storageRef);
        } catch (cleanupError) {
          console.warn('No se pudo limpiar el comprobante subido', cleanupError);
        }
      }
      throw error;
    }
  }, [activeEvent, registrations]);

  const updateRegistrationStatus = useCallback(async (id: string, status: RegistrationStatus, actor: string, overrides: Partial<Record<'checkedInAt' | 'checkedInBy', unknown>> = {}) => {
    const documentRef = getRegistrationDocumentRef(activeEvent, id);
    await updateDoc(documentRef, { status, ...overrides, updatedAt: serverTimestamp(), updatedBy: actor });
  }, [activeEvent]);

  const toggleCheckIn = useCallback(async (id: string, shouldCheckIn: boolean, actor: string) => {
    const documentRef = getRegistrationDocumentRef(activeEvent, id);

    if (shouldCheckIn) {
      await updateDoc(documentRef, {
        checkedInAt: serverTimestamp(),
        checkedInBy: actor,
        updatedAt: serverTimestamp(),
        updatedBy: actor,
      });
    } else {
      await updateDoc(documentRef, {
        checkedInAt: null,
        checkedInBy: null,
        updatedAt: serverTimestamp(),
        updatedBy: actor,
      });
    }
  }, [activeEvent]);

  const updateRegistrationResult = useCallback(async (id: string, resultTime: string | null, actor: string) => {
    const documentRef = getRegistrationDocumentRef(activeEvent, id);

    let resultSeconds: number | null = null;
    let storedTime: string | null = null;

    if (resultTime) {
      const normalized = resultTime.trim().toUpperCase();
      const specialTokens = ['NT', 'NS', 'DNS', 'DNF'];

      if (specialTokens.includes(normalized)) {
        storedTime = normalized;
        resultSeconds = null;
      } else {
        const parts = normalized.split(':').map((part) => part.trim());
        if (parts.some((value) => value === '' || Number.isNaN(Number(value)))) {
          throw new Error('Formato de tiempo inválido. Usa mm:ss, hh:mm:ss o los valores NT/NS.');
        }

        const numericParts = parts.map((value) => Number(value));
        if (numericParts.length === 2) {
          const [minutes, seconds] = numericParts;
          resultSeconds = minutes * 60 + seconds;
        } else if (numericParts.length === 3) {
          const [hours, minutes, seconds] = numericParts;
          resultSeconds = hours * 3600 + minutes * 60 + seconds;
        } else {
          throw new Error('Formato de tiempo inválido. Usa mm:ss, hh:mm:ss o los valores NT/NS.');
        }

        if (!Number.isFinite(resultSeconds) || resultSeconds < 0) {
          throw new Error('El tiempo debe ser un número positivo.');
        }

        storedTime = parts.join(':');
      }
    } else {
      storedTime = null;
    }

    await updateDoc(documentRef, {
      resultTime: storedTime,
      resultSeconds,
      resultRecordedAt: resultTime ? serverTimestamp() : null,
      resultRecordedBy: resultTime ? actor : null,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
    });
  }, [activeEvent]);

  const updateRegistrationData = useCallback(async (id: string, updates: RegistrationEditableFields, actor?: string) => {
    const documentRef = getRegistrationDocumentRef(activeEvent, id);
    const existing = registrations.find((participant) => participant.id === id);

    if (!existing) {
      throw new Error('No se encontró el registro que intentas editar.');
    }

    const sanitized: Record<string, unknown> = {};

    const sanitizeString = (value: unknown) =>
      typeof value === 'string' ? value.trim() : undefined;

    if ('nombre' in updates) {
      const value = sanitizeString(updates.nombre);
      if (!value) throw new Error('El nombre es obligatorio.');
      sanitized.nombre = value;
    }

    if ('email' in updates) {
      const value = sanitizeString(updates.email);
      if (!value) throw new Error('El correo electrónico es obligatorio.');
      sanitized.email = value;
    }

    if ('telefono' in updates) {
      const value = sanitizeString(updates.telefono);
      if (!value) throw new Error('El teléfono es obligatorio.');
      sanitized.telefono = value;
    }

    if ('club' in updates) {
      const value = sanitizeString(updates.club);
      sanitized.club = value ?? '';
    }

    if ('emergenciaNombre' in updates) {
      sanitized.emergenciaNombre = sanitizeString(updates.emergenciaNombre) ?? '';
    }

    if ('emergenciaTel' in updates) {
      sanitized.emergenciaTel = sanitizeString(updates.emergenciaTel) ?? '';
    }

    if ('medico' in updates) {
      sanitized.medico = sanitizeString(updates.medico) ?? '';
    }

    if ('banco' in updates) {
      const value = sanitizeString(updates.banco);
      if (!value) throw new Error('El banco o plataforma es obligatorio.');
      sanitized.banco = value;
    }

    if ('monto' in updates) {
      const value = sanitizeString(updates.monto);
      if (!value) throw new Error('El monto es obligatorio.');
      sanitized.monto = value;
    }

    if ('referencia' in updates) {
      const value = sanitizeString(updates.referencia);
      if (!value) throw new Error('La referencia o comprobante es obligatoria.');
      sanitized.referencia = value;
    }

    if ('tallaCamisa' in updates) {
      sanitized.tallaCamisa = sanitizeString(updates.tallaCamisa) ?? '';
    }

    if ('dorsal' in updates) {
      const value = sanitizeString(updates.dorsal);
      if (!value) throw new Error('El dorsal es obligatorio.');
      const numericValue = value.replace(/\D/g, '');
      if (!numericValue) throw new Error('El dorsal debe ser numérico.');
      const padded = numericValue.padStart(3, '0');

      const duplicateInState = registrations.some(
        (participant) => participant.id !== id && participant.dorsal === padded
      );
      if (duplicateInState) {
        throw new Error('Este dorsal ya está asignado a otro participante.');
      }

      sanitized.dorsal = padded;
    }

    if ('sexo' in updates) {
      const value = sanitizeString(updates.sexo);
      if (!value || !['M', 'F'].includes(value)) {
        throw new Error('Selecciona un sexo válido.');
      }
      sanitized.sexo = value;
    }

    if ('distancia' in updates) {
      const value = sanitizeString(updates.distancia);
      if (!value || !['800m', '2km', '5km'].includes(value)) {
        throw new Error('Selecciona una distancia válida.');
      }
      sanitized.distancia = value;
    }

    if ('categoria' in updates) {
      sanitized.categoria = sanitizeString(updates.categoria) ?? '';
    }

    if ('nacimiento' in updates) {
      const value = sanitizeString(updates.nacimiento);
      if (!value) throw new Error('La fecha de nacimiento es obligatoria.');
      sanitized.nacimiento = value;
    }

    if ('dni' in updates) {
      const raw = sanitizeString(updates.dni);
      if (!raw) throw new Error('El DNI es obligatorio.');
      const normalizedDni = raw.replace(/\D/g, '');
      if (normalizedDni.length !== 13) {
        throw new Error('El DNI debe contener exactamente 13 dígitos sin guiones.');
      }

      if (normalizedDni !== existing.dniNormalized) {
        const duplicateSnapshot = await getDocs(
          query(
            getRegistrationsCollectionRef(activeEvent),
            where('dniNormalized', '==', normalizedDni),
            limit(1)
          )
        );

        const hasDuplicate = duplicateSnapshot.docs.some((docSnapshot) => docSnapshot.id !== id);
        if (hasDuplicate) {
          throw new Error('Este DNI ya tiene una inscripción registrada.');
        }
      }

      sanitized.dni = normalizedDni;
      sanitized.dniNormalized = normalizedDni;
    }

    if (Object.keys(sanitized).length === 0) {
      return;
    }

    await updateDoc(documentRef, {
      ...sanitized,
      updatedAt: serverTimestamp(),
      updatedBy: actor || null,
    });
  }, [activeEvent, registrations]);

  const createEvent = useCallback(async (event: EventConfig) => {
    await setDoc(doc(db, EVENTS_COLLECTION_NAME, event.id), {
      ...event,
      updatedAt: serverTimestamp(),
    });
    setActiveEventId(event.id);
  }, []);

  const updateEvent = useCallback(async (eventId: string, event: Partial<EventConfig>) => {
    await setDoc(
      doc(db, EVENTS_COLLECTION_NAME, eventId),
      {
        ...event,
        id: eventId,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, []);

  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter((item) => item.status === 'pending').length;
    const validated = registrations.filter((item) => item.status === 'validated').length;
    const rejected = registrations.filter((item) => item.status === 'rejected').length;
    const checkedIn = registrations.filter((item) => item.checkedInAt !== null).length;
    const eventCapacity = activeEvent.capacityLimit;
    const remaining = typeof eventCapacity === 'number' ? Math.max(eventCapacity - total, 0) : null;
    const capacityFull = typeof eventCapacity === 'number' ? total >= eventCapacity : false;

    return {
      total,
      pending,
      validated,
      rejected,
      remaining,
      max: eventCapacity,
      capacityFull,
      checkedIn,
    };
  }, [activeEvent.capacityLimit, registrations]);

  const value = useMemo(
    () => ({
      events,
      activeEvent,
      activeEventId,
      setActiveEventId,
      createEvent,
      updateEvent,
      registrations,
      stats,
      isLoading,
      error,
      addRegistration,
      updateRegistrationStatus,
      toggleCheckIn,
      updateRegistrationResult,
      updateRegistrationData,
    }),
    [events, activeEvent, activeEventId, createEvent, updateEvent, registrations, stats, isLoading, error, addRegistration, updateRegistrationStatus, toggleCheckIn, updateRegistrationResult, updateRegistrationData]
  );

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistrations = () => {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrations debe usarse dentro de RegistrationProvider');
  }
  return context;
};
