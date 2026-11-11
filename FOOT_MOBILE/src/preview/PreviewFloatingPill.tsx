import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Compass,
  Layers,
  Power,
  Sparkles,
  X,
} from 'lucide-react-native';

import { usePreviewState } from './previewState';
import { palette } from '@/theme/colors';

export function PreviewFloatingPill(): React.JSX.Element | null {
  if (!__DEV__) return null;

  return <PreviewFloatingPillContent />;
}

function PreviewFloatingPillContent(): React.JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPreview, persona, personaInfo, setPersona, setPreview, personas } =
    usePreviewState();

  const [modalOpen, setModalOpen] = useState(false);

  // If preview is off or we are already on the directory page, hide the floating pill
  if (!isPreview || pathname === '/preview' || pathname === '/(public)/preview') {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.floatingWrap,
          { top: Math.max(insets.top, 10) + 4 },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => setModalOpen(true)}
          style={({ pressed }) => [
            styles.pillBtn,
            pressed && styles.pillBtnPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="خيارات وضع المعاينة"
        >
          <View style={styles.liveIndicator} />
          <Text style={styles.pillText} numberOfLines={1}>
            {personaInfo.badge}
          </Text>
          <Compass size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalOpen(false)}
        >
          <Pressable
            style={[styles.sheetCard, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleCol}>
                <View style={styles.badgeRow}>
                  <Sparkles size={14} color={palette.primaryGreen} />
                  <Text style={styles.sheetAppTag}>أجي نقصرو · وضع المعاينة</Text>
                </View>
                <Text style={styles.sheetTitle}>التحكم السريع في المعاينة</Text>
              </View>

              <Pressable
                onPress={() => setModalOpen(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Persona Switcher */}
            <View style={styles.sheetSection}>
              <Text style={styles.sheetSectionLabel}>
                تبديل الشخصية (تحديث فوري للصلاحيات):
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.personaList}
              >
                {personas.map((p) => {
                  const isSelected = p.id === persona;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        setPersona(p.id);
                        setModalOpen(false);
                      }}
                      style={[
                        styles.personaOption,
                        isSelected && styles.personaOptionActive,
                      ]}
                    >
                      <View style={styles.personaOptionTextCol}>
                        <Text
                          style={[
                            styles.personaOptionLabel,
                            isSelected && styles.personaOptionLabelActive,
                          ]}
                        >
                          {p.label}
                        </Text>
                        <Text
                          style={[
                            styles.personaOptionDesc,
                            isSelected && styles.personaOptionDescActive,
                          ]}
                          numberOfLines={1}
                        >
                          {p.description}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View style={styles.checkCircle}>
                          <Check size={12} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : (
                        <View style={styles.emptyCircle} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsCol}>
              <Pressable
                onPress={() => {
                  setModalOpen(false);
                  router.push('/(public)/preview');
                }}
                style={styles.catalogBtn}
              >
                <Layers size={18} color="#FFFFFF" />
                <Text style={styles.catalogBtnText}>
                  فتح دليل وتصفح جميع الشاشات
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setPreview(false);
                  setModalOpen(false);
                }}
                style={styles.exitBtn}
              >
                <Power size={16} color="#DC2626" />
                <Text style={styles.exitBtnText}>إيقاف وضع المعاينة</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingWrap: {
    position: 'absolute',
    left: 14,
    zIndex: 99999,
  },
  pillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 39, 71, 0.94)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#A8FF24',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  pillBtnPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A8FF24',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 20,
    gap: 16,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  sheetTitleCol: {
    gap: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetAppTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#101418',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F2747',
    textAlign: 'right',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSection: {
    gap: 8,
  },
  sheetSectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'right',
  },
  personaList: {
    maxHeight: 250,
  },
  personaOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  personaOptionActive: {
    backgroundColor: '#0F2747',
    borderColor: '#0F2747',
  },
  personaOptionTextCol: {
    flex: 1,
    gap: 2,
    alignItems: 'flex-start',
  },
  personaOptionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'right',
  },
  personaOptionLabelActive: {
    color: '#FFFFFF',
  },
  personaOptionDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'right',
  },
  personaOptionDescActive: {
    color: '#CBD5E1',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#A8FF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  quickActionsCol: {
    gap: 8,
    paddingTop: 4,
  },
  catalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#101418',
    borderRadius: 14,
    paddingVertical: 13,
  },
  catalogBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  exitBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
});
