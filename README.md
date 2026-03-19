# Salon Remarks — Field Agent Voice Remark Tool

A Next.js app that lets field agents record voice remarks after salon visits. The audio is transcribed (any language) using Whisper and summarized into a 2-line English remark using Claude — ready for head officers to review.

## Setup

```bash
npm install
```

Copy the env example and fill in your keys:
```bash
cp .env.local.example .env.local
```

Required keys in `.env.local`:
```
OPENAI_API_KEY=sk-...         # OpenAI Whisper — multilingual transcription
ANTHROPIC_API_KEY=sk-ant-...  # Claude — 2-line English summarization
```

Run dev server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How It Works

### Agent Flow
1. Opens `/agent`
2. Fills in name, salon name, and outcome (Interested / Not Interested / Follow Up)
3. Records voice remark — any language (Tamil, Hindi, English, etc.)
4. App transcribes via Whisper → summarizes via Claude to 2 sentences in English
5. Agent reviews and submits

### Officer Flow
1. Opens `/officer`
2. Sees all submissions with 2-line English summaries
3. Can filter by outcome
4. Can expand any card to see full transcript

## Stack
- **Next.js 14** App Router
- **OpenAI Whisper** — `whisper-1` model, auto language detection
- **Claude** — `claude-sonnet-4-20250514` for 2-line summarization
- **In-memory store** — swap with Postgres/SQLite for production

## Production Notes
- Replace `src/lib/store.ts` in-memory store with a real DB (Prisma + SQLite/Postgres)
- Add authentication for agent vs officer views
- Store audio files in S3 if you need playback
- The Vercel deployment will reset the in-memory store on each cold start — use a DB
