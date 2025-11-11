# SETUP — Firebase, iOS y Android

Firebase (FCM):
1) Crear proyecto.
2) Service Account JSON con permisos para Admin SDK.
3) Backend: colocar archivo y apuntar FIREBASE_SERVICE_ACCOUNT ó FIREBASE_SERVICE_ACCOUNT_B64.
4) iOS: subir APNs Auth Key a Firebase, integrar plist.
5) Android: integrar google-services.json y plugin.

iOS Info.plist claves:
- NSLocationAlwaysAndWhenInUseUsageDescription
- NSLocationWhenInUseUsageDescription
- NSBluetoothAlwaysUsageDescription
- UIBackgroundModes (location, remote-notifications)

Android permisos:
- ACCESS_FINE_LOCATION
- BLUETOOTH_SCAN (Android 12+)
- BLUETOOTH_CONNECT (Android 12+)

Backend env vars:
- PORT
- CORS_ORIGINS
- FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_B64
- PRESENCE_TTL_SECONDS

Flujo:
1) App registra token /api/register-token
2) App reporta presencia /api/presence
3) Admin publica /api/messages
4) Backend envía push via FCM

Producción:
- Sustituir memoria por Redis/DB.
- Auth en endpoints.
- HTTPS y rotación de credenciales.
