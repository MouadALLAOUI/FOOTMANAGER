import { useEffect, useState } from 'react';
import { persistentStorage } from '@/services/storage/persistent-storage';

export type MockPersonaId =
  | 'manager_approved'
  | 'manager_pending'
  | 'player'
  | 'committee'
  | 'terrain_owner'
  | 'admin'
  | 'guest';

export interface MockPersonaInfo {
  id: MockPersonaId;
  label: string;
  role: string;
  status: string;
  badge: string;
  description: string;
}

export const MOCK_PERSONAS: MockPersonaInfo[] = [
  {
    id: 'manager_approved',
    label: 'مدير فريق (معتمد)',
    role: 'manager',
    status: 'approved',
    badge: '⚽ مدير معتمد',
    description: 'يوسف العلوي — مدير رجاء كازابلانكا الهواة (كامل الصلاحيات)',
  },
  {
    id: 'manager_pending',
    label: 'مدير فريق (قيد المراجعة)',
    role: 'manager',
    status: 'pending',
    badge: '⏳ قيد المراجعة',
    description: 'رشيد الإدريسي — مدير نهضة البرنوصي (بانتظار موافقة الإدارة)',
  },
  {
    id: 'player',
    label: 'لاعب محلي',
    role: 'player',
    status: 'approved',
    badge: '🏃 لاعب',
    description: 'أمين السعدي — لاعب خط وسط محلي (تصفح المباريات والحجوزات)',
  },
  {
    id: 'committee',
    label: 'لجنة تنظيم البطولات',
    role: 'committee',
    status: 'approved',
    badge: '🏆 منظم بطولات',
    description: 'طارق العمراني — عضو لجنة تنظيم الدوريات والقرعة',
  },
  {
    id: 'terrain_owner',
    label: 'صاحب ملعب',
    role: 'terrain_owner',
    status: 'approved',
    badge: '🏟️ مالك ملاعب',
    description: 'الحاج محمد المنصوري — صاحب مركب العربي بنمبارك',
  },
  {
    id: 'admin',
    label: 'مشرف عام (Admin)',
    role: 'admin',
    status: 'approved',
    badge: '⚙️ مشرف النظام',
    description: 'الإدارة المركزية — التحكم في الموافقات والمستخدمين',
  },
  {
    id: 'guest',
    label: 'زائر بدون تسجيل',
    role: 'guest',
    status: 'unauthenticated',
    badge: '👁️ زائر',
    description: 'تصفح كزائر عام دون أي تسجيل دخول',
  },
];

const STORAGE_KEY_PREVIEW_ACTIVE = 'dev.preview_active';
const STORAGE_KEY_PREVIEW_PERSONA = 'dev.preview_persona';

const listeners = new Set<() => void>();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[PreviewState] Listener error:', e);
    }
  });
}

export function isPreviewModeActive(): boolean {
  if (!__DEV__) return false;
  const stored = persistentStorage.getBool(STORAGE_KEY_PREVIEW_ACTIVE);
  return stored ?? false;
}

export function setPreviewModeActive(active: boolean): void {
  if (!__DEV__) return;
  persistentStorage.setBool(STORAGE_KEY_PREVIEW_ACTIVE, active);
  notifyListeners();
}

export function getActivePreviewPersona(): MockPersonaId {
  if (!__DEV__) return 'manager_approved';
  const stored = persistentStorage.getString(STORAGE_KEY_PREVIEW_PERSONA) as MockPersonaId | undefined;
  if (stored && MOCK_PERSONAS.some((p) => p.id === stored)) {
    return stored;
  }
  return 'manager_approved';
}

export function setActivePreviewPersona(persona: MockPersonaId): void {
  if (!__DEV__) return;
  persistentStorage.setString(STORAGE_KEY_PREVIEW_PERSONA, persona);
  notifyListeners();
}

export function subscribePreviewState(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function usePreviewState(): {
  isPreview: boolean;
  persona: MockPersonaId;
  personaInfo: MockPersonaInfo;
  setPreview: (active: boolean) => void;
  setPersona: (id: MockPersonaId) => void;
  personas: MockPersonaInfo[];
} {
  const [isPreview, setIsPreview] = useState(() => isPreviewModeActive());
  const [persona, setPersonaState] = useState<MockPersonaId>(() => getActivePreviewPersona());

  useEffect(() => {
    const unsubscribe = subscribePreviewState(() => {
      setIsPreview(isPreviewModeActive());
      setPersonaState(getActivePreviewPersona());
    });
    return unsubscribe;
  }, []);

  const personaInfo =
    MOCK_PERSONAS.find((p) => p.id === persona) ?? MOCK_PERSONAS[0];

  return {
    isPreview,
    persona,
    personaInfo,
    setPreview: setPreviewModeActive,
    setPersona: setActivePreviewPersona,
    personas: MOCK_PERSONAS,
  };
}
