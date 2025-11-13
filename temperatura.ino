#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <DHT.h>
#include <ArduinoJson.h>

// =====================
// Configuración DHT11
// =====================
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ================================
// Motor + Puente H (L298N/L293D)
// ================================
#define MOTOR_PWM_PIN 25
#define MOTOR_IN1 26
#define MOTOR_IN2 27
#define PWM_CHANNEL 0
#define PWM_FREQ 1000
#define PWM_RESOLUTION 8

// ===========
// BLE UUIDs
// ===========
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_TX_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8" // Notify ESP32->App
#define CHAR_RX_UUID "1c95d5e3-d8f7-413a-bf3d-7a2e5d7be87e" // Write  App->ESP32

// ===================
// Variables de control
// ===================
float currentTemp = 25.0;   // valor inicial razonable
float setpoint    = 24.0;
int   pwmValue    = 0;      // 0..100 (lógico, lo que ve la app)
bool  autoMode    = true;   // AUTO=true, MANUAL=false
bool  locked      = false;

unsigned long lastSensorRead = 0;
unsigned long lastBLESend    = 0;

const unsigned long SENSOR_INTERVAL = 1000;  // ms (DHT11 ~1s)
const unsigned long BLE_INTERVAL    = 1000;  // ms

// Para lecturas robustas
float lastValidTemp = 25.0;
bool  hasValidTemp  = false;

// Alarmas como arreglo
#include <vector>
std::vector<String> alarms;

// BLE
BLEServer*         pServer           = nullptr;
BLECharacteristic* pTxCharacteristic = nullptr;
bool deviceConnected = false;

// =========================
// Media móvil (suavizado)
// =========================
const int  AVG_N  = 5;
float      avgBuf[AVG_N] = {0};
int        avgIdx        = 0;
bool       avgPriming    = true;

// ============================================
// PROTOTIPOS
// ============================================
void sendAck(bool ok, const String& error);
void setupBLE();
void setupMotor();
float readTemperature();
void  controlLoop();
void  sendBLEData();

// ============================================
// ACK
// ============================================
void sendAck(bool ok, const String& error) {
  StaticJsonDocument<128> doc;
  doc["ok"] = ok;
  if (error.length() > 0) doc["error"] = error;

  String response;
  serializeJson(doc, response);

  if (deviceConnected && pTxCharacteristic) {
    pTxCharacteristic->setValue((uint8_t*)response.c_str(), response.length());
    pTxCharacteristic->notify();
  }
}

// ============================================
// Callbacks BLE
// ============================================
class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("Cliente conectado");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("Cliente desconectado");
    delay(500);
    pServer->startAdvertising();
  }
};

class RxCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) override {
    String rxValue = pCharacteristic->getValue();
    if (rxValue.length() == 0) return;

    Serial.print("Recibido: ");
    Serial.println(rxValue);

    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, rxValue);
    if (err) {
      Serial.print("Error parseando JSON: ");
      Serial.println(err.c_str());
      return;
    }

    String cmd = doc["cmd"] | "";

    // ---------- SETPOINT ----------
    if (cmd == "set_sp") {
      if (!locked) {
        float v = doc["value"] | setpoint;

        // 🔧 Rango válido 20–30 °C
        if (v < 20.0f) v = 20.0f;
        if (v > 30.0f) v = 30.0f;

        setpoint = v;
        sendAck(true, "");
        Serial.printf("Nuevo setpoint: %.1f\n", setpoint);
      } else {
        sendAck(false, "SP_LOCKED");
      }
    }

    // ---------- MODO AUTO/MANUAL ----------
    else if (cmd == "set_mode") {
      // Bloqueamos cambio de modo si locked = true
      if (locked) {
        sendAck(false, "MODE_LOCKED");
        Serial.println("Intento de cambiar modo estando BLOQUEADO");
        return;
      }

      String mode = doc["value"] | "AUTO";
      autoMode = (mode == "AUTO");
      sendAck(true, "");
      Serial.printf("Modo: %s\n", autoMode ? "AUTO" : "MANUAL");
    }

    // ---------- BLOQUEO ----------
    else if (cmd == "set_lock") {
      bool v = doc["value"] | false;
      locked = v;
      sendAck(true, "");
      Serial.printf("Bloqueo: %s\n", locked ? "ACTIVADO" : "DESACTIVADO");
    }

    // ---------- PWM MANUAL ----------
    else if (cmd == "set_pwm") {
      // En AUTO jamás aceptamos set_pwm
      if (autoMode) {
        sendAck(false, "NOT_MANUAL_MODE");
        Serial.println("set_pwm ignorado: modo AUTO");
        return;
      }

      // Sólo en MANUAL, y si NO está bloqueado
      if (locked) {
        sendAck(false, "PWM_LOCKED");
        Serial.println("Intento de cambiar PWM MANUAL estando BLOQUEADO");
        return;
      }

      int v = doc["value"] | pwmValue;
      v = constrain(v, 0, 100);
      pwmValue = v;
      sendAck(true, "");
      Serial.printf("PWM manual (lógico): %d\n", pwmValue);
    }
  }
};

