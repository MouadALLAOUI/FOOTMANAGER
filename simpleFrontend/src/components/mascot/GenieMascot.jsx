/**
 * GenieMascot: Official platform mascot "الجني ذو الطربوش المغربي"
 * Loaded directly from the high-resolution official branding assets.
 * Ring: #D9A441 with 3px border
 * Status: Available green dot #1F7A4D in corner
 */
export default function GenieMascot({
  size = 40,
  className = '',
  animated = false,
  variant = 'avatar', // 'avatar' | 'bust' | 'pose'
  border = true,
  status = true,
}) {
  const src =
    variant === 'pose'
      ? '/mascot-pose.png'
      : variant === 'bust'
        ? '/mascot-bust.png'
        : '/mascot-avatar.png'

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      title="الجني - التميمة الرسمية لمنصة أجي نقصرو"
      aria-label="التميمة الرسمية لمنصة أجي نقصرو"
    >
      <div
        className={`relative size-full overflow-hidden ${
          variant === 'avatar' ? 'rounded-full' : 'rounded-2xl'
        } ${border ? 'border-[3px] border-[#D9A441] shadow-md shadow-black/25' : ''}`}
      >
        <img
          src={src}
          alt="التميمة الرسمية أجي نقصرو: الجني ذو الطربوش المغربي"
          loading="eager"
          decoding="sync"
          className={`size-full object-cover ${
            variant === 'avatar' ? 'object-center' : 'object-top'
          } ${animated ? 'hover:scale-105 transition-transform duration-300' : ''}`}
        />
      </div>

      {/* نقطة "متاح" الخضراء #1F7A4D في الزاوية */}
      {status && variant === 'avatar' && (
        <span
          className="absolute bottom-0 end-0 size-3 rounded-full bg-[#1F7A4D] ring-2 ring-[#0E1726] shadow-xs"
          title="المساعد متاح"
        />
      )}
    </div>
  )
}
