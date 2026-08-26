import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { updateProfile } from '@/api/profile';
import { getUserMessage, getValidationErrors } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { spacing } from '@/theme/spacing';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: Props): React.JSX.Element {
  const { user, updateCachedUser } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const { show } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [isWhatsapp, setIsWhatsapp] = useState(!!user?.is_whatsapp);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (visible && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form with user when modal opens
      setName(user.name ?? '');
      setPhone(user.phone ?? '');
      setEmail(user.email ?? '');
      setIsWhatsapp(!!user.is_whatsapp);
      setErrors({});
    }
  }, [visible, user]);

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) {
      show(isRTL ? 'الاسم مطلوب' : 'Name is required', 'error');
      return;
    }
    if (!phone.trim()) {
      show(isRTL ? 'رقم الهاتف مطلوب' : 'Phone is required', 'error');
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        is_whatsapp: isWhatsapp,
      };
      // only send email if changed (keep null if empty to avoid unique issues)
      const trimmedEmail = email.trim();
      if (trimmedEmail !== (user?.email ?? '')) {
        payload.email = trimmedEmail || null;
      }
      const res = await updateProfile(payload as never);
      updateCachedUser(res.user);
      show(isRTL ? 'تم تحديث الملف الشخصي' : 'Profile updated', 'success');
      onClose();
    } catch (e) {
      const fieldErrors = getValidationErrors(e);
      if (fieldErrors) setErrors(fieldErrors);
      show(getUserMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={isRTL ? 'تعديل الملف الشخصي' : 'Edit Profile'}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Input
            label={isRTL ? 'الاسم الكامل' : 'Full name'}
            value={name}
            onChangeText={setName}
            placeholder={isRTL ? 'أدخل اسمك' : 'Enter your name'}
            error={errors.name?.[0]}
          />
          <Input
            label={isRTL ? 'رقم الهاتف' : 'Phone'}
            value={phone}
            onChangeText={setPhone}
            placeholder="06XXXXXXXX"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            error={errors.phone?.[0]}
          />
          <Input
            label={isRTL ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            error={errors.email?.[0]}
          />
          <View style={[styles.switchRow, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>
              {isRTL ? 'هذا الرقم واتساب' : 'This number is WhatsApp'}
            </Text>
            <Switch value={isWhatsapp} onValueChange={setIsWhatsapp} trackColor={{ true: colors.primary }} />
          </View>
          {errors.is_whatsapp ? <Text style={[styles.fieldError, { color: colors.danger }]}>{errors.is_whatsapp[0]}</Text> : null}

          <View style={styles.actions}>
            <Button title={isRTL ? 'إلغاء' : 'Cancel'} variant="ghost" onPress={onClose} disabled={loading} />
            <View style={styles.saveWrap}>
              <Button title={isRTL ? 'حفظ' : 'Save'} onPress={() => void handleSave()} loading={loading} disabled={loading} fullWidth />
            </View>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  fieldError: { fontSize: 12, marginTop: -8 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  saveWrap: { flex: 1 },
});
