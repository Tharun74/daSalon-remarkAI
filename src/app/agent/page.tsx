'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

const MAX_DURATION = 30

type Step = 'record' | 'processing' | 'review' | 'done'

function Waveform() {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: `${Math.random() * 18 + 4}px`,
            backgroundColor: 'hsl(276 96% 65%)',
            animation: `wave ${0.6 + i * 0.07}s ease-in-out infinite`,
            animationDelay: `${i * 0.05}s`,
          }}
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


  useEffect(() => {
    if (isRecording && recordingTime >= MAX_DURATION) {
      stopRecording()
    }
  }, [isRecording, recordingTime])

  const startRecording = useCallback(async () => {
    try {
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
      setProcessingStep('Transcribing audio...')
      const fd = new FormData()
      fd.append('audio', blob, 'remark.webm')
      const tRes = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const tData = await tRes.json()
      if (!tRes.ok) throw new Error(tData.error || 'Transcription failed')
      const tx = tData.transcript
      setTranscript(tx)

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

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <main className="min-h-screen px-4 py-8 bg-white">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Record Remark</h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* STEP: RECORD */}
        {step === 'record' && (
          <div className="flex flex-col items-center text-center space-y-6 pt-8">
            <div className="py-8">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="w-20 h-20 rounded-full flex items-center justify-center pulse-ring transition-colors"
                  style={{ backgroundColor: 'hsl(276 96% 65%)' }}
                >
                  <div className="w-6 h-6 rounded bg-white" />
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center transition-all group"

                >
                  <svg className="w-7 h-7 text-gray-400 group-hover:text-purple-500 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {isRecording && (
              <div className="flex flex-col items-center gap-3">
                <Waveform />
                <div className="font-semibold text-lg" style={{ color: 'hsl(276 96% 65%)' }}>
                  {formatTime(recordingTime)}
                </div>
                <div className="w-48 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(recordingTime / MAX_DURATION) * 100}%`, backgroundColor: 'hsl(276 96% 65%)' }}
                  />
                </div>
                <p className="text-gray-400 text-xs">
                  {MAX_DURATION - recordingTime}s remaining
                </p>
              </div>
            )}

            {!isRecording && (
              <p className="text-gray-400 text-sm">Tap to start recording</p>
            )}
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div className="flex flex-col items-center text-center py-16 space-y-4">
            <div
              className="w-10 h-10 rounded-full border-2 border-gray-200 animate-spin"
              style={{ borderTopColor: 'hsl(276 96% 65%)' }}
            />
            <div className="text-gray-900 text-sm font-medium">{processingStep}</div>
            <div className="text-gray-400 text-xs">This may take a few seconds</div>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === 'review' && (
          <div className="space-y-4">
            {audioUrl && (
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Audio Preview</div>
                <audio controls src={audioUrl} className="w-full h-10" />
              </div>
            )}

            <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Summary</div>
              <p className="text-gray-900 text-sm leading-relaxed">{summary}</p>
            </div>

            <details className="group">
              <summary className="text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-600 transition-colors select-none">
                View full transcript ↓
              </summary>
              <div className="mt-2 p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-xs leading-relaxed">
                {transcript}
              </div>
            </details>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setStep('record'); setTranscript(''); setSummary(''); setAudioUrl(null) }}
                className="btn-secondary flex-1"
              >
                Re-record
              </button>
              <button
                onClick={finish}
                className="btn-primary flex-[2]"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center py-12 space-y-5">
            <div className="w-14 h-14 rounded-full border border-green-200 bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-gray-900 font-semibold">Done!</div>
              <div className="text-gray-400 text-sm mt-1">Your remark has been processed</div>
            </div>
            <button
              onClick={() => {
                setStep('record'); setTranscript(''); setSummary('')
                setRecordingTime(0); setAudioUrl(null)
              }}
              className="btn-primary"
            >
              + New Remark
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
