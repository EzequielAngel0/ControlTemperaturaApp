// src/ble/uuid.ts

// Usa los mismos UUID que tu firmware .ino
export const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const CHAR_TELEMETRY_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'; // notify ESP32->App
export const CHAR_COMMAND_UUID   = '1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e'; // write  App->ESP32

// Nombre que pusiste en BLEDevice::init("ESP32-TempControl");
export const DEVICE_NAME_PREFIX  = 'ESP32-TempControl';
