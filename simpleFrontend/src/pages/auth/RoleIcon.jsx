import React from 'react'

export default function RoleIcon({ role, className = 'size-14' }) {
  switch (role) {
    case 'manager':
      return (
        <div className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105 ${className}`}>
          {/* Tactical Clipboard + Football */}
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Clipboard board */}
            <rect x="4" y="4" width="16" height="17" rx="3" fill="currentColor" fillOpacity="0.12" />
            {/* Clipboard clip */}
            <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
            {/* Pitch tactics lines */}
            <path d="M8 10h3" strokeDasharray="1 1" />
            <path d="M13 14l2-2 2 2" />
            <circle cx="12" cy="11" r="1.5" fill="currentColor" />
            {/* Small soccer ball at corner */}
            <circle cx="15.5" cy="17" r="2.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15.5 15.5l.8.6-.3.9-.9-.1-.3-.8z" fill="currentColor" />
          </svg>
        </div>
      )

    case 'terrain_owner':
      return (
        <div className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105 ${className}`}>
          {/* Football Stadium / Pitch */}
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Pitch boundary */}
            <rect x="3" y="5" width="18" height="14" rx="2.5" fill="currentColor" fillOpacity="0.12" />
            {/* Center line */}
            <line x1="12" y1="5" x2="12" y2="19" />
            {/* Center circle */}
            <circle cx="12" cy="12" r="3" />
            {/* Goal areas */}
            <path d="M3 9h3v6H3" />
            <path d="M21 9h-3v6h3" />
          </svg>
        </div>
      )

    case 'player':
      return (
        <div className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105 ${className}`}>
          {/* Football Player / Jersey */}
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Jersey Body */}
            <path
              d="M8 4l-4 3 2 4 2-1v9h8v-9l2 1 2-4-4-3a4 4 0 0 1-8 0z"
              fill="currentColor"
              fillOpacity="0.15"
            />
            {/* Collar */}
            <path d="M10 4a2 2 0 0 0 4 0" />
            {/* Jersey number 10 or star */}
            <circle cx="12" cy="13" r="2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </div>
      )

    case 'committee':
      return (
        <div className={`relative grid place-items-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-1 ring-white/30 transition-transform duration-300 group-hover:scale-105 ${className}`}>
          {/* Championship Trophy Cup */}
          <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Trophy Cup */}
            <path
              d="M7 4h10v6a5 5 0 0 1-10 0V4z"
              fill="currentColor"
              fillOpacity="0.15"
            />
            {/* Handles */}
            <path d="M7 6H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h2" />
            <path d="M17 6h3a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-2" />
            {/* Stem and Base */}
            <path d="M12 15v3" />
            <path d="M8 21h8" />
            <path d="M10 18h4" />
            {/* Star on trophy */}
            <path d="M12 7l.6 1.4 1.4.2-1 1 .2 1.4-1.2-.7-1.2.7.2-1.4-1-1 1.4-.2z" fill="currentColor" stroke="none" />
          </svg>
        </div>
      )

    default:
      return null
  }
}
