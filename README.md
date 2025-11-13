🌡️ ControlTemperaturaApp

Sistema de control de temperatura vía Bluetooth Low Energy (BLE) usando
ESP32 + React Native

📌 Descripción general

ControlTemperaturaApp es una aplicación móvil desarrollada en React
Native CLI + TypeScript, diseñada para conectarse vía BLE a un ESP32
encargado de medir temperatura mediante un sensor DHT11 y controlar un
ventilador de DC mediante PWM.

El sistema permite monitorear temperatura en tiempo real, ajustar un
setpoint, seleccionar entre modo automático y manual, bloquear ajustes,
visualizar gráficas y almacenar configuración localmente.

🧩 Características principales

🔥 ESP32

-   Lectura de temperatura cada 1 segundo usando DHT11
-   Filtro de media móvil para eliminar ruido
-   Lógica de control proporcional por bandas:
    -   PV ≤ SP − 2 → PWM = 0
    -   PV = SP → PWM = 50
    -   PV ≥ SP + 2 → PWM = 100
-   Mapeo seguro de PWM real (35–60 %) para evitar reinicios del ESP32
-   Telemetría JSON cada segundo vía BLE
-   Recepción de comandos desde la app: set_sp, set_mode, set_pwm,
    set_lock

📱 App móvil (React Native)

-   Conexión BLE estable usando react-native-ble-plx
-   Pantalla principal con telemetría y gráfica en tiempo real
-   Historial local de temperatura
-   Visualización de alarmas
-   Configuración persistente con AsyncStorage
-   Bloqueo de controles de setpoint y PWM
-   Barra de navegación inferior

🛠️ Tecnologías utilizadas

-   React Native CLI
-   TypeScript
-   react-native-ble-plx
-   react-native-gifted-charts
-   AsyncStorage
-   C++ para ESP32
-   ArduinoJson, DHT.h, BLEDevice.h

📦 Instalación

git clone https://github.com/EzequielAngel0/ControlTemperaturaApp npm
install
npm run android

📡 UUID BLE del ESP32

Servicio: 4fafc201-1fb5-459e-8fcc-c5c9c331914b
TX: beb5483e-36e1-4688-b7f5-ea07361b26a8
RX: 1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e

📜 Licencia

MIT

👨‍💻 Autor

Ezequiel Ángel
