"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// Minimal typings for the Web Speech API (not in lib.dom for every TS target).
interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}
interface SpeechRecognitionErrorEventLike {
  error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was denied. Allow it in your browser's site settings.",
  "service-not-allowed": "Speech recognition is not allowed in this browser or context.",
  "audio-capture": "No microphone was found.",
  network: "Speech recognition needs a network connection in this browser.",
  "no-speech": "No speech was detected.",
  "language-not-supported": "This language is not supported for speech recognition.",
}

export interface UseSpeechRecognitionOptions {
  /** Called once per finalised phrase. */
  onFinalTranscript: (text: string) => void
  onError?: (message: string) => void
  lang?: string
}

/**
 * Browser-native dictation via the Web Speech API (Chrome, Edge, Safari).
 * `supported` is false on browsers without it (e.g. Firefox), so the UI can say so.
 */
export function useSpeechRecognition({ onFinalTranscript, onError, lang }: UseSpeechRecognitionOptions) {
  // Resolved after mount so server and first client render agree.
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState("")
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const callbacks = useRef({ onFinalTranscript, onError })
  callbacks.current = { onFinalTranscript, onError }

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null)
    return () => recognitionRef.current?.abort()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor || recognitionRef.current) return
    const rec = new Ctor()
    rec.lang = lang ?? (typeof navigator !== "undefined" ? navigator.language : "en-US")
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let interimText = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0]?.transcript ?? ""
        if (result.isFinal) {
          const trimmed = text.trim()
          if (trimmed) callbacks.current.onFinalTranscript(trimmed)
        } else {
          interimText += text
        }
      }
      setInterim(interimText)
    }
    rec.onerror = (e) => {
      // "aborted" is what stop()/abort() produce; not an error for the user.
      if (e.error === "aborted") return
      callbacks.current.onError?.(ERROR_MESSAGES[e.error] ?? `Voice input failed (${e.error}).`)
    }
    rec.onend = () => {
      recognitionRef.current = null
      setListening(false)
      setInterim("")
    }
    recognitionRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch (err) {
      recognitionRef.current = null
      callbacks.current.onError?.(err instanceof Error ? err.message : "Could not start voice input.")
    }
  }, [lang])

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop()
    else start()
  }, [start, stop])

  return { supported, listening, interim, start, stop, toggle }
}
