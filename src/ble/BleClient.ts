// src/ble/BleClient.ts
import {
  BleManager,
  Device,
  Characteristic,
  BleError,
  Subscription,
} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import base64 from 'base-64';
import {decodeTelemetry, encodeCmd, Telemetry} from './codec';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHAR_TX_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const CHAR_RX_UUID = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e';

export type TelemetryListener = (t: Telemetry) => void;

export class BleClient {
  private manager = new BleManager();
  private device: Device | null = null;
  private monitorSub: Subscription | null = null;
  private listeners = new Set<TelemetryListener>();

  addListener(fn: TelemetryListener) {
    this.listeners.add(fn);
  }

  removeListener(fn: TelemetryListener) {
    this.listeners.delete(fn);
  }

  private emitTelemetry(t: Telemetry) {
    for (const l of this.listeners) l(t);
  }

  // ====== permisos ======
  private async ensurePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const apiLevel = Number(Platform.Version);

      if (apiLevel < 31) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

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
      console.log('[BLE] ensurePermissions error', e);
      return false;
    }
  }

  // ====== escanear y conectar ======
  async scanAndConnect(timeoutMs = 10000): Promise<void> {
    const ok = await this.ensurePermissions();
    if (!ok) {
      throw new Error('Permisos BLE no concedidos');
    }

    console.log('[BLE] scanAndConnect iniciado...');

    return new Promise((resolve, reject) => {
      let timeout: any | null = null;

      const stateSub = this.manager.onStateChange(state => {
        console.log('[BLE] Estado Bluetooth:', state);
        if (state === 'PoweredOn') {
          stateSub.remove();

          this.manager.startDeviceScan(
            null,
            {allowDuplicates: false},
            (error: BleError | null, scannedDevice: Device | null) => {
              if (error) {
                console.log('[BLE] Error en startDeviceScan:', error);
                if (timeout) clearTimeout(timeout);
                this.manager.stopDeviceScan();
                reject(error);
                return;
              }

              if (!scannedDevice) return;

              const name =
                scannedDevice.name ?? scannedDevice.localName ?? '';

              if (name.includes('ESP32-TempControl')) {
                console.log(
                  '[BLE] Dispositivo objetivo encontrado:',
                  name,
                  scannedDevice.id,
                );

                this.manager.stopDeviceScan();
                if (timeout) clearTimeout(timeout);

                scannedDevice
                  .connect()
                  // 👉 Pedir MTU más grande antes de descubrir servicios
                  .then(d => {
                    console.log('[BLE] Conectado, solicitando MTU 185...');
                    if (Platform.OS === 'android') {
                      return d
                        .requestMTU(185)
                        .then(dd => {
                          console.log('[BLE] MTU negociado:', dd.mtu);
                          return dd;
                        })
                        .catch(err => {
                          console.log(
                            '[BLE] Error al solicitar MTU (se usa valor por defecto):',
                            err,
                          );
                          return d;
                        });
                    }
                    return d;
                  })
                  .then(d => {
                    console.log(
                      '[BLE] MTU OK, descubriendo servicios y características...',
                    );
                    return d.discoverAllServicesAndCharacteristics();
                  })
                  .then(d => {
                    this.device = d;
                    console.log(
                      '[BLE] Servicios descubiertos, configurando monitor...',
                    );

                    this.monitorSub = d.monitorCharacteristicForService(
                      SERVICE_UUID,
                      CHAR_TX_UUID,
                      (
                        monitorError: BleError | null,
                        char: Characteristic | null,
                      ) => {
                        if (monitorError) {
                          console.log(
                            '[BLE] monitor error:',
                            monitorError,
                          );
                          return;
                        }
                        if (!char?.value) {
                          return;
                        }

                        const decodedText = base64.decode(char.value);
                        console.log(
                          '[BLE] Notif raw base64:',
                          char.value,
                        );
                        console.log('[BLE] Notif texto:', decodedText);

                        const t = decodeTelemetry(char.value);
                        if (!t) {
                          console.log(
                            '[BLE] decodeTelemetry devolvió null',
                          );
                          return;
                        }

                        console.log('[BLE] Telemetría OK:', t);
                        this.emitTelemetry(t);
                      },
                    );

                    console.log('[BLE] Monitor configurado');
                    resolve();
                  })
                  .catch(err => {
                    console.log('[BLE] Error conectando:', err);
                    reject(err);
                  });
              }
            },
          );

          timeout = setTimeout(() => {
            console.log('[BLE] Timeout de escaneo');
            this.manager.stopDeviceScan();
            reject(new Error('Timeout de escaneo BLE'));
          }, timeoutMs);
        }
      }, true);
    });
  }

  // ====== escribir comandos ======
  async writeCommand(cmd: object): Promise<void> {
    if (!this.device) throw new Error('No hay dispositivo BLE conectado');

    const json = encodeCmd(cmd);
    const b64 = base64.encode(json);
    console.log('[BLE] writeCommand JSON:', json);

    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHAR_RX_UUID,
      b64,
    );
  }

  // ====== desconectar ======
  async disconnect(): Promise<void> {
    console.log('[BLE] disconnect() llamado');
    if (this.monitorSub) {
      try {
        this.monitorSub.remove();
      } catch {}
      this.monitorSub = null;
    }

    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch {}
      this.device = null;
    }
  }
}

export const bleClient = new BleClient();
