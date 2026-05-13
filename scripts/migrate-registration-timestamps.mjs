import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

function resolveServiceAccount() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const filePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (inlineJson) {
    try {
      return JSON.parse(inlineJson);
    } catch (error) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT debe contener un JSON válido.');
    }
  }

  if (filePath) {
    const absolutePath = path.resolve(filePath);
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    return JSON.parse(fileContent);
  }

  return null;
}

const serviceAccount = resolveServiceAccount();
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount?.project_id;

if (!serviceAccount) {
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
} else {
  initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

const db = getFirestore();
const dryRun = process.argv.includes('--dry-run');
const BATCH_LIMIT = 400;

const timestampFields = ['checkedInAt', 'resultRecordedAt', 'updatedAt'];

function normalizeTimestamp(value, fieldName, docId, counters) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value instanceof Timestamp) {
    return undefined;
  }

  if (typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
    const ts = new Timestamp(value._seconds, value._nanoseconds);
    counters.timestampsConverted += 1;
    return ts;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      counters.timestampsCleared += 1;
      return null;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      counters.timestampsConverted += 1;
      return Timestamp.fromDate(parsed);
    }

    console.warn(`[${docId}] No se pudo convertir ${fieldName}="${value}". Se establecerá en null.`);
    counters.timestampsCleared += 1;
    return null;
  }

  console.warn(`[${docId}] ${fieldName} tiene un tipo inesperado (${typeof value}). Se establecerá en null.`);
  counters.timestampsCleared += 1;
  return null;
}

function normalizeResultSeconds(value, docId, counters) {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      counters.resultSecondsCleared += 1;
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      counters.resultSecondsConverted += 1;
      return parsed;
    }
    console.warn(`[${docId}] resultSeconds="${value}" no es numérico. Se establecerá en null.`);
    counters.resultSecondsCleared += 1;
    return null;
  }

  console.warn(`[${docId}] resultSeconds tiene un tipo inesperado (${typeof value}). Se establecerá en null.`);
  counters.resultSecondsCleared += 1;
  return null;
}

function ensureDniNormalized(data, counters) {
  if (typeof data.dniNormalized === 'string' && data.dniNormalized.trim().length === 13) {
    return undefined;
  }

  if (typeof data.dni === 'string') {
    const normalized = data.dni.replace(/\D/g, '');
    if (normalized.length === 13) {
      counters.dniNormalizedFixed += 1;
      return normalized;
    }
  }

  return undefined;
}

(async () => {
  const snapshot = await db.collection('registrations').get();
  console.log(`Se encontraron ${snapshot.size} inscripciones.`);

  let batch = db.batch();
  let operationsInBatch = 0;
  let documentsChanged = 0;

  const counters = {
    timestampsConverted: 0,
    timestampsCleared: 0,
    resultSecondsConverted: 0,
    resultSecondsCleared: 0,
    dniNormalizedFixed: 0,
  };

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};

    for (const field of timestampFields) {
      if (!Object.prototype.hasOwnProperty.call(data, field)) continue;
      const normalized = normalizeTimestamp(data[field], field, doc.id, counters);
      if (normalized !== undefined) {
        updates[field] = normalized;
      }
    }

    if (Object.prototype.hasOwnProperty.call(data, 'resultSeconds')) {
      const normalizedResultSeconds = normalizeResultSeconds(data.resultSeconds, doc.id, counters);
      if (normalizedResultSeconds !== undefined) {
        updates.resultSeconds = normalizedResultSeconds;
      }
    }

    const normalizedDni = ensureDniNormalized(data, counters);
    if (normalizedDni !== undefined) {
      updates.dniNormalized = normalizedDni;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'updatedBy') && data.updatedBy === undefined) {
      updates.updatedBy = null;
    }

    if (Object.keys(updates).length === 0) {
      continue;
    }

    documentsChanged += 1;

    if (dryRun) {
      console.log(`[DRY-RUN] ${doc.id} →`, updates);
      continue;
    }

    batch.update(doc.ref, updates);
    operationsInBatch += 1;

    if (operationsInBatch >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      operationsInBatch = 0;
    }
  }

  if (!dryRun && operationsInBatch > 0) {
    await batch.commit();
  }

  console.log(`Documentos ajustados: ${documentsChanged}`);
  console.log(`Timestamps convertidos: ${counters.timestampsConverted}`);
  console.log(`Timestamps limpiados: ${counters.timestampsCleared}`);
  console.log(`resultSeconds numéricos: ${counters.resultSecondsConverted}`);
  console.log(`resultSeconds limpiados: ${counters.resultSecondsCleared}`);
  console.log(`dniNormalized fijados: ${counters.dniNormalizedFixed}`);

  if (dryRun) {
    console.log('Ejecuta nuevamente sin --dry-run para aplicar los cambios.');
  } else {
    console.log('Migración completada.');
  }
})();
