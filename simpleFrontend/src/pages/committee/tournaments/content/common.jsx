import { ImagePlus } from 'lucide-react'

export function ContentFilePicker({ file, setFile, currentUrl, label, hint, previewClass = 'size-16' }) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold text-slate-600">{label}</p>
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3 transition-colors hover:border-green-400">
        <span className={`${previewClass} grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200`}>
          {file || currentUrl ? (
            <img src={file ? URL.createObjectURL(file) : currentUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-slate-400" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-slate-700">{file ? file.name : label}</span>
          {hint && <span className="mt-0.5 block text-[10px] font-semibold text-slate-400">{hint}</span>}
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
    </div>
  )
}

export function ContentSectionHeader({ icon: Icon, title, desc, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-green-50 text-green-600">
          <Icon className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          {desc && <p className="text-[11px] font-semibold text-slate-400">{desc}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
