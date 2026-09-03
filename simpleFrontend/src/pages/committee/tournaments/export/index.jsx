import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import { Printer, FileDown, Download, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useToast } from '../../../../components/ui/Toast'
import { useTournamentExportData } from './useTournamentExportData'
import { collectImageUrls, validateImages } from './collectImages'
import TournamentExportSheet from './exportSheet'
import TournamentPdfDocument from './TournamentPdfDocument'
import useScrollLock from '../../../../components/useScrollLock'
import { usePublicSettings } from '../../../../api/queries'
import './print.css'

export default function TournamentExport({ tournament, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, loading, error, reload } = useTournamentExportData(tournament?.id)
  const [pdfBusy, setPdfBusy] = useState(false)
  const settingsQuery = usePublicSettings()
  const appName = settingsQuery.data?.settings?.platform_name

  useScrollLock(true)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handlePrint = () => window.print()

  const handlePdf = async () => {
    if (!data || pdfBusy) return
    setPdfBusy(true)
    try {
      const urls = collectImageUrls(data)
      const images = await validateImages(urls)
      const blob = await pdf(<TournamentPdfDocument data={data} images={images} appName={appName} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tournament-${tournament?.slug || tournament?.id || 'export'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(t('committee.export.downloaded'))
    } catch {
      toast.error(t('committee.export.downloadError'))
    } finally {
      setPdfBusy(false)
    }
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
              <button type="button" className="tm-export-btn tm-export-btn-primary" onClick={handlePdf} disabled={loading || !!error || pdfBusy}>
                {pdfBusy ? <Loader2 className="tm-export-spinner" size={18} /> : <FileDown size={18} />}
                {pdfBusy ? t('committee.export.generating') : t('committee.export.pdf')}
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

          {!loading && !error && data && <TournamentExportSheet data={data} appName={appName} />}
        </div>
      </div>
    </div>,
    document.body
  )
}
