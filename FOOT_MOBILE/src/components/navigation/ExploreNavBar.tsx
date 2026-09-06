import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, Home, Trophy, User, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useI18n } from '@/i18n/I18nProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

export type ExploreTab = 'home' | 'matches' | 'book' | 'tournaments' | 'profile';

interface Props {
  activeTab: ExploreTab;
  onTabChange: (tab: ExploreTab) => void;
}

export function ExploreNavBar({ activeTab, onTabChange }: Props): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const tabs: { key: ExploreTab; label: string; icon: typeof Home }[] = [
    { key: 'home', label: t('nav.home', 'الرئيسية'), icon: Home },
    { key: 'matches', label: t('nav.matches', 'المباريات'), icon: Users },
    { key: 'book', label: t('nav.book', 'حجز ملعب'), icon: Calendar },
    { key: 'tournaments', label: t('nav.tournaments', 'البطولات'), icon: Trophy },
    { key: 'profile', label: t('nav.profile', 'حسابي'), icon: User },
  ];

  const handlePress = (key: ExploreTab) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'profile') {
      router.push('/(auth)' as never);
      return;
    }
    onTabChange(key);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          const activeColor = palette.primaryGreen;
          const inactiveColor = colors.textMuted;

          return (
            <Pressable
              key={tab.key}
              onPress={() => handlePress(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              style={styles.tabItem}
            >
              <View style={styles.iconWrap}>
                <Icon size={22} color={isActive ? activeColor : inactiveColor} />
                {isActive ? <View style={[styles.activeDot, { backgroundColor: activeColor }]} /> : null}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? activeColor : inactiveColor, fontWeight: isActive ? '700' : '500' },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 52,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: sizes.touchTarget,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
  },
  activeDot: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
