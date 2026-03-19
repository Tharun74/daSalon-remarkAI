import { NextRequest, NextResponse } from 'next/server'
import { addSubmission, getSubmissions, Submission } from '@/lib/store'
import { randomUUID } from 'crypto'

export async function GET() {
  return NextResponse.json(getSubmissions())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { agentName, salonName, outcome, transcript, summary } = body

    if (!transcript || !summary) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const submission: Submission = {
      id: randomUUID(),
      agentName: agentName || undefined,
      salonName: salonName || undefined,
      outcome: outcome || undefined,
      transcript,
      summary,
      createdAt: new Date().toISOString(),
    }

    addSubmission(submission)
    return NextResponse.json({ success: true, id: submission.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
