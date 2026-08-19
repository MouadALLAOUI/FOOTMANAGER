import { createContext, useContext, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/client'
import { Maintenance } from '../errors'

const MaintenanceContext = createContext(null)

const MODULE_LABELS = {
  bookings: 'الحجوزات',
  matches: 'المباريات',
  tournaments: 'البطولات',
  teams: 'الفريق',
  players: 'اللاعبون',
  terrain: 'الملاعب',
  recruitment: 'الضم والwerel',
  social: 'التواصل الاجتماعي',
  chat: 'المحادثة',
  reviews: 'التقييمات',
  notifications: 'الإشعارات',
  subscriptions: 'الاشتراكات',
}

const PAGE_LABELS = {
  '/': 'الرئيسية',
  '/about': 'من نحن',
  '/contact': 'اتصل بنا',
  '/terms': 'الشروط',
  '/privacy': 'الخصوصية',
  '/pricing': 'الأسعار',
  '/fields': 'الملاعب',
  '/matches': 'المباريات',
  '/tournaments': 'البطولات',
  '/login': 'تسجيل الدخول',
  '/register': 'التسجيل',
  '/pending': 'في انتظار الموافقة',
  '/recovery': 'استرداد الحساب',
  '/dashboard': 'لوحة المدير',
  '/terrain': 'لوحة مالك الملعب',
  '/admin': 'لوحة المسؤول',
  '/player': 'لوحة اللاعب',
  '/committee': 'لوحة اللجنة',
}

export default function MaintenanceGate({ children }) {
  const { pathname } = useLocation()

  const { data, isLoading } = useQuery({
    queryKey: ['maintenance-mode'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/settings/public')
        return {
          global: data?.settings?.maintenance_mode === '1',
          modules: data?.module_maintenance || [],
          pages: data?.page_maintenance || [],
        }
      } catch {
        return { global: false, modules: [], pages: [] }
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const globalMaintenance = data?.global ?? false
  const moduleMaintenance = data?.modules ?? []
  const pageMaintenance = data?.pages ?? []

  const activeModules = useMemo(() => {
    const map = {}
    for (const m of moduleMaintenance) {
      map[m.module] = m
    }
    return map
  }, [moduleMaintenance])

  const activePages = useMemo(() => {
    const map = {}
    for (const p of pageMaintenance) {
      map[p.path] = p
    }
    return map
  }, [pageMaintenance])

  const isModuleActive = useMemo(
    () => (module) => Boolean(activeModules[module]),
    [activeModules],
  )

  const getModuleMessage = useMemo(
    () => (module) => activeModules[module]?.message || null,
    [activeModules],
  )

  const isPageActive = useMemo(
    () => (path) => {
      if (path.startsWith('/admin')) return false
      if (activePages[path]) return true
      const prefix = path.split('/').slice(0, 2).join('/')
      if (prefix !== path && activePages[prefix]) return true
      return false
    },
    [activePages],
  )

  const getPageMessage = useMemo(
    () => (path) => {
      if (activePages[path]) return activePages[path]?.message || null
      const prefix = path.split('/').slice(0, 2).join('/')
      return activePages[prefix]?.message || null
    },
    [activePages],
  )

  const ctx = useMemo(() => ({
    activeModules,
    isModuleActive,
    getModuleMessage,
    moduleLabels: MODULE_LABELS,
    activePages,
    isPageActive,
    getPageMessage,
    pageLabels: PAGE_LABELS,
  }), [activeModules, isModuleActive, getModuleMessage, activePages, isPageActive, getPageMessage])

  if (isLoading) return children

  if (globalMaintenance && !pathname.startsWith('/admin')) {
    return <Maintenance />
  }

  return (
    <MaintenanceContext.Provider value={ctx}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useModuleMaintenance() {
  const ctx = useContext(MaintenanceContext)
  return ctx
}

export function usePageMaintenance() {
  const ctx = useContext(MaintenanceContext)
  return ctx
}
