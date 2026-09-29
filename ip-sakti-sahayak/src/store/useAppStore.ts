import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_PERMISSIONS } from '../data/permissions'
import type {
  AssistantMessage,
  AuditAction,
  AuditEntry,
  Conversation,
  DataSourcePermission,
  FacilitatorRequest,
  Jurisdiction,
  LangCode,
  Message,
} from '../types'
import { uid } from '../lib/utils'

interface AppState {
  theme: 'light' | 'dark'
  lang: LangCode
  jurisdiction: Jurisdiction

  conversations: Conversation[]
  activeConversationId: string | null
  /** Assistant message whose sources show in the right panel */
  selectedMessageId: string | null
  /** 1-based citation index to highlight in the sources panel */
  highlightedCitation: number | null

  permissions: DataSourcePermission[]
  audit: AuditEntry[]
  requests: FacilitatorRequest[]
  permissionsOpen: boolean

  toggleTheme: () => void
  setLang: (l: LangCode) => void
  setJurisdiction: (j: Jurisdiction) => void

  newConversation: () => void
  openConversation: (id: string) => void
  deleteConversation: (id: string) => void
  appendMessage: (m: Message) => string
  replaceMessage: (id: string, m: AssistantMessage) => void
  setFeedback: (id: string, f: 'up' | 'down' | undefined) => void
  selectCitation: (messageId: string, index: number | null) => void

  setPermission: (id: string, enabled: boolean) => void
  log: (action: AuditAction, detail: string) => void
  clearAudit: () => void
  setPermissionsOpen: (open: boolean) => void
  addRequest: (r: FacilitatorRequest) => void
}

const now = () => new Date().toISOString()

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      lang: 'en',
      jurisdiction: 'india',
      conversations: [],
      activeConversationId: null,
      selectedMessageId: null,
      highlightedCitation: null,
      permissions: DEFAULT_PERMISSIONS,
      audit: [],
      requests: [],
      permissionsOpen: false,

      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark'
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },
      setLang: (lang) => {
        document.documentElement.lang = lang
        set({ lang })
      },
      setJurisdiction: (jurisdiction) => set({ jurisdiction, highlightedCitation: null }),

      newConversation: () => set({ activeConversationId: null, selectedMessageId: null, highlightedCitation: null }),
      openConversation: (id) => {
        const convo = get().conversations.find((c) => c.id === id)
        const lastAnswer = [...(convo?.messages ?? [])].reverse().find((m) => m.role === 'assistant' && m.kind === 'answer')
        set({ activeConversationId: id, selectedMessageId: lastAnswer?.id ?? null, highlightedCitation: null })
      },
      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          ...(s.activeConversationId === id ? { activeConversationId: null, selectedMessageId: null } : {}),
        })),

      appendMessage: (m) => {
        let convoId = get().activeConversationId
        if (!convoId || !get().conversations.some((c) => c.id === convoId)) {
          convoId = uid('c_')
          const title = m.role === 'user' ? m.text.slice(0, 70) : 'New conversation'
          set((s) => ({
            conversations: [{ id: convoId!, title, createdAt: now(), updatedAt: now(), messages: [] }, ...s.conversations],
            activeConversationId: convoId,
          }))
        }
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convoId ? { ...c, updatedAt: now(), messages: [...c.messages, m] } : c,
          ),
          // Only answers have sources; refusal and error cards keep the previous selection.
          ...(m.role === 'assistant' && m.kind === 'answer' ? { selectedMessageId: m.id, highlightedCitation: null } : {}),
        }))
        return convoId
      },
      replaceMessage: (id, m) =>
        set((s) => ({
          conversations: s.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((x) => (x.id === id ? m : x)),
          })),
          ...(m.kind === 'answer' ? { selectedMessageId: m.id } : {}),
        })),
      setFeedback: (id, f) =>
        set((s) => ({
          conversations: s.conversations.map((c) => ({
            ...c,
            messages: c.messages.map((x) => (x.id === id && x.role === 'assistant' ? { ...x, feedback: f } : x)),
          })),
        })),
      selectCitation: (messageId, index) => set({ selectedMessageId: messageId, highlightedCitation: index }),

      setPermission: (id, enabled) => {
        const p = get().permissions.find((x) => x.id === id)
        if (!p || p.kind === 'free') return
        set((s) => ({ permissions: s.permissions.map((x) => (x.id === id ? { ...x, enabled } : x)) }))
        get().log(enabled ? 'grant' : 'revoke', `${enabled ? 'Granted' : 'Revoked'} access to ${p.name}`)
      },
      log: (action, detail) =>
        set((s) => ({ audit: [{ id: uid('a_'), at: now(), action, detail }, ...s.audit].slice(0, 200) })),
      clearAudit: () => set({ audit: [] }),
      setPermissionsOpen: (permissionsOpen) => set({ permissionsOpen }),
      addRequest: (r) => set((s) => ({ requests: [r, ...s.requests] })),
    }),
    {
      name: 'ipsakti-store',
      version: 1,
      partialize: (s) => ({
        theme: s.theme,
        lang: s.lang,
        jurisdiction: s.jurisdiction,
        conversations: s.conversations,
        activeConversationId: s.activeConversationId,
        permissions: s.permissions,
        audit: s.audit,
        requests: s.requests,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) document.documentElement.lang = state.lang
      },
    },
  ),
)

export function useActiveConversation(): Conversation | undefined {
  return useAppStore((s) => s.conversations.find((c) => c.id === s.activeConversationId))
}
