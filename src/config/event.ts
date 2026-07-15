export const CURRENT_EVENT_ID = 'segundo-cruce-lago-2026';
export const CURRENT_EVENT_NAME = 'Segundo Cruce del Lago 2026';
export const CURRENT_EVENT_DATE = '2026-08-08';
export const CURRENT_EVENT_DATETIME = '2026-08-08T06:00:00-06:00';
export const REGISTRATION_OPEN_DATETIME = '2026-05-13T00:00:00-06:00';
export const REGISTRATION_CLOSE_DATETIME = '2026-08-07T23:59:59-06:00';

export const LEGACY_EVENT_ID = 'los-naranjos-2025';

export type EventConfig = {
  id: string;
  name: string;
  date: string;
  dateTime: string;
  registrationOpenDateTime: string;
  registrationCloseDateTime: string;
  location: string;
  locationShort: string;
  price: string;
  paymentInfo: string;
  posterImageUrl?: string;
  sponsorImageUrls?: string[];
  capacityLimit: number | null;
  distances: EventDistance[];
  courseType?: 'open_water' | 'pool';
  status: 'active' | 'past';
  acceptsRegistrations: boolean;
  registrationsManuallyClosed?: boolean;
  allowMultipleDistances?: boolean;
  legacyWithoutEventId?: boolean;
  publishedResultEventKeys?: string[];
};

export type EventDistance = {
  value: string;
  label: string;
  minAge: number;
  categories: EventCategory[];
};

export type EventCategory = {
  label: string;
  minAge: number;
  maxAge: number | null;
};

export const OPEN_WATER_DISTANCE_CATEGORIES: Record<string, EventCategory[]> = {
  '800m': [
    { label: 'Infantiles A (9-10)', minAge: 9, maxAge: 10 },
    { label: 'Infantiles B (11-12)', minAge: 11, maxAge: 12 },
    { label: 'Juveniles A (13-14)', minAge: 13, maxAge: 14 },
    { label: 'Juveniles B (15-19)', minAge: 15, maxAge: 19 },
    { label: 'Senior (20-29)', minAge: 20, maxAge: 29 },
    { label: 'Masters A (30-39)', minAge: 30, maxAge: 39 },
    { label: 'Master B (40-49)', minAge: 40, maxAge: 49 },
    { label: 'Master C (50 y mayores)', minAge: 50, maxAge: null },
  ],
  '2km': [
    { label: 'Infantiles B (11-12)', minAge: 11, maxAge: 12 },
    { label: 'Juveniles A (13-14)', minAge: 13, maxAge: 14 },
    { label: 'Juveniles B (15-19)', minAge: 15, maxAge: 19 },
    { label: 'Senior (20-29)', minAge: 20, maxAge: 29 },
    { label: 'Masters A (30-39)', minAge: 30, maxAge: 39 },
    { label: 'Master B (40-49)', minAge: 40, maxAge: 49 },
    { label: 'Master C (50 y mayores)', minAge: 50, maxAge: null },
  ],
  '5km': [
    { label: 'Juveniles A (13-14)', minAge: 13, maxAge: 14 },
    { label: 'Juveniles B (15-19)', minAge: 15, maxAge: 19 },
    { label: 'Senior (20-29)', minAge: 20, maxAge: 29 },
    { label: 'Masters A (30-39)', minAge: 30, maxAge: 39 },
    { label: 'Master B (40-49)', minAge: 40, maxAge: 49 },
    { label: 'Master C (50 y mayores)', minAge: 50, maxAge: null },
  ],
};

export const OFFICIAL_MASTER_CATEGORIES: EventCategory[] = [
  { label: '20-29', minAge: 20, maxAge: 29 },
  { label: '30-39', minAge: 30, maxAge: 39 },
  { label: '40-49', minAge: 40, maxAge: 49 },
  { label: '50 y mayores', minAge: 50, maxAge: null },
];

export const OFFICIAL_MASTER_CATEGORIES_TEXT = '20-29:20-29, 30-39:30-39, 40-49:40-49, 50 y mayores:50 y mayores';

export const shouldUseOfficialMasterCategories = (event: Pick<EventConfig, 'name' | 'courseType' | 'distances'>) => {
  const normalizedName = event.name.toLowerCase();
  const categoryText = event.distances
    .flatMap((distance) => distance.categories.map((category) => category.label))
    .join(' ')
    .toLowerCase();

  return (
    normalizedName.includes('master') ||
    (event.courseType === 'pool' && /\b20-30\b|\b30-40\b|\b40\+\b|\b40\s+y\s+mayores\b/.test(categoryText))
  );
};

export const applyOfficialMasterCategories = <T extends EventConfig>(event: T): T => {
  if (!shouldUseOfficialMasterCategories(event)) return event;

  return {
    ...event,
    distances: event.distances.map((distance) => ({
      ...distance,
      minAge: 20,
      categories: OFFICIAL_MASTER_CATEGORIES,
    })),
  };
};

