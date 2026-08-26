import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing } from '@/theme/spacing';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const bgMap: Record<ToastType, string> = {
  success: '#16a34a',
  error: '#f43f5e',
  info: '#0f172a',
};

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 ? (
        <SafeAreaView style={styles.container} pointerEvents="none" edges={['top']}>
          {toasts.map((t) => (
            <View key={t.id} style={[styles.toast, { backgroundColor: bgMap[t.type] }]}>
              <Text style={styles.text}>{t.message}</Text>
            </View>
          ))}
        </SafeAreaView>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: spacing.md,
    gap: spacing.sm,
    zIndex: 999,
  },
  toast: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xl,
    minWidth: 200,
    maxWidth: 480,
    alignItems: 'center',
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
