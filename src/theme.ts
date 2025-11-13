// src/theme.ts
export type AppTheme = {
  colors: {
    background: string;
    card: string;
    text: string;
    border: string;
    tabBarBackground: string;
    tabActive: string;
    tabInactive: string;
    accent: string;
    danger: string;
    muted: string;
  };
};

export const darkTheme: AppTheme = {
  colors: {
    background: '#05050a',
    card: '#111320',
    text: '#ffffff',
    border: '#222533',
    tabBarBackground: '#090b12',
    tabActive: '#4ade80',
    tabInactive: '#777777',
    accent: '#4ade80',
    danger: '#f97373',
    muted: '#6b7280',
  },
};
