export type Jurisdiction = 'india' | 'international'

export type LangCode = 'en' | 'hi' | 'ta' | 'bn' | 'mr' | 'te' | 'gu' | 'kn'

export type SourceType = 'Statute' | 'Treaty' | 'Registry' | 'Foreign law'

export interface Source {
  id: string
  name: string
  shortName: string
  type: SourceType
  jurisdiction: Jurisdiction
  provision: string
  versionDate: string // ISO date
  lastUpdated: string // ISO date the corpus entry was last refreshed
  summary: string
  url: string
  publisher: string
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Confidence {
  level: ConfidenceLevel
  /** 1 to 5 filled segments */
  score: 1 | 2 | 3 | 4 | 5
  reason: string
}

export interface Answer {
  title: string
  summary: { en: string; hi: string }
  keyPoints: string[]
  /** Source ids, in citation order. [1] is citations[0]. */
  citations: string[]
  confidence: Confidence
  links: { label: string; url: string }[]
}

export type TopicId = 'patent' | 'gi' | 'trademark' | 'abs' | 'advertising' | 'budapest'

export interface Topic {
  id: TopicId
  label: string
  keywords: string[]
  answers: Record<Jurisdiction, Answer>
}

export type MessageKind = 'answer' | 'abstain' | 'advocate' | 'error'

export interface UserMessage {
  id: string
  role: 'user'
  text: string
  at: string
}

export interface AssistantMessage {
  id: string
  role: 'assistant'
  kind: MessageKind
  topicId?: TopicId
  /** The question this responds to, used for retry */
  question: string
  at: string
  feedback?: 'up' | 'down'
}

export type Message = UserMessage | AssistantMessage

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export type AuditAction = 'grant' | 'revoke' | 'search' | 'ask' | 'request'

export interface AuditEntry {
  id: string
  at: string
  action: AuditAction
  detail: string
}

export interface DataSourcePermission {
  id: string
  name: string
  description: string
  kind: 'free' | 'paid'
  enabled: boolean
}

export type RequestStatus = 'Received' | 'Assigned' | 'Resolved'

export interface FacilitatorRequest {
  id: string
  name: string
  contact: string
  topic: string
  message: string
  createdAt: string
  status: RequestStatus
  facilitator?: string
}

export interface TkdlRecord {
  id: string
  name: string
  devanagari: string
  sourceText: string
  chapter: string
  system: 'Ayurveda'
  ingredients: string[]
  use: string
}

export interface TkdlResult extends TkdlRecord {
  similarity: number
}
