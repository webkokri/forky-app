import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/auth';
import { CartProvider } from '@/cart';
import { FavoritesProvider } from '@/favorites';
import { PaymentsProvider } from '@/payments';
import { RealtimeProvider } from '@/realtime';
import { CatalogProvider, useCatalog } from '@/catalog';
import { SplashAnimation } from '@/components/SplashAnimation';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Keeps the splash up until Home's data has loaded. */
function SplashGate({ onDone }: { onDone: () => void }) {
  const { loading } = useCatalog();
  return <SplashAnimation ready={!loading} onDone={onDone} />;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  // browser previews can skip the intro with ?nosplash (no effect on phones)
  const [splash, setSplash] = useState(() => !(Platform.OS === 'web' && typeof location !== 'undefined' && location.search.includes('nosplash')));
  useEffect(() => { if (loaded) void SplashScreen.hideAsync().catch(() => {}); }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.brand }} />;

  return (
    <SafeAreaProvider>
      <AuthProvider>
      <CatalogProvider>
      <PaymentsProvider>
      <RealtimeProvider>
      <FavoritesProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="store/[id]" />
          <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="addresses" />
          <Stack.Screen name="order/[id]" />
          <Stack.Screen name="wallet" />
          <Stack.Screen name="cards" />
          <Stack.Screen name="payments" />
        </Stack>
      </CartProvider>
      </FavoritesProvider>
      </RealtimeProvider>
      </PaymentsProvider>
      {splash && <SplashGate onDone={() => setSplash(false)} />}
      </CatalogProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
