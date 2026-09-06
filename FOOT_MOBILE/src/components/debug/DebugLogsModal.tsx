import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  Info,
  Radio,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react-native';

import { appLogger, type LogEntry, type LogLevel } from '@/services/logger/app-logger';
import { palette } from '@/theme/colors';
import { radius, sizes, spacing } from '@/theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function DebugLogsModal({ visible, onClose }: Props): React.JSX.Element {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    return appLogger.subscribe((allLogs) => {
      setLogs(allLogs);
    });
  }, [visible]);

  const counts = {
    all: logs.length,
    error: logs.filter((l) => l.level === 'error').length,
    warn: logs.filter((l) => l.level === 'warn').length,
    network: logs.filter((l) => l.level === 'network').length,
    info: logs.filter((l) => l.level === 'info').length,
  };

  const filteredLogs = logs.filter((l) => {
    if (filterLevel !== 'all' && l.level !== filterLevel) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.tag.toLowerCase().includes(q) ||
      l.message.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q))
    );
  });

  const handleShare = async () => {
    if (logs.length === 0) return;
    const text = logs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.tag}] ${l.message}${
            l.details ? `\n--> Details: ${l.details}` : ''
          }`
      )
      .join('\n\n');

    try {
      await Share.share({
        title: 'FootMANAGER App Logs',
        message: text,
      });
    } catch {}
  };

  const handleClear = () => {
    appLogger.clear();
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return '#EF4444';
      case 'warn':
        return '#F59E0B';
      case 'network':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return AlertCircle;
      case 'warn':
        return AlertTriangle;
      case 'network':
        return Radio;
      default:
        return Info;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>سجل الأخطاء والعمليات</Text>
            <Text style={styles.subtitle}>App Logs & Bug Inspector ({logs.length})</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleShare}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="مشاركة السجل"
            >
              <Share2 size={18} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleClear}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="مسح السجل"
            >
              <Trash2 size={18} color="#EF4444" />
            </Pressable>
            <Pressable
              onPress={onClose}
              style={styles.iconButton}
              accessibilityRole="button"
              accessibilityLabel="إغلاق"
            >
              <X size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="بحث في السجلات والرسائل..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: `الكل (${counts.all})` },
            { key: 'error', label: `أخطاء (${counts.error})`, color: '#EF4444' },
            { key: 'network', label: `API (${counts.network})`, color: '#3B82F6' },
            { key: 'warn', label: `تحذيرات (${counts.warn})`, color: '#F59E0B' },
          ].map((f) => {
            const isSelected = filterLevel === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilterLevel(f.key)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillActive,
                  isSelected && f.color ? { borderColor: f.color } : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextActive,
                    isSelected && f.color ? { color: f.color } : null,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Logs List */}
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <CheckCircle size={40} color="#10B981" />
              <Text style={styles.emptyTitle}>لا توجد أخطاء مسجلة</Text>
              <Text style={styles.emptySub}>التطبيق يعمل بشكل سليم دون مشاكل حالياً</Text>
            </View>
          }
          renderItem={({ item }) => {
            const color = getLevelColor(item.level);
            const Icon = getLevelIcon(item.level);
            const isExpanded = expandedId === item.id;

            return (
              <Pressable
                onPress={() => setExpandedId(isExpanded ? null : item.id)}
                style={[styles.logItem, { borderLeftColor: color }]}
              >
                <View style={styles.logTopRow}>
                  <View style={styles.logTagRow}>
                    <Icon size={14} color={color} />
                    <Text style={[styles.logTag, { color }]}>{item.tag}</Text>
                    <Text style={styles.logTime}>{item.timestamp}</Text>
                  </View>
                  <Text style={[styles.logLevelBadge, { color, backgroundColor: color + '20' }]}>
                    {item.level.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.logMessage}>{item.message}</Text>

                {item.details && isExpanded ? (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsText}>{item.details}</Text>
                  </View>
                ) : item.details ? (
                  <Text style={styles.expandHint}>اضغط لعرض تفاصيل الخطأ...</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleWrap: {
    gap: 2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    gap: spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    backgroundColor: '#334155',
    borderColor: palette.primaryGreen,
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  logItem: {
    backgroundColor: '#1E293B',
    borderRadius: radius.medium,
    padding: spacing.md,
    borderLeftWidth: 4,
    gap: 6,
  },
  logTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTag: {
    fontSize: 12,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  logLevelBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  logMessage: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  expandHint: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  detailsBox: {
    marginTop: 6,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  detailsText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
  },
});
