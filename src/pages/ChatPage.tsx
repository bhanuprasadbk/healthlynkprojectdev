import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import {
  Plus,
  Send,
  Bot,
  User,
  Trash2,
  MessageSquare,
  Sparkles,
  MoreHorizontal,
  Pencil,
  Check,
  X,
  Search,
  Clock,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useChat, Conversation } from '../contexts/ChatContext'

const SUGGESTIONS = [
  { icon: '📊', title: 'Dashboard summary', desc: 'Get a quick overview of practice metrics', query: 'Give me a summary of the dashboard' },
  { icon: '⏳', title: 'Pending authorizations', desc: 'Check pending prior authorization requests', query: 'Show me pending authorizations' },
  { icon: '👥', title: 'Patient statistics', desc: 'View patient counts and coverage data', query: 'Show me patient statistics' },
  { icon: '🔔', title: 'Recent notifications', desc: 'See unread alerts and priority items', query: 'What are the recent notifications?' },
  { icon: '🏥', title: 'Payor information', desc: 'View configured insurance providers', query: 'Show me payor information' },
  { icon: '💊', title: 'CPT/HCPC codes', desc: 'Look up procedure codes and auth requirements', query: 'Show me CPT HCPC codes' },
]

function formatContent(content: string): string {
  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  const lines = html.split('\n')
  let inTable = false
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|')
    const isSeparator = /^\|[\s\-:|]+\|$/.test(line.trim())

    if (isTableRow && !isSeparator) {
      if (!inTable) {
        result.push('<div class="overflow-x-auto my-2"><table class="chat-table">')
        inTable = true
      }
      const cells = line.split('|').filter((c) => c.trim() !== '')
      const isHeader = i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())
      const tag = isHeader ? 'th' : 'td'
      result.push('<tr>' + cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>')
    } else if (isSeparator) {
      // skip separator
    } else {
      if (inTable) {
        result.push('</table></div>')
        inTable = false
      }
      if (line.trim() === '') {
        result.push('<br/>')
      } else {
        result.push(`<p>${line}</p>`)
      }
    }
  }
  if (inTable) result.push('</table></div>')

  return result.join('')
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupConversationsByDate(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const groups = new Map<string, Conversation[]>()

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    let label: string
    if (diffDays === 0) label = 'Today'
    else if (diffDays === 1) label = 'Yesterday'
    else if (diffDays < 7) label = 'This Week'
    else if (diffDays < 30) label = 'This Month'
    else label = 'Older'

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(conv)
  }

  const order = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older']
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }))
}

