import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Brand, Colors } from '@/constants/theme';
import { PlatformAuthProvider } from '@/context/platform-auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Show local notifications while the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    primary: Brand.primary,
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Brand.primary,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <PlatformAuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomLightTheme}>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: Brand.primary,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          headerBackTitleStyle: { fontSize: 15 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen
          name="results"
          options={{
            title: 'Comparison',
            headerBackTitle: 'Home',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
    </PlatformAuthProvider>
  );
}
