import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ACCENT_MAP = {
  emerald: {
    header: 'hover:bg-emerald-50',
    icon: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-100',
  },
  orange: {
    header: 'hover:bg-orange-50',
    icon: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-orange-100',
  },
  violet: {
    header: 'hover:bg-violet-50',
    icon: 'text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
    border: 'border-violet-100',
  },
  red: {
    header: 'hover:bg-red-50',
    icon: 'text-red-600',
    badge: 'bg-red-100 text-red-700',
    border: 'border-red-100',
  },
  blue: {
    header: 'hover:bg-blue-50',
    icon: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-100',
  },
};

export default function AccordionSection({ title, icon: Icon, defaultOpen = false, badge, accent = 'emerald', children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const colors = ACCENT_MAP[accent] || ACCENT_MAP.emerald;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-5 py-4 text-start ${colors.header} transition`}
      >
        {Icon && <Icon size={18} className={`${colors.icon} shrink-0`} />}
        <span className="flex-1 text-sm font-black text-gray-800">{title}</span>
        {badge != null && badge > 0 && (
          <span className={`${colors.badge} text-xs font-black px-2.5 py-0.5 rounded-full`}>
            {badge}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className={`px-5 pb-5 border-t ${colors.border}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
