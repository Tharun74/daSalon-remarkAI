'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'

const MAX_DURATION = 30
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

type Step = 'input' | 'processing' | 'review' | 'done'

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
  const [step, setStep] = useState<Step>('input')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  const [englishText, setEnglishText] = useState('')
  const [originalText, setOriginalText] = useState('')
  const [language, setLanguage] = useState('')
  const [remarks, setRemarks] = useState('')

  const [activeTab, setActiveTab] = useState<'english' | 'original'>('english')

  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)

  useEffect(() => {
    if (isRecording && recordingTime >= MAX_DURATION) {
      stopRecording()
    }
  }, [isRecording, recordingTime])

  const startRecording = useCallback(async () => {
    try {
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
  }, [])

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop())
      processAudio(blob, 'remark.webm')
    }

    mediaRecorderRef.current.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError('File size exceeds limit')
        return
      }
      processAudio(file, file.name)
    }
  }

  const processAudio = (blob: Blob, filename: string) => {
    setError('')

    if (!navigator.onLine) {
      setError('No internet connection. Please try again.')
      return
    }

    setStep('processing')
    setProgress(0)
    setActiveTab('english')

    const fd = new FormData()
    fd.append('audio', blob, filename)

    const xhr = new XMLHttpRequest()
    xhrRef.current = xhr

    xhr.open('POST', '/api/transcribe', true)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const res = JSON.parse(xhr.responseText)
          setOriginalText(res.originalText)
          setEnglishText(res.englishText)
          setLanguage(res.language)
          setRemarks(res.englishText) // Auto-fill remarks
          setStep('review')
        } catch {
          setError('Could not process audio. Please try again.')
          setStep('input')
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText)
          setError(res.error || 'Could not process audio. Please try again.')
        } catch {
          setError('Could not process audio. Please try again.')
        }
        setStep('input')
      }
    }

    xhr.onerror = () => {
      setError('Could not process audio. Please try again.')
      setStep('input')
    }

    xhr.ontimeout = () => {
      setError('Processing took too long. Try again')
      setStep('input')
    }
    xhr.timeout = 60000; // 60s timeout

    xhr.send(fd)
  }

  const cancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort()
      xhrRef.current = null
    }
    setStep('input')
    setError('')
    setActiveTab('english')
  }

  const handleFinalSubmit = () => {
    setStep('done')
  }

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

        {/* STEP: INPUT */}
        {step === 'input' && (
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
                  className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center transition-all group hover:border-purple-300"
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
              <div className="flex flex-col gap-4 w-full pt-4">
                <p className="text-gray-400 text-sm mb-2">Tap to start recording</p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-400">Or</span>
                  </div>
                </div>
                <label className="btn-secondary w-full cursor-pointer flex justify-center items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload Audio File
                  <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div className="flex flex-col items-center text-center py-16 space-y-6">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Uploading & Processing...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, backgroundColor: 'hsl(276 96% 65%)' }}
                />
              </div>
            </div>

            <button
              onClick={cancelUpload}
              className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors border border-red-200 py-1.5 px-4 rounded hover:bg-red-50"
            >
              Cancel
            </button>
            <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
              Submit Final Remark
            </button>
          </div>
        )}

        {/* STEP: REVIEW */}
        {step === 'review' && (
          <div className="space-y-6 animate-fade-in py-2">
            <div className="p-4 rounded-lg shadow-sm border border-gray-200 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('english')}
                    className={`text-xs font-semibold uppercase tracking-wider px-1 pb-2 -mb-[9px] border-b-2 transition-colors ${
                      activeTab === 'english'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    English
                  </button>
                  {language !== 'english' && language !== 'en' && originalText && (
                    <button
                      onClick={() => setActiveTab('original')}
                      className={`text-xs font-semibold uppercase tracking-wider px-1 pb-2 -mb-[9px] border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === 'original'
                          ? 'border-purple-500 text-purple-600'
                          : 'border-transparent text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Original
                      <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] uppercase">{language}</span>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="min-h-[60px]">
                {activeTab === 'english' ? (
                  <p className="text-gray-900 text-sm leading-relaxed">{englishText}</p>
                ) : (
                  <p className="text-gray-700 text-sm leading-relaxed italic">{originalText}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="remarks" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                Final Remarks
              </label>
              <textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px] shadow-sm resize-y"
                placeholder="Edit your remarks here before submitting..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { setStep('input'); setRemarks(''); setError(''); setActiveTab('english') }}
                className="btn-secondary flex-1"
              >
                Start Over
              </button>
              <button
                onClick={handleFinalSubmit}
                className="btn-primary flex-[2]"
              >
                Submit Remark
              </button>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center py-12 space-y-5 animate-scale-up">
            <div className="w-14 h-14 rounded-full border border-green-200 bg-green-50 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="text-gray-900 font-semibold text-lg">Remark Submitted!</div>
              <div className="text-gray-400 text-sm mt-1">Your response has been saved.</div>
            </div>
            <button
              onClick={() => {
                setStep('input'); setEnglishText(''); setOriginalText(''); setRemarks(''); setActiveTab('english')
              }}
              className="btn-primary"
            >
              + Record Another
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