// ============================================
// BLE Setup
// ============================================
void setupBLE() {
  BLEDevice::init("ESP32-TempControl"); // nombre que filtra la app
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHAR_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
    CHAR_RX_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new RxCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("BLE iniciado. Esperando conexión...");
}

// ============================================
// Motor + PWM
// ============================================
void setupMotor() {
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);

  digitalWrite(MOTOR_IN1, HIGH);
  digitalWrite(MOTOR_IN2, LOW);

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcAttach(MOTOR_PWM_PIN, PWM_FREQ, PWM_RESOLUTION);
#else
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(MOTOR_PWM_PIN, PWM_CHANNEL);
#endif

  Serial.println("Motor configurado");
}

// ============================================
// Lectura + Media móvil (robusta)
// ============================================
float readTemperature() {
  alarms.clear();

  float raw = dht.readTemperature();
  bool error = false;

  if (isnan(raw)) {
    alarms.push_back("SENSOR_ERROR");
    error = true;
  } else if (raw < -10 || raw > 60) {
    alarms.push_back("TEMP_OUT_OF_RANGE");
    error = true;
  }

  if (error) {
    // Si ya tenemos alguna lectura válida → la usamos
    if (hasValidTemp) {
      Serial.println("⚠️ DHT inválido, usando última temperatura válida");
      return lastValidTemp;
    }
    // Si nunca hubo una válida, devolvemos currentTemp (inicial)
    Serial.println("⚠️ DHT inválido, sin lecturas previas, usando valor inicial");
    return currentTemp;
  }

  // Media móvil simple
  avgBuf[avgIdx] = raw;
  avgIdx = (avgIdx + 1) % AVG_N;

  float sum = 0;
  int count = avgPriming ? (avgIdx == 0 ? AVG_N : avgIdx) : AVG_N;
  if (avgIdx == 0) avgPriming = false;

  for (int i = 0; i < count; i++) sum += avgBuf[i];
  float filtered = sum / count;

  // Guardamos como "última válida"
  lastValidTemp = filtered;
  hasValidTemp  = true;

  return filtered;
}

