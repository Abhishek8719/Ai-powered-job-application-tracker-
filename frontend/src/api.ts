export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offer' | 'Rejected'

export type Application = {
  id: number
  company: string
  role: string
  status: ApplicationStatus
  jobUrl?: string | null
  salary?: number | null
  dateApplied: string
}

export type DashboardResponse = {
  stats: {
    totalApplications: number
    interviewsScheduled: number
    offersReceived: number
    rejectionRate: number
  }
  statusDistribution: Array<{ status: ApplicationStatus; count: number }>
  overviewSeries: Array<{ day: string; applications: number; interviews: number }>
  recent: Array<{ company: string; role: string; dateApplied: string; status: ApplicationStatus }>
}

export type AuthUser = {
  userId: string
  email: string
  username: string
}

export type AtsAnalysis = {
  scoreTotal: number
  breakdown: {
    skills: number
    roleFit: number
    keywords: number
    formatting: number
  }
  skills: {
    required: string[]
    preferred: string[]
    matched: string[]
    missing: string[]
  }
  responsibilities: Array<{
    text: string
    supported: boolean
    evidence: string | null
  }>
  keywords: {
    important: string[]
    matched: string[]
    missing: string[]
  }
  tips: string[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' })
    },
    credentials: 'include'
  })

  if (!res.ok) {
    // Prefer a JSON error shape like { error: string } when present.
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const data = (await res.json().catch(() => null)) as any
      if (data && typeof data.error === 'string' && data.error.trim()) {
        throw new Error(data.error)
      }

      // Handle Zod `.flatten()` shape: { error: { fieldErrors, formErrors } }
      const zod = data?.error
      const fieldErrors = zod?.fieldErrors
      const formErrors = zod?.formErrors
      if (fieldErrors && typeof fieldErrors === 'object') {
        const parts: string[] = []
        for (const [field, messages] of Object.entries(fieldErrors as Record<string, unknown>)) {
          if (Array.isArray(messages) && typeof messages[0] === 'string' && messages[0].trim()) {
            parts.push(`${field}: ${messages[0]}`)
          }
        }
        if (Array.isArray(formErrors) && typeof formErrors[0] === 'string' && formErrors[0].trim()) {
          parts.push(formErrors[0])
        }
        if (parts.length) {
          throw new Error(parts.join(' | '))
        }
      }
      throw new Error(`Request failed: ${res.status}`)
    }

    const text = await res.text().catch(() => '')
    throw new Error(text || `Request failed: ${res.status}`)
  }

  return (await res.json()) as T
}

export async function getMe(): Promise<AuthUser> {
  return request('/auth/me')
}

export async function register(input: { username: string; email: string; password: string }): Promise<AuthUser> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export async function login(input: { identifier: string; password: string }): Promise<AuthUser> {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export async function logout(): Promise<{ ok: true }> {
  return request('/auth/logout', { method: 'POST' })
}

export async function getDashboard(): Promise<DashboardResponse> {
  return request('/api/dashboard')
}

export async function listApplications(params: { status?: ApplicationStatus; sort?: 'dateAsc' | 'dateDesc' } = {}) {
  const search = new URLSearchParams()
  if (params.status) search.set('status', params.status)
  if (params.sort) search.set('sort', params.sort)
  const q = search.toString()
  return request<{ items: Application[] }>(`/api/applications${q ? `?${q}` : ''}`)
}

export async function createApplication(input: {
  company: string
  role: string
  status: ApplicationStatus
  jobUrl?: string
  salary?: number | ''
  dateApplied: string
}) {
  return request<{ id: number }>('/api/applications', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      salary: input.salary === '' ? null : Number(input.salary)
    })
  })
}

export async function updateApplication(id: number, patch: Partial<Omit<Application, 'id'>>): Promise<{ ok: true }> {
  return request(`/api/applications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch)
  })
}

export async function deleteApplication(id: number): Promise<{ ok: true }> {
  return request(`/api/applications/${id}`, { method: 'DELETE' })
}

export async function aiResumeCompatibility(input: { resumePdf: File; jobDescription: string }) {
  const fd = new FormData()
  fd.set('resumePdf', input.resumePdf)
  fd.set('jobDescription', input.jobDescription)

  return request<AtsAnalysis>('/api/ai/resume-compatibility', {
    method: 'POST',
    body: fd,
    headers: {}
  })
}

export async function aiInterviewProbability(input: { resumePdf?: File; jobDescription: string; profileSummary: string }) {
  const fd = new FormData()
  if (input.resumePdf) fd.set('resumePdf', input.resumePdf)
  fd.set('jobDescription', input.jobDescription)
  fd.set('profileSummary', input.profileSummary)

  return request<{
    interviewProbability: number
    reasoning: string[]
    recommendations: string[]
  }>('/api/ai/interview-probability', {
    method: 'POST',
    body: fd,
    headers: {}
  })
}
