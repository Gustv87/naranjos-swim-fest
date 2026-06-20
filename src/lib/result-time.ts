export const SPECIAL_RESULT_TOKENS = ['NT', 'NS', 'DQ', 'DNS', 'DNF'];

type NormalizedResultTime = {
  storedTime: string | null;
  resultSeconds: number | null;
};

const RESULT_TIME_ERROR = 'Formato de tiempo inválido. Usa 14520 = 1:45.20, 3045 = 30.45, mm:ss o NT/NS/DQ/DNS/DNF.';

const pad2 = (value: number) => String(value).padStart(2, '0');

const formatSecondsForResult = (totalSeconds: number) => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    throw new Error('El tiempo debe ser un número positivo.');
  }

  let totalHundredths = Math.round(totalSeconds * 100);
  const hours = Math.floor(totalHundredths / 360000);
  totalHundredths -= hours * 360000;
  const minutes = Math.floor(totalHundredths / 6000);
  totalHundredths -= minutes * 6000;
  const seconds = Math.floor(totalHundredths / 100);
  const hundredths = totalHundredths % 100;

  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}.${pad2(hundredths)}`;
  }

  if (minutes > 0) {
    return `${minutes}:${pad2(seconds)}.${pad2(hundredths)}`;
  }

  return `${seconds}.${pad2(hundredths)}`;
};

const parseCompactNumericTime = (value: string) => {
  if (!/^\d+$/.test(value)) return null;

  if (value.length <= 2) {
    return Number(value);
  }

  const hundredths = Number(value.slice(-2));
  const timeBody = value.slice(0, -2);

  if (timeBody.length <= 2) {
    return Number(timeBody) + hundredths / 100;
  }

  const minutes = Number(timeBody.slice(0, -2));
  const seconds = Number(timeBody.slice(-2));

  if (seconds >= 60) {
    throw new Error(RESULT_TIME_ERROR);
  }

  return minutes * 60 + seconds + hundredths / 100;
};

const parseDecimalSeconds = (value: string) => {
  const normalized = value.replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
};

const parseColonTime = (value: string) => {
  const parts = value.split(':').map((part) => part.trim());

  if (parts.length === 1) {
    return parseDecimalSeconds(parts[0]);
  }

  const wholeNumberPattern = /^\d+$/;
  const secondsPattern = /^\d+(?:[.,]\d+)?$/;

  if (parts.length === 2) {
    const [minutesPart, secondsPart] = parts;
    if (!wholeNumberPattern.test(minutesPart) || !secondsPattern.test(secondsPart)) {
      throw new Error(RESULT_TIME_ERROR);
    }

    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart.replace(',', '.'));

    if (seconds >= 60) {
      throw new Error(RESULT_TIME_ERROR);
    }

    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hoursPart, minutesPart, secondsPart] = parts;
    if (
      !wholeNumberPattern.test(hoursPart) ||
      !wholeNumberPattern.test(minutesPart) ||
      !secondsPattern.test(secondsPart)
    ) {
      throw new Error(RESULT_TIME_ERROR);
    }

    const hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    const seconds = Number(secondsPart.replace(',', '.'));

    if (minutes >= 60 || seconds >= 60) {
      throw new Error(RESULT_TIME_ERROR);
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  throw new Error(RESULT_TIME_ERROR);
};

export const normalizeResultTimeInput = (resultTime: string | null): NormalizedResultTime => {
  const trimmedValue = resultTime?.trim() ?? '';

  if (!trimmedValue) {
    return { storedTime: null, resultSeconds: null };
  }

  const normalized = trimmedValue.toUpperCase();

  if (SPECIAL_RESULT_TOKENS.includes(normalized)) {
    return { storedTime: normalized, resultSeconds: null };
  }

  const compactSeconds = parseCompactNumericTime(normalized);
  const resultSeconds = compactSeconds ?? parseColonTime(normalized);

  if (resultSeconds === null || !Number.isFinite(resultSeconds) || resultSeconds < 0) {
    throw new Error(RESULT_TIME_ERROR);
  }

  return {
    storedTime: formatSecondsForResult(resultSeconds),
    resultSeconds: Math.round(resultSeconds * 100) / 100,
  };
};
