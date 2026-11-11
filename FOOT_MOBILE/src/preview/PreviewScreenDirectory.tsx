import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Layers,
  Search,
  Sparkles,
  X,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { palette } from '@/theme/colors';
import { useI18n } from '@/i18n/I18nProvider';
import {
  type MockPersonaId,
  usePreviewState,
} from './previewState';

export interface ScreenCatalogItem {
  id: string;
  category: 'public' | 'auth' | 'manager' | 'player' | 'committee' | 'terrain' | 'admin';
  title: string;
  description: string;
  route: string;
  badge: string;
  requiredRole?: string;
  targetPersona?: MockPersonaId;
  highlight?: boolean;
}

export const SCREEN_CATALOG: ScreenCatalogItem[] = [
  // ── 1. Public & Guest ──
  {
    id: 'pub-landing',
    category: 'public',
    title: 'الصفحة الرئيسية (Landing Screen)',
    description: 'واجهة البداية الرسمية مع البطولات الحية، التحديات، الملاعب، وشريط الإحصائيات.',
    route: '/(public)',
    badge: 'شاشة عامة',
    targetPersona: 'guest',
    highlight: true,
  },
  {
    id: 'pub-challenges',
    category: 'public',
    title: 'منصة التحديات المفتوحة (Challenges Feed)',
    description: 'استعراض التحديات المتاحة بين الفرق وإمكانية قبول التحدي مباشرة.',
    route: '/(public)/challenges',
    badge: 'تحديات',
    targetPersona: 'manager_approved',
  },
  {
    id: 'pub-challenge-detail',
    category: 'public',
    title: 'تفاصيل التحدي المفتوح (Challenge Detail)',
    description: 'بطاقة التحدي، تفاصيل الملعب المقترح، شروط المباراة، وإجراءات الانضمام.',
    route: '/(public)/challenges/1',
    badge: 'تفاصيل التحدي',
  },
  {
    id: 'pub-book-match',
    category: 'public',
    title: 'طلب مباراة وحجز سريع (Book Match)',
    description: 'نموذج اختيار الملعب والتوقيت وطلب منافس من الفرق المسجلة.',
    route: '/(public)/book-match',
    badge: 'حجز مباراة',
  },
  {
    id: 'pub-stadiums',
    category: 'public',
    title: 'دليل وملاعب كرة القدم (Stadiums Catalog)',
    description: 'استعراض الملاعب المعتمدة مع صورها، أسعارها، نوع العشب، والمرافق.',
    route: '/(public)/stadiums',
    badge: 'الملاعب',
  },
  {
    id: 'pub-stadium-detail',
    category: 'public',
    title: 'تفاصيل الملعب والخدمات (Stadium Detail)',
    description: 'معلومات تفصيلية عن المركب الرياضي، أوقات العمل، وخريطة الموقع.',
    route: '/(public)/stadiums/1',
    badge: 'تفاصيل الملعب',
  },
  {
    id: 'pub-tournaments',
    category: 'public',
    title: 'دليل البطولات والدوريات (Tournaments List)',
    description: 'قائمة الدوريات الرمضانية وبطولات الهواة مع حالة التسجيل والجوائز.',
    route: '/(public)/tournaments',
    badge: 'البطولات',
  },
  {
    id: 'pub-tournament-detail',
    category: 'public',
    title: 'تفاصيل البطولة والمجموعات (Tournament Detail)',
    description: 'جدول الترتيب، المجموعات، نتائج المباريات، ولوائح البطولة الرسمية.',
    route: '/(public)/tournaments/1',
    badge: 'تفاصيل البطولة',
  },
  {
    id: 'pub-design-system',
    category: 'public',
    title: 'دليل نظام التصميم (Design System Hub)',
    description: 'استعراض جميع أزرار وتنبيهات ومكونات الهوية البصرية للتحقق.',
    route: '/(public)/dev/design-system',
    badge: 'مكونات التصميم',
  },

  // ── 2. Auth & Onboarding ──
  {
    id: 'auth-login',
    category: 'auth',
    title: 'تسجيل الدخول (Login Screen)',
    description: 'واجهة الدخول برقم الهاتف وكلمة المرور مع زر التبديل لوضع المعاينة.',
    route: '/(auth)',
    badge: 'دخول',
    targetPersona: 'guest',
  },
  {
    id: 'auth-register',
    category: 'auth',
    title: 'إنشاء حساب جديد (Register Screen)',
    description: 'تسجيل حساب جديد للمديرين أو اللاعبين أو الحكام.',
    route: '/(auth)/register',
    badge: 'تسجيل',
    targetPersona: 'guest',
  },
  {
    id: 'auth-account-type',
    category: 'auth',
    title: 'اختيار نوع الحساب (Account Type Selector)',
    description: 'بطاقات اختيار الدور: مدير فريق، لاعب، مالك ملعب، أو لجنة تنظيم.',
    route: '/(auth)/account-type',
    badge: 'أنواع الحسابات',
    targetPersona: 'guest',
  },
  {
    id: 'auth-manager-onboarding',
    category: 'auth',
    title: 'تهيئة حساب المدير (Manager Onboarding)',
    description: 'إدخال اسم الفريق، الفئة العمرية، وعدد اللاعبين المبدئي.',
    route: '/(auth)/manager-onboarding',
    badge: 'تهيئة المدير',
  },
  {
    id: 'auth-team-setup-2',
    category: 'auth',
    title: 'إعداد الفريق — الخطوة 2 (Team Setup Step 2)',
    description: 'اختيار هوية الفريق البصرية وشعار الفريق المعتمد.',
    route: '/(auth)/team-setup-step2',
    badge: 'إعداد الفريق',
  },
  {
    id: 'auth-team-setup-3',
    category: 'auth',
    title: 'إعداد الفريق — الخطوة 3 (Team Setup Step 3)',
    description: 'إضافة التشكيلة الأساسية للاعبين وأرقام قمصانهم.',
    route: '/(auth)/team-setup-step3',
    badge: 'إعداد الفريق',
  },
  {
    id: 'auth-team-setup-4',
    category: 'auth',
    title: 'إعداد الفريق — الخطوة 4 (Team Setup Step 4)',
    description: 'المراجعة النهائية لملف الفريق قبل إرسال طلب الاعتماد.',
    route: '/(auth)/team-setup-step4',
    badge: 'إعداد الفريق',
  },
  {
    id: 'auth-stadium-setup',
    category: 'auth',
    title: 'إعداد وتجهيز الملعب (Stadium Setup)',
    description: 'شاشة إدخال بيانات الملعب والمواصفات ومواعيد الحجز.',
    route: '/(auth)/stadium-setup',
    badge: 'إعداد الملعب',
  },
  {
    id: 'auth-pending',
    category: 'auth',
    title: 'حالة الحساب قيد المراجعة (Account Pending)',
    description: 'رسالة إرشادية للمدير أثناء مراجعة طلب الاعتماد من قبل الإدارة.',
    route: '/(auth)/account-pending',
    badge: 'قيد المراجعة',
    targetPersona: 'manager_pending',
  },
  {
    id: 'auth-blocked',
    category: 'auth',
    title: 'حالة الحساب المعطل (Account Blocked)',
    description: 'واجهة توضيح تقييد أو تعليق الحساب لأسباب تنظيمية.',
    route: '/(auth)/account-blocked',
    badge: 'حساب معطل',
  },

  // ── 3. Manager Experience ──
  {
    id: 'mgr-dashboard-approved',
    category: 'manager',
    title: 'لوحة تحكم المدير المعتمد (Manager Dashboard)',
    description: 'شاشة 09 — الهيدر العائم، إحصائيات الفريق، الإجراءات السريعة، والمباريات.',
    route: '/(manager)',
    badge: 'لوحة التحكم',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
    highlight: true,
  },
  {
    id: 'mgr-matches-list',
    category: 'manager',
    title: 'مركز المباريات والتحديات (Matches Hub)',
    description: 'شاشة 3 تابات مخصصة: مبارياتي، تحديات متاحة، وتحديات واردة مع أزرار القبول.',
    route: '/(manager)/matches',
    badge: 'المباريات',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
    highlight: true,
  },
  {
    id: 'mgr-create-match',
    category: 'manager',
    title: 'إنشاء مباراة / إرسال تحدي (Create Match Screen)',
    description: 'تحديد الملعب، التاريخ والوقت، وتوجيه تحدي مباشر لفريق أو فتح طلب عام.',
    route: '/(manager)/matches/create',
    badge: 'طلب مباراة',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
  },
  {
    id: 'mgr-match-detail',
    category: 'manager',
    title: 'تفاصيل المباراة وبطاقة اللقاء (Match Detail VS Hero)',
    description: 'بطاقة المواجهة المباشرة، تسجيل وتأكيد النتيجة، ومشاركة التحدي عبر واتساب.',
    route: '/(manager)/matches/1',
    badge: 'تفاصيل اللقاء',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
    highlight: true,
  },
  {
    id: 'mgr-team-squad',
    category: 'manager',
    title: 'إدارة تشكيلة الفريق (Screen 10 — Team Management)',
    description: 'شاشة 10 — استعراض قائمة اللاعبين، المراكز، الأرقام، وإحصائيات كل لاعب.',
    route: '/(manager)/team',
    badge: 'تشكيلة الفريق',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
    highlight: true,
  },
  {
    id: 'mgr-add-player',
    category: 'manager',
    title: 'إضافة لاعب جديد للفريق (Screen 11 — Add Player)',
    description: 'شاشة 11 — نموذج إدخال الاسم، المركز، رقم القميص، وسنة الميلاد.',
    route: '/(manager)/team/add-player',
    badge: 'إضافة لاعب',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
  },
  {
    id: 'mgr-player-profile',
    category: 'manager',
    title: 'الملف الشخصي للاعب (Screen 12 — Player Profile)',
    description: 'شاشة 12 المعاد بناؤها طبق الأصل: البطل، هوية اللاعب، إحصائيات المباريات، الإجراءات.',
    route: '/(manager)/team/player/1',
    badge: 'بروفايل اللاعب (Screen 12)',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
    highlight: true,
  },
  {
    id: 'mgr-bookings',
    category: 'manager',
    title: 'حجوزات الملاعب للفريق (Manager Bookings)',
    description: 'متابعة حجوزات الملاعب وتواريخ الحصص التدريبية والمباريات المؤكدة.',
    route: '/(manager)/bookings',
    badge: 'الحجوزات',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
  },
  {
    id: 'mgr-notifications',
    category: 'manager',
    title: 'إشعارات المدير (Manager Notifications)',
    description: 'التنبيهات اللحظية حول التحديات الجديدة، تأكيدات الحجز، وتحديثات الدوريات.',
    route: '/(manager)/notifications',
    badge: 'الإشعارات',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
  },
  {
    id: 'mgr-settings',
    category: 'manager',
    title: 'إعدادات الحساب والفريق (Manager Settings)',
    description: 'تغيير اللغة، الوضع الداكن/الفاتح، بيانات الفريق، وتسجيل الخروج.',
    route: '/(manager)/settings',
    badge: 'الإعدادات',
    requiredRole: 'manager',
    targetPersona: 'manager_approved',
  },

  // ── 4. Player Experience ──
  {
    id: 'ply-home',
    category: 'player',
    title: 'الرئيسية للاعب (Player Home Dashboard)',
    description: 'لوحة اللاعب مع استعراض فرصه القادمة وحجوزات التداريب والتحديات.',
    route: '/(player)',
    badge: 'لوحة اللاعب',
    requiredRole: 'player',
    targetPersona: 'player',
  },
  {
    id: 'ply-matches',
    category: 'player',
    title: 'مباريات اللاعب (Player Matches)',
    description: 'المباريات التي شارك أو سيشارك فيها اللاعب مع فريقه.',
    route: '/(player)/matches',
    badge: 'مبارياتي',
    requiredRole: 'player',
    targetPersona: 'player',
  },
  {
    id: 'ply-bookings',
    category: 'player',
    title: 'حجوزات اللاعب (Player Bookings)',
    description: 'سجل الحجوزات الفردية والجماعية الخاصة باللاعب.',
    route: '/(player)/bookings',
    badge: 'حجوزاتي',
    requiredRole: 'player',
    targetPersona: 'player',
  },
  {
    id: 'ply-profile',
    category: 'player',
    title: 'الملف الشخصي للاعب (Player Profile)',
    description: 'بيانات المركز، القدم المفضلة، وسجل الإنجازات والأهداف.',
    route: '/(player)/profile',
    badge: 'بروفايل اللاعب',
    requiredRole: 'player',
    targetPersona: 'player',
  },

  // ── 5. Committee Experience ──
  {
    id: 'com-home',
    category: 'committee',
    title: 'لوحة لجنة تنظيم البطولات (Committee Home)',
    description: 'إحصائيات الدوريات النشطة، عدد الفرق المشاركة، وحالة المباريات.',
    route: '/(committee)',
    badge: 'لجنة التنظيم',
    requiredRole: 'committee',
    targetPersona: 'committee',
  },
  {
    id: 'com-tournaments',
    category: 'committee',
    title: 'إدارة البطولات (Tournaments Management)',
    description: 'التحكم في مواعيد الدوريات وتأكيد مشاركة الفرق في القرعة.',
    route: '/(committee)/tournaments',
    badge: 'إدارة البطولات',
    requiredRole: 'committee',
    targetPersona: 'committee',
  },
  {
    id: 'com-tournament-detail',
    category: 'committee',
    title: 'إدارة تفاصيل البطولة (Tournament Manager Detail)',
    description: 'لوحة التوزيع العشوائي للمجموعات، إدخال النتائج، وجدول المباريات.',
    route: '/(committee)/tournaments/1',
    badge: 'تفاصيل وإدارة البطولة',
    requiredRole: 'committee',
    targetPersona: 'committee',
  },

  // ── 6. Terrain Owner Experience ──
  {
    id: 'trn-dashboard',
    category: 'terrain',
    title: 'لوحة تحكم صاحب الملعب (Terrain Dashboard)',
    description: 'إحصائيات الإشغال، الحجوزات اليومية، ومداخيل الملعب.',
    route: '/(terrain)',
    badge: 'لوحة الملعب',
    requiredRole: 'terrain_owner',
    targetPersona: 'terrain_owner',
  },
  {
    id: 'trn-fields',
    category: 'terrain',
    title: 'إدارة مساحات وملاعب المركب (Owner Fields)',
    description: 'قائمة الملاعب التابعة للمركب وإمكانية إضافة أو تعديل ملعب.',
    route: '/(terrain)/fields',
    badge: 'الملاعب',
    requiredRole: 'terrain_owner',
    targetPersona: 'terrain_owner',
  },
  {
    id: 'trn-bookings',
    category: 'terrain',
    title: 'جدول حجوزات الملعب (Owner Bookings)',
    description: 'متابعة الحجوزات الواردة، تأكيدها، أو إلغاؤها وتحديد المواعيد المتاحة.',
    route: '/(terrain)/bookings',
    badge: 'حجوزات الملعب',
    requiredRole: 'terrain_owner',
    targetPersona: 'terrain_owner',
  },

  // ── 7. Admin Experience ──
  {
    id: 'adm-dashboard',
    category: 'admin',
    title: 'لوحة تحكم الإدارة العامة (Admin Dashboard)',
    description: 'إحصائيات المنصة المركزية، المديرين، الملاعب، والطلبات المعلقة.',
    route: '/(admin)',
    badge: 'لوحة الإدارة',
    requiredRole: 'admin',
    targetPersona: 'admin',
  },
  {
    id: 'adm-approvals',
    category: 'admin',
    title: 'مركز الموافقات والاعتمادات (Approvals Hub)',
    description: 'مراجعة طلبات انضمام مديري الفرق الجدد وقبولها أو رفضها بنقرة واحدة.',
    route: '/(admin)/approvals',
    badge: 'الموافقات',
    requiredRole: 'admin',
    targetPersona: 'admin',
    highlight: true,
  },
  {
    id: 'adm-users',
    category: 'admin',
    title: 'إدارة المستخدمين والحسابات (Users Directory)',
    description: 'قائمة بجميع المستخدمين والمديرين مع إمكانية قفل النشاط أو استعراض البيانات.',
    route: '/(admin)/users',
    badge: 'المستخدمين',
    requiredRole: 'admin',
    targetPersona: 'admin',
  },
];

