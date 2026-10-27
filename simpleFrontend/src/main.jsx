import { registerServiceWorker } from './pages/landing/pwaHelper'
// Safe DOM patch for Google Translate / browser extensions mutating DOM nodes
if (typeof window !== 'undefined') {
  const originalInsertBefore = Node.prototype.insertBefore
  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode)
    }
    return originalInsertBefore.apply(this, arguments)
  }

  const originalRemoveChild = Node.prototype.removeChild
  Node.prototype.removeChild = function (child) {
    if (child && child.parentNode !== this) {
      return child
    }
    return originalRemoveChild.apply(this, arguments)
  }
}

import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import './i18n'
import './index.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { config } from '@fortawesome/fontawesome-svg-core'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { queryClient } from './api/queryClient'

config.autoAddCss = false

// Register PWA Service Worker for offline support and auto-updates
registerServiceWorker()

const bootFallback = () => (
  <div className="grid min-h-screen place-items-center bg-[#f6f7fb]">
    <div className="size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500" />
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={bootFallback()}>
          <App />
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
