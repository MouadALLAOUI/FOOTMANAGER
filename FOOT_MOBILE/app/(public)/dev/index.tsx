import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { get } from '@/api/client';
import { getUserMessage } from '@/api/errors';
import { qSelfTestPing } from '@/api/query-keys';
import { getAppConfig } from '@/config/env';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { runStorageSelfTest, type StorageSelfTestReport } from '@/services/storage';
import { DevOnlyGate } from '@/system/DevOnlyGate';

const COLORS = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  muted: '#94a3b8',
  primary: '#22c55e',
  danger: '#f43f5e',
  amber: '#f59e0b',
} as const;

const STATE_COLOR: Record<string, string> = {
  pass: COLORS.primary,
  fail: COLORS.danger,
  skip: COLORS.amber,
};
const STATE_LABEL: Record<string, string> = { pass: '✓', fail: '✗', skip: '⤼' };

function useApiConfig(): { apiUrl: string; env: string; error: string | null } {
  try {
    const config = getAppConfig();
    return { apiUrl: config.apiUrl, env: config.env, error: null };
  } catch (error) {
    return {
      apiUrl: '—',
      env: 'unknown',
      error: error instanceof Error ? error.message : 'Unknown env error',
    };
  }
}

export default function DevDiagnostics(): React.JSX.Element {
  return (
    <DevOnlyGate>
      <DevDiagnosticsContent />
    </DevOnlyGate>
  );
}

function DevDiagnosticsContent(): React.JSX.Element {
  const api = useApiConfig();
  const network = useNetworkStatus();
  const [report, setReport] = useState<StorageSelfTestReport | null>(null);
  const [running, setRunning] = useState(false);

  const ping = useQuery({
    queryKey: qSelfTestPing(),
    queryFn: async () => ({ ok: true, at: new Date().toISOString() }),
  });

  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => get<{ status: string; timestamp: string }>('/health'),
    retry: false,
    enabled: network.isOnline,
  });

  const onRunSelfTest = useCallback(async () => {
    setRunning(true);
    setReport(null);
    try {
      const result = await runStorageSelfTest();
      setReport(result);
    } catch (error) {
      setReport({
        backend: 'memory',
        secureSupported: false,
        allPassed: false,
        results: [{ id: 'runner', label: 'Runner crashed', state: 'fail', detail: String(error) }],
      });
    } finally {
      setRunning(false);
    }
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>FootMANAGER Mobile — Dev Diagnostics</Text>
      <Text style={styles.subtitle}>Development only · not visible in production</Text>

      <View style={styles.card}>
        <SectionLabel label="Infrastructure" />
        <Row k="Platform" v={String(process.env.EXPO_OS ?? 'native')} />
        <Row k="API env" v={api.env} />
        <Row k="API url" v={api.apiUrl} mono />
        <Row k="Persistent store" v={report?.backend ?? 'sqlite | memory*'} />
        <Row k="SecureStore" v={report ? String(report.secureSupported) : 'expo-secure-store'} />
        <Row
          k="QueryClient ping"
          v={
            ping.isSuccess && ping.data.ok
              ? `✓ ${ping.data.at}`
              : ping.isError
                ? '✗ failed'
                : '…'
          }
        />
        {api.error ? <Text style={styles.errorText}>{api.error}</Text> : null}
      </View>

      <View style={styles.card}>
        <SectionLabel label="Network & API" />
        <Row k="Network" v={network.isOnline ? `online (${network.type ?? 'unknown'})` : 'offline'} />
        <Row
          k="GET /health"
          v={
            !network.isOnline
              ? '— offline (skipped)'
              : health.isPending
                ? '…'
                : health.isSuccess
                  ? `✓ ${health.data.status} @ ${health.data.timestamp}`
                  : `✗ ${getUserMessage(health.error)}`
          }
          mono={health.isSuccess}
        />
        {health.isError && network.isOnline ? (
          <Text style={styles.errorText}>{String((health.error as Error).message)}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <SectionLabel label="Storage self-test (dev)" />
        <Pressable
          accessibilityRole="button"
          onPress={() => void onRunSelfTest()}
          disabled={running}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            running && styles.buttonDisabled,
          ]}
        >
          {running ? (
            <ActivityIndicator color={COLORS.bg} size="small" />
          ) : (
            <Text style={styles.buttonText}>Run self-test</Text>
          )}
        </Pressable>

        {report ? (
          <View style={styles.results}>
            <Row
              k="Summary"
              v={report.allPassed ? '✓ ALL PASSED' : '✗ FAILURES'}
              valueColor={report.allPassed ? COLORS.primary : COLORS.danger}
            />
            {report.results.map((result) => (
              <View key={result.id} style={styles.resultLine}>
                <Text style={[styles.resultState, { color: STATE_COLOR[result.state] }]}>
                  {STATE_LABEL[result.state]}
                </Text>
                <View style={styles.resultBody}>
                  <Text style={styles.resultLabel}>{result.label}</Text>
                  {result.detail ? <Text style={styles.resultDetail}>{result.detail}</Text> : null}
                </View>
              </View>
            ))}
            <Text style={styles.note}>Test keys are removed after every run (secure + persistent).</Text>
          </View>
        ) : null}
      </View>

      <Link href="/(public)/dev/design-system" style={styles.link}>
        View design system →
      </Link>
      <Link href="/" style={styles.link}>
        ← Back to landing
      </Link>
      <Text style={styles.footer}>
        secrets → SecureStore only · prefs/cache → MMKV · diagnostics are dev-only
      </Text>
    </ScrollView>
  );
}

function SectionLabel({ label }: { label: string }): React.JSX.Element {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Row({
  k,
  v,
  mono,
  valueColor,
}: {
  k: string;
  v: string;
  mono?: boolean;
  valueColor?: string;
}): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={[styles.rowValue, mono && styles.mono, valueColor ? { color: valueColor } : null]}>
        {v}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 64, gap: 16 },
  title: { color: COLORS.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: COLORS.muted, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowKey: { color: COLORS.muted, fontSize: 13 },
  rowValue: { color: COLORS.text, fontSize: 13, fontWeight: '600', textAlign: 'right', flexShrink: 1 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  errorText: { color: COLORS.danger, fontSize: 12 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: COLORS.bg, fontWeight: '800', fontSize: 15 },
  results: { gap: 8, marginTop: 4 },
  resultLine: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  resultState: { fontSize: 14, fontWeight: '800', width: 16 },
  resultBody: { flex: 1, flexShrink: 1 },
  resultLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  resultDetail: {
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  note: { color: COLORS.muted, fontSize: 11, fontStyle: 'italic' },
  footer: { color: COLORS.muted, fontSize: 11, textAlign: 'center', paddingBottom: 24 },
  link: { color: COLORS.primary, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
