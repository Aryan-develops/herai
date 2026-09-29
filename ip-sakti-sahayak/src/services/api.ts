/**
 * Mock service layer. Every function returns a Promise with a 600-900 ms delay,
 * so the UI is written against the same async shape a real API would have.
 * Replace the bodies with fetch() calls when a backend exists.
 *
 * To exercise error states, run in the console:
 *   localStorage.setItem('ipsakti:failRate', '0.5')
 */
import { absSteps, type AbsAnswers, type AbsStep } from '../data/abs'
import { classify, type ClassifyAnswers, type ClassifyResult } from '../data/classify'
import { SEED_REQUESTS } from '../data/permissions'
import { CORPUS_UPDATED, CORPUS_VERSION, SOURCES } from '../data/sources'
import { TKDL_RECORDS } from '../data/tkdl'
import type { FacilitatorRequest, Jurisdiction, Source, TkdlResult } from '../types'
import { uid } from '../lib/utils'
import { matchQuestion, type MatchResult } from './matcher'

export class ApiError extends Error {}

function failRate(): number {
  try {
    return Number(localStorage.getItem('ipsakti:failRate') ?? 0) || 0
  } catch {
    return 0
  }
}

function simulate<T>(fn: () => T, min = 600, max = 900): Promise<T> {
  const ms = min + Math.random() * (max - min)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate()) {
        reject(new ApiError('The service did not respond. Check your connection and try again.'))
        return
      }
      try {
        resolve(fn())
      } catch (e) {
        reject(e)
      }
    }, ms)
  })
}

export const api = {
  ask(question: string): Promise<MatchResult> {
    return simulate(() => matchQuestion(question), 700, 900)
  },

  listSources(): Promise<{ version: string; updated: string; sources: Source[] }> {
    return simulate(() => ({ version: CORPUS_VERSION, updated: CORPUS_UPDATED, sources: SOURCES }))
  },

  classifyProduct(answers: ClassifyAnswers): Promise<ClassifyResult> {
    return simulate(() => classify(answers))
  },

  absChecklist(answers: AbsAnswers): Promise<Record<Jurisdiction, AbsStep[]>> {
    return simulate(() => ({
      india: absSteps(answers, 'india'),
      international: absSteps(answers, 'international'),
    }))
  },

  searchTkdl(query: string): Promise<TkdlResult[]> {
    return simulate(() => {
      const q = normalise(query)
      if (!q) return []
      return TKDL_RECORDS.map((r) => {
        const nameScore = dice(q, normalise(r.name))
        const ingredientScore = Math.max(0, ...r.ingredients.map((i) => dice(q, normalise(i)) * 0.85))
        const contains = normalise(r.name).includes(q) || r.devanagari.includes(query.trim()) ? 0.92 : 0
        const similarity = Math.min(0.99, Math.max(nameScore, ingredientScore, contains))
        return { ...r, similarity }
      })
        .filter((r) => r.similarity >= 0.35)
        .sort((a, b) => b.similarity - a.similarity)
    }, 650, 900)
  },

  listRequests(extra: FacilitatorRequest[]): Promise<FacilitatorRequest[]> {
    return simulate(() =>
      [...extra, ...SEED_REQUESTS].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )
  },

  submitRequest(input: Omit<FacilitatorRequest, 'id' | 'createdAt' | 'status'>): Promise<FacilitatorRequest> {
    return simulate(() => ({
      ...input,
      id: `REQ-2026-${uid().slice(0, 4).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'Received' as const,
    }), 800, 900)
  },
}

function normalise(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9ऀ-ॿ ]/g, '').trim()
}

/** Sørensen-Dice coefficient over character bigrams. */
function dice(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const grams = (s: string) => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) ?? 0) + 1)
    }
    return m
  }
  const ga = grams(a)
  const gb = grams(b)
  let overlap = 0
  for (const [g, n] of ga) overlap += Math.min(n, gb.get(g) ?? 0)
  return (2 * overlap) / (a.length - 1 + (b.length - 1))
}