const CATEGORIES = [
  { key: 'all', label: 'الكل' },
  { key: 'manager', label: '⚽ المدير' },
  { key: 'public', label: '🌟 العامة' },
  { key: 'auth', label: '🔐 الدخول والتسجيل' },
  { key: 'player', label: '🏃 اللاعب' },
  { key: 'committee', label: '🏆 البطولات' },
  { key: 'terrain', label: '🏟️ الملاعب' },
  { key: 'admin', label: '⚙️ الإدارة' },
];

export function PreviewScreenDirectory(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRTL } = useI18n();
  const { isPreview, persona, setPersona, setPreview, personas } = usePreviewState();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredScreens = useMemo(() => {
    return SCREEN_CATALOG.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.route.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
      );
    });
  }, [search, selectedCategory]);

  const handleOpenScreen = (item: ScreenCatalogItem) => {
    // 1. Ensure preview mode is active
    if (!isPreview) {
      setPreview(true);
    }
    // 2. If the item specifies a targetPersona or requiredRole, automatically switch to it!
    if (item.targetPersona) {
      setPersona(item.targetPersona);
    } else if (item.requiredRole === 'manager' && persona !== 'manager_approved') {
      setPersona('manager_approved');
    } else if (item.requiredRole === 'player' && persona !== 'player') {
      setPersona('player');
    } else if (item.requiredRole === 'committee' && persona !== 'committee') {
      setPersona('committee');
    } else if (item.requiredRole === 'terrain_owner' && persona !== 'terrain_owner') {
      setPersona('terrain_owner');
    } else if (item.requiredRole === 'admin' && persona !== 'admin') {
      setPersona('admin');
    }

    // 3. Navigate directly to the screen route!
    router.push(item.route as never);
  };

  const ForwardIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Screen padded={false}>
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.titleBadgeRow}>
                <Sparkles size={16} color={palette.primaryGreen} />
                <Text style={styles.appTag}>AJI NQSSRO · أجي نقصرو</Text>
              </View>
              <Text style={styles.headerTitle}>دليل معاينة الواجهات</Text>
              <Text style={styles.headerSubtitle}>
                معاينة واختبار جميع الشاشات محلياً بدون إنترنت وسيرفر
              </Text>
            </View>

            <Pressable
              onPress={() => setPreview(!isPreview)}
              style={[
                styles.previewToggleBtn,
                { backgroundColor: isPreview ? '#DCFCE7' : '#F1F5F9' },
              ]}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.toggleDot,
                  { backgroundColor: isPreview ? '#16A34A' : '#94A3B8' },
                ]}
              />
              <Text
                style={[
                  styles.toggleText,
                  { color: isPreview ? '#166534' : '#64748B' },
                ]}
              >
                {isPreview ? 'المعاينة نشطة' : 'المعاينة متوقفة'}
              </Text>
            </Pressable>
          </View>

          {/* Quick Notice Banner */}
          <View style={styles.noticeBanner}>
            <Text style={styles.noticeText}>
              💡 اضغط على أي شاشة للانتقال إليها مباشرة مع تحميل بيانات مغربية واقعية تحاكي الحالات الواقعية.
            </Text>
          </View>

          {/* Persona Switcher Section */}
          <View style={styles.personaSection}>
            <Text style={styles.sectionLabel}>تبديل هوية المستخدم (Persona Switcher):</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personaRow}
            >
              {personas.map((p) => {
                const isSelected = p.id === persona;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPersona(p.id)}
                    style={[
                      styles.personaChip,
                      isSelected && styles.personaChipActive,
                    ]}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    <Text
                      style={[
                        styles.personaChipText,
                        isSelected && styles.personaChipTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Search Input */}
          <View style={styles.searchWrap}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن شاشة (مثال: بروفايل اللاعب، التحديات، الاعتمادات...)"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              textAlign={isRTL ? 'right' : 'left'}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <X size={16} color="#64748B" />
              </Pressable>
            )}
          </View>

          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelectedCategory(cat.key)}
                  style={[
                    styles.categoryTab,
                    isActive && styles.categoryTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      isActive && styles.categoryTabTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Screen Cards List */}
        <FlatList
          data={filteredScreens}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 24) + 60 },
          ]}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleOpenScreen(item)}
              style={({ pressed }) => [
                styles.screenCard,
                item.highlight && styles.screenCardHighlight,
                pressed && styles.screenCardPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.roleBadge,
                      item.highlight && styles.roleBadgeHighlight,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        item.highlight && styles.roleBadgeTextHighlight,
                      ]}
                    >
                      {item.badge}
                    </Text>
                  </View>
                  <Text style={styles.routeText} numberOfLines={1}>
                    {item.route}
                  </Text>
                </View>

                {item.highlight && (
                  <View style={styles.featuredBadge}>
                    <Flame size={12} color="#D97706" />
                    <Text style={styles.featuredText}>مميز</Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.actionBtn}>
                  <Text style={styles.actionBtnText}>معاينة الواجهة</Text>
                  <ForwardIcon size={14} color="#101418" />
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Layers size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>لا توجد نتائج بحث مطابقة</Text>
              <Text style={styles.emptySubtitle}>جرب كتابة اسم مختلف أو اختر تصنيفاً آخر.</Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleCol: {
    flex: 1,
    gap: 4,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#101418',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F2747',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    lineHeight: 18,
  },
  previewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
  },
  noticeBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  noticeText: {
    fontSize: 11,
    color: '#1E40AF',
    textAlign: 'right',
    lineHeight: 16,
    fontWeight: '600',
  },
  personaSection: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'right',
  },
  personaRow: {
    gap: 8,
    paddingVertical: 2,
  },
  personaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  personaChipActive: {
    backgroundColor: '#0F2747',
    borderColor: '#0F2747',
  },
  personaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  personaChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F2747',
    fontWeight: '600',
    paddingVertical: 0,
  },
  categoryRow: {
    gap: 6,
    paddingTop: 4,
  },
  categoryTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F4F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTabActive: {
    backgroundColor: '#101418',
    borderColor: '#101418',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  screenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  screenCardHighlight: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  screenCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  roleBadgeHighlight: {
    backgroundColor: '#DCFCE7',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  roleBadgeTextHighlight: {
    color: '#166534',
  },
  routeText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#94A3B8',
    flex: 1,
    textAlign: 'left',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  featuredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2747',
    textAlign: 'right',
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#101418',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
