import { useEffect, useState } from 'react'
import { prefersReducedMotion } from '../lib/utils'

/**
 * Reveals text word by word to mimic a streamed answer.
 * Returns the full text immediately when disabled or when reduced motion is on.
 */
export function useTypewriter(text: string, enabled: boolean, msPerWord = 28) {
  const instant = !enabled || prefersReducedMotion()
  const words = text.split(/(\s+)/)
  const [count, setCount] = useState(instant ? words.length : 0)

  useEffect(() => {
    if (instant) {
      setCount(words.length)
      return
    }
    setCount(0)
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      setCount(i)
      if (i >= words.length) window.clearInterval(id)
    }, msPerWord * 2)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, instant])

  const done = count >= words.length
  return { text: done ? text : words.slice(0, count).join(''), done }
}
