import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  Calendar,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Phone,
  Shield,
  Shirt,
  User,
  UserPlus,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { useToast } from '@/components/ui/Toast';
import { useCreatePlayer } from '@/api/managerTeam';

export default function AddPlayerScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const createPlayerMutation = useCreatePlayer();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('حارس المرمى (GK)');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const positions = [
    'حارس المرمى (GK)',
    'قلب دفاع (CB)',
    'وسط دفاعي (CDM)',
    'وسط ميدان (CM)',
    'جناح (W)',
    'مهاجم (ST)',
  ];

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      toast.show('تعذر اختيار الصورة من المعرض', 'error');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.show('يرجى إدخال اسم اللاعب', 'error');
      return;
    }
    if (!jerseyNumber.trim()) {
      toast.show('يرجى إدخال رقم القميص', 'error');
      return;
    }

    const positionMap: Record<string, string> = {
      'حارس المرمى (GK)': 'goalkeeper',
      'قلب دفاع (CB)': 'defender',
      'وسط دفاعي (CDM)': 'midfielder',
      'وسط ميدان (CM)': 'midfielder',
      'جناح (W)': 'forward',
      'مهاجم (ST)': 'forward',
    };

    let photo: { uri: string; name: string; type: string } | undefined;
    if (avatarUri) {
      const filename = avatarUri.split('/').pop() || 'avatar.jpg';
      photo = {
        uri: avatarUri,
        name: filename,
        type: 'image/jpeg',
      };
    }

    try {
      await createPlayerMutation.mutateAsync({
        name: fullName.trim(),
        number: parseInt(jerseyNumber, 10),
        position: positionMap[position] || 'midfielder',
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        photo,
      });

      toast.show('تمت إضافة اللاعب بنجاح!', 'success');
      router.back();
    } catch (err: any) {
      toast.show(err?.message || 'تعذر إضافة اللاعب، يرجى المحاولة ثانية', 'error');
    }
  };


  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader
        showBack
        title="إضافة لاعب"
        titleIcon={<UserPlus size={22} color="#00875A" />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo Picker Placeholder Box */}
        <TouchableOpacity
          style={styles.photoUploadCard}
          onPress={handlePickImage}
          activeOpacity={0.85}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.pickedAvatar} />
          ) : (
            <View style={styles.cameraCircle}>
              <Camera size={28} color="#00875A" />
            </View>
          )}

          <Text style={styles.photoUploadTitle}>إضافة صورة اللاعب</Text>
          <Text style={styles.photoUploadSubtitle}>
            اضغط لاختيار صورة من المعرض
          </Text>
        </TouchableOpacity>

        {/* Input: الاسم الكامل * */}
        <View style={styles.fieldWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>الاسم الكامل *</Text>
            <User size={15} color="#00875A" />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="مثال: أحمد الزروالي"
            placeholderTextColor="#94A3B8"
            value={fullName}
            onChangeText={setFullName}
            textAlign="right"
          />
        </View>

        {/* Input: رقم اللاعب * */}
        <View style={styles.fieldWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>رقم اللاعب *</Text>
            <Shirt size={15} color="#00875A" />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="مثال: 10"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            value={jerseyNumber}
            onChangeText={setJerseyNumber}
            textAlign="right"
          />
        </View>

        {/* Input: المركز * (Dropdown) */}
        <View style={styles.fieldWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>المركز *</Text>
            <Shield size={15} color="#00875A" />
          </View>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setShowPositionPicker(!showPositionPicker)}
            activeOpacity={0.8}
          >
            <ChevronDown size={18} color="#64748B" />
            <Text style={styles.dropdownValue}>{position}</Text>
          </TouchableOpacity>

          {showPositionPicker && (
            <View style={styles.positionsMenu}>
              {positions.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={styles.positionMenuItem}
                  onPress={() => {
                    setPosition(pos);
                    setShowPositionPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.positionMenuItemText,
                      position === pos && styles.positionMenuItemTextActive,
                    ]}
                  >
                    {pos}
                  </Text>
                  {position === pos && <Check size={14} color="#00875A" />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Input: تاريخ الميلاد * */}
        <View style={styles.fieldWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>تاريخ الميلاد *</Text>
            <Calendar size={15} color="#00875A" />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="اختر التاريخ (مثال: 2005-04-15)"
            placeholderTextColor="#94A3B8"
            value={birthDate}
            onChangeText={setBirthDate}
            textAlign="right"
          />
        </View>

        {/* Input: رقم الهاتف (اختياري) */}
        <View style={styles.fieldWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>رقم الهاتف (اختياري)</Text>
            <Phone size={15} color="#00875A" />
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="مثال: 06 12 34 56 78"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            textAlign="right"
          />
        </View>

        {/* Input: ملاحظات (اختياري) */}
        <View style={styles.fieldWrap}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>ملاحظات (اختياري)</Text>
            <FileText size={15} color="#00875A" />
          </View>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="أي معلومات إضافية عن اللاعب..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
            textAlign="right"
          />
        </View>

        {/* Submit Button: حفظ اللاعب */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.88}
        >
          <Check size={18} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.saveBtnText}>حفظ اللاعب</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  photoUploadCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginVertical: 16,
  },
  cameraCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pickedAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#00875A',
    marginBottom: 8,
  },
  photoUploadTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  photoUploadSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  dropdownBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  positionsMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    paddingVertical: 4,
  },
  positionMenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  positionMenuItemText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  positionMenuItemTextActive: {
    color: '#00875A',
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