const ChatPage = () => {
  const { theme } = useTheme()
  const {
    history,
    activeConversation,
    createConversation,
    deleteConversation,
    setActiveConversation,
    sendMessage,
    clearHistory,
    renameConversation,
    isTyping,
  } = useChat()

  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages, isTyping])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px'
    }
  }, [input])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isTyping) return
    sendMessage(trimmed)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const handleSuggestionClick = (query: string) => {
    if (!activeConversation) createConversation()
    sendMessage(query)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStartRename = (conv: Conversation) => {
    setEditingId(conv.id)
    setEditTitle(conv.title)
    setMenuOpenId(null)
  }

  const handleSaveRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  const filteredConversations = searchQuery.trim()
    ? history.conversations.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : history.conversations

  const grouped = groupConversationsByDate(filteredConversations)

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0" style={{ backgroundColor: theme.colors.background }}>
      {/* Conversation Sidebar */}
      <div
        className="w-full md:w-72 flex flex-col flex-shrink-0 max-h-[min(40vh,22rem)] md:max-h-none min-h-0 border-b md:border-b-0 md:border-r"
        style={{
          backgroundColor: theme.isDarkMode ? 'rgba(248,250,252,0.06)' : '#f1f5f9',
          borderColor: theme.colors.border,
        }}
      >
        {/* Sidebar Header */}
        <div className="p-3 space-y-3 flex-shrink-0">
          <button
            onClick={createConversation}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.01]"
            style={{
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.textPrimary,
              backgroundColor: theme.colors.cardBackground,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = theme.colors.primary
              e.currentTarget.style.backgroundColor = theme.colors.primaryLight
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border
              e.currentTarget.style.backgroundColor = theme.colors.cardBackground
            }}
          >
            <Plus size={16} />
            New conversation
          </button>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: theme.colors.textSecondary }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs focus:outline-none focus:ring-1 transition-colors"
              style={{
                backgroundColor: theme.isDarkMode ? 'rgba(255,255,255,0.06)' : '#ffffff',
                border: `1px solid ${theme.isDarkMode ? 'transparent' : theme.colors.border}`,
                color: theme.colors.textPrimary,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.primary
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
              }}
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {grouped.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-20" style={{ color: theme.colors.textSecondary }} />
              <p className="text-xs" style={{ color: theme.colors.textSecondary }}>
                No conversations yet.
                <br />
                Start a new one!
              </p>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.label} className="mb-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5"
                style={{ color: theme.colors.textSecondary }}
              >
                {group.label}
              </p>
              {group.items.map((conv) => {
                const isActive = conv.id === history.activeConversationId
                const isEditing = editingId === conv.id
                return (
                  <div
                    key={conv.id}
                    className="group relative rounded-lg mb-0.5"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                          className="flex-1 px-2 py-1 rounded text-xs focus:outline-none"
                          style={{
                            backgroundColor: theme.colors.cardBackground,
                            border: `1px solid ${theme.colors.primary}`,
                            color: theme.colors.textPrimary,
                          }}
                          autoFocus
                        />
                        <button onClick={handleSaveRename} className="p-1 rounded" style={{ color: theme.colors.primary }}>
                          <Check size={14} />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 rounded" style={{ color: theme.colors.textSecondary }}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveConversation(conv.id)}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors"
                        style={{
                          backgroundColor: isActive
                            ? theme.colors.primaryLight
                            : 'transparent',
                          color: isActive
                            ? theme.colors.primary
                            : theme.colors.textPrimary,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = theme.isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                      >
                        <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium">{conv.title}</p>
                          <p className="text-[10px] opacity-50 mt-0.5">{formatRelativeDate(conv.updatedAt)}</p>
                        </div>

                        {/* Menu */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(menuOpenId === conv.id ? null : conv.id)
                            }}
                            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          {menuOpenId === conv.id && (
                            <div
                              className="absolute right-0 top-full mt-1 w-36 rounded-lg shadow-lg py-1 z-10"
                              style={{
                                backgroundColor: theme.colors.cardBackground,
                                border: `1px solid ${theme.colors.border}`,
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartRename(conv)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                                style={{ color: theme.colors.textPrimary }}
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                              >
                                <Pencil size={12} /> Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteConversation(conv.id)
                                  setMenuOpenId(null)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 transition-colors"
                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        {history.conversations.length > 0 && (
          <div className="p-3 flex-shrink-0" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
            <button
              onClick={clearHistory}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{ color: theme.colors.textSecondary }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(220,38,38,0.08)'
                e.currentTarget.style.color = '#dc2626'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = theme.colors.textSecondary
              }}
            >
              <Trash2 size={13} /> Clear all conversations
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation && activeConversation.messages.length > 0 ? (
          <>
            {/* Chat Header */}
            <div
              className="flex items-center gap-3 px-4 sm:px-6 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid ${theme.colors.border}` }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: theme.colors.primaryLight }}
              >
                <Sparkles size={16} style={{ color: theme.colors.primary }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold truncate" style={{ color: theme.colors.textPrimary }}>
                  {activeConversation.title}
                </h2>
                <p className="text-[11px] flex items-center gap-1" style={{ color: theme.colors.textSecondary }}>
                  <Clock size={10} />
                  {formatRelativeDate(activeConversation.updatedAt)}
                  &middot;
                  {activeConversation.messages.length} messages
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
                {activeConversation.messages.map((msg) => (
                  <div key={msg.id} className="flex gap-4 chat-message-enter">
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{
                        backgroundColor:
                          msg.role === 'assistant'
                            ? theme.colors.primaryLight
                            : theme.isDarkMode
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.05)',
                      }}
                    >
                      {msg.role === 'assistant' ? (
                        <Bot size={16} style={{ color: theme.colors.primary }} />
                      ) : (
                        <User size={16} style={{ color: theme.colors.textSecondary }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: msg.role === 'assistant' ? theme.colors.primary : theme.colors.textPrimary }}
                        >
                          {msg.role === 'assistant' ? 'Lynk AI' : 'You'}
                        </span>
                        <span className="text-[10px]" style={{ color: theme.colors.textSecondary }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className="text-sm leading-relaxed chat-content"
                        style={{ color: theme.colors.textPrimary }}
                        dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                      />
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-4 chat-message-enter">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                      style={{ backgroundColor: theme.colors.primaryLight }}
                    >
                      <Bot size={16} style={{ color: theme.colors.primary }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
                          Lynk AI
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 py-2">
                        <span className="typing-dot" style={{ backgroundColor: theme.colors.textSecondary }} />
                        <span className="typing-dot" style={{ backgroundColor: theme.colors.textSecondary, animationDelay: '0.15s' }} />
                        <span className="typing-dot" style={{ backgroundColor: theme.colors.textSecondary, animationDelay: '0.3s' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>
          </>
        ) : (
          /* Empty State / Welcome */
          <div className="flex-1 flex items-center justify-center overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
                style={{
                  background: theme.isDarkMode
                    ? `linear-gradient(135deg, ${theme.colors.primaryLight}, ${theme.colors.primary})`
                    : 'linear-gradient(135deg, #bae6fd, #ddd6fe)',
                }}
              >
                <Sparkles
                  size={28}
                  style={{ color: theme.isDarkMode ? '#ffffff' : '#0369a1' }}
                />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: theme.colors.textPrimary }}>
                Lynk AI
              </h1>
              <p className="text-sm mb-10" style={{ color: theme.colors.textSecondary }}>
                Your HealthLynk assistant. Ask about patients, eligibility, authorizations, and more.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => handleSuggestionClick(s.query)}
                    className="flex items-start gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: theme.colors.cardBackground,
                      border: `1px solid ${theme.colors.border}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.primary
                      e.currentTarget.style.boxShadow = `0 0 0 1px ${theme.colors.primaryLight}`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = theme.colors.border
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <span className="text-xl mt-0.5">{s.icon}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: theme.colors.textPrimary }}>
                        {s.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: theme.colors.textSecondary }}>
                        {s.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div
          className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-5 pt-3"
          style={{ borderTop: activeConversation?.messages.length ? `1px solid ${theme.colors.border}` : 'none' }}
        >
          <div className="max-w-3xl mx-auto">
            <div
              className="flex items-end gap-3 rounded-2xl px-4 py-3 transition-colors"
              style={{
                backgroundColor: theme.isDarkMode ? theme.colors.cardBackground : '#ffffff',
                border: `1px solid ${theme.colors.border}`,
                boxShadow: theme.isDarkMode
                  ? '0 2px 8px rgba(0,0,0,0.12)'
                  : '0 2px 12px rgba(15, 23, 42, 0.04)',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Lynk AI..."
                rows={1}
                className="flex-1 resize-none text-sm leading-relaxed focus:outline-none bg-transparent"
                style={{
                  color: theme.colors.textPrimary,
                  maxHeight: '150px',
                }}
                disabled={isTyping}
                onFocus={(e) => {
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.style.borderColor = theme.colors.primary
                    parent.style.boxShadow = `0 0 0 2px ${theme.colors.primaryLight}`
                  }
                }}
                onBlur={(e) => {
                  const parent = e.currentTarget.parentElement
                  if (parent) {
                    parent.style.borderColor = theme.colors.border
                    parent.style.boxShadow = theme.isDarkMode
                      ? '0 2px 8px rgba(0,0,0,0.12)'
                      : '0 2px 12px rgba(15, 23, 42, 0.04)'
                  }
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex-shrink-0"
                style={{
                  backgroundColor: input.trim() && !isTyping ? theme.colors.primary : theme.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  color: input.trim() && !isTyping ? '#ffffff' : theme.colors.textSecondary,
                }}
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-center mt-2.5" style={{ color: theme.colors.textSecondary }}>
              Lynk AI has access to your practice data. Responses are generated from application data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatPage
