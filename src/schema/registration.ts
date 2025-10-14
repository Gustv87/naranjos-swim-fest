import { z } from "zod";

export const registrationSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  dni: z.string().trim().regex(/^\d{13}$/, 'El DNI debe tener 13 dígitos sin guiones'),
  nacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  email: z.string().trim().email('Correo inválido'),
  telefono: z.string().trim().min(7, 'Teléfono inválido'),
  club: z.string().trim().optional(),
  distancia: z.enum(['800m', '2km', '5km']),
  sexo: z.enum(['M', 'F']),
  emergenciaNombre: z.string().trim().optional(),
  emergenciaTel: z.string().trim().optional(),
  medico: z.string().trim().optional(),
  banco: z.string().trim().min(1, 'El banco es obligatorio'),
  monto: z.string().trim().min(1, 'El monto es obligatorio'),
  referencia: z.string().trim().min(1, 'La referencia es obligatoria'),
  tallaCamisa: z.string().trim().optional(),
});

export type RegistrationCreateInput = z.infer<typeof registrationSchema>;
