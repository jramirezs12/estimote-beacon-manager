# App móvil (React Native)

Objetivo: detectar iBeacons (Estimote) y recibir push incluso con la app cerrada (FCM).

Paquetes:
- react-native-beacons-manager
- @react-native-firebase/app
- @react-native-firebase/messaging
- @react-native-async-storage/async-storage
- socket.io-client (debug opcional)

Firebase:
1) Crea proyecto y agrega apps iOS/Android.
2) iOS: GoogleService-Info.plist en ios/<App>.
3) Android: google-services.json en android/app/>.
4) APNs Auth Key subida a Firebase (para iOS push).

Permisos:
- iOS: location always, bluetooth, background modes (location, remote-notifications).
- Android: ACCESS_FINE_LOCATION (+ BLUETOOTH_SCAN/CONNECT Android 12+).

Config Gradle Android:
- build.gradle project: classpath 'com.google.gms:google-services:4.4.2'
- build.gradle app: apply plugin: 'com.google.gms.google-services'

Reemplaza SERVER y REGION_UUID en App.js.

Flujo:
1) Obtener deviceId local.
2) Solicitar permisos y token FCM.
3) Registrar token en backend.
4) Ranging y monitoring de beacons -> reportar presencia periódicamente.
5) Admin envía mensaje -> backend envía push a tokens con presencia activa.