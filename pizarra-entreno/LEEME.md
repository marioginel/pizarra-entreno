# Pizarra de Entreno: publicar en Vercel con Firebase y Gemini

Esta carpeta es tu app lista para publicar. Tiempo estimado: 20–30 minutos. No hace falta instalar nada en el ordenador: todo se hace desde el navegador.

**Qué usa cada pieza**

- **Vercel**: aloja la app y una pequeña función (`api/generate.js`) que habla con Gemini. Tu clave de Gemini vive solo ahí, nunca en el móvil.
- **Firebase**: la base de datos (Firestore) y el inicio de sesión (correo y contraseña). Firestore guarda una copia en el móvil, así que la app funciona en el gimnasio aunque no haya cobertura; se sincroniza al volver la conexión. Lo único que necesita internet es generar una sesión con IA.
- **Gemini**: genera las sesiones. Si falla, la app monta la sesión con sus reglas locales.

---

## Paso 0. Exporta tus datos de la versión de Claude

En la app actual (la de claude.ai): **Historial → Copia de seguridad → Exportar mis datos**. Guarda el archivo `.json`; lo importarás al final.

## Paso 1. Firebase

1. Entra en <https://console.firebase.google.com> con tu cuenta de Google personal y pulsa **Crear un proyecto**. Nombre: `pizarra-entreno`. Google Analytics no hace falta.
2. **Inicio de sesión**: menú *Compilación → Authentication → Comenzar*. En *Método de acceso* activa **Correo electrónico/contraseña**. Después, en la pestaña *Usuarios*, pulsa **Agregar usuario** y crea el tuyo (tu correo y una contraseña).
3. **Base de datos**: *Compilación → Firestore Database → Crear base de datos*. Elige una ubicación en Europa (por ejemplo `eur3` o `europe-southwest1`, Madrid) y el **modo de producción**.
4. **Reglas**: en Firestore, pestaña *Reglas*, borra lo que haya, pega el contenido del archivo `firestore.rules` de esta carpeta y pulsa **Publicar**. Así cada usuario solo ve sus propios datos.
5. **Configuración web**: rueda dentada ⚙ → *Configuración del proyecto* → en *Tus apps* pulsa el icono web `</>`. Nombre: `Pizarra`, sin Hosting. Te mostrará un bloque `firebaseConfig = { apiKey: ..., authDomain: ..., ... }`.
6. Abre `config.js` de esta carpeta y sustituye cada `PEGA_AQUI` por el valor correspondiente. Estos valores no son secretos, pueden ir en el código.
7. Apunta el **ID del proyecto** (`projectId`), lo necesitarás en Vercel.

## Paso 2. Clave de Gemini

Entra en <https://aistudio.google.com/apikey> y pulsa **Create API key**. Cópiala y no la pegues en ningún archivo: irá en Vercel.

> Consejo: usa una clave personal en lugar de la del trabajo. El gasto de generar una sesión es mínimo y así la app no depende de tu empresa.

## Paso 3. Sube el proyecto a GitHub

1. En <https://github.com/new> crea un repositorio **privado** llamado `pizarra-entreno`.
2. En la página del repositorio vacío pulsa **uploading an existing file** y arrastra **todo el contenido** de esta carpeta, incluida la subcarpeta `api` (con `config.js` ya rellenado). Pulsa **Commit changes**.

## Paso 4. Publica en Vercel

1. Entra en <https://vercel.com> con tu cuenta de GitHub → **Add New… → Project** → importa `pizarra-entreno`.
2. *Framework Preset*: **Other**. No cambies nada más de la compilación.
3. Despliega **Environment Variables** y añade:

   | Nombre | Valor |
   |---|---|
   | `GEMINI_API_KEY` | la clave del paso 2 |
   | `FIREBASE_PROJECT_ID` | el `projectId` del paso 1 |
   | `ALLOWED_EMAILS` | tu correo (solo tú podrás usar la IA) |
   | `GEMINI_MODEL` | *(opcional)* el modelo de Gemini; si no lo pones se usa `gemini-3.6-flash` |

4. Pulsa **Deploy**. En un minuto tendrás una dirección tipo `pizarra-entreno.vercel.app`.
5. Vuelve a Firebase → *Authentication → Configuración → Dominios autorizados* y añade esa dirección.

## Paso 5. Instálala en el móvil e importa tus datos

1. Abre la dirección de Vercel en el móvil y entra con tu correo y contraseña.
2. **Historial → Importar datos** → elige el `.json` del paso 0.
3. Instálala:
   - **iPhone (Safari)**: Compartir → **Añadir a pantalla de inicio**.
   - **Android (Chrome)**: menú ⋮ → **Instalar aplicación** (o *Añadir a pantalla de inicio*).

Se abrirá a pantalla completa, con su icono, como una app normal.

---

## Si algo falla

- **"La IA no respondió bien"**: en Vercel → tu proyecto → *Logs*, busca la línea de `Gemini`.
  - Un error 400 o 404 suele indicar que el modelo no existe o no está disponible para tu clave. Pon en `GEMINI_MODEL` uno de los que aparecen en AI Studio y vuelve a desplegar (*Deployments → ⋯ → Redeploy*).
  - Un error 401 o 403 de Gemini indica que la clave no es válida.
- **"Sesión no válida" o no genera tras entrar**: revisa que `FIREBASE_PROJECT_ID` coincide exactamente con el `projectId` de `config.js`, y que `ALLOWED_EMAILS` es el mismo correo con el que entras.
- **No puedo entrar**: comprueba que creaste el usuario en *Authentication → Usuarios* y que `config.js` tiene tus valores.
- **No se guarda nada**: revisa que publicaste las reglas del paso 1.4.

## Cómo hacer cambios más adelante

Edita el archivo en GitHub (icono del lápiz) y guarda; Vercel vuelve a publicar solo. Si cambias `index.html`, sube también el número de `CACHE` en `sw.js` (por ejemplo `pizarra-v2`) para que el móvil descargue la versión nueva.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa |
| `config.js` | Configuración de Firebase (la rellenas tú) |
| `api/generate.js` | Función que comprueba que eres tú y pide la sesión a Gemini |
| `firestore.rules` | Reglas de seguridad de la base de datos |
| `manifest.webmanifest`, `sw.js`, iconos | Lo necesario para instalarla y abrirla sin conexión |
| `package.json`, `vercel.json` | Configuración para Vercel |
