import './App.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  aiInterviewProbability,
  aiResumeCompatibility,
  createApplication,
  deleteApplication,
  getDashboard,
  getMe,
  type AtsAnalysis,
  listApplications,
  login,
  logout,
  register,
  updateApplication,
  type Application,
  type ApplicationStatus,
  type DashboardResponse
} from './api'

const STATUSES: ApplicationStatus[] = ['Applied', 'Interviewing', 'Offer', 'Rejected']

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function OverviewBarChart({
  data,
  height = 220,
  width = 520
}: {
  data: Array<{ day: string; applications: number; interviews: number }>
  height?: number
  width?: number
}) {
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.applications, d.interviews]))
  const padding = 28
  const chartW = width - padding * 2
  const chartH = height - padding * 2

  const groupCount = Math.max(1, data.length)
  const groupW = chartW / groupCount
  const barW = clamp(groupW * 0.35, 6, 24)

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Applications and interviews over time">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />

      {/* axes */}
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--chart-grid)" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--chart-grid)" />

      {/* legend */}
      <rect x={padding} y={8} width={10} height={10} fill="var(--chart-applications)" />
      <text x={padding + 14} y={17} fill="var(--text)" fontSize={11}>
        Applications
      </text>
      <rect x={padding + 110} y={8} width={10} height={10} fill="var(--chart-interviews)" />
      <text x={padding + 124} y={17} fill="var(--text)" fontSize={11}>
        Interviews
      </text>

      {data.map((d, i) => {
        const xCenter = padding + groupW * i + groupW / 2

        const appsH = (d.applications / maxVal) * chartH
        const intH = (d.interviews / maxVal) * chartH

        const appsX = xCenter - barW - 2
        const intX = xCenter + 2

        const appsY = padding + (chartH - appsH)
        const intY = padding + (chartH - intH)

        const label = d.day.slice(5)
        const showLabel = data.length <= 8 || i === 0 || i === data.length - 1 || i % 2 === 0

        return (
          <g key={d.day}>
            <rect x={appsX} y={appsY} width={barW} height={appsH} fill="var(--chart-applications)" />
            <rect x={intX} y={intY} width={barW} height={intH} fill="var(--chart-interviews)" />
            {showLabel ? (
              <text x={xCenter} y={height - 10} textAnchor="middle" fill="var(--muted)" fontSize={10}>
                {label}
              </text>
            ) : null}
          </g>
        )
      })}
    </svg>
  )
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const large = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} L ${cx} ${cy} Z`
}

function StatusPieChart({ counts, size = 220 }: { counts: Record<ApplicationStatus, number>; size?: number }) {
  const total = STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.82

  const colors: Record<ApplicationStatus, string> = {
    Applied: 'var(--chart-applied)',
    Interviewing: 'var(--chart-interviewing)',
    Offer: 'var(--chart-offer)',
    Rejected: 'var(--chart-rejected)'
  }

  if (total === 0) {
    return (
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Status distribution">
        <circle cx={cx} cy={cy} r={r} fill="var(--panel)" stroke="var(--border)" />
        <text x={cx} y={cy} textAnchor="middle" fill="var(--muted)" fontSize={12}>
          No data
        </text>
      </svg>
    )
  }

  let angle = 0
  const slices = STATUSES.map((s) => {
    const value = counts[s] ?? 0
    const sweep = (value / total) * 360
    const start = angle
    const end = angle + sweep
    angle = end
    return { status: s, value, start, end, color: colors[s] }
  }).filter((x) => x.value > 0)

  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Status distribution">
      {slices.map((sl) => (
        <path key={sl.status} d={describeArc(cx, cy, r, sl.start, sl.end)} fill={sl.color} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--panel)" />
      <text x={cx} y={cy} textAnchor="middle" fill="var(--text)" fontSize={12}>
        {total}
      </text>
    </svg>
  )
}
function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function App() {
  const [activeView, setActiveView] = useState<'dashboard' | 'applications' | 'resume' | 'profile'>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resumeAiError, setResumeAiError] = useState<string | null>(null)
  const [interviewAiError, setInterviewAiError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authUsername, setAuthUsername] = useState('')
  const [authIdentifier, setAuthIdentifier] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [apps, setApps] = useState<Application[]>([])

  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'All'>('All')
  const [sort, setSort] = useState<'dateDesc' | 'dateAsc'>('dateDesc')

  const [newApp, setNewApp] = useState({
    company: '',
    role: '',
    status: 'Applied' as ApplicationStatus,
    jobUrl: '',
    salary: '' as number | '',
    dateApplied: todayISO()
  })

  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [jobDesc, setJobDesc] = useState('')
  const [compat, setCompat] = useState<AtsAnalysis | null>(null)

  const [profileSummary, setProfileSummary] = useState('')
  const [interview, setInterview] = useState<null | {
    interviewProbability: number
    reasoning: string[]
    recommendations: string[]
  }>(null)

  const addCompanyInputRef = useRef<HTMLInputElement | null>(null)

  async function refreshAll() {
    setError(null)
    const [d, a] = await Promise.all([
      getDashboard(),
      listApplications({ status: filterStatus === 'All' ? undefined : filterStatus, sort })
    ])
    setDashboard(d)
    setApps(a.items)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const who = await getMe()
        if (!mounted) return
        setUserId(who.userId)
        setEmail(who.email)
        setUsername(who.username)
        setReady(true)
        setAuthChecked(true)
        await refreshAll()
      } catch (e) {
        if (!mounted) return
        setUserId(null)
        setEmail(null)
        setUsername(null)
        setReady(false)
        setAuthChecked(true)
        const msg = e instanceof Error ? e.message : 'Failed to initialize'
        // If unauthenticated, we show the login form instead of an error.
        if (!/401/.test(msg) && !/Not authenticated/i.test(msg)) {
          setError(msg)
        }
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready) return
    refreshAll().catch((e) => setError(e instanceof Error ? e.message : 'Refresh failed'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, sort])

  const statusCounts = useMemo(() => {
    const map: Record<ApplicationStatus, number> = {
      Applied: 0,
      Interviewing: 0,
      Offer: 0,
      Rejected: 0
    }
    for (const row of dashboard?.statusDistribution ?? []) {
      map[row.status] = Number(row.count)
    }
    return map
  }, [dashboard])

  const latestOverview = useMemo(() => {
    const series = dashboard?.overviewSeries ?? []
    return series.slice(Math.max(0, series.length - 14))
  }, [dashboard])

  function humanizeAiError(err: unknown): string {
    const msg = err instanceof Error ? err.message : String(err)
    const lower = msg.toLowerCase()

    if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('resource has been exhausted')) {
      return 'Rate limit exceeded for Gemini. Try again later or use a different API key.'
    }

    if (lower.includes('not configured') || lower.includes('gemini_api_key') || lower.includes('authentication')) {
      return 'Gemini is not configured. Set GEMINI_API_KEY in backend .env and restart the backend.'
    }

    return msg
  }

  function renderAuth() {
    return (
      <div className="authPage">
        <div className="authShell" role="main">
          <div className="authCard">
            <div className="authTitle">{authMode === 'login' ? 'Sign in' : 'Create account'}</div>
            <div className="authSubtitle">Use your email and password.</div>

            {error ? <div className="error">{error}</div> : null}

            <form
              className="authForm"
              onSubmit={(e) => {
                e.preventDefault()
                setError(null)
                setAuthBusy(true)

                const action = authMode === 'login' ? login : register
                const payload =
                  authMode === 'login'
                    ? { identifier: authIdentifier, password: authPassword }
                    : { username: authUsername, email: authIdentifier, password: authPassword }

                action(payload as any)
                  .then((who) => {
                    setUserId(who.userId)
                    setEmail(who.email)
                    setUsername(who.username)
                    setReady(true)
                    setAuthPassword('')
                    return refreshAll()
                  })
                  .catch((err) => setError(err instanceof Error ? err.message : 'Authentication failed'))
                  .finally(() => setAuthBusy(false))
              }}
            >
              {authMode === 'register' ? (
                <label className="authField">
                  <span className="authLabel">Username</span>
                  <input
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    type="text"
                    autoComplete="username"
                    placeholder="your_name"
                    required
                  />
                </label>
              ) : null}

              <label className="authField">
                <span className="authLabel">{authMode === 'login' ? 'Email or Username' : 'Email'}</span>
                <input
                  value={authIdentifier}
                  onChange={(e) => setAuthIdentifier(e.target.value)}
                  type={authMode === 'login' ? 'text' : 'email'}
                  autoComplete={authMode === 'login' ? 'username' : 'email'}
                  placeholder={authMode === 'login' ? 'you@example.com or your_name' : 'you@example.com'}
                  required
                />
              </label>

              <label className="authField">
                <span className="authLabel">Password</span>
                <input
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  type="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  required
                />
              </label>

              <button className="btn authSubmit" type="submit" disabled={authBusy}>
                {authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>

          <div className="authSide" aria-label="Welcome panel">
            <div className="authSideInner">
              <div className="authSideTitle">{authMode === 'login' ? 'Welcome back!' : 'Welcome!'}</div>
              <div className="authSideText">
                {authMode === 'login'
                  ? 'Sign in to continue tracking your applications and insights.'
                  : 'Create an account to start tracking your applications and insights.'}
              </div>

              <button
                className="btn secondary authSwitch"
                type="button"
                onClick={() => setAuthMode((m) => (m === 'login' ? 'register' : 'login'))}
                disabled={authBusy}
              >
                {authMode === 'login' ? 'No account yet? Register' : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderDashboard() {
    return (
      <>
        <div className="summaryCards">
          <div className="summaryCard">
            <div className="summaryCardTop">
              <div className="summaryCardTitle">Total Applications</div>
              <div className="summaryCardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M7 2a1 1 0 0 0-1 1v2H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2V3a1 1 0 1 0-2 0v2H8V3a1 1 0 0 0-1-1Zm13 8H4v10h16V10Z"
                  />
                </svg>
              </div>
            </div>
            <div className="summaryCardValue">{dashboard?.stats.totalApplications ?? 0}</div>
          </div>
          <div className="summaryCard">
            <div className="summaryCardTop">
              <div className="summaryCardTitle">Interviews</div>
              <div className="summaryCardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M7 2h10a2 2 0 0 1 2 2v16.5a1.5 1.5 0 0 1-2.4 1.2L12 18.5 7.4 21.7A1.5 1.5 0 0 1 5 20.5V4a2 2 0 0 1 2-2Zm2 6h6a1 1 0 1 0 0-2H9a1 1 0 0 0 0 2Zm0 4h6a1 1 0 1 0 0-2H9a1 1 0 1 0 0 2Z"
                  />
                </svg>
              </div>
            </div>
            <div className="summaryCardValue">{dashboard?.stats.interviewsScheduled ?? 0}</div>
          </div>
          <div className="summaryCard">
            <div className="summaryCardTop">
              <div className="summaryCardTitle">Offers</div>
              <div className="summaryCardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 2a3 3 0 0 1 3 3v1h3a2 2 0 0 1 2 2v2a6 6 0 0 1-6 6h-1v2h2a1 1 0 1 1 0 2H7a1 1 0 1 1 0-2h2v-2H8a6 6 0 0 1-6-6V8a2 2 0 0 1 2-2h3V5a3 3 0 0 1 3-3h2Zm1 4V5a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1h4Z"
                  />
                </svg>
              </div>
            </div>
            <div className="summaryCardValue">{dashboard?.stats.offersReceived ?? 0}</div>
          </div>
          <div className="summaryCard">
            <div className="summaryCardTop">
              <div className="summaryCardTitle">Rejection Rate</div>
              <div className="summaryCardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm3.7 12.3a1 1 0 0 0-1.4 0L12 16.6l-2.3-2.3a1 1 0 1 0-1.4 1.4l3 3a1 1 0 0 0 1.4 0l3-3a1 1 0 0 0 0-1.4ZM12 6a1 1 0 0 0-1 1v4a1 1 0 0 0 .4.8l2.5 1.9a1 1 0 1 0 1.2-1.6L13 10.5V7a1 1 0 0 0-1-1Z"
                  />
                </svg>
              </div>
            </div>
            <div className="summaryCardValue">{dashboard?.stats.rejectionRate ?? 0}%</div>
          </div>
        </div>

        <div className="chartGrid">
          <div className="panel">
            <div className="panelHeader">
              <h3>Applications Overview</h3>
              <div className="panelSub">Last 14 days</div>
            </div>
            <OverviewBarChart data={latestOverview} height={180} />
          </div>

          <div className="panel">
            <div className="panelHeader">
              <h3>Application Status</h3>
              <div className="panelSub">Distribution</div>
            </div>
            <StatusPieChart counts={statusCounts} size={180} />
            <div className="legend">
              {STATUSES.map((s) => (
                <div className="legendItem" key={s}>
                  <span className={`legendDot status-${s}`} aria-hidden="true" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>Recent Applications</h3>
            <div className="panelSub">Last 5</div>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Date Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(dashboard?.recent ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No applications yet
                  </td>
                </tr>
              ) : (
                (dashboard?.recent ?? []).map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.company}</td>
                    <td>{r.role}</td>
                    <td>{r.dateApplied}</td>
                    <td>{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  function renderApplications() {
    return (
      <>
        <div className="panel">
          <div className="panelHeader">
            <h3>Add Application</h3>
            <div className="panelSub">Track a new job</div>
          </div>
          <form
            className="form appForm"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              createApplication(newApp)
                .then(() => {
                  setNewApp({ ...newApp, company: '', role: '', jobUrl: '' })
                  return refreshAll()
                })
                .catch((err) => setError(err instanceof Error ? err.message : 'Failed to create'))
            }}
          >
            <input
              ref={addCompanyInputRef}
              placeholder="Company"
              value={newApp.company}
              onChange={(e) => setNewApp({ ...newApp, company: e.target.value })}
              required
            />
            <input
              placeholder="Role"
              value={newApp.role}
              onChange={(e) => setNewApp({ ...newApp, role: e.target.value })}
              required
            />
            <select value={newApp.status} onChange={(e) => setNewApp({ ...newApp, status: e.target.value as ApplicationStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              placeholder="Job Post URL (optional)"
              value={newApp.jobUrl}
              onChange={(e) => setNewApp({ ...newApp, jobUrl: e.target.value })}
            />
            <input
              placeholder="Salary (optional)"
              value={newApp.salary}
              onChange={(e) => setNewApp({ ...newApp, salary: e.target.value === '' ? '' : Number(e.target.value) })}
              type="number"
              min={0}
            />
            <input
              value={newApp.dateApplied}
              onChange={(e) => setNewApp({ ...newApp, dateApplied: e.target.value })}
              type="date"
              required
            />
            <button className="btn" type="submit">
              Add
            </button>
          </form>
        </div>

        <div className="panel">
          <div className="row rowWrap">
            <div>
              <h3>All Applications</h3>
              <div className="panelSub">Update status as you go</div>
            </div>
            <div className="row">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                <option value="All">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
                <option value="dateDesc">Date (newest)</option>
                <option value="dateAsc">Date (oldest)</option>
              </select>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Date Applied</th>
                <th>Status</th>
                <th>Job URL</th>
                <th>Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No applications found
                  </td>
                </tr>
              ) : (
                apps.map((a) => (
                  <tr key={a.id}>
                    <td>{a.company}</td>
                    <td>{a.role}</td>
                    <td>{a.dateApplied}</td>
                    <td>
                      <select
                        value={a.status}
                        onChange={(e) => {
                          const next = e.target.value as ApplicationStatus
                          setError(null)
                          updateApplication(a.id, { status: next })
                            .then(() => refreshAll())
                            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Update failed'))
                        }}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {a.jobUrl ? (
                        <a href={a.jobUrl} target="_blank" rel="noreferrer">
                          Link
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{a.salary ?? <span className="muted">—</span>}</td>
                    <td>
                      <button
                        className="btn danger"
                        onClick={() => {
                          setError(null)
                          deleteApplication(a.id)
                            .then(() => refreshAll())
                            .catch((err) => setError(err instanceof Error ? err.message : 'Delete failed'))
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  function renderResume() {
    const ScoreRow = (props: { label: string; value: number; max: number }) => {
      const pct = props.max ? Math.round((props.value / props.max) * 100) : 0
      const width = Math.max(0, Math.min(100, pct))
      return (
        <div className="scoreRow">
          <div className="scoreRowTop">
            <div className="scoreLabel">{props.label}</div>
            <div className="scoreValue">
              {props.value}/{props.max}
            </div>
          </div>
          <div
            className="scoreBar"
            role="progressbar"
            aria-label={props.label}
            aria-valuemin={0}
            aria-valuemax={props.max}
            aria-valuenow={props.value}
          >
            <div className="scoreFill" style={{ width: `${width}%` }} />
          </div>
        </div>
      )
    }

    const unsupportedResponsibilities = (compat?.responsibilities ?? []).filter((r) => !r.supported)

    return (
      <div className="chartGrid">
        <div className="panel">
          <div className="panelHeader">
            <h3>Resume ATS Analysis</h3>
            <div className="panelSub">PDF + job description (score is /100)</div>
          </div>

          {resumeAiError ? (
            <div className="error inlineError" role="alert">
              {resumeAiError}
            </div>
          ) : null}

          <div className="form">
            <input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
            <textarea placeholder="Paste job description..." value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} rows={8} />
            <button
              className="btn"
              onClick={() => {
                if (!resumeFile) {
                  setResumeAiError('Please choose a resume PDF')
                  return
                }
                if (!jobDesc.trim()) {
                  setResumeAiError('Please paste the job description')
                  return
                }
                setResumeAiError(null)
                setCompat(null)
                aiResumeCompatibility({ resumePdf: resumeFile, jobDescription: jobDesc })
                  .then(setCompat)
                  .catch((err) => setResumeAiError(humanizeAiError(err)))
              }}
            >
              Analyze
            </button>
          </div>

          {compat ? (
            <div className="result">
              <div className="value">ATS Score: {compat.scoreTotal}/100</div>

              <div className="label">Score breakdown</div>
              <div className="scoreGrid">
                <ScoreRow label="Skills" value={compat.breakdown.skills} max={50} />
                <ScoreRow label="Role Fit" value={compat.breakdown.roleFit} max={25} />
                <ScoreRow label="Keywords" value={compat.breakdown.keywords} max={15} />
                <ScoreRow label="Formatting" value={compat.breakdown.formatting} max={10} />
              </div>

              <div className="label">Matched skills</div>
              <ul>
                {compat.skills.matched.length ? compat.skills.matched.map((s) => <li key={s}>{s}</li>) : <li>None detected</li>}
              </ul>

              <div className="label">Missing skills (gap)</div>
              <ul>
                {compat.skills.missing.length ? compat.skills.missing.map((s) => <li key={s}>{s}</li>) : <li>None</li>}
              </ul>

              <div className="label">Responsibility gaps</div>
              <ul>
                {unsupportedResponsibilities.length ? (
                  unsupportedResponsibilities.map((r, i) => <li key={`${r.text}-${i}`}>{r.text}</li>)
                ) : (
                  <li>No gaps detected</li>
                )}
              </ul>

              <div className="label">Tips to improve</div>
              <ul>
                {compat.tips.length ? compat.tips.map((t, i) => <li key={i}>{t}</li>) : <li>No tips</li>}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="panel">
          <div className="panelHeader">
            <h3>Interview Probability Prediction</h3>
            <div className="panelSub">Optional PDF + summary</div>
          </div>

          {interviewAiError ? (
            <div className="error inlineError" role="alert">
              {interviewAiError}
            </div>
          ) : null}

          <div className="form">
            <input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)} />
            <textarea
              placeholder="Professional profile summary..."
              value={profileSummary}
              onChange={(e) => setProfileSummary(e.target.value)}
              rows={5}
            />
            <textarea placeholder="Paste job description..." value={jobDesc} onChange={(e) => setJobDesc(e.target.value)} rows={6} />
            <button
              className="btn"
              onClick={() => {
                if (!profileSummary.trim()) {
                  setInterviewAiError('Please add your profile summary')
                  return
                }
                if (!jobDesc.trim()) {
                  setInterviewAiError('Please paste the job description')
                  return
                }

                setInterviewAiError(null)
                setInterview(null)
                aiInterviewProbability({ resumePdf: resumeFile ?? undefined, jobDescription: jobDesc, profileSummary })
                  .then(setInterview)
                  .catch((err) => setInterviewAiError(humanizeAiError(err)))
              }}
            >
              Predict
            </button>
          </div>

          {interview ? (
            <div className="result">
              <div className="value">Interview Probability: {interview.interviewProbability}%</div>
              <div className="label">Reasoning</div>
              <ul>
                {interview.reasoning.length ? interview.reasoning.map((s, i) => <li key={i}>{s}</li>) : <li>No reasoning</li>}
              </ul>
              <div className="label">Recommendations</div>
              <ul>
                {interview.recommendations.length ? interview.recommendations.map((s, i) => <li key={i}>{s}</li>) : <li>No recommendations</li>}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  function renderProfile() {
    return (
      <div className="panel">
        <div className="panelHeader">
          <h3>Profile</h3>
          <div className="panelSub">Signed in</div>
        </div>
        <div className="profileBlock">
          <div className="profileAvatar" aria-hidden="true" />
          <div>
            <div className="profileName">{username || email || '—'}</div>
            <div className="profileMeta">ID: {userId ?? '—'}</div>
          </div>
        </div>
      </div>
    )
  }

  const viewTitle =
    activeView === 'dashboard'
      ? { title: 'Welcome Back', subtitle: "Here's a summary of your job search progress." }
      : activeView === 'applications'
        ? { title: 'Applications', subtitle: 'Manage and track your applications.' }
        : activeView === 'resume'
          ? { title: 'Resume Analysis', subtitle: 'Use AI tools to improve your chances.' }
          : { title: 'Profile', subtitle: 'Your current session details.' }

  if (!authChecked) {
    return (
      <div className="main">
        <div className="pageTitle">Loading…</div>
      </div>
    )
  }

  if (!ready) {
    return renderAuth()
  }

  return (
    <div className={sidebarCollapsed ? 'appShell sidebarCollapsed' : 'appShell'}>
      <aside className="sidebar">
        <div className="brandRow">
          <div className="brand" onClick={() => setActiveView('dashboard')} role="button" tabIndex={0}>
            <div className="brandMark" aria-hidden="true" />
            <div className="brandText">AI-Powered Job Application Tracker</div>
          </div>

          <button
            className="iconBtn"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((v) => !v)}
          >
            {sidebarCollapsed ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm2 0v14h12V5H6Zm2 2h2v10H8V7Zm5 5 3-3a1 1 0 1 1 1.4 1.4L16.8 12l1.6 1.6A1 1 0 1 1 17 15l-3-3a1 1 0 0 1 0-1.4Z"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm2 0v14h12V5H6Zm2 2h2v10H8V7Zm3 5 3 3a1 1 0 0 0 1.4-1.4L13.4 12 15 10.4A1 1 0 1 0 13.6 9l-3 3a1 1 0 0 0 0 1.4Z"
                />
              </svg>
            )}
          </button>
        </div>

        <nav className="nav">
          <button
            className={activeView === 'dashboard' ? 'navItem active' : 'navItem'}
            onClick={() => {
              setError(null)
              setActiveView('dashboard')
            }}
          >
            <span className="navIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"
                />
              </svg>
            </span>
            <span className="navLabel">Dashboard</span>
          </button>
          <button
            className={activeView === 'applications' ? 'navItem active' : 'navItem'}
            onClick={() => {
              setError(null)
              setActiveView('applications')
              queueMicrotask(() => addCompanyInputRef.current?.focus())
            }}
          >
            <span className="navIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M7 2h10a2 2 0 0 1 2 2v18H5V4a2 2 0 0 1 2-2Zm0 6h10V6H7v2Zm0 4h10v-2H7v2Zm0 4h10v-2H7v2Z"
                />
              </svg>
            </span>
            <span className="navLabel">Applications</span>
          </button>
          <button
            className={activeView === 'resume' ? 'navItem active' : 'navItem'}
            onClick={() => {
              setError(null)
              setActiveView('resume')
            }}
          >
            <span className="navIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 12h8a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Zm0 4h8a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2Z"
                />
              </svg>
            </span>
            <span className="navLabel">Resume Analysis</span>
          </button>
        </nav>

        <div className="sidebarBottom">
          <button
            className={activeView === 'profile' ? 'navItem active' : 'navItem'}
            onClick={() => {
              setError(null)
              setActiveView('profile')
            }}
          >
            <span className="navIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z"
                />
              </svg>
            </span>
            <span className="navLabel">Profile</span>
          </button>
          <button
            className="navItem"
            onClick={() => {
              setError(null)
              logout()
                .then(() => {
                  setUserId(null)
                  setEmail(null)
                  setUsername(null)
                  setReady(false)
                  setActiveView('dashboard')
                })
                .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Logout failed'))
            }}
          >
            <span className="navIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M10 17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4a1 1 0 1 1 0 2H5v8h4a1 1 0 0 1 1 1Zm10.7-5.7-3-3a1 1 0 1 0-1.4 1.4l1.3 1.3H10a1 1 0 1 0 0 2h7.6l-1.3 1.3a1 1 0 1 0 1.4 1.4l3-3a1 1 0 0 0 0-1.4Z"
                />
              </svg>
            </span>
            <span className="navLabel">Logout</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="pageTitle">{viewTitle.title}</div>
            <div className="pageSubtitle">{viewTitle.subtitle}</div>
          </div>
          <div className="topbarActions">
            {activeView === 'dashboard' ? (
              <button
                className="btn"
                onClick={() => {
                  setActiveView('applications')
                  queueMicrotask(() => addCompanyInputRef.current?.focus())
                }}
              >
                <span className="btnIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path fill="currentColor" d="M11 11V6a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5Z" />
                  </svg>
                </span>
                Add Application
              </button>
            ) : null}
          </div>
        </header>

        {error ? <div className="error">{error}</div> : null}

        <div className="content">
          {activeView === 'dashboard'
            ? renderDashboard()
            : activeView === 'applications'
              ? renderApplications()
              : activeView === 'resume'
                ? renderResume()
                : renderProfile()}
        </div>
      </main>
    </div>
  )
}

export default App
