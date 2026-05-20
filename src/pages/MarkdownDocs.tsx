import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Search } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

type MarkdownModule = () => Promise<string>

const docsModules = import.meta.glob('/docs/**/*.md', {
  query: '?raw',
  import: 'default',
}) as Record<string, MarkdownModule>

function normalizeDocPath(filePath: string): string {
  return filePath.replace('/docs/', '').replace(/\.md$/, '')
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function makeReadableTitle(doc: string): string {
  const leaf = doc.split('/').pop() ?? doc
  return leaf
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function flattenText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (!children) {
    return ''
  }
  if (Array.isArray(children)) {
    return children.map((child) => flattenText(child)).join('')
  }
  if (typeof children === 'object' && 'props' in children) {
    return flattenText((children as { props?: { children?: ReactNode } }).props?.children ?? '')
  }
  return ''
}

export default function MarkdownDocs() {
  const { theme } = useTheme()
  const params = useParams()
  const slug = params['*'] ?? ''
  const cleanSlug = slug.replace(/^\/+/, '').replace(/\/+$/, '')
  const selectedDoc = cleanSlug || 'index'

  const docs = useMemo(
    () => Object.keys(docsModules).map((path) => normalizeDocPath(path)).sort(),
    [],
  )

  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')

  const headingLinks = useMemo(() => {
    const lines = content.split('\n')
    const matches = lines
      .map((line) => line.match(/^(#{1,3})\s+(.*)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => ({
        level: match[1].length,
        title: match[2].trim(),
      }))

    const used = new Map<string, number>()
    return matches.map((item) => {
      const rawId = slugify(item.title) || 'section'
      const count = used.get(rawId) ?? 0
      used.set(rawId, count + 1)
      return {
        ...item,
        id: count === 0 ? rawId : `${rawId}-${count}`,
      }
    })
  }, [content])

  const filteredDocs = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    if (!query) {
      return docs
    }
    return docs.filter((doc) => doc.toLowerCase().includes(query))
  }, [docs, searchText])

  useEffect(() => {
    const key = `/docs/${selectedDoc}.md`
    const loader = docsModules[key]
    if (!loader) {
      setIsLoading(false)
      setError(`Document not found: ${selectedDoc}.md`)
      setContent('')
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError('')
    loader()
      .then((markdown) => {
        if (!cancelled) {
          setContent(markdown)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(`Unable to load document: ${selectedDoc}.md`)
          setContent('')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedDoc])

  return (
    <div className="min-h-screen text-slate-800" style={{ backgroundColor: theme.colors.background }}>
      <div className="mx-auto grid min-h-screen w-full max-w-[1680px] lg:grid-cols-[260px,1fr,220px]">
        <aside
          className="border-r bg-white"
          style={{ borderColor: theme.colors.sidebarBorder, backgroundColor: theme.colors.sidebarBackground }}
        >
          <div className="border-b px-5 py-4" style={{ borderColor: theme.colors.sidebarBorder }}>
            <p className="text-[30px] font-bold leading-none tracking-tight" style={{ color: theme.colors.primary }}>
              Health Lynk
            </p>
            <p className="mt-1 text-[11px]" style={{ color: theme.colors.textSecondary }}>
              Web Application Documentation
            </p>
            <button
              className="mt-3 w-full rounded-md px-3 py-2 text-xs font-medium"
              style={{
                backgroundColor: theme.colors.primaryLight,
                color: theme.colors.primary,
              }}
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="p-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                size={16}
                style={{ color: theme.colors.textSecondary }}
              />
              <input
                className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none"
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Quick search..."
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                }}
                value={searchText}
              />
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
              Module Documents
            </p>
            <ul className="mt-2 space-y-0.5 text-sm">
              {filteredDocs.length === 0 ? (
                <li className="rounded-md px-2 py-1" style={{ color: theme.colors.textSecondary }}>
                  No documents found.
                </li>
              ) : (
                filteredDocs.map((doc) => (
                  <li key={doc}>
                    <Link
                      className={`block rounded-md px-2.5 py-2 text-[13px] transition ${
                        doc === selectedDoc ? 'font-semibold' : 'font-medium hover:bg-slate-50'
                      }`}
                      style={
                        doc === selectedDoc
                          ? {
                              backgroundColor: theme.colors.sidebarActiveBackground,
                              color: theme.colors.sidebarActiveText,
                            }
                          : { color: theme.colors.sidebarText }
                      }
                      to={`/docs/${doc}`}
                    >
                      {makeReadableTitle(doc)}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>

        <main className="p-4 md:p-5">
          <div
            className="rounded-xl border bg-white shadow-sm"
            style={{ borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardBackground }}
          >
            <div
              className="flex items-center justify-between border-b px-5 py-4"
              style={{ borderColor: theme.colors.border }}
            >
              <div>
                <p className="mb-5 text-base font-semibold sm:text-lg" style={{ color: theme.colors.textSecondary }}>
                  Documentation
                </p>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                  {makeReadableTitle(selectedDoc)}
                </h1>
                {selectedDoc === 'configuration' && (
                  <p className="mt-2 text-sm" style={{ color: theme.colors.textSecondary }}>
                    This project uses environment variables and standard frontend build configuration.
                  </p>
                )}
              </div>
              <div className="flex gap-2 text-sm">
                <button
                  className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
                  type="button"
                >
                  Copy
                </button>
                <button
                  className="rounded-md border bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  style={{ borderColor: theme.colors.border, color: theme.colors.textSecondary }}
                  type="button"
                >
                  Export PDF
                </button>
              </div>
            </div>

            <section className="px-5 py-5">
              {isLoading ? (
                <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  Loading markdown...
                </p>
              ) : error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : (
                <article className="markdown-doc-content">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => {
                        const text = flattenText(children)
                        return (
                          <h1 className="mt-6 mb-3 text-xl sm:text-2xl font-bold text-gray-900" id={slugify(text)}>
                            {children}
                          </h1>
                        )
                      },
                      h2: ({ children }) => {
                        const text = flattenText(children)
                        return (
                          <h2 className="mt-5 mb-2 text-lg sm:text-xl font-semibold text-gray-900" id={slugify(text)}>
                            {children}
                          </h2>
                        )
                      },
                      h3: ({ children }) => {
                        const text = flattenText(children)
                        return (
                          <h3 className="mt-4 mb-2 text-base sm:text-lg font-semibold text-gray-900" id={slugify(text)}>
                            {children}
                          </h3>
                        )
                      },
                    }}
                    remarkPlugins={[remarkGfm]}
                  >
                    {content}
                  </ReactMarkdown>
                </article>
              )}
            </section>
          </div>
        </main>

        <aside
          className="border-l bg-white p-4"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.cardBackground }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            On this page
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {headingLinks.length === 0 ? (
              <li style={{ color: theme.colors.textSecondary }}>No section headings.</li>
            ) : (
              headingLinks.map((heading) => (
                <li key={heading.id}>
                  <a
                    className={`block rounded px-2 py-1 text-[13px] hover:bg-slate-50 ${
                      heading.level === 1 ? 'font-semibold' : heading.level === 2 ? 'pl-3' : 'pl-5'
                    }`}
                    style={{ color: theme.colors.textSecondary }}
                    href={`#${heading.id}`}
                  >
                    {heading.title}
                  </a>
                </li>
              ))
            )}
          </ul>
        </aside>
      </div>
    </div>
  )
}
