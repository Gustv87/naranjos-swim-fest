import { z } from "zod";
import { validateParticipantDocument } from '@/lib/registration-categories';

export const registrationSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  dni: z.string().trim().min(1, 'El documento es obligatorio'),
  nacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  pais: z.string().trim().min(2, 'El país es obligatorio'),
  email: z.string().trim().email('Correo inválido'),
  telefono: z.string().trim().min(7, 'Teléfono inválido'),
  club: z.string().trim().optional(),
  distancia: z.string().trim().min(1, 'La distancia es obligatoria'),
  sexo: z.enum(['M', 'F']),
  emergenciaNombre: z.string().trim().optional(),
  emergenciaTel: z.string().trim().optional(),
  medico: z.string().trim().optional(),
  banco: z.string().trim().min(1, 'El banco es obligatorio'),
  monto: z.string().trim().min(1, 'El monto es obligatorio'),
  referencia: z.string().trim().min(1, 'La referencia es obligatoria'),
  tallaCamisa: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  const documentError = validateParticipantDocument(value.dni, value.pais);
  if (documentError) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dni'],
      message: documentError,
    });
  }
});

export type RegistrationCreateInput = z.infer<typeof registrationSchema>;
