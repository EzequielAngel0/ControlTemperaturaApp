// src/ble/TelemetryContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {bleClient} from './BleClient';
import type {Telemetry} from './codec';

type Mode = 'AUTO' | 'MANUAL' | 'FAULT';

export type AlarmEntry = {
  id: string;
  message: string;
  timestamp: number;
  pv: number;
  sp: number;
};

type TelemetryContextValue = {
  connected: boolean;
  telemetry: Telemetry | null;
  history: Telemetry[];
  alarms: AlarmEntry[];
  error: string | null;

  autoConnectEnabled: boolean;
  setAutoConnectEnabled: (v: boolean) => void;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  setMode: (mode: Mode) => Promise<void>;
  setSetpoint: (sp: number) => Promise<void>;
  setLock: (locked: boolean) => Promise<void>;
  setManualPwm: (pwm: number) => Promise<void>;
};

const TelemetryContext = createContext<TelemetryContextValue | undefined>(
  undefined,
);

const AUTO_CONNECT_KEY = 'tempcontrol_autoConnect';

export const TelemetryProvider: React.FC<{children: ReactNode}> = ({
  children,
}) => {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<Telemetry[]>([]);
  const [alarms, setAlarms] = useState<AlarmEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoConnectEnabled, setAutoConnectEnabled] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Cargar preferencia al iniciar
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTO_CONNECT_KEY);
        if (stored === 'true') {
          setAutoConnectEnabled(true);
        }
      } catch (e) {
        console.log('[Prefs] Error leyendo autoConnect:', e);
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  // Guardar preferencia cuando cambia
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(
          AUTO_CONNECT_KEY,
          autoConnectEnabled ? 'true' : 'false',
        );
      } catch (e) {
        console.log('[Prefs] Error guardando autoConnect:', e);
      }
    })();
  }, [autoConnectEnabled]);

  // Suscripción a telemetría
  useEffect(() => {
    const listener = (t: Telemetry) => {
      setTelemetry(t);

      setHistory(prev => {
        const next = [...prev, t];
        if (next.length > 200) next.shift();
        return next;
      });

      const hasAlarms = t.alarms && t.alarms.length > 0;
      const highTemp = t.pv >= t.sp + 5 || t.pv >= 40;

      if (hasAlarms || highTemp) {
        const msg = hasAlarms
          ? `Alarmas: ${t.alarms.join(', ')}`
          : `Alta temperatura: ${t.pv.toFixed(1)} °C`;
        const id = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        setAlarms(prev => [
          {
            id,
            message: msg,
            timestamp: Date.now(),
            pv: t.pv,
            sp: t.sp,
          },
          ...prev,
        ]);
      }
    };

    bleClient.addListener(listener);
    return () => {
      bleClient.removeListener(listener);
      bleClient.disconnect();
    };
  }, []);

  // Conexión manual
  const connect = async () => {
    setError(null);
    try {
      await bleClient.scanAndConnect(12000);
      setConnected(true);
    } catch (e: any) {
      console.log('[BLE] connect error', e);
      setConnected(false);
      setError(String(e?.message ?? e));
      throw e;
    }
  };

  const disconnect = async () => {
    try {
      await bleClient.disconnect();
    } catch {}
    setConnected(false);
  };

  // Auto-reconexión simple
  useEffect(() => {
    if (!prefsLoaded) return;
    if (!autoConnectEnabled) return;
    if (connected) return;

    connect().catch(e =>
      console.log('[BLE] autoConnect error (ignorado):', e),
    );
  }, [prefsLoaded, autoConnectEnabled, connected]);

  const ensureConnected = () => {
    if (!connected) {
      throw new Error('No hay dispositivo BLE conectado');
    }
  };

  const setMode = async (mode: Mode) => {
    ensureConnected();
    if (telemetry?.locked) {
      throw new Error('Modo bloqueado (locked = true)');
    }
    await bleClient.writeCommand({cmd: 'set_mode', value: mode});
  };

  const setSetpoint = async (sp: number) => {
    ensureConnected();
    if (telemetry?.locked) {
      throw new Error('Setpoint bloqueado (locked = true)');
    }
    await bleClient.writeCommand({cmd: 'set_sp', value: sp});
  };

  const setLock = async (locked: boolean) => {
    ensureConnected();
    await bleClient.writeCommand({cmd: 'set_lock', value: locked});
  };

  const setManualPwm = async (pwm: number) => {
    ensureConnected();
    if (telemetry?.locked) {
      throw new Error('PWM bloqueado (locked = true)');
    }
    await bleClient.writeCommand({cmd: 'set_pwm', value: pwm});
  };

  const value: TelemetryContextValue = {
    connected,
    telemetry,
    history,
    alarms,
    error,
    autoConnectEnabled,
    setAutoConnectEnabled,
    connect,
    disconnect,
    setMode,
    setSetpoint,
    setLock,
    setManualPwm,
  };

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = (): TelemetryContextValue => {
  const ctx = useContext(TelemetryContext);
  if (!ctx) {
    throw new Error('useTelemetry debe usarse dentro de TelemetryProvider');
  }
  return ctx;
};
