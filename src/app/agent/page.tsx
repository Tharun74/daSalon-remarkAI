'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

const MAX_DURATION = 30

type Step = 'record' | 'processing' | 'review' | 'done'

interface WaveformProps { isRecording: boolean }

function Waveform({ isRecording }: WaveformProps) {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-red-500 transition-all"
          style={
            isRecording
              ? {
                  height: `${Math.random() * 18 + 4}px`,
                  animation: `wave ${0.6 + i * 0.07}s ease-in-out infinite`,
                  animationDelay: `${i * 0.05}s`,
                }
              : { height: '4px', opacity: 0.3 }
          }
        />
      ))}
    </div>
  )
}

export default function AgentPage() {
  const [step, setStep] = useState<Step>('record')
  const [isRecording, setIsRecording] = useState(false)

  const [recordingTime, setRecordingTime] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [processingStep, setProcessingStep] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<Blob | null>(null)

  // Auto-stop at MAX_DURATION
  useEffect(() => {
    if (isRecording && recordingTime >= MAX_DURATION) {
      stopRecording()
    }
  }, [isRecording, recordingTime])

  const startRecording = useCallback(async () => {
    try {
      // Revoke previous audio URL if any
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
        setAudioUrl(null)
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000)
    } catch {
      setError('Microphone access denied. Please allow microphone and retry.')
    }
  }, [audioUrl])

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      audioRef.current = blob
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
      await processAudio(blob)
    }

    mediaRecorderRef.current.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setStep('processing')
  }, [])

  const processAudio = async (blob: Blob) => {
    setError('')
    try {
      // Step 1: Transcribe
      setProcessingStep('Transcribing audio...')
      const fd = new FormData()
      fd.append('audio', blob, 'remark.webm')
      const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const tData = await tRes.json()
      if (!tRes.ok) throw new Error(tData.error || 'Transcription failed')
      const tx = tData.transcript
      setTranscript(tx)

      // Step 2: Summarize
      setProcessingStep('Summarizing...')
      const sRes = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: tx }),
      })
      const sData = await sRes.json()
      if (!sRes.ok) throw new Error(sData.error || 'Summarization failed')
      setSummary(sData.summary)
      setStep('review')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Processing failed')
      setStep('record')
    }
  }

  const finish = () => setStep('done')

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: '#0f0f0f' }}>
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Agent Portal</div>
            <div className="text-sm text-white font-medium">Record Visit Remark</div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* STEP: RECORD */}
        {step === 'record' && (
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="py-8">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center pulse-ring hover:bg-red-600 transition-colors"
                >
                  <div className="w-6 h-6 rounded bg-white" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full border-2 border-zinc-700 flex items-center justify-center hover:border-red-500 hover:bg-red-500/10 transition-all group"
                >
                  <svg className="w-7 h-7 text-zinc-500 group-hover:text-red-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {isRecording && (
              <div className="flex flex-col items-center gap-3">
                <Waveform isRecording={isRecording} />
                <div className="font-mono text-red-400 text-lg">{formatTime(recordingTime)}</div>
                {/* Progress bar for max duration */}
                <div className="w-48 h-1 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${(recordingTime / MAX_DURATION) * 100}%` }}
                  />
                </div>
                <p className="text-zinc-500 text-xs">
                  {MAX_DURATION - recordingTime}s remaining · Speak in any language
                </p>
              </div>
            )}

            {!isRecording && (
              <p className="text-zinc-600 text-sm">Tap the mic to start recording (max {MAX_DURATION}s)</p>
            )}
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div className="flex flex-col items-center text-center py-16 space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-white animate-spin" />
            <div className="text-white text-sm">{processingStep}</div>
            <div className="text-zinc-600 text-xs">This may take a few seconds</div>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Audio preview */}
            {audioUrl && (
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">Audio Preview</div>
                <audio controls src={audioUrl} className="w-full h-10" style={{ filter: 'invert(0.85)' }} />
              </div>
            )}

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Summary</span>
              </div>
              <p className="text-white text-sm leading-relaxed">{summary}</p>
            </div>

            <details className="group">
              <summary className="text-xs font-mono text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors select-none">
                View full transcript ↓
              </summary>
              <div className="mt-2 p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 text-xs leading-relaxed">
                {transcript}
              </div>
            </details>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setStep('record'); setTranscript(''); setSummary(''); setAudioUrl(null) }}
                className="flex-1 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 text-sm hover:border-zinc-700 transition-colors"
              >
                Re-record
              </button>
              <button
                onClick={finish}
                className="flex-[2] py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-colors"
              >
                Done →
              </button>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center py-12 space-y-5">
            <div className="w-14 h-14 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-white font-medium">Remark Submitted</div>
              <div className="text-zinc-500 text-sm mt-1">Your officer will see the summary</div>
            </div>
            <button
              onClick={() => {
                setStep('record'); setTranscript(''); setSummary('')
                setRecordingTime(0); setAudioUrl(null)
              }}
              className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm hover:border-zinc-700 transition-colors"
            >
              + New Remark
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
