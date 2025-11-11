# Backend (server)

Funciones:
- Registrar tokens FCM de dispositivos: `POST /api/register-token`
- Recibir presencia de dispositivos cerca de beacons: `POST /api/presence`
- Enviar push a todos los dispositivos con presencia activa cerca de un beacon: `POST /api/messages`

Requisitos:
- Node.js 18+
- Credenciales de servicio Firebase (Service Account) con FCM habilitado.

Setup:
1) npm install
2) cp .env.example .env (ajusta valores)
3) npm start

Endpoints:
- POST /api/register-token { deviceId, platform, token }
- POST /api/presence { deviceId, nearby: [{uuid,major,minor}], ttlSeconds? }
- POST /api/messages { uuid, major, minor, title, body?, data? }
- GET /api/messages/logs
- GET /api/health

Notas:
Almacenamiento en memoria. Usa Redis/DB en producción.