// ============================================
// Lazo de control (LO QUE PEDISTE)
//  - PV = SP - 2 → PWM app = 0
//  - PV = SP     → PWM app = 50
//  - PV = SP + 2 → PWM app = 100
//  Extendido por saturación:
//  - PV <= SP - 2 → 0
//  - PV >= SP + 2 → 100
//  Y mapeo motor:
//  - PWM app 0   → 35% real
//  - PWM app 100 → 60% real
// ============================================
void controlLoop() {
  // ---------- MODO AUTO ----------
  if (autoMode) {
    // delta = PV - SP
    float delta = currentTemp - setpoint;
    float logicalPwmF = 0.0f;

    // Caso 1: por debajo de SP - 2 → PWM = 0
    if (delta <= -2.0f) {
      logicalPwmF = 0.0f;
    }
    // Caso 2: por encima de SP + 2 → PWM = 100
    else if (delta >= 2.0f) {
      logicalPwmF = 100.0f;
    }
    // Caso 3: entre SP - 2 y SP → ramp 0 → 50
    else if (delta < 0.0f) {
      // delta ∈ (-2, 0)
      // mapeo: delta=-2 → 0, delta=0 → 50
      float x = (delta + 2.0f) / 2.0f;  // 0..1
      logicalPwmF = x * 50.0f;          // 0..50
    }
    // Caso 4: entre SP y SP + 2 → ramp 50 → 100
    else {
      // delta ∈ [0, 2)
      // mapeo: delta=0 → 50, delta=2 → 100
      float x = delta / 2.0f;           // 0..1
      logicalPwmF = 50.0f + x * 50.0f;  // 50..100
    }

    // Clamp final
    if (logicalPwmF < 0.0f)   logicalPwmF = 0.0f;
    if (logicalPwmF > 100.0f) logicalPwmF = 100.0f;

    pwmValue = (int)(logicalPwmF + 0.5f); // redondeo
  }

  // ---------- MODO MANUAL ----------
  // En MANUAL, pwmValue viene de set_pwm (0..100)

  // Clamp general
  if (pwmValue < 0)   pwmValue = 0;
  if (pwmValue > 100) pwmValue = 100;

  int logicalPwm   = pwmValue;
  int effectivePwm = 0;

  // ======================================
  // Mapeo PWM lógico (0..100) → real (35..60)
  //  App 0   -> 35% real
  //  App 100 -> 60% real
  //  E = 35 + 0.25 * L
  // ======================================
  effectivePwm = 35 + (logicalPwm * 25) / 100;
  if (effectivePwm > 60) effectivePwm = 60;

  int duty = map(effectivePwm, 0, 100, 0, 255);

#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 0, 0)
  ledcWrite(MOTOR_PWM_PIN, duty);
#else
  ledcWrite(PWM_CHANNEL, duty);
#endif

  // Debug para validar comportamiento
  // Serial.printf("SP=%.1f PV=%.1f delta=%.2f | PWM_app=%d, PWM_real=%d, duty=%d\n",
  //               setpoint, currentTemp, delta, logicalPwm, effectivePwm, duty);
}

// ============================================
// Telemetría BLE (JSON enmarcado) + DEBUG
// ============================================
void sendBLEData() {
  if (!deviceConnected || !pTxCharacteristic) return;

  StaticJsonDocument<512> doc;
  doc["pv"]   = currentTemp;
  doc["sp"]   = setpoint;
  doc["pwm"]  = pwmValue; // PWM lógico 0–100
  doc["mode"] = autoMode ? "AUTO" : "MANUAL";
  doc["locked"] = locked;

  JsonArray a = doc.createNestedArray("alarms");
  for (auto &s : alarms) a.add(s);

  doc["timestamp"] = millis() / 1000;

  String out;
  serializeJson(doc, out);

  String framed = "<<" + out + ">>";

  Serial.print("Enviando framed: ");
  Serial.println(framed);

  pTxCharacteristic->setValue((uint8_t*)framed.c_str(), framed.length());
  pTxCharacteristic->notify();
}

// ============================================
// SETUP
// ============================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Sistema de Control de Temperatura ===\n");

  dht.begin();
  delay(2000);

  // Inicializamos buffer de media móvil con el valor inicial
  for (int i = 0; i < AVG_N; i++) {
    avgBuf[i] = currentTemp;
  }
  hasValidTemp  = false;
  avgIdx        = 0;
  avgPriming    = true;

  setupMotor();
  setupBLE();

  Serial.println("✓ Sistema iniciado. Esperando conexión BLE...");
}

// ============================================
// LOOP
// ============================================
void loop() {
  unsigned long now = millis();

  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;
    currentTemp = readTemperature();

    Serial.printf("PV: %.1f °C | SP: %.1f °C | PWM lógico: %d %% | MODO: %s\n",
      currentTemp, setpoint, pwmValue, autoMode ? "AUTO" : "MANUAL");

    controlLoop();
  }

  if (now - lastBLESend >= BLE_INTERVAL) {
    lastBLESend = now;
    sendBLEData();
  }

  delay(10);
}
