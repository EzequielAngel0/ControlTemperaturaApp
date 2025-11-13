// src/components/BottomTabs.tsx
import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {AppTheme} from '../theme';

export type TabKey = 'home' | 'history' | 'alarms' | 'settings';

type Props = {
  theme: AppTheme;
  tab: TabKey;
  onChangeTab: (key: TabKey) => void;
};

export const BottomTabs: React.FC<Props> = ({theme, tab, onChangeTab}) => {
  const colors = theme.colors;

  const tabs: {key: TabKey; label: string; icon: string}[] = [
    {key: 'home', label: 'Inicio', icon: '🏠'},
    {key: 'history', label: 'Historial', icon: '📈'},
    {key: 'alarms', label: 'Alarmas', icon: '🚨'},
    {key: 'settings', label: 'Ajustes', icon: '⚙️'},
  ];

  return (
    <View
      style={{
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.tabBarBackground,
        paddingVertical: 6,
        paddingHorizontal: 8,
      }}>
      {tabs.map(t => {
        const active = t.key === tab;
        return (
          <TouchableOpacity
            key={t.key}
            onPress={() => onChangeTab(t.key)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 4,
            }}>
            <Text
              style={{
                fontSize: 16,
                marginBottom: 2,
                color: active ? colors.tabActive : colors.tabInactive,
              }}>
              {t.icon}
            </Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: active ? '700' : '500',
                color: active ? colors.tabActive : colors.tabInactive,
              }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
