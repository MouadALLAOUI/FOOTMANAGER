import { useTranslation } from 'react-i18next'
import { Trash2, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'

export default function DeleteTeamModal({
  open,
  team,
  selectedCount = 0,
  isBulk = false,
  loading = false,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation()

  if (!open) return null

  if (isBulk) {
    return (
      <ConfirmDialog
        open={open}
        onClose={onClose}
        onConfirm={onConfirm}
        loading={loading}
        title={t('adminTeams.confirmBulkDeleteTitle', 'تأكيد حذف الفرق الحرة المحددة')}
        description={t(
          'adminTeams.confirmBulkDeleteDesc',
          'هل أنت متأكد من حذف {{count}} من الفرق الحرة نهائياً؟ الفرق التابعة للمسيرين سيتم استثناؤها ولن تُحذف.',
          { count: selectedCount },
        )}
        confirmLabel={t('adminTeams.bulkDelete', 'حذف الفرق الحرة')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        tone="danger"
        icon={Trash2}
      />
    )
  }

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      loading={loading}
      title={t('adminTeams.confirmDeleteTitle', 'تأكيد حذف الفريق الحر')}
      description={t(
        'adminTeams.confirmDeleteDesc',
        'هل أنت متأكد من حذف الفريق الحر "{{name}}" نهائياً؟ سيتم حذفه بالكامل ولن يظهر بعد ذلك في اختيار فرق البطولات.',
        { name: team?.name || '' },
      )}
      confirmLabel={t('adminTeams.deleteFreeTeam', 'حذف نهائياً')}
      cancelLabel={t('common.cancel', 'إلغاء')}
      tone="danger"
      icon={AlertTriangle}
    />
  )
}
