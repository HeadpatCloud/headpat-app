import '@/global.css';

import { useSession } from '@/lib/auth-client';
import { AppProviders } from '@/lib/providers';
import { NAV_THEME } from '@/lib/theme';
import { PortalHost } from '@rn-primitives/portal';
import { Redirect, Slot, useSegments } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

function AuthGate() {
  const { data, isPending } = useSession();
  const segments = useSegments();

  if (isPending) return null;

  const inAuthGroup = segments[0] === '(auth)';
  if (!data && !inAuthGroup) return <Redirect href="/(auth)/welcome" />;
  if (data && inAuthGroup) return <Redirect href="/(tabs)" />;

  return <Slot />;
}

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <SafeAreaProvider>
      <AppProviders>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <AuthGate />
          <PortalHost />
        </ThemeProvider>
      </AppProviders>
    </SafeAreaProvider>
  );
}
