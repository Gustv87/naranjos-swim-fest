export type AgeCategory = {
  label: string;
  minAge: number;
  maxAge: number | null;
};

export const ADULT_REGISTRATION_MIN_AGE = 18;
export const MINOR_REGISTRATION_FEE = '600';
export const ADULT_REGISTRATION_FEE = '800';
export const FOREIGN_REGISTRATION_FEE = '$30';
export const HONDURAS_COUNTRY = 'Honduras';
export const AGE_BASED_REGISTRATION_FEE_TEXT =
  `Hondureños menores de ${ADULT_REGISTRATION_MIN_AGE} años: L. ${MINOR_REGISTRATION_FEE}. ` +
  `Hondureños ${ADULT_REGISTRATION_MIN_AGE} y más: L. ${ADULT_REGISTRATION_FEE}. ` +
  `Extranjeros: ${FOREIGN_REGISTRATION_FEE}.`;

type EventForCategory = {
  date: string;
  distances: Array<{
    value: string;
    categories: AgeCategory[];
  }>;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const parseDateParts = (value: string): DateParts | null => {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const validationDate = new Date(Date.UTC(year, month - 1, day));

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

export const calculateAgeOnEvent = (birthDate: string, eventDate: string): number | null => {
  const birth = parseDateParts(birthDate);
  const event = parseDateParts(eventDate);
  if (!birth || !event) return null;

  if (
    birth.year > event.year ||
    (birth.year === event.year && birth.month > event.month) ||
    (birth.year === event.year && birth.month === event.month && birth.day > event.day)
  ) {
    return null;
  }

  let age = event.year - birth.year;
  if (event.month < birth.month || (event.month === birth.month && event.day < birth.day)) {
    age -= 1;
  }

  return age;
};

export const isHonduranParticipant = (country: string) =>
  country.trim().toLowerCase() === HONDURAS_COUNTRY.toLowerCase();

export const normalizeParticipantDocument = (documentId: string, country: string) => {
  if (isHonduranParticipant(country)) {
    return documentId.replace(/\D/g, '');
  }

  return documentId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
};

export const getParticipantDocumentLabel = (country: string) =>
  isHonduranParticipant(country) ? 'Identidad/DNI' : 'Pasaporte o DNI extranjero';

export const validateParticipantDocument = (documentId: string, country: string): string | null => {
  const normalized = normalizeParticipantDocument(documentId, country);

  if (isHonduranParticipant(country)) {
    return normalized.length === 13 ? null : 'El DNI hondureño debe contener exactamente 13 dígitos sin guiones.';
  }

  if (normalized.length < 5) {
    return 'Ingresa un pasaporte o DNI extranjero válido, con al menos 5 caracteres.';
  }

  return null;
};

export const formatRegistrationFee = (fee: string) =>
  fee.trim().startsWith('$') ? fee.trim() : `L. ${fee.trim()}`;

export const calculateRegistrationFee = (
  birthDate: string,
  eventDate: string,
  fallbackFee = MINOR_REGISTRATION_FEE,
  country = HONDURAS_COUNTRY
) => {
  if (!isHonduranParticipant(country)) return FOREIGN_REGISTRATION_FEE;

  const age = calculateAgeOnEvent(birthDate, eventDate);
  if (age === null) return fallbackFee;

  return age >= ADULT_REGISTRATION_MIN_AGE ? ADULT_REGISTRATION_FEE : MINOR_REGISTRATION_FEE;
};

export const splitRegistrationDistances = (value: string) =>
  value.split(',').map((item) => item.trim()).filter(Boolean);

export const calculateRegistrationCategory = (
  birthDate: string,
  distanceValue: string,
  event: EventForCategory
): string => {
  const age = calculateAgeOnEvent(birthDate, event.date);
  if (age === null) return '';

  const selectedDistances = splitRegistrationDistances(distanceValue);
  const distance = selectedDistances
    .map((selected) => event.distances.find((item) => item.value === selected))
    .find(Boolean) ?? (selectedDistances.length === 0 ? event.distances[0] : undefined);

  if (!distance) return '';

  return distance.categories.find((category) =>
    age >= category.minAge && (category.maxAge === null || age <= category.maxAge)
  )?.label ?? '';
};

const parseRange = (value: string) => {
  const normalized = value.trim().replace(/\.$/, '').trim();
  const rangeMatch = normalized.match(/^(\d+)\s*-\s*(\d+)(?:\s*años?)?$/i);
  if (rangeMatch) {
    const minAge = Number(rangeMatch[1]);
    const maxAge = Number(rangeMatch[2]);
    if (minAge > maxAge) {
      throw new Error(`El rango "${value}" tiene la edad mínima mayor que la máxima.`);
    }
    return { minAge, maxAge, display: `${minAge}-${maxAge}` };
  }

  const plusMatch = normalized.match(/^(\d+)\s*(?:\+|y\s+mayores)(?:\s*años?)?$/i);
  if (plusMatch) {
    const minAge = Number(plusMatch[1]);
    return { minAge, maxAge: null, display: `${minAge} y Mayores` };
  }

  return null;
};

const labelIncludesRange = (label: string) =>
  /\d+\s*-\s*\d+|\d+\s*(?:\+|y\s+mayores)/i.test(label);

export const parseAgeCategories = (value: string): AgeCategory[] => {
  const items = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (!items.length) {
    throw new Error('Agrega al menos una categoría por edad.');
  }

  let currentGroupLabel = '';

  return items.map((item) => {
    const separatorIndex = item.indexOf(':');

    if (separatorIndex >= 0) {
      const groupLabel = item.slice(0, separatorIndex).trim();
      const rangeText = item.slice(separatorIndex + 1).trim();
      const range = parseRange(rangeText);

      if (!groupLabel || !range) {
        throw new Error(`No se pudo interpretar la categoría "${item}".`);
      }

      currentGroupLabel = groupLabel;
      return {
        label: labelIncludesRange(groupLabel) ? groupLabel : `${groupLabel} ${range.display}`,
        minAge: range.minAge,
        maxAge: range.maxAge,
      };
    }

    const rangeOnly = parseRange(item);
    if (rangeOnly) {
      if (!currentGroupLabel) {
        throw new Error(`Agrega un nombre antes del rango "${item}", por ejemplo Master:${item}.`);
      }

      return {
        label: `${currentGroupLabel} ${rangeOnly.display}`,
        minAge: rangeOnly.minAge,
        maxAge: rangeOnly.maxAge,
      };
    }

    const labeledRangeMatch = item
      .replace(/\.$/, '')
      .match(/^(.*?)\s+(\d+\s*-\s*\d+(?:\s*años?)?|\d+\s*(?:\+|y\s+mayores)(?:\s*años?)?)$/i);
    if (!labeledRangeMatch) {
      throw new Error(`No se pudo interpretar la categoría "${item}". Usa Nombre:20-29 o Nombre 20-29.`);
    }

    const groupLabel = labeledRangeMatch[1].trim();
    const range = parseRange(labeledRangeMatch[2]);
    if (!groupLabel || !range) {
      throw new Error(`No se pudo interpretar la categoría "${item}".`);
    }

    currentGroupLabel = groupLabel;
    return {
      label: `${groupLabel} ${range.display}`,
      minAge: range.minAge,
      maxAge: range.maxAge,
    };
  });
};
