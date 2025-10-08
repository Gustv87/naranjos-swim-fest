# Encuentro de Aguas Abiertas Los Naranjos

Sitio oficial del evento de natación en aguas abiertas “Los Naranjos 2025”. Permite difundir información del encuentro, gestionar inscripciones de atletas, validar pagos, registrar tiempos oficiales y publicar resultados en tiempo real.

## Características principales

- **Landing informativa** con hero, cronómetro, distancias, reglamento y CTA dinámico que se desactiva al cerrarse el período de inscripción.
- **Formulario de inscripción** con validaciones avanzadas (edad por distancia, DNI único, subida de comprobantes hasta 15 MB, App Check para evitar abuso).
- **Panel administrativo** (requiere autenticación de Firebase) para:
  - Validar/rechazar inscripciones y controlar check-in.
  - Editar cualquier dato de un participante (incluido dorsal) con auditoría (`updatedBy`, `updatedAt`).
  - Registrar tiempos con soporte para códigos `NT`, `NS`, `DNS`, `DNF`.
  - Descargar CSV con toda la información y URL pública del comprobante.
- **Resultados en vivo** agrupados por distancia, filtrables por categoría y ordenados por dorsal.
- **Página 404 personalizada** compatible con GitHub Pages y fallback SPA.

## Requisitos

- Node.js 18 o superior
- npm 9 o superior
- Cuenta de Firebase con Firestore, Storage y Authentication habilitados
- (Opcional pero recomendado) reCAPTCHA v3 para App Check

## Configuración rápida

1. **Clonar e instalar dependencias**
   ```bash
   git clone <repo-url>
   cd naranjos-swim-fest
   npm install
   ```

2. **Configurar variables de entorno**
   Crea un archivo `.env` en la raíz con los valores reales de Firebase (basado en `.env.example`):
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   VITE_ADMIN_EMAILS=correo1@dominio.com,correo2@dominio.com
   VITE_ADMIN_LOCAL_PASSWORD= # Opcional, sólo para desarrollo local
   VITE_RECAPTCHA_SITE_KEY=   # Site key de reCAPTCHA v3 (opcional pero recomendado)
   ```

3. **Firebase App Check (opcional)**
   - En la consola de Firebase → *App Check* → habilita reCAPTCHA v3 para tu app web.
   - Copia el site key en `VITE_RECAPTCHA_SITE_KEY`.

4. **Reglas de seguridad**
   - Firestore: `firebase/firestore.rules`
   - Storage: `firebase/storage.rules`

   Despliega las reglas antes de usar el sistema:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only storage
   ```
   Las reglas actuales restringen la lectura/escritura a través de App Check y controlan qué campos puede actualizar un administrador.

5. **Iniciar en modo desarrollo**
   ```bash
   npm run dev
   ```
   La app se sirve en `http://localhost:8080`.

6. **Compilar y desplegar**
   ```bash
   npm run build
   npm run deploy   # Publica en GitHub Pages (dist/)
   ```

## Autenticación y administración

- Usa Firebase Authentication (correo/contraseña) para los correos listados en `VITE_ADMIN_EMAILS`.
- Para pruebas locales puedes definir `VITE_ADMIN_LOCAL_PASSWORD`; en producción deja ese valor vacío para forzar autenticación real.
- Cada acción administrativa guarda `updatedBy` y `updatedAt` para auditar quién modificó un registro.

## Estructura destacada

- `src/pages/Index.tsx`: landing page.
- `src/pages/Inscripcion.tsx`: formulario de inscripción con validaciones y subida de comprobantes.
- `src/pages/Admin.tsx`: panel administrativo.
- `src/pages/Resultados.tsx`: resultados públicos filtrables.
- `src/context/registration-context.tsx`: lógica central de Firestore/Storage.
- `firebase/firestore.rules` y `firebase/storage.rules`: reglas de seguridad.

## Buenas prácticas y mantenimiento

- **Auditoría**: revisa periódicamente los registros para asegurarte de que `updatedBy` coincide con el historial de acciones.
- **Límites de Storage**: aunque se permiten archivos hasta 15 MB, es recomendable depurar comprobantes antiguos para reducir costos.
- **Respaldo**: utiliza exportaciones de Firestore para tener copias de seguridad previas al evento.
- **Actualización de dependencias**: ejecuta `npm audit` y `npm outdated` con regularidad.

## Licencia

Este proyecto es propiedad de los organizadores del Encuentro de Aguas Abiertas Los Naranjos. El código no está licenciado para uso público sin autorización explícita.

## Soporte

- Reportes técnicos: abre un issue en el repositorio privado.
- Contacto operativo: `info@swimplushn.com`
- Sitio oficial: <https://swimplushn.com>
