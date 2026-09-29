import { useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { translate, type StringKey } from './strings'

export function useT() {
  const lang = useAppStore((s) => s.lang)
  return useCallback((key: StringKey) => translate(lang, key), [lang])
}
