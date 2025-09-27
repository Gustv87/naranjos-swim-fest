import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, type StorageReference } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

export type RegistrationStatus = 'pending' | 'validated' | 'rejected';

export type RegistrationInput = {
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
  createdAt: string;
  dorsal: string;
  status: RegistrationStatus;
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
  comprobanteNombre: string | null;
  comprobanteUrl: string | null;
  comprobantePath: string | null;
  checkedInAt: string | null;
  checkedInBy: string | null;
};

interface RegistrationContextValue {
  registrations: Registration[];
  stats: {
    total: number;
    pending: number;
    validated: number;
    rejected: number;
    remaining: number;
    max: number;
    capacityFull: boolean;
    checkedIn: number;
  };
  isLoading: boolean;
  error: string | null;
  addRegistration: (data: RegistrationInput) => Promise<Registration>;
  updateRegistrationStatus: (id: string, status: RegistrationStatus, overrides?: Partial<Record<'checkedInAt' | 'checkedInBy', unknown>>) => Promise<void>;
  toggleCheckIn: (id: string, shouldCheckIn: boolean, actor: string) => Promise<void>;
}

const MAX_PARTICIPANTS = 100;
const COLLECTION_NAME = 'registrations';

const RegistrationContext = createContext<RegistrationContextValue | undefined>(undefined);

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
  };
};

const getNextDorsal = (registrations: Registration[]) => {
  if (!registrations.length) return '001';

  const lastNumber = registrations
    .map((item) => parseInt(item.dorsal, 10))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 0;

  const next = Math.min(lastNumber + 1, MAX_PARTICIPANTS);
  return String(next).padStart(3, '0');
};

export const RegistrationProvider = ({ children }: PropsWithChildren) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const registrationsRef = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      registrationsRef,
      (snapshot) => {
        const docs = snapshot.docs.map((document) => toRegistration(document.id, document.data()));
        if (import.meta.env.DEV) {
          console.info(`[Firestore] Registrations recibidos: ${docs.length}`);
        }
        docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
  }, []);

  const addRegistration = useCallback(async (data: RegistrationInput) => {
    if (registrations.length >= MAX_PARTICIPANTS) {
      throw new Error('No hay cupos disponibles');
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
        comprobantePath = `comprobantes/${dorsal}-${timestamp}-${comprobanteNombre}`;
        storageRef = ref(storage, comprobantePath);
        await uploadBytes(storageRef, data.comprobanteFile);
        comprobanteUrl = await getDownloadURL(storageRef);
      }

      const registro = {
        nombre: data.nombre,
        dni: data.dni,
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
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), registro);

      return {
        id: docRef.id,
        ...registro,
        createdAt: new Date().toISOString(),
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
  }, [registrations]);

  const updateRegistrationStatus = useCallback(async (id: string, status: RegistrationStatus, overrides: Partial<Record<'checkedInAt' | 'checkedInBy', unknown>> = {}) => {
    const documentRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(documentRef, { status, ...overrides });
  }, []);

  const toggleCheckIn = useCallback(async (id: string, shouldCheckIn: boolean, actor: string) => {
    const documentRef = doc(db, COLLECTION_NAME, id);

    if (shouldCheckIn) {
      await updateDoc(documentRef, {
        checkedInAt: serverTimestamp(),
        checkedInBy: actor,
      });
    } else {
      await updateDoc(documentRef, {
        checkedInAt: null,
        checkedInBy: null,
      });
    }
  }, []);

  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter((item) => item.status === 'pending').length;
    const validated = registrations.filter((item) => item.status === 'validated').length;
    const rejected = registrations.filter((item) => item.status === 'rejected').length;
    const checkedIn = registrations.filter((item) => item.checkedInAt !== null).length;
    const remaining = Math.max(MAX_PARTICIPANTS - total, 0);

    return {
      total,
      pending,
      validated,
      rejected,
      remaining,
      max: MAX_PARTICIPANTS,
      capacityFull: total >= MAX_PARTICIPANTS,
      checkedIn,
    };
  }, [registrations]);

  const value = useMemo(
    () => ({
      registrations,
      stats,
      isLoading,
      error,
      addRegistration,
      updateRegistrationStatus,
      toggleCheckIn,
    }),
    [registrations, stats, isLoading, error, addRegistration, updateRegistrationStatus, toggleCheckIn]
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
