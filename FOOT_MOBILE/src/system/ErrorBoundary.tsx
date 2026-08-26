import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

const FALLBACK_COLORS = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  primary: '#22c55e',
  textOnPrimary: '#0f172a',
  bgMuted: '#1e293b',
} as const;

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }): React.JSX.Element {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: FALLBACK_COLORS.bg }]}>
      <View style={[styles.card, { backgroundColor: FALLBACK_COLORS.surface, borderColor: FALLBACK_COLORS.border }]}>
        <Text style={[styles.title, { color: FALLBACK_COLORS.text }]}>حدث خطأ غير متوقع</Text>
        <Text style={[styles.message, { color: FALLBACK_COLORS.muted }]}>
          نعتذر، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.
        </Text>
        {__DEV__ && error ? (
          <View style={[styles.devBox, { backgroundColor: FALLBACK_COLORS.bgMuted, borderColor: FALLBACK_COLORS.border }]}>
            <Text style={[styles.devText, { color: FALLBACK_COLORS.muted }]} numberOfLines={4}>
              {error.message}
            </Text>
          </View>
        ) : null}
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          accessibilityLabel="إعادة المحاولة"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: FALLBACK_COLORS.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={[styles.buttonText, { color: FALLBACK_COLORS.textOnPrimary }]}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  card: {
    gap: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  devBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  devText: { fontSize: 11, fontFamily: 'monospace' },
  button: { marginTop: 8, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
});
