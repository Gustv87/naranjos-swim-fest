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
  capacityLimit: number | null;
  distances: EventDistance[];
  status: 'active' | 'past';
  acceptsRegistrations: boolean;
  legacyWithoutEventId?: boolean;
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

export const DEFAULT_DISTANCES: EventDistance[] = [
  {
    value: '800m',
    label: '800 metros',
    minAge: 9,
    categories: [
      { label: 'Infantiles A (9-10)', minAge: 9, maxAge: 10 },
      { label: 'Infantiles B (11-12)', minAge: 11, maxAge: 12 },
      { label: 'Juveniles A (13-14)', minAge: 13, maxAge: 14 },
      { label: 'Masters', minAge: 15, maxAge: null },
    ],
  },
  {
    value: '2km',
    label: '2 kilómetros',
    minAge: 15,
    categories: [
      { label: 'Juveniles B (15-17)', minAge: 15, maxAge: 17 },
      { label: '20-30', minAge: 18, maxAge: 30 },
      { label: '30-40', minAge: 31, maxAge: 40 },
      { label: '40+', minAge: 41, maxAge: null },
    ],
  },
  {
    value: '5km',
    label: '5 kilómetros',
    minAge: 15,
    categories: [
      { label: 'Juveniles B (15-17)', minAge: 15, maxAge: 17 },
      { label: '20-30', minAge: 18, maxAge: 30 },
      { label: '30-40', minAge: 31, maxAge: 40 },
      { label: '40+', minAge: 41, maxAge: null },
    ],
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
    status: 'past',
    acceptsRegistrations: false,
    legacyWithoutEventId: true,
  },
];

export const getEventById = (eventId: string) =>
  EVENTS.find((event) => event.id === eventId) ?? EVENTS[0];
