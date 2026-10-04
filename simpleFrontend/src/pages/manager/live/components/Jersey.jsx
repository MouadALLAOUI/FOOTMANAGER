import React from 'react'

export default function Jersey({
  number,
  photoUrl,
  variant = 'home', // 'home' | 'away'
  className = 'w-14 h-16',
}) {
  const isHome = variant === 'home'
  // Home kit: AJI NQSSRO deep emerald green
  // Away kit: Clean crisp white / light slate
  const fillColor = isHome ? '#047857' : '#FFFFFF'
  const strokeColor = isHome ? '#065F46' : '#CBD5E1'
  const accentColor = isHome ? '#059669' : '#F1F5F9'
  const collarColor = isHome ? '#065F46' : '#94A3B8'
  const textColor = isHome ? '#FFFFFF' : '#0F172A'

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 110"
        className="h-full w-full drop-shadow-sm transition-transform group-hover:scale-105"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Sleeves & Body */}
        <path
          d="M30 18 L8 40 L24 54 L32 44 L32 98 C32 102 36 106 40 106 L60 106 C64 106 68 102 68 98 L68 44 L76 54 L92 40 L70 18 C64 24 56 26 50 26 C44 26 36 24 30 18 Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner shoulder accent stripes */}
        <path
          d="M32 44 L24 54 L12 42 L28 22"
          fill={accentColor}
          opacity={isHome ? 0.35 : 0.6}
        />
        <path
          d="M68 44 L76 54 L88 42 L72 22"
          fill={accentColor}
          opacity={isHome ? 0.35 : 0.6}
        />

        {/* Collar neckline */}
        <path
          d="M34 20 C42 28 58 28 66 20"
          stroke={collarColor}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Center content: Player photo avatar if available, otherwise player number */}
      {photoUrl ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-2.5">
          <img
            src={photoUrl}
            alt=""
            className="size-7 rounded-full object-cover ring-2 ring-white/90 shadow-sm"
          />
        </div>
      ) : (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center pt-2.5 font-black tabular-nums tracking-tighter"
          style={{ color: textColor, fontSize: '1.25rem' }}
        >
          {number ?? '—'}
        </span>
      )}
    </div>
  )
}
