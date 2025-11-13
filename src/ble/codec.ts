// src/ble/codec.ts
import base64 from 'base-64';

export type Telemetry = {
  pv: number;
  sp: number;
  pwm: number;
  mode: 'AUTO' | 'MANUAL' | 'FAULT';
  locked: boolean;
  alarms: string[];
  timestamp: number;
};

/**
 * Decodifica el valor base64 de la característica TX y extrae el JSON.
 * Tolera que venga envuelto en << >> y/o texto basura alrededor.
 */
export function decodeTelemetry(b64Value: string): Telemetry | null {
  try {
    const decoded = base64.decode(b64Value);
    let s = decoded.trim();

    // quitar delimitadores << >>
    if (s.startsWith('<<')) s = s.slice(2);
    if (s.endsWith('>>')) s = s.slice(0, -2);

    // buscar el JSON dentro del texto
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      console.log('[BLE] decodeTelemetry: no se encontró JSON en:', s);
      return null;
    }

    const jsonText = s.slice(start, end + 1);
    const raw = JSON.parse(jsonText) as any;

    const telemetry: Telemetry = {
      pv: Number(raw.pv ?? 0),
      sp: Number(raw.sp ?? 0),
      pwm: Number(raw.pwm ?? 0),
      mode:
        raw.mode === 'AUTO' || raw.mode === 'MANUAL'
          ? raw.mode
          : 'FAULT',
      locked: Boolean(raw.locked),
      alarms: Array.isArray(raw.alarms) ? raw.alarms.map(String) : [],
      timestamp: Number(raw.timestamp ?? 0),
    };

    return telemetry;
  } catch (e) {
    console.log('[BLE] decodeTelemetry error:', e);
    return null;
  }
}

/** Serializa un comando a JSON plano (luego se base64-encodea). */
export function encodeCmd(cmd: object): string {
  return JSON.stringify(cmd);
}
