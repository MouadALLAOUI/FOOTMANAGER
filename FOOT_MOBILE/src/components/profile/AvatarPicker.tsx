import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { removeAvatar, uploadAvatar } from '@/api/profile';
import { getUserMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useTheme } from '@/theme/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { Camera, Trash2 } from 'lucide-react-native';

interface Props {
  editable?: boolean;
}

export function AvatarPicker({ editable = true }: Props): React.JSX.Element {
  const { user, updateCachedUser } = useAuth();
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const { show } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const hasAvatar = !!user?.avatar_url;

  const pickImage = async (): Promise<void> => {
    if (!editable) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      show(isRTL ? 'الإذن مطلوب للوصول إلى الصور' : 'Permission required', 'error');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      exif: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const name = asset.fileName ?? `avatar_${Date.now()}.jpg`;
    const type = asset.mimeType ?? 'image/jpeg';
    setPreviewUri(uri);
    setUploading(true);
    try {
      const res = await uploadAvatar({ uri, name, type });
      updateCachedUser(res.user);
      show(isRTL ? 'تم تحديث الصورة' : 'Avatar updated', 'success');
    } catch (e) {
      show(getUserMessage(e), 'error');
      setPreviewUri(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (): void => {
    if (!hasAvatar || !editable) return;
    const doRemove = async (): Promise<void> => {
      setUploading(true);
      try {
        const res = await removeAvatar();
        updateCachedUser(res.user);
        setPreviewUri(null);
        show(isRTL ? 'تمت إزالة الصورة' : 'Avatar removed', 'success');
      } catch (e) {
        show(getUserMessage(e), 'error');
      } finally {
        setUploading(false);
      }
    };
    Alert.alert(
      isRTL ? 'إزالة الصورة' : 'Remove avatar',
      isRTL ? 'هل أنت متأكد؟' : 'Are you sure?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isRTL ? 'إزالة' : 'Remove', style: 'destructive', onPress: () => void doRemove() },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {previewUri ? (
          <Image source={{ uri: previewUri }} style={styles.preview} />
        ) : (
          <Avatar uri={user?.avatar_url ?? user?.avatar_thumbnail_url ?? null} name={user?.name} size="xl" />
        )}
        {uploading ? (
          <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>

      {editable ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => void pickImage()}
            disabled={uploading}
            style={({ pressed }) => [
              styles.camBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : uploading ? 0.6 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isRTL ? 'تغيير الصورة' : 'Change avatar'}
          >
            <Camera size={16} color="#fff" />
            <Text style={styles.camText}>{isRTL ? 'تغيير' : 'Change'}</Text>
          </Pressable>
          {hasAvatar ? (
            <Pressable
              onPress={handleRemove}
              disabled={uploading}
              style={({ pressed }) => [
                styles.removeBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Trash2 size={14} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10 },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  preview: { width: 88, height: 88, borderRadius: 44 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  camBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 },
  camText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  removeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
});