export const applyOpenWaterDistanceCategories = <T extends EventConfig>(event: T): T => {
  if (event.courseType !== 'open_water') return event;

  return {
    ...event,
    distances: event.distances.map((distance) => {
      const categories = OPEN_WATER_DISTANCE_CATEGORIES[distance.value];
      if (!categories) return distance;

      return {
        ...distance,
        minAge: categories[0]?.minAge ?? distance.minAge,
        categories,
      };
    }),
  };
};

const normalizeDistanceText = (distance: EventDistance) =>
  `${distance.value} ${distance.label}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isFiftyFreeDistance = (distance: EventDistance) => {
  const text = normalizeDistanceText(distance);
  return /\b50\b/.test(text) && /\blibre\b/.test(text) && !/\b750\b/.test(text);
};

const isSevenHundredFiftyFreeDistance = (distance: EventDistance) => {
  const text = normalizeDistanceText(distance);
  return /\b750\b/.test(text) && /\blibre\b/.test(text);
};

export const applyPoolDistanceOrder = <T extends EventConfig>(event: T): T => {
  if (event.courseType !== 'pool' && !event.allowMultipleDistances) return event;

  const firstDistance = event.distances.find(isFiftyFreeDistance);
  const lastDistance = event.distances.find(isSevenHundredFiftyFreeDistance);
  if (!firstDistance || !lastDistance) return event;

  return {
    ...event,
    distances: [
      firstDistance,
      ...event.distances.filter((distance) =>
        distance.value !== firstDistance.value && distance.value !== lastDistance.value
      ),
      lastDistance,
    ],
  };
};

export type EventRegistrationStatusReason = 'open' | 'inactive' | 'manual' | 'before' | 'after';

export const getEventRegistrationStatus = (event: EventConfig, now = new Date()) => {
  if (!event.acceptsRegistrations || event.status === 'past') {
    return { isOpen: false, reason: 'inactive' as EventRegistrationStatusReason };
  }

  if (event.registrationsManuallyClosed) {
    return { isOpen: false, reason: 'manual' as EventRegistrationStatusReason };
  }

  if (now < new Date(event.registrationOpenDateTime)) {
    return { isOpen: false, reason: 'before' as EventRegistrationStatusReason };
  }

  if (now >= new Date(event.registrationCloseDateTime)) {
    return { isOpen: false, reason: 'after' as EventRegistrationStatusReason };
  }

  return { isOpen: true, reason: 'open' as EventRegistrationStatusReason };
};

export const isEventRegistrationOpen = (event: EventConfig, now = new Date()) =>
  getEventRegistrationStatus(event, now).isOpen;

export const DEFAULT_DISTANCES: EventDistance[] = [
  {
    value: '800m',
    label: '800 metros',
    minAge: 9,
    categories: OPEN_WATER_DISTANCE_CATEGORIES['800m'],
  },
  {
    value: '2km',
    label: '2 kilómetros',
    minAge: 11,
    categories: OPEN_WATER_DISTANCE_CATEGORIES['2km'],
  },
  {
    value: '5km',
    label: '5 kilómetros',
    minAge: 13,
    categories: OPEN_WATER_DISTANCE_CATEGORIES['5km'],
  },
];

export const EVENTS: EventConfig[] = [
  {
    id: CURRENT_EVENT_ID,
    name: CURRENT_EVENT_NAME,
    date: CURRENT_EVENT_DATE,
    dateTime: CURRENT_EVENT_DATETIME,
    registrationOpenDateTime: REGISTRATION_OPEN_DATETIME,
    registrationCloseDateTime: REGISTRATION_CLOSE_DATETIME,
    location: 'Lago de Yojoa, Los Naranjos, Honduras',
    locationShort: 'Lago de Yojoa, Los Naranjos',
    price: '600',
    paymentInfo: 'Deposita en BAC Honduras 743657881 a nombre de CARLOS RENE CERRATO OSORIO.',
    capacityLimit: null,
    distances: DEFAULT_DISTANCES,
    courseType: 'open_water',
    status: 'active',
    acceptsRegistrations: true,
  },
  {
    id: LEGACY_EVENT_ID,
    name: 'Primera Edición Los Naranjos 2025',
    date: '2025-10-12',
    dateTime: '2025-10-12T06:00:00-06:00',
    registrationOpenDateTime: '2025-08-01T00:00:00-06:00',
    registrationCloseDateTime: '2025-10-08T23:59:59-06:00',
    location: 'Lago de Yojoa, Los Naranjos, Honduras',
    locationShort: 'Lago de Yojoa, Los Naranjos',
    price: '300',
    paymentInfo: 'Deposita en BAC Honduras 743657881 a nombre de CARLOS RENE CERRATO OSORIO.',
    capacityLimit: null,
    distances: DEFAULT_DISTANCES,
    courseType: 'open_water',
    status: 'past',
    acceptsRegistrations: false,
    legacyWithoutEventId: true,
  },
];

export const getEventById = (eventId: string) =>
  applyPoolDistanceOrder(
    applyOfficialMasterCategories(
      applyOpenWaterDistanceCategories(EVENTS.find((event) => event.id === eventId) ?? EVENTS[0])
    )
  );
