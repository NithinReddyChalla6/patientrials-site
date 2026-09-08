import * as React from 'react'

/**
 * The browser's own speech recognition.
 *
 * Not in TypeScript's DOM library, and prefixed everywhere except Chrome, so
 * the shape is declared here rather than pulled in wholesale — only the four
 * members this uses.
 */
interface Recognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
}

interface RecognitionEvent {
  resultIndex: number
  results: {
    length: number
    [index: number]: { isFinal: boolean; 0: { transcript: string } }
  }
}

type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export interface Dictation {
  /** False in browsers without speech recognition — Firefox, mainly. */
  supported: boolean
  listening: boolean
  /** What it has heard so far this turn, including words it may still revise. */
  transcript: string
  error?: string
  start: () => void
  stop: () => void
}

/**
 * Dictation for a text field.
 *
 * `onFinal` fires once the speaker stops and the browser commits what it heard,
 * which is the moment to act on it — the interim transcript is shown while
 * talking but is still being revised, so sending on it would send half a
 * sentence.
 */
export function useDictation(onFinal: (text: string) => void): Dictation {
  const [listening, setListening] = React.useState(false)
  const [transcript, setTranscript] = React.useState('')
  const [error, setError] = React.useState<string>()
  const ref = React.useRef<Recognition | null>(null)
  // Held in a ref so restarting recognition never captures a stale callback.
  const finalRef = React.useRef(onFinal)
  finalRef.current = onFinal

  const supported = React.useMemo(() => Boolean(ctor()), [])

  const stop = React.useCallback(() => {
    ref.current?.stop()
    setListening(false)
  }, [])

  const start = React.useCallback(() => {
    const Ctor = ctor()
    if (!Ctor) return

    setError(undefined)
    setTranscript('')

    const rec = new Ctor()
    rec.lang = navigator.language || 'en-GB'
    // One utterance at a time: this fills a chat box, and a recogniser left
    // running keeps the microphone open long after the question is asked.
    rec.continuous = false
    rec.interimResults = true

    rec.addEventListener('result', ((raw: Event) => {
      const event = raw as unknown as RecognitionEvent
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          const said = text.trim()
          if (said) finalRef.current(said)
        } else {
          interim += text
        }
      }
      if (interim) setTranscript(interim)
    }) as EventListener)

    rec.addEventListener('error', ((raw: Event) => {
      const event = raw as unknown as { error: string }
      setListening(false)
      // `no-speech` and `aborted` are ordinary — someone pressed the button and
      // changed their mind. Only real failures are worth putting on screen.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(
        event.error === 'not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser settings.'
          : 'Dictation stopped working. Try again.',
      )
    }) as EventListener)

    rec.addEventListener('end', () => {
      setListening(false)
      setTranscript('')
    })

    ref.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('Dictation could not start.')
    }
  }, [])

  React.useEffect(() => () => ref.current?.abort(), [])

  return { supported, listening, transcript, error, start, stop }
}
