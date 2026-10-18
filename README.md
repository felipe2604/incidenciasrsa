# Incidencias RSA — Web

Aplicación de gestión de incidencias de la comunidad de vecinos **Residencial Santa
Aurelia**, reescrita como aplicación web desplegable en [Vercel](https://vercel.com).

Sustituye a la versión anterior (Google Apps Script embebido en un Google Sheet) para
que iniciar sesión sea tan simple como pulsar "Continuar con Google", sin avisos de
"aplicación no verificada", sin límite de 100 usuarios de prueba y sin tener que volver
a conceder permisos cada 7 días.

Repositorio: https://github.com/felipe2604/incidenciasrsa

## Índice

- [Stack técnico](#stack-técnico)
- [Arquitectura y seguridad](#arquitectura-y-seguridad)
- [Funcionalidad actual vs. pendiente](#funcionalidad-actual-vs-pendiente)
- [Puesta en marcha en local](#puesta-en-marcha-en-local)
- [Preparar la hoja de cálculo (Google Sheets)](#preparar-la-hoja-de-cálculo-google-sheets)
- [Credenciales de Google Cloud](#credenciales-de-google-cloud)
- [Vercel Blob (almacenamiento de archivos)](#vercel-blob-almacenamiento-de-archivos)
- [Despliegue en Vercel](#despliegue-en-vercel)
- [Scripts disponibles](#scripts-disponibles)
- [Notas de seguridad](#notas-de-seguridad)

## Stack técnico

| Capa | Elección | Motivo |
| --- | --- | --- |
| Framework | **Next.js 15** (App Router) + **TypeScript** | Despliegue nativo en Vercel, API routes y páginas en el mismo proyecto, tipado fuerte para una app con reglas de permisos complejas. |
| Estilos | **Tailwind CSS 3** | Rapidez de maquetación, paleta de color (`marca-*`) ajustada a la identidad visual de la app original. |
| Autenticación | **NextAuth.js** con Google y credenciales habilitadas por ADMIN, sesión JWT | El acceso a Sheets lo gestiona una cuenta de servicio; las contraseñas se guardan como hashes scrypt, nunca como texto. |
| Base de datos | La misma **Google Sheet** ya usada por la app original, vía API de Sheets autenticada con **cuenta de servicio** | No hay que migrar datos a una base de datos nueva; el comité ya conoce y sabe editar esa hoja si hace falta. |
| Archivos adjuntos | **Vercel Blob** | Sustituye a Google Drive; las fotos se comprimen en el navegador antes de subirlas y solo se sirven a través de una ruta propia que revalida permisos en cada descarga. |
| Validación | `zod` (forma/tipos en el borde de la API) + funciones de saneado propias (límites de negocio exactos) | Defensa en profundidad: cualquier payload manipulado a mano que no respete la forma esperada se rechaza antes de tocar la lógica de negocio. |

## Arquitectura y seguridad

El principio heredado de la aplicación original es: **el cliente nunca es la barrera de
seguridad real**. Cada ruta de API y cada página protegida:

1. Llama a `obtenerUsuarioActual()`, que valida la sesión de Google **y** vuelve a leer
   el usuario desde la hoja "Usuarios" en cada petición (no se confía en datos
   cacheados en el token más allá del email). Si el usuario está desactivado o hay un
   bloqueo global de acceso, se corta ahí mismo.
2. Revalida permisos por rol (`verificarPermiso`) y ámbito (`incidenciaEnAmbito`) antes
   de leer o escribir cualquier incidencia — un vocal con ámbito limitado a un bloque
   no puede ver ni modificar incidencias de otro bloque aunque adivine su ID.
3. Nunca expone la URL real de Vercel Blob al navegador: las descargas pasan siempre
   por `/api/archivos/[id]/descarga`, que vuelve a comprobar permisos y hace de proxy
   de los bytes.

Otros puntos relevantes:

- Las credenciales de la cuenta de servicio de Google y el token de Vercel Blob solo se
  leen en código de servidor (`lib/sheets.ts`, rutas de API); ningún componente
  `"use client"` las importa, por lo que nunca llegan al bundle del navegador.
- Los errores de negocio (`ErrorAplicacion`) se traducen a códigos HTTP concretos
  (401/403/404/400) sin filtrar trazas internas; cualquier error no controlado se
  registra en el servidor y se devuelve como mensaje genérico (500).
- La generación de IDs correlativos (`INC000001`, etc.) usa reintento optimista contra
  un contador en la pestaña "Configuracion", ya que la API de Sheets no ofrece bloqueo
  real como `LockService` en Apps Script. Es una limitación aceptada para el volumen de
  una comunidad de vecinos; si el número de altas simultáneas creciera mucho, sustituir
  por un lock distribuido (p. ej. Vercel KV).

## Funcionalidad actual vs. pendiente

**Ya implementado:**
- Login con Google restringido a usuarios dados de alta y activos en la hoja "Usuarios".
- Alta de incidencias (bloque/planta o zona común, categoría, prioridad, descripción).
- Adjuntar fotos (comprimidas automáticamente en el navegador) y PDFs.
- Listado de incidencias filtrado por ámbito del usuario, detalle, comentarios.
- Cambios de estado siguiendo la máquina de estados original (registrada → asignada →
  en curso → resuelta → cerrada, con reapertura y cancelación).
- Marcar incidencias como confidenciales (solo visibles para ADMIN/PRESIDENTE y el autor).

**Pendiente (fuera de alcance de esta primera versión):**
- Panel/dashboard con gráficas.
- Informes en PDF.
- Pantalla de administración (alta/baja de usuarios, catálogos de bloques/zonas).
- Notificaciones por email.
- Tareas programadas (recordatorios, cierres automáticos).

## Puesta en marcha en local

### Perfiles

| Perfil | Visibilidad | Operaciones |
| --- | --- | --- |
| ADMIN | Todo | Gestión completa, incluidos usuarios y catálogos. |
| PRESIDENTE | Todas las incidencias, contenido confidencial e informes | Crear y editar cualquier incidencia, cambiar estados, comentar y adjuntar. Sin gestión de usuarios ni catálogos. |
| VOCAL | Bloques y zonas asignados; descripción confidencial solo si es propia | Crear, editar las propias, comentar y adjuntar. Sin cambios de estado ni informes. |
| COORDINADOR | Igual que VOCAL | Igual que VOCAL. |
| ADMINISTRADOR_FINCAS | Todas las incidencias e informes; descripción confidencial solo si es propia | Crear, editar y cambiar estado solo de las propias; comentar y adjuntar también en las ajenas. Sin gestión de usuarios ni catálogos. |

### Acceso Sin Google

Cualquier perfil puede entrar mediante correo y contraseña si ADMIN habilita
ese acceso en Administración → Usuarios. El registro sigue siendo exclusivamente
administrativo; no existe un alta pública que pueda asignarse permisos.
ADMIN establece una contraseña temporal (12 a 128 caracteres), o utiliza
«Resetear contraseña». La temporal caduca en 24 horas y se muestra una sola vez
para su entrega manual. Al editar, dejar la contraseña vacía conserva la existente.

En el primer acceso con una contraseña inicial o restablecida se exige cambiarla
antes de consultar o modificar datos. Las cuentas que ya tenían contraseña antes
de incorporar esta función también deben cambiarla una primera vez. Mi perfil
permite consultar los datos y cambiar la contraseña. El cambio o reseteo revoca
las sesiones anteriores; las sesiones tienen además un límite absoluto de ocho
horas y cada operación revalida el estado y los permisos del usuario.

La hoja Usuarios incorpora automáticamente `password_hash`, `auth_intentos` y
`auth_bloqueado_hasta`, `acceso_password`, `cambio_password_obligatorio`,
`password_expira` y `version_sesion`. Tras cinco fallos consecutivos, la cuenta se bloquea durante
15 minutos. El contador se conserva en Sheets; su concurrencia entre distintas
instancias tiene las mismas limitaciones no transaccionales que el resto de la
aplicación. La protección simultánea dentro de cada instancia no sustituye un
limitador distribuido; para exposición a ataques intensivos, configurar además
rate limiting en Vercel para `/api/auth/callback/credentials`.

La cuenta de Domingo GS es `administracion@inmoabades.es` (sin tilde), con el perfil
`ADMINISTRADOR_FINCAS`. No necesita una cuenta Google para este acceso.

### Filtros, Archivado Y Aspecto

Listado e informes comparten filtros de bloque, zona común y fechas inclusivas.
Seleccionar bloque y zona incluye cualquiera de las dos ubicaciones, manteniendo
el ámbito del usuario. La referencia de fechas puede ser alta, resolución o
actividad (alta, última modificación de la incidencia o paso a estado final).
PDF y CSV conservan los filtros seleccionados.

Las resueltas y cerradas se consideran archivadas tras 15 días desde el último
paso a uno de esos estados. La marca se calcula en cada lectura: no necesita cron
ni elimina datos. Desaparecen del listado y panel, pero siguen disponibles en
informes y enlace directo con su estado original y la marca «Archivada».
Reabrirlas elimina la marca. Para datos históricos sin fecha de estado final,
se utiliza la fecha de resolución o de última modificación existente.

Solo ADMIN puede eliminar una incidencia desde su detalle, confirmando su
identificador. La eliminación es definitiva: borra los adjuntos en Vercel Blob y
vacía los registros de la incidencia, archivos, comentarios, actuaciones y
notificaciones asociados, sin desplazar otras filas. Se conserva la auditoría.
Si el borrado de Blob falla, no se limpian los registros de Sheets. Si falla Sheets
después de borrar archivos, la operación se puede reintentar; ambos servicios no
comparten una transacción.

El selector Actual/Moderno conserva el aspecto original por defecto y guarda la
elección en el navegador. No cambia permisos ni datos.

**Correo aplazado por decisión del administrador:** no se han habilitado envío
de contraseñas, enlaces de recuperación ni informes periódicos por email porque
no hay servicio de envío configurado. Recuperar contraseña informa de que debe
solicitarse un restablecimiento manual a ADMIN.

Requisitos: **Node.js 20 o superior** y una copia de la hoja de cálculo (ver siguiente
sección).

```bash
git clone https://github.com/felipe2604/incidenciasrsa.git
cd incidenciasrsa
npm install
cp .env.example .env.local   # y rellenar los valores (ver secciones siguientes)
npm run dev
```

La app queda disponible en `http://localhost:3000`.

## Preparar la hoja de cálculo (Google Sheets)

1. Duplicar la hoja de cálculo original de la app Apps Script (Archivo → Crear una copia).
2. Mantener las pestañas **Usuarios** y **Configuracion** tal cual (son la lista blanca
   de acceso y los parámetros/contadores de la app).
3. En el resto de pestañas (Incidencias, Actuaciones, Comentarios, Archivos, Auditoria,
   Notificaciones) borrar las filas de datos pero conservar la fila de cabeceras.
4. En la pestaña **Archivos**, sustituir la columna `id_drive` (si existía) por
   `url_blob`: ahora los adjuntos se guardan en Vercel Blob, no en Google Drive.
5. Copiar el ID de la hoja de cálculo (la parte de la URL entre `/d/` y `/edit`) en la
   variable `GOOGLE_SHEETS_SPREADSHEET_ID`.
6. Compartir la hoja con el email de la cuenta de servicio (ver siguiente sección) con
   permiso de **editor**.

## Credenciales de Google Cloud

**1. Cliente OAuth para el login (NextAuth):**
- Google Cloud Console → "APIs y servicios" → "Credenciales" → "Crear credenciales" →
  "ID de cliente de OAuth" → tipo "Aplicación web".
- Orígenes autorizados de JavaScript: `http://localhost:3000` y la URL de producción.
- URI de redirección autorizados: `.../api/auth/callback/google` (local y producción).
- Copiar el Client ID/Secret en `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- No hace falta pedir scopes sensibles ni pasar verificación de Google: solo se piden
  los scopes básicos (openid/email/profile).

**2. Cuenta de servicio para el acceso del backend a Sheets:**
- Google Cloud Console → "IAM y administración" → "Cuentas de servicio" → "Crear cuenta
  de servicio".
- Generar una clave JSON, copiar `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` y
  `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (mantener los `\n` literales si
  se pega como variable de entorno de una sola línea en Vercel).
- Habilitar la API de Google Sheets en el proyecto.
- Compartir la hoja de cálculo con ese email (paso 6 de la sección anterior).

**3. `NEXTAUTH_SECRET`:** generar con `openssl rand -base64 32` (o cualquier generador
de cadena aleatoria de 32+ bytes).

## Vercel Blob (almacenamiento de archivos)

En el proyecto de Vercel: pestaña "Storage" → "Create Database" → "Blob". Al crearlo,
Vercel añade automáticamente la variable `BLOB_READ_WRITE_TOKEN` al proyecto. Para
desarrollo local, copiar ese mismo token a `.env.local`.

## Despliegue en Vercel

1. Importar el repositorio `felipe2604/incidenciasrsa` desde el dashboard de Vercel.
2. Configurar las variables de entorno (sección "Environment Variables") con los mismos
   nombres que `.env.example`, usando los valores de producción (URL real en
   `NEXTAUTH_URL`, etc.).
3. Añadir el almacén de Vercel Blob al proyecto (paso anterior).
4. Desplegar. Vercel ejecuta `npm install` y `next build` automáticamente.
5. Actualizar en Google Cloud Console el cliente OAuth con la URL final de producción
   (orígenes y URI de redirección).

## Scripts disponibles

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción (incluye type-check y lint)
npm run start   # sirve el build de producción
npm run lint    # ESLint
npm test        # regresiones de acceso, permisos, filtros, archivado y etiquetas
```

## Notas de seguridad

- Revisado con `tsc --noEmit`, `next build` y `next lint` sin errores ni warnings.
- `npm audit` señala vulnerabilidades en dependencias **transitivas** de `next`,
  `tailwindcss` y `googleapis` (parsing de CSS/sourcemaps y generación interna de UUIDs)
  cuyo arreglo completo exige subir esos paquetes de versión mayor (Next 16, Tailwind 4,
  googleapis 185). No son explotables en el flujo de esta app (no procesamos CSS ni
  buffers de terceros), así que se ha preferido no forzar esas migraciones mayores sin
  probarlas a fondo primero. Revisar periódicamente con `npm audit` y planificar esas
  subidas de versión como tarea aparte.
- Antes de desplegar a producción, confirmar que ninguna variable de entorno sensible
  lleva el prefijo `NEXT_PUBLIC_` (eso la incluiría en el bundle del navegador). Ninguna
  de las definidas en `.env.example` lo lleva.
