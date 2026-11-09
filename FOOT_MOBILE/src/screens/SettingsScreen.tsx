import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { ArrowLeftRight, ChevronRight, ChevronLeft, Globe, Info, LogOut, UserCircle } from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { profilePathForRole } from '@/navigation/tabs';
import { radius, spacing } from '@/theme/spacing';

export function SettingsScreen(): React.JSX.Element {
  const { user, role, logout } = useAuth();
  const { colors } = useTheme();
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmSwitchAccount, setConfirmSwitchAccount] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const Chevron = isRTL ? ChevronLeft : ChevronRight;

  const handleAccountPress = (): void => {
    router.push(profilePathForRole(role));
  };

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <Globe size={18} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('settings.language', 'اللغة')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t('settings.languageHint', 'اختر لغة التطبيق')}</Text>
            </View>
          </View>
          <View style={styles.languageWrap}>
            <LanguageSwitcher />
          </View>
          <Text style={[styles.persistHint, { color: colors.textSubtle }]}>{t('settings.languagePersist', 'يتم حفظ اختيارك تلقائياً.')}</Text>
        </Card>

        {/* Account */}
        <Card>
          <Pressable
            onPress={handleAccountPress}
            style={({ pressed }) => [styles.accountRow, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('settings.account', 'الحساب')}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <UserCircle size={18} color={colors.primary} />
            </View>
            <View style={styles.accountText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('settings.account', 'الحساب')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {user?.name ?? '—'} {user?.phone ? `· ${user.phone}` : ''}
              </Text>
            </View>
            <Chevron size={18} color={colors.textMuted} />
          </Pressable>
        </Card>

        {/* About */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <Info size={18} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t('settings.about', 'حول التطبيق')}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{t('app.tagline', 'إدارة فريقك')}</Text>
            </View>
          </View>
          <View style={[styles.aboutBox, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <Text style={[styles.aboutName, { color: colors.text }]}>{t('app.name', 'AJI NQSSRO — أجي نقصرو')}</Text>
            <Text style={[styles.aboutVersion, { color: colors.textMuted }]}>v{version}</Text>
            <Text style={[styles.aboutNote, { color: colors.textSubtle }]}>{t('settings.aboutNote', 'منصة كرة القدم المغربية لتنظيم المباريات والفرق والبطولات.')}</Text>
          </View>
        </Card>

        {/* Session Management: Switch Account & Logout */}
        <Card>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <ArrowLeftRight size={18} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t('settings.sessionManagement', 'إدارة الجلسة')}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                {t('settings.sessionHint', 'تبديل الحساب أو تسجيل الخروج من هذا الجهاز')}
              </Text>
            </View>
          </View>

          <View style={styles.sessionButtonsCol}>
            {/* Switch Account */}
            <Button
              title={t('auth.switchAccount', 'تبديل الحساب')}
              onPress={() => setConfirmSwitchAccount(true)}
              variant="outline"
              fullWidth
              leftIcon={<ArrowLeftRight size={16} color={colors.primary} />}
            />

            {/* Logout */}
            <Button
              title={t('auth.logout', 'تسجيل الخروج')}
              onPress={() => setConfirmLogout(true)}
              variant="danger"
              fullWidth
              leftIcon={<LogOut size={16} color="#FFFFFF" />}
            />
          </View>
        </Card>
      </ScrollView>

      {/* Confirmation Dialog: Switch Account */}
      <ConfirmationDialog
        visible={confirmSwitchAccount}
        title={t('auth.switchAccount', 'تبديل الحساب')}
        description={t('settings.switchAccountConfirm', 'هل تريد تسجيل الخروج والتبديل إلى حساب آخر؟')}
        confirmLabel={t('auth.switchAccount', 'تبديل الحساب')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        onCancel={() => setConfirmSwitchAccount(false)}
        onConfirm={() => {
          setConfirmSwitchAccount(false);
          void logout();
        }}
      />

      {/* Confirmation Dialog: Logout */}
      <ConfirmationDialog
        visible={confirmLogout}
        title={t('auth.logout', 'تسجيل الخروج')}
        description={t('settings.logoutConfirm', 'هل أنت متأكد أنك تريد تسجيل الخروج؟')}
        confirmLabel={t('auth.logout', 'تسجيل الخروج')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        destructive
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          void logout();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardHeaderText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  cardSubtitle: { fontSize: 12, lineHeight: 16 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  languageWrap: { marginTop: spacing.md },
  persistHint: { fontSize: 11, marginTop: spacing.sm, fontStyle: 'italic' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  accountText: { flex: 1, gap: 2 },
  aboutBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, gap: 4, alignItems: 'center' },
  aboutName: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  aboutVersion: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  aboutNote: { fontSize: 11, textAlign: 'center', marginTop: 4, lineHeight: 16 },
  sessionButtonsCol: { marginTop: spacing.md, gap: spacing.sm },
});
