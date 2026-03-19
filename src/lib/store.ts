export interface Submission {
  id: string
  agentName?: string
  salonName?: string
  outcome?: 'interested' | 'not_interested' | 'follow_up'
  transcript: string
  summary: string
  audioUrl?: string
  createdAt: string
}

// In-memory store (replace with DB in production)
declare global {
  // eslint-disable-next-line no-var
  var __submissions: Submission[] | undefined
}

function getStore(): Submission[] {
  if (!global.__submissions) {
    global.__submissions = []
  }
  return global.__submissions
}

export function addSubmission(s: Submission) {
  getStore().unshift(s)
}

export function getSubmissions(): Submission[] {
  return getStore()
}
