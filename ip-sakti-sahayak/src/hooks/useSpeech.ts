import { useCallback, useEffect, useState } from 'react'

/** Wraps the browser SpeechSynthesis API. `supported` is false where it is missing. */
export function useSpeech() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel()
  }, [supported])

  const speak = useCallback(
    (id: string, text: string, lang: string) => {
      if (!supported) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang
      const voice = window.speechSynthesis.getVoices().find((v) => v.lang === lang)
      if (voice) u.voice = voice
      u.rate = 0.98
      u.onend = () => setSpeakingId((cur) => (cur === id ? null : cur))
      u.onerror = () => setSpeakingId((cur) => (cur === id ? null : cur))
      setSpeakingId(id)
      window.speechSynthesis.speak(u)
    },
    [supported],
  )

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeakingId(null)
  }, [supported])

  return { supported, speakingId, speak, stop }
}
