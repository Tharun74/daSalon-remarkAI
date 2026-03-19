import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { transcript, salonName } = await req.json()

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `You are summarizing a field sales agent's visit remark for a head officer. \nThe agent visited ${salonName || 'a salon'} and recorded this remark (may be in any language):\n\n"${transcript}"\n\nWrite EXACTLY 2 sentences in English summarizing:\n1. The outcome/interest level of the salon\n2. Any key detail or next action\n\nBe direct and factual. No preamble, no labels, just 2 sentences.`,
        },
      ],
      max_tokens: 150,
    })

    const summary = response.choices[0]?.message?.content?.trim() || ''
    return NextResponse.json({ summary })
  } catch (err: unknown) {
    console.error('Summarize error:', err)
    const message = err instanceof Error ? err.message : 'Summarization failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
