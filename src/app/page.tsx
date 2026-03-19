import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
      <div className="w-full max-w-sm text-center">
        {/* Title */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">daSalon Remarks</h1>
          <p className="mt-2 text-sm text-gray-500">Voice-to-summary for field agents</p>
        </div>

        {/* CTA */}
        <Link href="/agent" className="btn-primary w-full">
          Start Recording
        </Link>

        <p className="text-center text-xs text-gray-400 mt-8">Powered by Whisper + OpenAI</p>
      </div>
    </main>
  )
}
