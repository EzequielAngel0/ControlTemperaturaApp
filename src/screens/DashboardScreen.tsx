// src/screens/DashboardScreen.tsx
import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {LineChart} from 'react-native-gifted-charts';
import {useTelemetry} from '../ble/TelemetryContext';
import {darkTheme} from '../theme';

const colors = darkTheme.colors;

const DashboardScreen: React.FC = () => {
  const {
    connected,
    telemetry,
    history,
    connect,
    setMode,
    setSetpoint,
    setLock,
    setManualPwm,
    error,
  } = useTelemetry();

  const [localSp, setLocalSp] = useState(30);
  const [localPwm, setLocalPwm] = useState(0);
  const [localMode, setLocalMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [localLocked, setLocalLocked] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const mergedError = localError || error;

  const handleMainButtonPress = async () => {
    setLocalError(null);
    if (connected) {
      BackHandler.exitApp();
      return;
    }
    try {
      await connect();
    } catch (e: any) {
      setLocalError(String(e?.message ?? e));
    }
  };

  const handleModeToggle = async (mode: 'AUTO' | 'MANUAL') => {
    const isLocked = localLocked || telemetry?.locked;
    if (isLocked) {
      setLocalError(
        'Modo bloqueado: desbloquea antes de cambiar AUTO/MANUAL',
      );
      return;
    }
    if (localMode === mode) return;

    try {
      await setMode(mode);
      setLocalMode(mode);
    } catch (e: any) {
      setLocalError(String(e?.message ?? e));
    }
  };

  const handleSetpointChange = async (value: number) => {
    setLocalSp(value);
    if (!telemetry?.locked) {
      try {
        await setSetpoint(value);
      } catch (e: any) {
        setLocalError(String(e?.message ?? e));
      }
    }
  };

  const handleLockToggle = async () => {
    const newLocked = !localLocked;
    try {
      await setLock(newLocked);
      setLocalLocked(newLocked);
    } catch (e: any) {
      setLocalError(String(e?.message ?? e));
    }
  };

  const handlePwmChange = async (value: number) => {
    setLocalPwm(value);
    const isLocked = localLocked || telemetry?.locked;
    if (isLocked) {
      setLocalError('PWM bloqueado: desbloquea antes de cambiarlo');
      return;
    }
    if (localMode === 'MANUAL') {
      try {
        await setManualPwm(Math.round(value));
      } catch (e: any) {
        setLocalError(String(e?.message ?? e));
      }
    }
  };

  // Sincronizar controles con telemetría real
  useEffect(() => {
    if (telemetry) {
      setLocalSp(telemetry.sp);
      setLocalMode(
        telemetry.mode === 'AUTO' || telemetry.mode === 'MANUAL'
          ? telemetry.mode
          : 'AUTO',
      );
      setLocalLocked(telemetry.locked);
      setLocalPwm(telemetry.pwm);
    }
  }, [telemetry]);

  const recent = history.slice(-60);
  const chartData = recent.map(t => ({value: t.pv}));

  const pv = telemetry?.pv ?? 0;
  const sp = telemetry?.sp ?? 0;
  const delta = pv - sp;
  const deltaText =
    telemetry == null ? '' : `${delta >= 0 ? '+' : ''}${delta.toFixed(
      1,
    )}°C`;

  const estadoBloqueo = telemetry?.locked ? 'Bloqueado' : 'Desbloqueado';
  const modeLockedUI = localLocked || telemetry?.locked;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{paddingBottom: 32}}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>TempControlApp</Text>
        <Text style={styles.subtitle}>Control térmico en tiempo real</Text>
        <Text style={styles.connectionText}>
          {connected ? 'Conectado' : 'Desconectado'}
        </Text>
      </View>

      {/* Botón principal conectar/cerrar app */}
      <TouchableOpacity
        style={[
          styles.connectButton,
          {backgroundColor: connected ? '#f97373' : colors.accent},
        ]}
        onPress={handleMainButtonPress}>
        <Text style={styles.connectText}>
          {connected ? 'Cerrar aplicación' : 'Conectar ESP32'}
        </Text>
      </TouchableOpacity>

      {mergedError && (
        <Text style={styles.errorText}>⚠ {mergedError}</Text>
      )}

      {/* Telemetría mejorada */}
      <View style={styles.telemetryCard}>
        <Text style={styles.sectionLabel}>Telemetría</Text>
        {telemetry ? (
          <>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>Temperatura</Text>
              <Text style={styles.telemetryValue}>
                {telemetry.pv.toFixed(1)} °C
              </Text>
            </View>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>Setpoint</Text>
              <Text style={styles.telemetryValue}>
                {telemetry.sp.toFixed(1)} °C
              </Text>
            </View>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>PWM</Text>
              <Text style={styles.telemetryValue}>{telemetry.pwm} %</Text>
            </View>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>Modo</Text>
              <Text
                style={[
                  styles.badge,
                  telemetry.mode === 'AUTO'
                    ? styles.badgeAuto
                    : styles.badgeManual,
                ]}>
                {telemetry.mode}
              </Text>
            </View>
            <View style={styles.telemetryRow}>
              <Text style={styles.telemetryLabel}>Bloqueo</Text>
              <Text
                style={[
                  styles.badge,
                  telemetry.locked
                    ? styles.badgeLocked
                    : styles.badgeUnlocked,
                ]}>
                {estadoBloqueo}
              </Text>
            </View>
          </>
        ) : (
          <Text style={styles.muted}>
            Sin datos aún. Conéctate al ESP32 y espera 1–2 segundos.
          </Text>
        )}
      </View>

      {/* Temperatura + gráfica en tiempo real */}
      <View style={styles.tempCard}>
        <Text style={styles.sectionLabel}>Temperatura</Text>
        <Text style={styles.tempValue}>
          {telemetry ? `${telemetry.pv.toFixed(1)}°C` : '--.- °C'}
        </Text>
        <Text style={styles.tempSubtitle}>
          {telemetry ? 'Últimos 60 segundos ' : ''}
          {telemetry && (
            <Text style={styles.tempDelta}>{deltaText}</Text>
          )}
        </Text>

        <View style={{height: 140, marginTop: 12}}>
          {chartData.length > 1 ? (
            <LineChart
              data={chartData}
              thickness={2}
              color={colors.accent}
              curved
              areaChart
              startFillColor="rgba(74, 222, 128, 0.25)"
              endFillColor="rgba(15, 23, 42, 0.05)"
              startOpacity={0.7}
              endOpacity={0.1}
              hideDataPoints
              hideRules
              hideYAxisText
              adjustToWidth
              xAxisLabelTexts={['0s', '15s', '30s', '45s', '60s']}
              xAxisLabelTextStyle={{
                color: colors.muted,
                fontSize: 10,
              }}
            />
          ) : (
            <Text style={styles.muted}>
              Recopilando muestras para la gráfica…
            </Text>
          )}
        </View>
      </View>

      {/* Controles */}
      <View style={styles.controlsCard}>
        <Text style={styles.sectionLabel}>Controles</Text>

        {/* Segmento AUTO / MANUAL */}
        <View
          style={[
            styles.segmentContainer,
            modeLockedUI && {opacity: 0.5},
          ]}>
          <TouchableOpacity
            disabled={modeLockedUI}
            style={[
              styles.segmentItem,
              localMode === 'AUTO' && styles.segmentItemActive,
            ]}
            onPress={() => handleModeToggle('AUTO')}>
            <Text
              style={[
                styles.segmentText,
                localMode === 'AUTO' && styles.segmentTextActive,
              ]}>
              AUTO
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={modeLockedUI}
            style={[
              styles.segmentItem,
              localMode === 'MANUAL' && styles.segmentItemActive,
            ]}
            onPress={() => handleModeToggle('MANUAL')}>
            <Text
              style={[
                styles.segmentText,
                localMode === 'MANUAL' && styles.segmentTextActive,
              ]}>
              MANUAL
            </Text>
          </TouchableOpacity>
        </View>

        {/* Setpoint */}
        <View style={{marginTop: 16}}>
          <Text style={styles.fieldLabel}>Setpoint</Text>
          <View style={styles.fakeInput}>
            <Text style={styles.fakeInputText}>
              {localSp.toFixed(1)} °C
            </Text>
          </View>
          <Slider
            minimumValue={20}
            maximumValue={30}
            step={0.5}
            value={localSp}
            onSlidingComplete={handleSetpointChange}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </View>

        {/* PWM */}
        <View style={{marginTop: 16}}>
          <View style={styles.pwmRow}>
            <Text style={styles.fieldLabel}>PWM (%)</Text>
            <Text style={styles.pwmValue}>{Math.round(localPwm)}</Text>
          </View>
          <Slider
            minimumValue={0}
            maximumValue={100}
            step={1}
            value={localPwm}
            onSlidingComplete={handlePwmChange}
            minimumTrackTintColor={colors.accent}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.accent}
          />
        </View>

        {/* Bloquear setpoint / modo / PWM */}
        <TouchableOpacity
          style={styles.lockButton}
          onPress={handleLockToggle}>
          <Text style={styles.lockText}>Bloquear setpoint, modo y PWM</Text>
          <View
            style={[
              styles.lockIndicator,
              {
                backgroundColor: localLocked
                  ? colors.accent
                  : colors.border,
              },
            ]}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  header: {
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  connectionText: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  connectButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginBottom: 14,
  },
  connectText: {
    color: '#05050a',
    fontWeight: '600',
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 6,
  },
  telemetryCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  tempCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  controlsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  muted: {
    fontSize: 12,
    color: colors.muted,
  },
  tempValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  tempSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  tempDelta: {
    color: colors.accent,
    fontWeight: '600',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  telemetryLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  telemetryValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    overflow: 'hidden',
  },
  badgeAuto: {
    backgroundColor: '#16a34a33',
    color: '#bbf7d0',
  },
  badgeManual: {
    backgroundColor: '#1f293733',
    color: '#e5e7eb',
  },
  badgeLocked: {
    backgroundColor: '#f9737333',
    color: '#fecaca',
  },
  badgeUnlocked: {
    backgroundColor: '#16a34a33',
    color: '#bbf7d0',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#10121e',
    borderRadius: 999,
    padding: 3,
    marginTop: 8,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 999,
  },
  segmentItemActive: {
    backgroundColor: '#1f2933',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4,
  },
  fakeInput: {
    backgroundColor: '#141827',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  fakeInputText: {
    color: '#d1d5db',
    fontSize: 13,
  },
  pwmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pwmValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  lockButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#141827',
  },
  lockText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  lockIndicator: {
    width: 16,
    height: 16,
    borderRadius: 999,
  },
});

export default DashboardScreen;
