// src/ble/permissions.ts
import {PermissionsAndroid, Platform} from 'react-native';

export async function ensureBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Number(Platform.Version);

    // Android < 12
    if (apiLevel < 31) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!,
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // Android 12+ → BLUETOOTH_SCAN + BLUETOOTH_CONNECT (y opcionalmente LOCATION)
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN!,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT!,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!,
    ]);

    const ok =
      result['android.permission.BLUETOOTH_SCAN'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.BLUETOOTH_CONNECT'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.ACCESS_FINE_LOCATION'] ===
        PermissionsAndroid.RESULTS.GRANTED;

    if (!ok) {
      console.log('[BLE] Permisos no concedidos:', result);
    }

    return ok;
  } catch (e) {
    console.log('[BLE] Error pidiendo permisos:', e);
    return false;
  }
}
