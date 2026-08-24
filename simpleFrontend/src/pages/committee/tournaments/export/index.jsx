import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Printer, FileDown, Download, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '../../../../components/ui/Toast'
import { useTournamentExportData } from './useTournamentExportData'
import TournamentExportSheet from './exportSheet'
import useScrollLock from '../../../../components/useScrollLock'
import './print.css'

export default function TournamentExport({ tournament, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, loading, error, reload } = useTournamentExportData(tournament?.id)

  useScrollLock(true)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handlePrint = () => window.print()

  const handlePdf = () => {
    window.print()
    toast.info(t('committee.export.pdfHint'))
  }

  const handleJson = () => {
    if (!data) return
    const payload = {
      generated_at: new Date().toISOString(),
      tournament: data.tournament,
      teams: data.teams,
      fixtures: data.fixtures,
      standings: data.standings,
      statistics: data.statistics,
      news: data.news,
      gallery: data.gallery,
      sponsors: data.sponsors,
      partners: data.partners,
      contact: data.contact,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tournament-${tournament?.id || 'export'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return createPortal(
    <div className="tm-export-root">
      <div className="tm-export-backdrop" onClick={onClose}>
        <div className="tm-export-frame" onClick={(e) => e.stopPropagation()}>
          <div className="tm-export-toolbar">
            <div className="tm-export-toolbar-title">
              <h2>{t('committee.export.title')}</h2>
              <p>{t('committee.export.subtitle')}</p>
            </div>
            <div className="tm-export-actions">
              <button type="button" className="tm-export-btn tm-export-btn-primary" onClick={handlePrint} disabled={loading || !!error}>
                <Printer size={18} />
                {t('committee.export.print')}
              </button>
              <button type="button" className="tm-export-btn tm-export-btn-primary" onClick={handlePdf} disabled={loading || !!error}>
                <FileDown size={18} />
                {t('committee.export.pdf')}
              </button>
              <button type="button" className="tm-export-btn tm-export-btn-ghost" onClick={handleJson} disabled={loading || !!error}>
                <Download size={18} />
                {t('committee.export.exportData')}
              </button>
              <button type="button" className="tm-export-btn tm-export-btn-close" onClick={onClose} aria-label={t('committee.export.close')}>
                <X size={18} />
              </button>
            </div>
          </div>

          {loading && (
            <div className="tm-export-status">
              <Loader2 className="tm-export-spinner" size={28} />
              <span>{t('committee.export.loading')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="tm-export-status tm-export-status-error">
              <AlertCircle size={28} />
              <span>{t('committee.export.error')}</span>
              <button type="button" className="tm-export-btn tm-export-btn-primary" onClick={reload}>
                <RefreshCw size={18} />
                {t('committee.export.retry')}
              </button>
            </div>
          )}

          {!loading && !error && data && <TournamentExportSheet data={data} />}
        </div>
      </div>
    </div>,
    document.body
  )
}
