// src/screens/SettingsScreen.tsx
import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import {useTelemetry} from '../ble/TelemetryContext';
import {darkTheme} from '../theme';

const colors = darkTheme.colors;

const SettingsScreen: React.FC = () => {
  const {autoConnectEnabled, setAutoConnectEnabled} = useTelemetry();

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Configuración</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={{flex: 1}}>
            <Text style={styles.label}>Conexión automática</Text>
            <Text style={styles.muted}>
              Si está activada, la app recordará esta opción y
              reconectará automáticamente al ESP32 cuando sea posible.
            </Text>
          </View>
          <Switch
            value={autoConnectEnabled}
            onValueChange={setAutoConnectEnabled}
            trackColor={{false: '#444', true: colors.accent}}
            thumbColor={colors.text}
          />
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  muted: {
    fontSize: 13,
    color: colors.muted,
  },
});

export default SettingsScreen;
