import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Increase timeout config if possible, but Next.js app directory limits API routes to host limit (Vercel is 10s on free by default unless configured).
// We'll rely on the client for timeouts if it exceeds.
export const maxDuration = 60 // Allow up to 60s if environment supports it

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 })
    }

    // Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      // Request verbose_json to get the detected language
      response_format: 'verbose_json',
    })

    const originalText = transcription.text
    
    if (!originalText || originalText.trim().length === 0) {
      return NextResponse.json({ error: 'No speech detected' }, { status: 400 })
    }

    let englishText = originalText
    const language = transcription.language?.toLowerCase() || 'unknown'

    // If language is not English, translate it to English
    if (language !== 'english' && language !== 'en') {
      const translationResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a translation engine. Translate the following text to English. Output EXACTLY the English translation and nothing else, no quotes, no markdown.'
          },
          {
            role: 'user',
            content: originalText
          }
        ],
        max_tokens: 500,
      })
      englishText = translationResponse.choices[0]?.message?.content?.trim() || originalText
    }

    return NextResponse.json({ originalText, englishText, language })
  } catch (err: unknown) {
    console.error('Transcribe error:', err)
    let message = 'Could not process audio. Please try again.'
    
    if (err instanceof Error) {
      if (err.message.includes('timeout')) {
        message = 'Processing took too long. Try again'
      } else if (err.message.includes('format') || err.message.includes('unsupported')) {
        message = 'Unsupported file format'
      }
    }
    
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
