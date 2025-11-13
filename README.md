🌡️ **ControlTemperaturaApp**  
Sistema de control de temperatura vía Bluetooth Low Energy utilizando ESP32 + React Native

<div align="center">

🚀 Monitoreo en tiempo real • 🔧 Control inteligente PWM • 📱 App móvil BLE

</div>

---

## 📌 Descripción general

**ControlTemperaturaApp** es una aplicación móvil desarrollada en React Native CLI con TypeScript, diseñada para comunicarse vía Bluetooth Low Energy (BLE) con un ESP32 encargado de medir la temperatura mediante el sensor DHT11 y controlar un ventilador DC por PWM seguro y estable.

La aplicación permite:

- Visualizar telemetría y gráficas de temperatura en tiempo real
- Ajustar el setpoint (20–30 °C)
- Cambiar entre modo Automático y Manual
- Bloquear o desbloquear ajustes de control
- Consultar historial de temperaturas almacenado localmente
- Visualizar alarmas y estados críticos
- Guardar preferencias y configuración persistente

Todo esto en una interfaz moderna, optimizada para dispositivos Android y modo oscuro.

---

## 🧩 Características principales

### 🔥 ESP32 – Firmware

- Lectura de temperatura cada segundo mediante DHT11
- Filtro de media móvil adaptable para eliminación de ruido (5 muestras)
- Recuperación automática ante lecturas inválidas
- Telemetría JSON encapsulada enviada cada segundo por BLE
- Control remoto a través de comandos BLE:
  - `set_sp` (ajuste setpoint)
  - `set_mode` (cambio modo)
  - `set_pwm` (ajuste manual PWM)
  - `set_lock` (bloqueo de cambios)

### 📱 App móvil (React Native)

- Conexión BLE estable (react-native-ble-plx)
- Gráfica en tiempo real de temperatura (react-native-gifted-charts)
- Historial local persistente mediante AsyncStorage
- Visualización y gestión de alarmas
- Bloqueo inteligente de controles:
  - Setpoint en modo AUTO
  - Setpoint y PWM en modo MANUAL si está bloqueado
- Barra de navegación inferior personalizada
- Interfaz responsiva y modo oscuro nativo

---

## 🛠️ Tecnologías utilizadas

**Frontend (App móvil)**
- React Native CLI
- TypeScript
- react-native-ble-plx
- react-native-gifted-charts
- AsyncStorage

**Firmware ESP32**
- C++ (Arduino Core)
- BLEDevice.h
- ArduinoJson
- DHT.h
- PWM por hardware con `ledcWrite`

---

## 📦 Instalación

### 1️⃣ Clonar el repositorio
```bash
git clone https://github.com/EzequielAngel0/ControlTemperaturaApp
cd ControlTemperaturaApp
```

### 2️⃣ Instalar dependencias
```bash
npm install
```

### 3️⃣ Ejecutar en Android
```bash
npm run android
```
*Asegúrate de tener un emulador o dispositivo físico conectado por USB.*

---

## 📡 UUID BLE del ESP32

- **Servicio UUID:** `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **TX Notify:** `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **RX Write:** `1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e`

---

## 📜 Licencia

Este proyecto se distribuye bajo la licencia **MIT**, permitiendo su uso académico y de desarrollo sin restricciones.

---

## 👨‍💻 Autor

**Angel Ezequiel Barbosa Lomeli**
