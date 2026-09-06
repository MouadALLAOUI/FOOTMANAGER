import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import { useUploadTeamLogo } from '@/api/managerTeam';
import { AppText } from '@/components/ui/AppText';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/spacing';
import { compressSquareImage, resolveImageUrl } from '@/utils/image';

interface Props {
  logoUrl?: string | null;
  logoThumbnailUrl?: string | null;
  name?: string;
  size?: number;
  editable?: boolean;
}

export function TeamLogoPicker({ logoUrl, logoThumbnailUrl, name, size = 72, editable = false }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const { show } = useToast();
  const uploadMutation = useUploadTeamLogo();
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const busy = uploadMutation.isPending;
  const resolvedLogoUrl = resolveImageUrl(logoUrl ?? logoThumbnailUrl);
  const source = previewUri ?? resolvedLogoUrl ?? null;
  const initial = name?.trim().charAt(0) ?? '';

  const pickLogo = async (): Promise<void> => {
    if (!editable || busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      show(isRTL ? 'الإذن مطلوب للوصول إلى الصور' : 'Permission required', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPreviewUri(asset.uri);
    try {
      const compressed = await compressSquareImage(asset.uri, 512, 500);
      const baseName = asset.fileName?.replace(/\.[a-z0-9]+$/i, '') ?? '';
      const file = {
        uri: compressed.uri,
        name: baseName ? `${baseName}_${Date.now()}.jpg` : `logo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      };
      uploadMutation.mutate(file, {
        onSuccess: () => {
          show(isRTL ? 'تم تحديث شعار الفريق' : 'Team logo updated', 'success');
        },
        onError: (err) => {
          setPreviewUri(null);
          show(getApiErrorMessage(err, isRTL ? 'تعذر رفع الشعار' : 'Could not upload logo'), 'error');
        },
      });
    } catch {
      setPreviewUri(null);
      show(isRTL ? 'تعذر معالجة الصورة' : 'Could not process image', 'error');
    }
  };

  return (
    <Pressable
      onPress={() => void pickLogo()}
      disabled={!editable || busy}
      accessibilityRole="button"
      accessibilityLabel={isRTL ? 'تغيير شعار الفريق' : 'Change team logo'}
      style={({ pressed }) => ({ opacity: pressed && editable ? 0.85 : 1 })}
    >
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
        {source ? (
          <Image source={{ uri: source }} style={[styles.image, { width: size, height: size }]} resizeMode="cover" />
        ) : (
          <AppText variant="h2" color={colors.textMuted} style={styles.initial}>
            {initial || '—'}
          </AppText>
        )}
        {busy ? (
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
        {editable ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Camera size={14} color="#fff" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  initial: { fontWeight: '800' },
  overlay: { position: 'absolute', top: 0, bottom: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    bottom: -2,
    end: -2,
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});