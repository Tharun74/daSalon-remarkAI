import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0f0f0f' }}>
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Field Remarks</span>
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Salon Intel</h1>
          <p className="mt-2 text-sm text-zinc-500">Voice-to-summary for field agents</p>
        </div>

        {/* Entry Card */}
        <div className="space-y-3">
          <Link href="/agent" className="block group">
            <div className="border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-zinc-900 transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">Field Agent</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Record visit remarks via voice</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                    <path fillRule="evenodd" d="M10 3a7 7 0 100 14A7 7 0 0010 3zm-9 7a9 9 0 1118 0A9 9 0 011 10z" clipRule="evenodd"/>
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <p className="text-center text-xs text-zinc-700 mt-8 font-mono">Powered by Whisper + OpenAI</p>
      </div>
    </main>
  )
}
