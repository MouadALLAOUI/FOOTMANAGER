import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { pdf } from '@react-pdf/renderer'
import {
  Printer,
  FileDown,
  Download,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Grid3X3,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react'
import { useToast } from '../../../../components/ui/Toast'
import { useTournamentExportData } from './useTournamentExportData'
import { collectImageUrls, validateImages } from './collectImages'
import TournamentExportSheet from './exportSheet'
import TournamentPdfDocument from './TournamentPdfDocument'
import TournamentSummaryImageModal from './TournamentSummaryImageModal'
import LeagueResultsMatrixExportModal from './LeagueResultsMatrixExportModal'
import useScrollLock from '../../../../components/useScrollLock'
import { usePublicSettings } from '../../../../api/queries'
import './print.css'

export default function TournamentExport({ tournament, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, loading, error, reload } = useTournamentExportData(tournament?.id)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [summaryImageOpen, setSummaryImageOpen] = useState(false)
  const [matrixOpen, setMatrixOpen] = useState(false)
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
      link.download = `tournament-report-${tournament?.slug || tournament?.id || 'export'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('تم تحميل التقرير الختامي PDF بنجاح')
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('حدث خطأ أثناء توليد ملف الـ PDF')
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

  const isLeague = tournament?.tournament_format === 'league'

  return createPortal(
    <div className="tm-export-root">
      <div className="tm-export-backdrop" onClick={onClose}>
        <div className="tm-export-frame" onClick={(e) => e.stopPropagation()}>
          <div className="tm-export-toolbar">
            <div className="tm-export-toolbar-title">
              <h2>{t('committee.export.title', 'تصدير وثائق وتقارير البطولة')}</h2>
              <p>{t('committee.export.subtitle', 'ملخص مرئي وصورة قابلة للمشاركة وتقارير PDF رسمية')}</p>
            </div>

            <div className="tm-export-actions">
              {/* Output 1: ملخص البطولة — صورة */}
              <button
                type="button"
                className="tm-export-btn tm-export-btn-primary"
                style={{ backgroundColor: '#059669', borderColor: '#10b981' }}
                onClick={() => setSummaryImageOpen(true)}
                disabled={loading || !!error}
                title="توليد صورة ملخص عالية الجودة للمشاركة على واتساب"
              >
                <ImageIcon size={18} />
                <span>ملخص البطولة — صورة</span>
              </button>

              {/* Output 2: التقرير الختامي الكامل — PDF */}
              <button
                type="button"
                className="tm-export-btn tm-export-btn-primary"
                style={{ backgroundColor: '#0284c7', borderColor: '#38bdf8' }}
                onClick={handlePdf}
                disabled={loading || !!error || pdfBusy}
                title="توليد تقرير ختامي شامل ومنسق بصيغة PDF"
              >
                {pdfBusy ? <Loader2 className="tm-export-spinner" size={18} /> : <FileDown size={18} />}
                <span>{pdfBusy ? 'جاري التوليد...' : 'التقرير الختامي — PDF'}</span>
              </button>

              {/* Option: League Matrix Export */}
              {isLeague && (
                <button
                  type="button"
                  className="tm-export-btn tm-export-btn-ghost"
                  onClick={() => setMatrixOpen(true)}
                  disabled={loading || !!error}
                  title="تصدير صورة مصفوفة نتائج مواجهات الدوري"
                >
                  <Grid3X3 size={18} />
                  <span>مصفوفة النتائج</span>
                </button>
              )}

              {/* Standard browser print */}
              <button type="button" className="tm-export-btn tm-export-btn-ghost" onClick={handlePrint} disabled={loading || !!error}>
                <Printer size={18} />
                <span>{t('committee.export.print', 'طباعة')}</span>
              </button>

              {/* Raw JSON data */}
              <button type="button" className="tm-export-btn tm-export-btn-ghost" onClick={handleJson} disabled={loading || !!error}>
                <Download size={18} />
                <span>بيانات JSON</span>
              </button>

              {/* Close */}
              <button type="button" className="tm-export-btn tm-export-btn-close" onClick={onClose} aria-label={t('committee.export.close', 'إغلاق')}>
                <X size={18} />
              </button>
            </div>
          </div>

          {loading && (
            <div className="tm-export-status">
              <Loader2 className="tm-export-spinner" size={28} />
              <span>{t('committee.export.loading', 'جاري تجهيز بيانات البطولة...')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="tm-export-status tm-export-status-error">
              <AlertCircle size={28} />
              <span>{t('committee.export.error', 'حدث خطأ أثناء تحميل البيانات')}</span>
              <button type="button" className="tm-export-btn tm-export-btn-primary" onClick={reload}>
                <RefreshCw size={18} />
                <span>{t('committee.export.retry', 'إعادة المحاولة')}</span>
              </button>
            </div>
          )}

          {!loading && !error && data && <TournamentExportSheet data={data} appName={appName} />}
        </div>
      </div>

      {/* Quick Summary Image Modal */}
      {summaryImageOpen && (
        <TournamentSummaryImageModal
          data={data}
          appName={appName}
          onClose={() => setSummaryImageOpen(false)}
        />
      )}

      {/* League Results Matrix Modal */}
      {matrixOpen && (
        <LeagueResultsMatrixExportModal
          tournament={tournament}
          standingsData={data?.standings}
          onClose={() => setMatrixOpen(false)}
        />
      )}
    </div>,
    document.body
  )
}
