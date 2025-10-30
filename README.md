# Estimote Beacon Manager (Web + Mobile)

Monorepo para gestionar beacons (iBeacon y Eddystone), ubicaciones y sightings en tiempo real con:
- Web (Next.js 14, App Router, TypeScript, Tailwind, NextAuth con GitHub + Email, Firestore/Firebase Admin)
- Mobile (Expo + react-native-ble-plx) para escanear BLE y enviar sightings a la API con API Key
- Base de datos: Firebase Firestore
- CI (GitHub Actions), linters, tipado

Estructura
- apps/web: Panel de gestión y API
- apps/mobile: App móvil para escaneo BLE y envío de sightings
- .github/workflows/ci.yml: CI

Requisitos
- Node 18+
- pnpm 9+
- Firebase proyecto con Firestore habilitado
- Service Account para Firebase Admin (para el backend Next.js)
- SMTP para el proveedor de Email (NextAuth)
- OAuth App en GitHub (NextAuth GitHub)
- Para móvil: Expo CLI y build de desarrollo (Dev Client)

Configuración

1) Variables Web
Copia apps/web/.env.local.example a apps/web/.env.local y completa:
- NEXTAUTH_URL y NEXTAUTH_SECRET
- GITHUB_ID, GITHUB_SECRET
- EMAIL_SERVER y EMAIL_FROM
- Credenciales Firebase:
  - Server (Admin): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
  - Client (NEXT_PUBLIC_*): API key, auth domain, etc.

2) Firebase
- Crea un proyecto
- Habilita Firestore en modo Production
- Crea credenciales de Service Account y copia:
  - project_id -> FIREBASE_PROJECT_ID
  - client_email -> FIREBASE_CLIENT_EMAIL
  - private_key -> FIREBASE_PRIVATE_KEY (escapado con \n)

3) NextAuth
- Crea OAuth App en GitHub y configura callback:
  - http://localhost:3000/api/auth/callback/github (desarrollo)
- Configura SMTP (Mailtrap, SendGrid, etc.)

4) Mobile (API key)
- Desde la web, en Settings > API Keys, crea una API Key y cópiala en la app móvil.
- En la app, configura:
  - Base URL: http://<TU-IP-LAN>:3000
  - API Key: la creada en el panel
- Selecciona la ubicación desde la app para etiquetar sightings.

Comandos

- Instalar dependencias
  pnpm install

- Web
  pnpm --filter @app/web dev
  pnpm --filter @app/web build && pnpm --filter @app/web start

- Mobile
  pnpm --filter @app/mobile start
  Luego crea un Development Build:
  - iOS: expo run:ios
  - Android: expo run:android
  Abre la app dev y se conectará al bundler.

Importante: BLE requiere permisos de Localización y Bluetooth en iOS/Android. Están configurados en app.json.

Despliegue
- Web: Vercel (Next.js)
  - Añade las env vars de producción en Vercel
- DB: Firestore (no requiere despliegue)
- Mobile: EAS build (opcional)

Seguridad
- La API acepta:
  - Sesión NextAuth (para UI)
  - API Key (x-api-key) para el cliente móvil
- Las API Keys se guardan hasheadas en Firestore (bcrypt)

Carpetas principales
- apps/web:
  - api/beacons, locations, sightings, apikeys
  - pages de panel: Dashboard, Beacons, Locations, Sightings, Settings (API Keys)
- apps/mobile:
  - Escaneo BLE (iBeacon + Eddystone UID)
  - Cola offline con SQLite
  - Envío batch de sightings con throttle

Licencia
MIT