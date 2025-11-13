// src/screens/AlarmsScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useTelemetry} from '../ble/TelemetryContext';
import {darkTheme} from '../theme';

const colors = darkTheme.colors;

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const AlarmsScreen: React.FC = () => {
  const {alarms} = useTelemetry();

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Alarmas</Text>

      <View style={[styles.card, {flex: 1}]}>
        <ScrollView>
          {alarms.length === 0 ? (
            <Text style={styles.muted}>
              Aún no se han registrado alarmas en esta sesión.
            </Text>
          ) : (
            alarms.map(a => (
              <View key={a.id} style={styles.alarmItem}>
                <Text style={styles.alarmTime}>
                  {formatTime(a.timestamp)}
                </Text>
                <Text style={styles.alarmMessage}>{a.message}</Text>
                <Text style={styles.alarmDetail}>
                  PV: {a.pv.toFixed(1)} °C | SP: {a.sp.toFixed(1)} °C
                </Text>
              </View>
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
  },
  muted: {
    fontSize: 13,
    color: colors.muted,
  },
  alarmItem: {
    marginBottom: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  alarmTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  alarmMessage: {
    fontSize: 14,
    color: '#fbbf24',
    marginTop: 2,
  },
  alarmDetail: {
    fontSize: 13,
    color: '#e5e7eb',
  },
});

export default AlarmsScreen;
