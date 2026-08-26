import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { get } from '@/api/client';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/auth/useAuth';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

interface MaintenanceModule {
  module: string;
  message?: string | null;
  block_reads?: boolean;
}

interface MaintenancePage {
  path: string;
  message?: string | null;
}

interface PublicSettingsResponse {
  settings: Record<string, string>;
  module_maintenance: MaintenanceModule[];
  page_maintenance: MaintenancePage[];
}

interface MaintenanceContextValue {
  isModuleActive: (module: string) => boolean;
  getModuleMessage: (module: string) => string | null;
  isPageActive: (path: string) => boolean;
}

const MaintenanceContext = createContext<MaintenanceContextValue | null>(null);

export function useMaintenance(): MaintenanceContextValue | null {
  return useContext(MaintenanceContext);
}

function MaintenanceScreen({ message }: { message?: string | null }): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <Screen>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>{t('common.comingSoon')}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message ?? t('common.comingSoon')}</Text>
          <Text style={[styles.hint, { color: colors.textSubtle }]}>يرجى المحاولة لاحقاً</Text>
        </Card>
      </View>
    </Screen>
  );
}

export function MaintenanceGate({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      try {
        const res = await get<PublicSettingsResponse>('/settings/public');
        return {
          global: res.settings?.maintenance_mode === '1',
          modules: res.module_maintenance ?? [],
          pages: res.page_maintenance ?? [],
        };
      } catch {
        return { global: false, modules: [] as MaintenanceModule[], pages: [] as MaintenancePage[] };
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const globalMaintenance = data?.global ?? false;

  const activeModules = useMemo(() => {
    const map: Record<string, MaintenanceModule> = {};
    for (const m of data?.modules ?? []) map[m.module] = m;
    return map;
  }, [data?.modules]);

  const activePages = useMemo(() => {
    const map: Record<string, MaintenancePage> = {};
    for (const p of data?.pages ?? []) map[p.path] = p;
    return map;
  }, [data?.pages]);

  const isModuleActive = useCallback((mod: string) => Boolean(activeModules[mod]), [activeModules]);
  const getModuleMessage = useCallback((mod: string) => activeModules[mod]?.message ?? null, [activeModules]);

  const isPageActive = useCallback(
    (path: string) => {
      if (path.startsWith('/(admin)') || path.startsWith('/admin')) return false;
      if (activePages[path]) return true;
      const prefix = `/${path.split('/').filter(Boolean)[0] ?? ''}`;
      if (prefix !== path && activePages[prefix]) return true;
      return false;
    },
    [activePages],
  );

  const getPageMessage = useCallback(
    (path: string) => {
      if (activePages[path]) return activePages[path]?.message ?? null;
      const prefix = `/${path.split('/').filter(Boolean)[0] ?? ''}`;
      return activePages[prefix]?.message ?? null;
    },
    [activePages],
  );

  const ctx = useMemo<MaintenanceContextValue>(
    () => ({ isModuleActive, getModuleMessage, isPageActive }),
    [isModuleActive, getModuleMessage, isPageActive],
  );

  if (isLoading) return <>{children}</>;

  if (globalMaintenance && !isAdmin) {
    const isAdminRoute = pathname?.startsWith('/(admin)') || pathname?.startsWith('/admin');
    if (!isAdminRoute) return <MaintenanceScreen />;
  }

  if (isPageActive(pathname ?? '/')) {
    return <MaintenanceScreen message={getPageMessage(pathname ?? '/')} />;
  }

  return <MaintenanceContext.Provider value={ctx}>{children}</MaintenanceContext.Provider>;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { gap: 8, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
