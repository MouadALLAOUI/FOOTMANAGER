import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, View, Pressable, StyleSheet } from 'react-native';

import { setupNetworkMonitoring } from '@/api/network';
import { queryClient } from '@/api/query-client';
import { AuthGuard } from '@/auth/AuthGuard';
import { AuthProvider } from '@/auth/AuthProvider';
import { SessionRestoreGate } from '@/auth/SessionRestoreGate';
import { ToastProvider } from '@/components/ui/Toast';
import { I18nProvider } from '@/i18n/I18nProvider';

import { ActivityLockBanner } from '@/system/ActivityLockBanner';
import { DeepLinkBootstrap } from '@/system/DeepLinkBootstrap';
import { ErrorBoundary } from '@/system/ErrorBoundary';
import { MaintenanceGate } from '@/system/MaintenanceGate';
import { OfflineBanner } from '@/system/OfflineBanner';
import { PushNotificationsBootstrap } from '@/system/PushNotificationsBootstrap';
import { ThemedStatusBar } from '@/system/ThemedStatusBar';
import { useAppBootstrap } from '@/system/useAppBootstrap';
import { ModeSwitchFAB } from '@/components/navigation/ModeSwitchFAB';
import { appLogger } from '@/services/logger/app-logger';
import { ThemeProvider } from '@/theme/ThemeProvider';


function BootstrapGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isReady, error, retry } = useAppBootstrap();

  if (error) {
    return (
      <View style={bootstrapStyles.container}>
        <Text style={bootstrapStyles.title}>تعذر تهيئة التطبيق</Text>
        <Text style={bootstrapStyles.message}>{error}</Text>
        <Text style={bootstrapStyles.hint}>تحقق من EXPO_PUBLIC_API_URL في .env</Text>
        <Pressable onPress={retry} style={bootstrapStyles.button} accessibilityRole="button">
          <Text style={bootstrapStyles.buttonText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) return <View style={bootstrapStyles.container} />;

  return <>{children}</>;
}

export default function RootLayout(): React.JSX.Element {
  useEffect(() => {
    appLogger.init();
    setupNetworkMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BootstrapGate>
          <SafeAreaProvider>
            <I18nProvider>
              <ThemeProvider>
                <AuthProvider>
                  <SessionRestoreGate>
                    <ToastProvider>
                    <PushNotificationsBootstrap />
                    <DeepLinkBootstrap />
                    <ThemedStatusBar />
                    <OfflineBanner />
                    <ActivityLockBanner />
                    <MaintenanceGate>
                      <AuthGuard>
                        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                          <Stack.Screen name="index" />
                          <Stack.Screen name="(public)" />
                          <Stack.Screen name="(auth)" />
                          <Stack.Screen name="(manager)" />
                          <Stack.Screen name="(player)" />
                          <Stack.Screen name="(terrain)" />
                          <Stack.Screen name="(committee)" />
                          <Stack.Screen name="(admin)" />
                          <Stack.Screen name="+not-found" />
                        </Stack>
                      </AuthGuard>
                    </MaintenanceGate>
                    <ModeSwitchFAB />
                  </ToastProvider>
                  </SessionRestoreGate>
                </AuthProvider>
              </ThemeProvider>
            </I18nProvider>
          </SafeAreaProvider>
        </BootstrapGate>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const bootstrapStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
  hint: { color: '#64748b', fontSize: 11, textAlign: 'center' },
  button: { marginTop: 8, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
});
