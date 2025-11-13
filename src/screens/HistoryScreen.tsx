// src/screens/HistoryScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {LineChart} from 'react-native-gifted-charts';
import {useTelemetry} from '../ble/TelemetryContext';
import {darkTheme} from '../theme';

const colors = darkTheme.colors;

const HistoryScreen: React.FC = () => {
  const {history} = useTelemetry();

  const lastSamples = history.slice(-40);
  const chartData = lastSamples.map((t, idx) => ({
    value: t.pv,
    label: `${idx}`,
  }));

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Historial de temperatura</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Gráfica (PV)</Text>
        {chartData.length > 1 ? (
          <LineChart
            data={chartData}
            thickness={2}
            color={colors.accent}
            areaChart
            startFillColor="rgba(74, 222, 128, 0.3)"
            endFillColor="rgba(15, 23, 42, 0.1)"
            startOpacity={0.8}
            endOpacity={0.1}
            hideDataPoints={false}
            hideRules={true}
            hideYAxisText={true}
            adjustToWidth={true}
          />
        ) : (
          <Text style={styles.muted}>
            Todavía no hay suficientes muestras para mostrar una
            gráfica.
          </Text>
        )}
      </View>

      <View style={[styles.card, {flex: 1}]}>
        <Text style={styles.cardTitle}>Muestras recientes</Text>
        <ScrollView>
          {lastSamples.length === 0 ? (
            <Text style={styles.muted}>Sin datos aún.</Text>
          ) : (
            lastSamples
              .slice()
              .reverse()
              .map((t, idx) => (
                <Text key={idx} style={styles.rowText}>
                  PV: {t.pv.toFixed(1)} °C | SP: {t.sp.toFixed(1)} °C |
                  {'  '}PWM: {t.pwm}% | {t.mode}
                </Text>
              ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  muted: {
    fontSize: 13,
    color: colors.muted,
  },
  rowText: {
    fontSize: 13,
    color: '#e5e7eb',
    marginBottom: 4,
  },
});

export default HistoryScreen;
