import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="auto" />
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: '#185FA5',
            tabBarInactiveTintColor: '#888780',
            tabBarStyle: {
              borderTopWidth: 0.5,
              borderTopColor: '#D3D1C7',
              paddingBottom: 4,
              height: 60,
            },
            tabBarLabelStyle: { fontSize: 11, marginTop: -2 },
            headerStyle: { borderBottomWidth: 0.5, borderBottomColor: '#D3D1C7' } as any,
            headerTitleStyle: { fontSize: 17, fontWeight: '600' },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Tableau de bord',
              tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
              tabBarLabel: 'Accueil',
            }}
          />
          <Tabs.Screen
            name="transactions"
            options={{
              title: 'Transactions',
              tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
              tabBarLabel: 'Dépenses',
            }}
          />
          <Tabs.Screen
            name="budget"
            options={{
              title: 'Budgets',
              tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
              tabBarLabel: 'Budgets',
            }}
          />
          <Tabs.Screen
            name="forecast"
            options={{
              title: 'Prévisions',
              tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
              tabBarLabel: 'Prévisions',
            }}
          />
          <Tabs.Screen
            name="savings"
            options={{
              title: 'Épargne',
              tabBarIcon: ({ color, size }) => <Ionicons name="save-outline" size={size} color={color} />,
              tabBarLabel: 'Épargne',
            }}
          />
          <Tabs.Screen
            name="simulator"
            options={{
              title: 'Simulateur',
              tabBarIcon: ({ color, size }) => <Ionicons name="calculator-outline" size={size} color={color} />,
              tabBarLabel: 'Simul.',
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Paramètres',
              tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
              tabBarLabel: 'Réglages',
            }}
          />
          <Tabs.Screen name="add-transaction" options={{ href: null, title: 'Nouvelle transaction' }} />
        </Tabs>
      </AppProvider>
    </SafeAreaProvider>
  );
}
