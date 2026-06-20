import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';

initializeApp();

const db = getFirestore();
const mailUser = defineSecret('MAIL_USER');
const mailPass = defineSecret('MAIL_PASS');

const getTransporter = () => {
  const user = mailUser.value();
  const pass = mailPass.value();

  if (!user || !pass) {
    logger.error('MAIL_USER o MAIL_PASS no configurados. Usa "firebase functions:secrets:set" para definirlos.');
    throw new Error('Credenciales SMTP no configuradas');
  }

  return nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  });
};

const fallbackEvents = {
  'segundo-cruce-lago-2026': {
    name: 'Segundo Cruce del Lago 2026',
    date: '2026-08-08',
    dateTime: '2026-08-08T06:00:00-06:00',
    location: 'Lago de Yojoa, Los Naranjos, Honduras',
    price: '600',
  },
  'los-naranjos-2025': {
    name: 'Primera Edición Los Naranjos 2025',
    date: '2025-10-12',
    dateTime: '2025-10-12T06:00:00-06:00',
    location: 'Lago de Yojoa, Los Naranjos, Honduras',
    price: '300',
  },
};

const formatDate = (date) => {
  if (!date) return 'Fecha por confirmar';
  const [year, month, day] = String(date).split('-').map(Number);
  if (!year || !month || !day) return String(date);

  // Noon UTC avoids the date moving to the previous day in America/Tegucigalpa.
  return new Intl.DateTimeFormat('es-HN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Tegucigalpa',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

const formatTime = (dateTime) => {
  if (!dateTime) return 'Hora por confirmar';
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return 'Hora por confirmar';

  return new Intl.DateTimeFormat('es-HN', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Tegucigalpa',
  }).format(date);
};

const getCompetitionInfo = async (registration) => {
  const eventId = registration?.eventId || 'los-naranjos-2025';
  const fallback = fallbackEvents[eventId] ?? fallbackEvents['segundo-cruce-lago-2026'];

  try {
    const snapshot = await db.doc(`events/${eventId}`).get();
    const eventData = snapshot.exists ? snapshot.data() : null;
    const eventInfo = { ...fallback, ...eventData };

    return {
      id: eventId,
      name: eventInfo.name,
      fecha: formatDate(eventInfo.date),
      hora: formatTime(eventInfo.dateTime),
      lugar: eventInfo.location,
      precio: eventInfo.price,
    };
  } catch (error) {
    logger.warn('No se pudo leer la competencia desde Firestore. Se usa configuración local.', { eventId, error });
    return {
      id: eventId,
      name: fallback.name,
      fecha: formatDate(fallback.date),
      hora: formatTime(fallback.dateTime),
      lugar: fallback.location,
      precio: fallback.price,
    };
  }
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const buildRegistrationSummary = (data) => {
  const resumen = [
    `Dorsal: ${data.dorsal ?? 'Pendiente'}`,
    `País: ${data.pais ?? data.nacionalidad ?? 'No indicado'}`,
    `Distancia: ${data.distancia ?? 'No indicada'}`,
    `Categoría: ${data.categoria ?? 'No indicada'}`,
    `Banco: ${data.banco ?? 'No indicado'}`,
    `Monto: L ${data.monto ?? 'No indicado'}`,
    `Referencia: ${data.referencia ?? 'No indicada'}`,
  ];
  return resumen.join('\n');
};

const summaryToHtml = (summary) =>
  summary
    .split('\n')
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  const fromAddress = mailUser.value();

  await transporter.sendMail({
    from: `Swim+ <${fromAddress}>`,
    to,
    replyTo: fromAddress,
    subject,
    text,
    html,
  });
};

const handleRegistrationCreated = async (event) => {
    const data = event.data?.data();
    const email = data?.email;

    if (!email) {
      logger.warn('Registro sin correo. Se omite envío de bienvenida.', { id: event.params.registrationId });
      return;
    }

    const info = await getCompetitionInfo(data);
    const summary = buildRegistrationSummary(data ?? {});

    const text = `Hola ${data?.nombre ?? 'participante'},\n\n` +
      `Gracias por inscribirte a ${info.name}. ` +
      'Tu registro quedó pendiente de validación y recibirás una notificación cuando sea confirmado.\n\n' +
      `Fecha: ${info.fecha}\nHora: ${info.hora}\nLugar: ${info.lugar}\n\n` +
      'Resumen de tu inscripción:\n' + summary + '\n\n' +
      'Cualquier duda puedes responder a este correo.\n\nEquipo Swim+';

    const html = `
      <p>Hola <strong>${escapeHtml(data?.nombre ?? 'participante')}</strong>,</p>
      <p>
        Gracias por inscribirte a <strong>${escapeHtml(info.name)}</strong>.<br />
        Tu registro quedó <strong>pendiente de validación</strong>; te avisaremos cuando sea confirmado.
      </p>
      <p>
        <strong>Fecha:</strong> ${escapeHtml(info.fecha)}<br />
        <strong>Hora:</strong> ${escapeHtml(info.hora)}<br />
        <strong>Lugar:</strong> ${escapeHtml(info.lugar)}
      </p>
      <p><strong>Resumen de tu inscripción:</strong></p>
      <ul>${summaryToHtml(summary)}</ul>
      <p>Cualquier consulta puedes responder a este correo.</p>
      <p>Equipo Swim+</p>
    `;

    try {
      await sendMail({ to: email, subject: `Inscripción recibida - ${info.name}`, text, html });
      await event.data.ref.update({
        registrationEmailSentAt: FieldValue.serverTimestamp(),
        registrationEmailTo: email,
      });
      logger.info('Correo de registro recibido enviado', { id: event.params.registrationId, email });
    } catch (error) {
      logger.error('Fallo al enviar correo de registro recibido', { error, id: event.params.registrationId, email });
      throw error;
    }
  }
;

export const sendRegistrationReceivedEmail = onDocumentCreated(
  {
    document: 'registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  handleRegistrationCreated
);

export const sendEventRegistrationReceivedEmail = onDocumentCreated(
  {
    document: 'events/{eventId}/registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  handleRegistrationCreated
);

const handleRegistrationUpdatedForValidation = async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!afterData) return;

    const beforeStatus = beforeData?.status;
    const afterStatus = afterData.status;

    if (beforeStatus === 'validated' || afterStatus !== 'validated') {
      return; // Sólo notificamos cuando el estado cambia a "validated"
    }

    const email = afterData.email;
    if (!email) {
      logger.warn('Registro validado sin correo. Se omite envío.', { id: event.params.registrationId });
      return;
    }

    const info = await getCompetitionInfo(afterData);
    const summary = buildRegistrationSummary(afterData);

    const text = `Hola ${afterData.nombre ?? 'participante'},\n\n` +
      `Tu inscripción a ${info.name} ha sido validada exitosamente.\n\n` +
      `Fecha: ${info.fecha}\nHora: ${info.hora}\nLugar: ${info.lugar}\n\n` +
      'Resumen final de tu inscripción:\n' + summary + '\n\n' +
      'Recuerda presentarte con tiempo y tu documento de identidad.\n\n¡Nos vemos en el Lago de Yojoa!';

    const html = `
      <p>Hola <strong>${escapeHtml(afterData.nombre ?? 'participante')}</strong>,</p>
      <p>Tu inscripción a <strong>${escapeHtml(info.name)}</strong> ha sido <strong>validada</strong>.</p>
      <p>
        <strong>Fecha:</strong> ${escapeHtml(info.fecha)}<br />
        <strong>Hora:</strong> ${escapeHtml(info.hora)}<br />
        <strong>Lugar:</strong> ${escapeHtml(info.lugar)}
      </p>
      <p><strong>Resumen final:</strong></p>
      <ul>${summaryToHtml(summary)}</ul>
      <p>Recuerda presentarte con tiempo y llevar tu documento de identidad.</p>
      <p>¡Nos vemos en el Lago de Yojoa!</p>
    `;

    try {
      await sendMail({ to: email, subject: `Inscripción validada - ${info.name}`, text, html });
      await event.data.after.ref.update({
        validationEmailSentAt: FieldValue.serverTimestamp(),
        validationEmailTo: email,
      });
      logger.info('Correo de validación enviado', { id: event.params.registrationId, email });
    } catch (error) {
      logger.error('Fallo al enviar correo de validación', { error, id: event.params.registrationId, email });
      throw error;
    }
  }
;

export const sendRegistrationValidatedEmail = onDocumentUpdated(
  {
    document: 'registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  handleRegistrationUpdatedForValidation
);

export const sendEventRegistrationValidatedEmail = onDocumentUpdated(
  {
    document: 'events/{eventId}/registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  handleRegistrationUpdatedForValidation
);

const handleRegistrationUpdatedForCheckIn = async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!afterData) {
      return;
    }

    const beforeCheckedAt = beforeData?.checkedInAt?.toMillis?.() ?? null;
    const afterCheckedAtField = afterData.checkedInAt;
    const afterCheckedAt = afterCheckedAtField?.toMillis?.() ?? null;

    if (!afterCheckedAt || beforeCheckedAt === afterCheckedAt) {
      return;
    }

    const participantEmail = afterData.email;
    if (!participantEmail) {
      logger.warn('Documento sin email, se omite envío de check-in', { id: event.params.registrationId });
      return;
    }

    const info = await getCompetitionInfo(afterData);

    const text = `Hola ${afterData.nombre},\n\n` +
      `Tu check-in para ${info.name} ha sido registrado.\n\n` +
      `Dorsal: ${afterData.dorsal}\nDistancia: ${afterData.distancia}\nCategoría: ${afterData.categoria}\n\n` +
      `Recuerda que el evento inicia el ${info.fecha} a las ${info.hora} en ${info.lugar}.\n\n¡Te esperamos!`;

    const html = `
      <p>Hola <strong>${escapeHtml(afterData.nombre)}</strong>,</p>
      <p>Tu check-in para <strong>${escapeHtml(info.name)}</strong> ha sido registrado.</p>
      <ul>
        <li><strong>Dorsal:</strong> ${escapeHtml(afterData.dorsal)}</li>
        <li><strong>Distancia:</strong> ${escapeHtml(afterData.distancia)}</li>
        <li><strong>Categoría:</strong> ${escapeHtml(afterData.categoria)}</li>
      </ul>
      <p>
        Recuerda que el evento inicia el <strong>${escapeHtml(info.fecha)}</strong> a las <strong>${escapeHtml(info.hora)}</strong><br />
        en <strong>${escapeHtml(info.lugar)}</strong>.
      </p>
      <p>¡Te esperamos!</p>
    `;

    try {
      await sendMail({ to: participantEmail, subject: `Check-in confirmado - ${info.name}`, text, html });
      await event.data.after.ref.update({
        checkInEmailSentAt: FieldValue.serverTimestamp(),
        checkInEmailTo: participantEmail,
      });
      logger.info('Check-in email enviado', { id: event.params.registrationId, email: participantEmail });
    } catch (error) {
      logger.error('Error enviando email de check-in', { error, id: event.params.registrationId });
      throw error;
    }
  }
;

export const sendCheckInEmail = onDocumentUpdated(
  {
    document: 'registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  handleRegistrationUpdatedForCheckIn
);

export const sendEventCheckInEmail = onDocumentUpdated(
  {
    document: 'events/{eventId}/registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  handleRegistrationUpdatedForCheckIn
);
