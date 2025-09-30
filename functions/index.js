import { initializeApp } from 'firebase-admin/app';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';

initializeApp();

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
    service: 'gmail',
    auth: { user, pass },
  });
};

const getCompetitionInfo = () => ({
  fecha: '12 de octubre de 2025',
  hora: '7:00 AM',
  lugar: 'Lago de Yojoa, Los Naranjos, Honduras',
});

const buildRegistrationSummary = (data) => {
  const resumen = [
    `Dorsal: ${data.dorsal ?? 'Pendiente'}`,
    `Distancia: ${data.distancia ?? 'No indicada'}`,
    `Categoría: ${data.categoria ?? 'No indicada'}`,
    `Talla de camisa: ${data.tallaCamisa ?? 'No indicada'}`,
    `Banco: ${data.banco ?? 'No indicado'}`,
    `Monto: ${data.monto ?? 'No indicado'}`,
    `Referencia: ${data.referencia ?? 'No indicada'}`,
  ];
  return resumen.join('\n');
};

const sendMail = async ({ to, subject, text, html }) => {
  const transporter = getTransporter();
  const fromAddress = mailUser.value();

  await transporter.sendMail({
    from: `Los Naranjos Swim Fest <${fromAddress}>`,
    to,
    subject,
    text,
    html,
  });
};

export const sendRegistrationReceivedEmail = onDocumentCreated(
  {
    document: 'registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  async (event) => {
    const data = event.data?.data();
    const email = data?.email;

    if (!email) {
      logger.warn('Registro sin correo. Se omite envío de bienvenida.', { id: event.params.registrationId });
      return;
    }

    const info = getCompetitionInfo();
    const summary = buildRegistrationSummary(data ?? {});

    const text = `Hola ${data?.nombre ?? 'participante'},\n\n` +
      'Gracias por inscribirte al Encuentro de Aguas Abiertas Los Naranjos 2025. ' +
      'Tu registro quedó pendiente de validación y recibirás una notificación cuando sea confirmado.\n\n' +
      `Fecha: ${info.fecha}\nHora: ${info.hora}\nLugar: ${info.lugar}\n\n` +
      'Resumen de tu inscripción:\n' + summary + '\n\n' +
      'Cualquier duda puedes responder a este correo.\n\nEquipo Los Naranjos Swim Fest';

    const html = `
      <p>Hola <strong>${data?.nombre ?? 'participante'}</strong>,</p>
      <p>
        Gracias por inscribirte al <strong>Encuentro de Aguas Abiertas Los Naranjos 2025</strong>.<br />
        Tu registro quedó <strong>pendiente de validación</strong>; te avisaremos cuando sea confirmado.
      </p>
      <p>
        <strong>Fecha:</strong> ${info.fecha}<br />
        <strong>Hora:</strong> ${info.hora}<br />
        <strong>Lugar:</strong> ${info.lugar}
      </p>
      <p><strong>Resumen de tu inscripción:</strong><br />${summary.replace(/\n/g, '<br />')}</p>
      <p>Cualquier consulta puedes responder a este correo.</p>
      <p>Equipo Los Naranjos Swim Fest</p>
    `;

    try {
      await sendMail({ to: email, subject: 'Inscripción recibida - Encuentro Los Naranjos', text, html });
      logger.info('Correo de registro recibido enviado', { id: event.params.registrationId, email });
    } catch (error) {
      logger.error('Fallo al enviar correo de registro recibido', { error, id: event.params.registrationId, email });
      throw error;
    }
  }
);

export const sendRegistrationValidatedEmail = onDocumentUpdated(
  {
    document: 'registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  async (event) => {
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

    const info = getCompetitionInfo();
    const summary = buildRegistrationSummary(afterData);

    const text = `Hola ${afterData.nombre ?? 'participante'},\n\n` +
      'Tu inscripción al Encuentro de Aguas Abiertas Los Naranjos 2025 ha sido validada exitosamente.\n\n' +
      `Fecha: ${info.fecha}\nHora: ${info.hora}\nLugar: ${info.lugar}\n\n` +
      'Resumen final de tu inscripción:\n' + summary + '\n\n' +
      'Recuerda presentarte con tiempo y tu documento de identidad.\n\n¡Nos vemos en el Lago de Yojoa!';

    const html = `
      <p>Hola <strong>${afterData.nombre ?? 'participante'}</strong>,</p>
      <p>Tu inscripción al <strong>Encuentro de Aguas Abiertas Los Naranjos 2025</strong> ha sido <strong>validada</strong>.</p>
      <p>
        <strong>Fecha:</strong> ${info.fecha}<br />
        <strong>Hora:</strong> ${info.hora}<br />
        <strong>Lugar:</strong> ${info.lugar}
      </p>
      <p><strong>Resumen final:</strong><br />${summary.replace(/\n/g, '<br />')}</p>
      <p>Recuerda presentarte con tiempo y llevar tu documento de identidad.</p>
      <p>¡Nos vemos en el Lago de Yojoa!</p>
    `;

    try {
      await sendMail({ to: email, subject: 'Inscripción validada - Encuentro Los Naranjos', text, html });
      logger.info('Correo de validación enviado', { id: event.params.registrationId, email });
    } catch (error) {
      logger.error('Fallo al enviar correo de validación', { error, id: event.params.registrationId, email });
      throw error;
    }
  }
);

export const sendCheckInEmail = onDocumentUpdated(
  {
    document: 'registrations/{registrationId}',
    secrets: [mailUser, mailPass],
    region: 'us-central1',
  },
  async (event) => {
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

    const info = getCompetitionInfo();

    const text = `Hola ${afterData.nombre},\n\n` +
      'Tu check-in para el Encuentro de Aguas Abiertas Los Naranjos ha sido registrado.\n\n' +
      `Dorsal: ${afterData.dorsal}\nDistancia: ${afterData.distancia}\nCategoría: ${afterData.categoria}\n\n` +
      `Recuerda que el evento inicia el ${info.fecha} a las ${info.hora} en ${info.lugar}.\n\n¡Te esperamos!`;

    const html = `
      <p>Hola <strong>${afterData.nombre}</strong>,</p>
      <p>Tu check-in para el <strong>Encuentro de Aguas Abiertas Los Naranjos</strong> ha sido registrado.</p>
      <ul>
        <li><strong>Dorsal:</strong> ${afterData.dorsal}</li>
        <li><strong>Distancia:</strong> ${afterData.distancia}</li>
        <li><strong>Categoría:</strong> ${afterData.categoria}</li>
      </ul>
      <p>
        Recuerda que el evento inicia el <strong>${info.fecha}</strong> a las <strong>${info.hora}</strong><br />
        en <strong>${info.lugar}</strong>.
      </p>
      <p>¡Te esperamos!</p>
    `;

    try {
      await sendMail({ to: participantEmail, subject: 'Check-in confirmado - Encuentro Los Naranjos', text, html });
      logger.info('Check-in email enviado', { id: event.params.registrationId, email: participantEmail });
    } catch (error) {
      logger.error('Error enviando email de check-in', { error, id: event.params.registrationId });
      throw error;
    }
  }
);
