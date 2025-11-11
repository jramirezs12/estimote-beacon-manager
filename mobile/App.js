import React, { useEffect, useRef } from 'react';
import { View, Text, Platform, PermissionsAndroid, Alert } from 'react-native';
import Beacons from 'react-native-beacons-manager';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';

const SERVER = 'http://YOUR_SERVER_IP:3000';
const REGION_UUID = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
const REGION_ID = 'REGION1';
const PRESENCE_PUSH_INTERVAL_MS = 8000;

function beaconKey(b) { return `${String(b.uuid).toLowerCase()}:${b.major}:${b.minor}`; }
async function getOrCreateDeviceId() {
  let id = await AsyncStorage.getItem('deviceId');
  if (!id) { id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; await AsyncStorage.setItem('deviceId', id); }
  return id;
}

export default function App() {
  const socketRef = useRef(null);
  const lastPresenceSentAt = useRef(0);
  const seenKeys = useRef(new Set());
  const deviceIdRef = useRef(null);

  useEffect(() => {
    let rangingSub = null, monitoringEnterSub = null, monitoringExitSub = null;
    (async () => {
      deviceIdRef.current = await getOrCreateDeviceId();
      await requestPermissions();
      await setupFCM();
      socketRef.current = io(SERVER);
      if (Platform.OS === 'ios') {
        Beacons.requestAlwaysAuthorization();
        Beacons.allowsBackgroundLocationUpdates(true);
        Beacons.pausesLocationUpdatesAutomatically(false);
        Beacons.detectIBeacons();
        await Beacons.startMonitoringForRegion({ identifier: REGION_ID, uuid: REGION_UUID });
        await Beacons.startRangingBeaconsInRegion({ identifier: REGION_ID, uuid: REGION_UUID });
      } else {
        Beacons.detectIBeacons();
        try { await Beacons.startMonitoringForRegion({ identifier: REGION_ID, uuid: REGION_UUID }); } catch (e) {}
        await Beacons.startRangingBeaconsInRegion({ identifier: REGION_ID, uuid: REGION_UUID });
      }
      rangingSub = Beacons.BeaconsEventEmitter.addListener('beaconsDidRange', (data) => {
        const { beacons } = data || {};
        const now = Date.now();
        if (Array.isArray(beacons)) {
          beacons.forEach(b => { seenKeys.current.add(beaconKey(b)); socketRef.current?.emit?.('subscribe', { uuid: b.uuid, major: b.major, minor: b.minor }); });
        }
        if (now - lastPresenceSentAt.current >= PRESENCE_PUSH_INTERVAL_MS) flushPresence();
      });
      monitoringEnterSub = Beacons.BeaconsEventEmitter.addListener('regionDidEnter', () => { flushPresence(true); });
      monitoringExitSub = Beacons.BeaconsEventEmitter.addListener('regionDidExit', () => { seenKeys.current.clear(); flushPresence(true); });
    })();

    async function flushPresence(force = false) {
      const keys = Array.from(seenKeys.current);
      if (!force && keys.length === 0) return;
      lastPresenceSentAt.current = Date.now();
      const nearby = keys.map(k => { const [uuid, major, minor] = k.split(':'); return { uuid, major: Number(major), minor: Number(minor) }; });
      try {
        await fetch(`${SERVER}/api/presence`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: deviceIdRef.current, nearby, ttlSeconds: 120 }) });
      } catch (e) {}
    }

    async function setupFCM() {
      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) { Alert.alert('Permiso de notificaciones denegado'); }
      const token = await messaging().getToken();
      await registerToken(token);
      messaging().onTokenRefresh(async (newToken) => { await registerToken(newToken); });
      messaging().setBackgroundMessageHandler(async () => {});
      messaging().onMessage(async (remoteMessage) => { console.log('Push foreground', remoteMessage); });
    }

    async function registerToken(token) {
      const deviceId = deviceIdRef.current;
      await fetch(`${SERVER}/api/register-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId, platform: Platform.OS === 'ios' ? 'ios' : 'android', token }) });
    }

    async function requestPermissions() {
      if (Platform.OS === 'android') {
        const perms = [];
        if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        try { await PermissionsAndroid.requestMultiple(perms); } catch (err) {}
      } else { /* iOS handled in setupFCM + beacons */ }
    }

    return () => {
      try { Beacons.stopRangingBeaconsInRegion({ identifier: REGION_ID, uuid: REGION_UUID }); } catch(e){}
      try { Beacons.stopMonitoringForRegion({ identifier: REGION_ID, uuid: REGION_UUID }); } catch(e){}
      rangingSub?.remove?.(); monitoringEnterSub?.remove?.(); monitoringExitSub?.remove?.(); socketRef.current?.disconnect?.();
    };
  }, []);

  return (<View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Estimote iBeacons — FCM Push Demo</Text><Text>iOS & Android</Text></View>);
}