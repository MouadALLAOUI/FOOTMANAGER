import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Flame, Trophy } from 'lucide-react-native';

export function ActionCategoryCards(): React.JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>شنو باغي دير؟</Text>
      
      <View style={styles.cardsRow}>
        {/* Card 1: حجز ملعب (Blue) */}
        <TouchableOpacity
          style={[styles.actionCard, styles.blueCard]}
          activeOpacity={0.88}
          onPress={() => router.push('/(public)/stadiums' as any)}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, styles.blueIconWrap]}>
              <Calendar size={22} color="#0284C7" />
            </View>
          </View>
          <Text style={styles.cardTitle}>حجز ملعب</Text>
          <Text style={styles.cardSubtitle}>اختار الملعب والنهار والساعة</Text>
          <View style={styles.arrowCircle}>
            <ArrowLeft size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Card 2: تحدي فريق (Orange) */}
        <TouchableOpacity
          style={[styles.actionCard, styles.orangeCard]}
          activeOpacity={0.88}
          onPress={() => router.push('/(public)/challenges' as any)}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, styles.orangeIconWrap]}>
              <Flame size={22} color="#EA580C" />
            </View>
          </View>
          <Text style={styles.cardTitle}>تحدي فريق</Text>
          <Text style={styles.cardSubtitle}>تحدى فريق أو قلب على خصم</Text>
          <View style={styles.arrowCircle}>
            <ArrowLeft size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Card 3: البطولات (Green) */}
        <TouchableOpacity
          style={[styles.actionCard, styles.greenCard]}
          activeOpacity={0.88}
          onPress={() => router.push('/(public)/tournaments' as any)}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, styles.greenIconWrap]}>
              <Trophy size={22} color="#00875A" />
            </View>
          </View>
          <Text style={styles.cardTitle}>البطولات</Text>
          <Text style={styles.cardSubtitle}>المباريات والنتائج والترتيب</Text>
          <View style={styles.arrowCircle}>
            <ArrowLeft size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    minHeight: 146,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  blueCard: {
    backgroundColor: '#0284C7',
  },
  orangeCard: {
    backgroundColor: '#EA580C',
  },
  greenCard: {
    backgroundColor: '#00875A',
  },
  cardHeader: {
    width: '100%',
    alignItems: 'flex-end',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueIconWrap: {},
  orangeIconWrap: {},
  greenIconWrap: {},
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'right',
    marginTop: 6,
  },
  cardSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'right',
    lineHeight: 14,
    marginTop: 2,
    fontWeight: '600',
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});
