import { initializeApp } from 'firebase-admin/app';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import nodemailer from 'nodemailer';

initializeApp();

const mailUser = defineSecret('MAIL_USER');
const mailPass = defineSecret('MAIL_PASS');

const createTransporter = () => {
  const user = mailUser.value();
  const pass = mailPass.value();

  if (!user || !pass) {
    logger.error('MAIL_USER o MAIL_PASS no configurados. Usa "firebase functions:secrets:set" para definirlos.');
    throw new Error('Credenciales SMTP no configuradas');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

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

    // Solo enviamos el correo cuando se agrega el check-in y no existía antes
    if (!afterCheckedAt || beforeCheckedAt === afterCheckedAt) {
      return;
    }

    const participantEmail = afterData.email;
    if (!participantEmail) {
      logger.warn('Documento sin email, se omite envío de check-in', { id: event.params.registrationId });
      return;
    }

    const transporter = createTransporter();
    const fromAddress = mailUser.value();

    const mailOptions = {
      from: `Los Naranjos Swim Fest <${fromAddress}>`,
      to: participantEmail,
      subject: 'Check-in confirmado - Encuentro Los Naranjos',
      text: `Hola ${afterData.nombre},\n\nTu check-in para el Encuentro de Aguas Abiertas Los Naranjos ha sido registrado.\n\nDorsal: ${afterData.dorsal}\nDistancia: ${afterData.distancia}\nCategoría: ${afterData.categoria}\n\n¡Te esperamos en la línea de salida!`,
      html: `
        <p>Hola <strong>${afterData.nombre}</strong>,</p>
        <p>Tu check-in para el <strong>Encuentro de Aguas Abiertas Los Naranjos</strong> ha sido registrado.</p>
        <ul>
          <li><strong>Dorsal:</strong> ${afterData.dorsal}</li>
          <li><strong>Distancia:</strong> ${afterData.distancia}</li>
          <li><strong>Categoría:</strong> ${afterData.categoria}</li>
        </ul>
        <p>¡Te esperamos en la línea de salida!</p>
        <p>Equipo Los Naranjos Swim Fest</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      logger.info('Check-in email enviado', { id: event.params.registrationId, email: participantEmail });
    } catch (error) {
      logger.error('Error enviando email de check-in', { error, id: event.params.registrationId });
      throw error;
    }
  }
);
