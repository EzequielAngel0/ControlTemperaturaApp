// App.tsx
import React, {useState} from 'react';
import {SafeAreaView, View} from 'react-native';

import {TelemetryProvider} from './src/ble/TelemetryContext';
import {BottomTabs, TabKey} from './src/components/BottomTabs';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import AlarmsScreen from './src/screens/AlarmsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {darkTheme} from './src/theme';

const App: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('home');

  let screen: React.ReactNode;
  switch (tab) {
    case 'home':
      screen = <DashboardScreen />;
      break;
    case 'history':
      screen = <HistoryScreen />;
      break;
    case 'alarms':
      screen = <AlarmsScreen />;
      break;
    case 'settings':
    default:
      screen = <SettingsScreen />;
      break;
  }

  return (
    <TelemetryProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: darkTheme.colors.background,
        }}>
        <View style={{flex: 1}}>{screen}</View>
        <BottomTabs theme={darkTheme} tab={tab} onChangeTab={setTab} />
      </SafeAreaView>
    </TelemetryProvider>
  );
};

export default App;
