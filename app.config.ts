import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Budget Tracker',
  slug: 'budget-tracker',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.yourname.budgettracker',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
    package: 'com.yourname.budgettracker',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
  ],
  scheme: 'budget-tracker',
  experiments: {
    typedRoutes: true,
  },
});
