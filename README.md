# Estimote Beacon Manager — Proximity Push

Solución de extremo a extremo:
- Backend (Node.js + Express + Firebase Admin): registra tokens de dispositivos, mantiene presencia de dispositivos cercanos a cada beacon y envía push notifications por FCM cuando el admin publica un mensaje para un beacon.
- Admin web: formulario simple para enviar mensajes a un iBeacon (UUID + major + minor).
- App móvil (React Native): detecta iBeacons (react-native-beacons-manager), registra token FCM y reporta presencia al backend. Recibe push incluso cuando la app está cerrada.

Carpetas:
- server/: API y push.
- web/: admin.html para disparar mensajes.
- mobile/: App.js y guía de integración RN.
- docs/: SETUP con pasos de Firebase, iOS y Android.

Pasos rápidos
1) Backend
   - Copia `server/` y crea credenciales FCM (service account JSON).
   - `cp server/.env.example server/.env` y rellena valores.
   - `npm install` dentro de `server/` y `npm start`.
2) Admin
   - Abre `web/admin.html` (ajusta SERVER_URL si no es localhost).
3) Mobile
   - Crea proyecto React Native (bare).
   - Integra FCM (`@react-native-firebase/app` y `@react-native-firebase/messaging`).
   - Integra `react-native-beacons-manager`.
   - Sustituye `mobile/App.js` y sigue `mobile/README.md` y `docs/SETUP.md.`