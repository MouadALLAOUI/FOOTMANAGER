import React from 'react'
import ReactMarkdown from 'react-markdown'

const MARKDOWN_RE = /(^|\n)(\s{0,3})#{1,6}\s|(\*\*|__|`|```)|(^|\n)\s*[-*+]\s|(^|\n)\s*\d+[.)]\s|^>\s/

export default function MarkdownText({ children, content, className = '' }) {
  const text = (content ?? children ?? '').toString()

  const isMarkdown = MARKDOWN_RE.test(text)

  if (!isMarkdown) {
    return (
      <p className={`whitespace-pre-line text-xs leading-relaxed text-slate-600 ${className}`}>{text}</p>
    )
  }

  const components = {
    h1: (props) => <h1 className="mt-2 mb-1 text-base font-black text-slate-900" {...props} />,
    h2: (props) => <h2 className="mt-2 mb-1 text-sm font-black text-slate-900" {...props} />,
    h3: (props) => <h3 className="mt-2 mb-1 text-sm font-extrabold text-slate-900" {...props} />,
    h4: (props) => <h4 className="mt-2 mb-1 text-sm font-extrabold text-slate-900" {...props} />,
    h5: (props) => <h5 className="mt-1 mb-1 text-sm font-extrabold text-slate-900" {...props} />,
    h6: (props) => <h6 className="mt-1 mb-1 text-sm font-extrabold text-slate-900" {...props} />,
    p: (props) => <p className="my-1.5 leading-relaxed text-slate-600" {...props} />,
    strong: (props) => <strong className="font-extrabold text-slate-900" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    ul: (props) => <ul className="my-1.5 space-y-1 ps-4" {...props} />,
    ol: (props) => <ol className="my-1.5 list-decimal space-y-1 ps-5" {...props} />,
    li: (props) => <li className="leading-relaxed text-slate-600" {...props} />,
    a: (props) => (
      <a className="font-bold text-green-700 underline decoration-green-300 underline-offset-2" {...props} />
    ),
    blockquote: (props) => (
      <blockquote className="my-2 border-s-4 border-slate-300 ps-3 text-slate-500" {...props} />
    ),
    code: (props) => (
      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-800" {...props} />
    ),
    pre: (props) => (
      <pre className="my-2 overflow-x-auto rounded-xl bg-slate-900 p-3 text-slate-100" {...props} />
    ),
    hr: () => <hr className="my-3 border-slate-200" />,
  }

  return (
    <div className={`text-xs leading-relaxed ${className}`}>
      <ReactMarkdown components={components}>{text}</ReactMarkdown>
    </div>
  )
}
