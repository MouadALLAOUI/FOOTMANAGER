import React, { useEffect } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

import { persistentStorage } from '@/services/storage/persistent-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 18;
const GRID_GAP = 12;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GRID_GAP) / 2);
const ILLUSTRATION_HEIGHT = Math.round(CARD_WIDTH * (230 / 402));

type RoleId = 'player' | 'manager' | 'terrain_owner' | 'committee';

interface RoleCardData {
  id: RoleId;
  title: string;
  desc: string;
  image: number;
}

// Visual placement matching the reference design:
// Left column: Player (top), Stadium Owner (bottom)
// Right column: Team Manager (top), Tournament Committee (bottom)
const LEFT_COLUMN_CARDS: RoleCardData[] = [
  {
    id: 'player',
    title: 'لاعب',
    desc: 'اكتشف المباريات، انضم إلى الفرق وتابع إحصائياتك.',
    image: require('../../assets/role-player.png'),
  },
  {
    id: 'terrain_owner',
    title: 'مالك ملعب',
    desc: 'أدر ملاعبك والحجوزات والمواعيد.',
    image: require('../../assets/role-stadium.png'),
  },
];

const RIGHT_COLUMN_CARDS: RoleCardData[] = [
  {
    id: 'manager',
    title: 'مسيّر فريق',
    desc: 'أدر فريقك ولاعبيك ومبارياتك وتحدياتك.',
    image: require('../../assets/role-manager.png'),
  },
  {
    id: 'committee',
    title: 'لجنة تنظيم',
    desc: 'نظّم البطولات والمجموعات والنتائج والترتيب.',
    image: require('../../assets/role-committee.png'),
  },
];

export default function AccountTypeScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Clear stale registration session artifacts to start clean
  useEffect(() => {
    try {
      persistentStorage.remove('owner.pendingStadium');
      persistentStorage.remove('owner.manualBookings');
      persistentStorage.remove('owner.pendingUser');
    } catch {
      // Ignore storage errors on cleanup
    }
  }, []);

  const handleSelectRole = (role: RoleId) => {
    router.push({
      pathname: '/(auth)/register',
      params: { role },
    } as never);
  };

  const renderCard = (card: RoleCardData) => (
    <Pressable
      key={card.id}
      onPress={() => handleSelectRole(card.id)}
      style={({ pressed }) => [
        styles.card,
        {
          transform: [{ scale: pressed ? 0.975 : 1 }],
          borderColor: pressed ? '#059669' : 'rgba(226, 232, 240, 0.9)',
          shadowOpacity: pressed ? 0.12 : 0.06,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={card.title}
      accessibilityHint={card.desc}
    >
      {/* 1. Football Role Illustration */}
      <View style={styles.illustrationWrap}>
        <Image
          source={card.image}
          style={styles.cardImage}
          resizeMode="cover"
        />
      </View>

      {/* 2. Text & Forward Indicator Row (RTL aligned) */}
      <View style={styles.cardContent}>
        {/* Title and Short Description */}
        <View style={styles.textWrap}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {card.desc}
          </Text>
        </View>

        {/* Circular Green Forward Indicator */}
        <View style={styles.arrowCircle}>
          <ChevronLeft size={16} color="#101418" strokeWidth={3} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Stadium & Southeastern Moroccan Landscape Background */}
      <Image
        source={require('../../assets/role-selection-bg.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header: Official Logo & Greetings ─── */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/role-header-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.primaryGreeting}>مرحباً بك !</Text>
          <Text style={styles.secondaryHeading}>كيف تريد استخدام التطبيق؟</Text>
          <Text style={styles.subtitle}>اختر صفتك لنقدم لك تجربة تناسبك</Text>
        </View>

        {/* ─── 2x2 Grid of Account Types ─── */}
        <View style={styles.gridContainer}>
          {/* Left Column (Player & Stadium Owner) */}
          <View style={styles.column}>
            {LEFT_COLUMN_CARDS.map(renderCard)}
          </View>

          {/* Right Column (Team Manager & Committee) */}
          <View style={styles.column}>
            {RIGHT_COLUMN_CARDS.map(renderCard)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: HORIZONTAL_PADDING,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 16,
    width: '100%',
  },
  logo: {
    width: 60,
    height: 64,
    marginBottom: 8,
  },
  primaryGreeting: {
    fontSize: Math.min(27, Math.round(SCREEN_WIDTH * 0.070)),
    fontWeight: '900',
    color: '#101418',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: Platform.OS === 'android' ? 36 : 32,
  },
  secondaryHeading: {
    fontSize: Math.min(19, Math.round(SCREEN_WIDTH * 0.050)),
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
    marginTop: 3,
    letterSpacing: -0.2,
    lineHeight: Platform.OS === 'android' ? 28 : 25,
  },
  subtitle: {
    fontSize: Math.min(12.5, Math.round(SCREEN_WIDTH * 0.033)),
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 5,
    paddingHorizontal: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    direction: 'ltr', // Fixes column anchoring: left column remains on the left, right column on the right
    justifyContent: 'space-between',
    width: '100%',
    gap: GRID_GAP,
    marginTop: 4,
    marginBottom: 10,
  },
  column: {
    width: CARD_WIDTH,
    gap: GRID_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#E2E6E9',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  illustrationWrap: {
    width: '100%',
    height: ILLUSTRATION_HEIGHT,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    direction: 'rtl', // Ensures RTL alignment: Arabic text on the right, arrow on the left
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: '#FFFFFF',
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: Math.min(15.5, Math.round(SCREEN_WIDTH * 0.040)),
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: Math.min(10, Math.round(SCREEN_WIDTH * 0.026)),
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'right',
    lineHeight: 14,
    marginTop: 3,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(168, 255, 36, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
