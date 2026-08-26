import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

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

export function ChangePasswordModal({ visible, onClose }: Props): React.JSX.Element {
  const { logout } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const { show } = useToast();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const reset = (): void => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setErrors({});
  };

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const handleSave = async (): Promise<void> => {
    if (!current || !next || !confirm) {
      show(isRTL ? 'جميع الحقول مطلوبة' : 'All fields are required', 'error');
      return;
    }
    if (next.length < 8) {
      show(isRTL ? 'كلمة المرور 8 أحرف على الأقل' : 'Password must be at least 8 characters', 'error');
      return;
    }
    if (next !== confirm) {
      show(isRTL ? 'تأكيد كلمة المرور غير متطابق' : 'Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      await updateProfile({
        current_password: current,
        password: next,
        password_confirmation: confirm,
      } as never);
      show(isRTL ? 'تم تغيير كلمة المرور، يرجى تسجيل الدخول مجدداً' : 'Password changed, please sign in again', 'success');
      reset();
      onClose();
      // Tokens revoked server-side — force logout
      setTimeout(() => {
        void logout();
      }, 600);
    } catch (e) {
      const fieldErrors = getValidationErrors(e);
      if (fieldErrors) setErrors(fieldErrors);
      // current_password validation shows under that field
      const msg = getUserMessage(e);
      // If 403 activity locked, show specific
      show(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={handleClose} title={isRTL ? 'تغيير كلمة المرور' : 'Change Password'}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <Input
            label={isRTL ? 'كلمة المرور الحالية' : 'Current password'}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            placeholder="••••••••"
            error={errors.current_password?.[0]}
          />
          <Input
            label={isRTL ? 'كلمة المرور الجديدة' : 'New password'}
            value={next}
            onChangeText={setNext}
            secureTextEntry
            placeholder="••••••••"
            hint={isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}
            error={errors.password?.[0]}
          />
          <Input
            label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm password'}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="••••••••"
            error={errors.password_confirmation?.[0]}
          />

          <View style={styles.actions}>
            <Button title={isRTL ? 'إلغاء' : 'Cancel'} variant="ghost" onPress={handleClose} disabled={loading} />
            <View style={styles.saveWrap}>
              <Button title={isRTL ? 'تأكيد' : 'Confirm'} onPress={() => void handleSave()} loading={loading} disabled={loading} fullWidth />
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {isRTL ? 'سيتم تسجيل خروجك بعد تغيير كلمة المرور.' : 'You will be signed out after changing password.'}
          </Text>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  saveWrap: { flex: 1 },
  hint: { fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
