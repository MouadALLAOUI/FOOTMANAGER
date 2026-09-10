import React, { useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  LandPlot,
  Trophy,
  User,
  Users,
} from 'lucide-react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { AjiNqssroLogo } from '@/components/ui/AjiNqssroLogo';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { radius, spacing } from '@/theme/spacing';

// Stadium Icon tailored to match the sheet icon
function StadiumIcon({ size = 32, color = '#059669' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Ellipse cx="18" cy="18" rx="15" ry="11" stroke={color} strokeWidth="2.4" />
      <Ellipse cx="18" cy="18" rx="9" ry="6" stroke={color} strokeWidth="1.8" strokeDasharray="3 2" />
      {/* Field markings */}
      <Path d="M18 12 L18 24" stroke={color} strokeWidth="1.8" />
      <Path d="M9 18 L27 18" stroke={color} strokeWidth="1.2" strokeDasharray="2 2" />
      {/* Goal arches */}
      <Path d="M4 15 C6 15 6 21 4 21" stroke={color} strokeWidth="2" />
      <Path d="M32 15 C30 15 30 21 32 21" stroke={color} strokeWidth="2" />
    </Svg>
  );
}

interface RoleCardItem {
  id: 'terrain_owner' | 'manager' | 'committee' | 'player';
  title: string;
  desc: string;
  icon: (color: string) => React.JSX.Element;
  primaryColor: string;
  borderColor: string;
  bgColor: string;
  activeBgColor: string;
}

export default function AccountTypeScreen(): React.JSX.Element {
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  // Terrain owner is selected by default as in the design sheet!
  const [selectedRole, setSelectedRole] = useState<'terrain_owner' | 'manager' | 'committee' | 'player'>('terrain_owner');

  // Clear previous user signup data so it never pollutes a new signup
  React.useEffect(() => {
    try {
      persistentStorage.remove('owner.pendingStadium');
      persistentStorage.remove('owner.manualBookings');
      persistentStorage.remove('owner.pendingUser');
    } catch {
      // Ignore
    }
  }, []);

  const ROLE_CARDS: RoleCardItem[] = [
    {
      id: 'terrain_owner',
      title: 'عندي ملعب',
      desc: 'تسير الملاعب والحجوزات',
      icon: (c) => <StadiumIcon size={32} color={c} />,
      primaryColor: '#059669',
      borderColor: '#10B981',
      bgColor: '#F0FDF4',
      activeBgColor: '#ECFDF5',
    },
    {
      id: 'manager',
      title: 'عندي فريق',
      desc: 'مثل تصعيد الفريق والمباريات واللاعبين',
      icon: (c) => <Users size={30} color={c} />,
      primaryColor: '#2563EB',
      borderColor: '#93C5FD',
      bgColor: '#F8FAFC',
      activeBgColor: '#EFF6FF',
    },
    {
      id: 'committee',
      title: 'كننظم بطولة',
      desc: 'تنظيم بنظام البطولة',
      icon: (c) => <Trophy size={30} color={c} />,
      primaryColor: '#EA580C',
      borderColor: '#FDBA74',
      bgColor: '#F8FAFC',
      activeBgColor: '#FFF7ED',
    },
    {
      id: 'player',
      title: 'أنا لاعب',
      desc: 'تلعب ونتابع فريقك',
      icon: (c) => <User size={30} color={c} />,
      primaryColor: '#9333EA',
      borderColor: '#D8B4FE',
      bgColor: '#F8FAFC',
      activeBgColor: '#FAF5FF',
    },
  ];

  const handleProceed = () => {
    router.push({
      pathname: '/(auth)/register',
      params: { role: selectedRole },
    } as never);
  };

  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Logo */}
        <View style={styles.topLogoWrap}>
          <AjiNqssroLogo size={52} />
        </View>

        {/* Main Title Question */}
        <View style={styles.titleWrap}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>
            شنو باغي تدير فجي أجي نقصرو؟
          </Text>
        </View>

        {/* 2x2 Grid of Roles */}
        <View style={styles.grid}>
          {ROLE_CARDS.map((card) => {
            const isSelected = selectedRole === card.id;
            return (
              <Pressable
                key={card.id}
                onPress={() => setSelectedRole(card.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: isSelected ? card.activeBgColor : card.bgColor,
                    borderColor: isSelected ? card.primaryColor : card.borderColor,
                    borderWidth: isSelected ? 2.5 : 1.5,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    shadowColor: isSelected ? card.primaryColor : '#000',
                    shadowOpacity: isSelected ? 0.12 : 0.04,
                    shadowRadius: isSelected ? 8 : 4,
                    elevation: isSelected ? 3 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={card.title}
                accessibilityState={{ selected: isSelected }}
              >
                {/* Icon Circle */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isSelected ? '#FFFFFF' : card.activeBgColor,
                      borderColor: isSelected ? card.primaryColor + '40' : 'transparent',
                    },
                  ]}
                >
                  {card.icon(card.primaryColor)}
                </View>

                {/* Card Title */}
                <Text style={[styles.cardTitle, { color: card.primaryColor }]}>
                  {card.title}
                </Text>

                {/* Card Description */}
                <Text style={[styles.cardDesc, { color: '#64748B' }]}>
                  {card.desc}
                </Text>

                {/* Check badge on selected */}
                {isSelected ? (
                  <View style={[styles.checkBadge, { backgroundColor: card.primaryColor }]}>
                    <Text style={styles.checkBadgeText}>✓</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Next Action Button at Bottom */}
      <View style={[styles.bottomBar, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <Pressable
          onPress={handleProceed}
          style={({ pressed }) => [
            styles.floatingBtn,
            {
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="متابعة"
        >
          <ForwardArrow size={26} color="#FFFFFF" strokeWidth={2.6} />
        </Pressable>
      </View>
    </Screen>
  );
}

const screenWidth = Dimensions.get('window').width;
const cardWidth = Math.floor((screenWidth - spacing.lg * 2 - spacing.md) / 2);

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 110,
    gap: spacing.lg,
    alignItems: 'center',
  },
  topLogoWrap: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  titleWrap: {
    alignItems: 'center',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    gap: spacing.md,
  },
  card: {
    width: cardWidth,
    minHeight: 155,
    borderRadius: 20,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  cardDesc: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    end: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 28,
    start: spacing.lg,
    end: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  floatingBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
