import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Trophy,
  User,
  Users,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { palette, roleAccents } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

interface RoleOption {
  id: 'player' | 'manager' | 'terrain_owner' | 'committee' | 'admin';
  icon: typeof User;
  titleKey: string;
  titleFallback: string;
  descKey: string;
  descFallback: string;
  accentColor: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'player',
    icon: User,
    titleKey: 'auth.rolePlayerTitle',
    titleFallback: 'لاعب (Player)',
    descKey: 'auth.rolePlayerDesc',
    descFallback: 'العب وانضم لمباريات ودية وتحديات حماسية',
    accentColor: roleAccents.player,
  },
  {
    id: 'manager',
    icon: Users,
    titleKey: 'auth.roleManagerTitle',
    titleFallback: 'مدرب / مسير فريق (Manager)',
    descKey: 'auth.roleManagerDesc',
    descFallback: 'أدِر تشكيلة فريقك ونظّم مباريات ضد فرق أخرى',
    accentColor: roleAccents.manager,
  },
  {
    id: 'terrain_owner',
    icon: MapPin,
    titleKey: 'auth.roleTerrainTitle',
    titleFallback: 'مالك ملعب (Terrain Owner)',
    descKey: 'auth.roleTerrainDesc',
    descFallback: 'أدر حجوزات ملعبك وساعات الفراغ بكل احترافية',
    accentColor: roleAccents.terrain_owner,
  },
  {
    id: 'committee',
    icon: Trophy,
    titleKey: 'auth.roleCommitteeTitle',
    titleFallback: 'لجنة تنظيمية (Committee)',
    descKey: 'auth.roleCommitteeDesc',
    descFallback: 'نظّم بطولات ومنافسات كرة القدم للأحياء',
    accentColor: roleAccents.committee,
  },
  {
    id: 'admin',
    icon: ShieldCheck,
    titleKey: 'auth.roleAdminTitle',
    titleFallback: 'مشرف المنصة (Admin)',
    descKey: 'auth.roleAdminDesc',
    descFallback: 'إدارة وتنسيق الفرق والملاعب في المنصة',
    accentColor: roleAccents.admin,
  },
];

export default function AccountTypeScreen(): React.JSX.Element {
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const handleSelectRole = (roleId: string) => {
    if (roleId === 'admin') {
      // Admin accounts are managed directly or through contact
      router.push('/(auth)/register?role=committee' as never);
    } else {
      router.push({
        pathname: '/(auth)/register',
        params: { role: roleId },
      } as never);
    }
  };

  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <Screen padded={false}>
      <ScreenHeader
        title={t('auth.joinTitle', 'الانضمام كـ')}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBox}>
          <Text style={[styles.introTitle, { color: colors.text }]}>
            {t('auth.chooseAccountType', 'اختر نوع الحساب الذي يناسبك')}
          </Text>
          <Text style={[styles.introDesc, { color: colors.textMuted }]}>
            {t('auth.chooseUsage', 'حدد كيف ترغب في استخدام تطبيق أجي نقصروا')}
          </Text>
        </View>

        <View style={styles.optionsList}>
          {ROLE_OPTIONS.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelectRole(item.id)}
                accessibilityRole="button"
                accessibilityLabel={t(item.titleKey, item.titleFallback)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: pressed ? [{ scale: 0.99 }] : [],
                  },
                ]}
              >
                {/* Icon box with role accent hue */}
                <View style={[styles.iconBox, { backgroundColor: item.accentColor + '16' }]}>
                  <Icon size={24} color={item.accentColor} />
                </View>

                {/* Text Content */}
                <View style={styles.textWrap}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>
                    {t(item.titleKey, item.titleFallback)}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                    {t(item.descKey, item.descFallback)}
                  </Text>
                </View>

                {/* Trailing arrow */}
                <ArrowIcon size={20} color={colors.textSubtle} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  introBox: {
    gap: 4,
    marginBottom: spacing.xs,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  introDesc: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionsList: {
    gap: spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 1.5,
    minHeight: 88,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
