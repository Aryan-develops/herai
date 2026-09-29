import { TOPICS } from '../data/topics'
import type { MessageKind, TopicId } from '../types'

const LITIGATION = [
  /\bwill i win\b/i,
  /\b(sue|suing|sued)\b/i,
  /\binfringement (case|suit|claim|notice)\b/i,
  /\b(lawsuit|litigation|court case|legal notice|cease and desist|injunction)\b/i,
  /\b(file|filed) a case\b/i,
  /मुकदमा|अदालत|केस जीत/,
]

export interface MatchResult {
  kind: Exclude<MessageKind, 'error'>
  topicId?: TopicId
}

/**
 * Keyword router standing in for retrieval. A real backend would do semantic
 * retrieval over the corpus and abstain when nothing scores above a threshold.
 */
export function matchQuestion(raw: string): MatchResult {
  const q = raw.toLowerCase()
  if (LITIGATION.some((re) => re.test(raw))) return { kind: 'advocate' }

  let best: { id: TopicId; score: number } | null = null
  for (const topic of TOPICS) {
    let score = 0
    for (const kw of topic.keywords) {
      const k = kw.toLowerCase()
      // Latin keywords match from a word start; short ones (gi, abs, pct) must be whole words.
      const tail = k.length <= 4 ? '\\b' : ''
      const hit = /^[a-z\- ]+$/.test(k) ? new RegExp(`\\b${k.replace(/-/g, '\\-')}${tail}`, 'i').test(q) : q.includes(k)
      if (hit) score += k.includes(' ') ? 2 : 1
    }
    if (score > 0 && (!best || score > best.score)) best = { id: topic.id, score }
  }

  return best ? { kind: 'answer', topicId: best.id } : { kind: 'abstain' }
}
