
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import {
  ArrowRight,
  Network,
  Sparkles,
  GitBranch,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FolderTree,
  BrainCircuit,
  Route,
  Search,
  ShieldCheck,
  Download,
} from 'lucide-react'

import Dashboard from './components/Dashboard'

import {
  analyzeRepository,
  checkBackendHealth,
  getApiError,
} from './services/api'

import type { RepositoryAnalysis } from './types/repository'
import { exportRepositoryPDF } from './utils/pdfExporter'

type BackendStatus = 'checking' | 'online' | 'offline'

function App() {
  const [repoUrl, setRepoUrl] = useState('')
  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>('checking')

  const [analysis, setAnalysis] =
    useState<RepositoryAnalysis | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Backend health check
  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'))
  }, [])

  // Export complete repository analysis as JSON
  const handleExportJSON = () => {
    if (!analysis) return

    const report = {
      report_name: 'CodeAtlas Repository Intelligence Report',
      generated_at: new Date().toISOString(),
      repository_analysis: analysis,
    }

    const json = JSON.stringify(report, null, 2)

    const blob = new Blob([json], {
      type: 'application/json',
    })

    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = downloadUrl
    link.download = `${analysis.repository.name}-codeatlas-report.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(downloadUrl)
  }

  // Export repository analysis as PDF
  const handleExportPDF = () => {
    if (!analysis) return

    try {
      exportRepositoryPDF(analysis)
      setError('')
    } catch (err) {
      console.error('PDF export failed:', err)
      setError('Unable to generate the PDF report. Please try again.')
    }
  }

  // Repository analysis
  const handleAnalyze = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()

    const url = repoUrl.trim()

    if (!url) {
      setError('Please enter a GitHub repository URL.')
      return
    }

    try {
      const parsedUrl = new URL(url)

      const valid =
        ['github.com', 'www.github.com'].includes(
          parsedUrl.hostname
        ) &&
        /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(
          parsedUrl.pathname
        ) &&
        ['http:', 'https:'].includes(parsedUrl.protocol)

      if (!valid) {
        setError(
          'Enter a valid URL: https://github.com/owner/repository'
        )
        return
      }
    } catch {
      setError('Please enter a valid GitHub URL.')
      return
    }

    setLoading(true)
    setError('')
    setAnalysis(null)

    try {
      const result = await analyzeRepository(url)

      setAnalysis(result)
      setBackendStatus('online')
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  // Dashboard after successful analysis
  if (analysis) {
    return (
      <div className="min-h-screen bg-[#080b12]">
        <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#080b12]/95 px-6 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Network size={19} className="text-violet-400" />
            CodeAtlas
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151b2a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#202a3d]"
            >
              <Download size={17} />
              Export JSON
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Download size={17} />
              Export PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-4 flex max-w-6xl items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        <Dashboard
          analysis={analysis}
          onBack={() => {
            setAnalysis(null)
            setError('')
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100">

      {/* Navigation */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <Network size={23} />
            </div>

            <span className="text-xl font-bold tracking-tight">
              CodeAtlas<span className="text-violet-400">.</span>
            </span>
          </div>

          <div className="hidden items-center gap-8 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>

            <a href="#how-it-works" className="transition hover:text-white">
              How it works
            </a>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition hover:text-white"
            >
              <GitBranch size={17} />
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {backendStatus === 'online' ? (
              <CheckCircle2 size={16} className="text-green-500" />
            ) : backendStatus === 'offline' ? (
              <AlertCircle size={16} className="text-red-500" />
            ) : (
              <Loader2 size={16} className="animate-spin text-yellow-500" />
            )}

            <span className="hidden text-slate-400 sm:inline">
              API {backendStatus}
            </span>

            {backendStatus === 'offline' && (
              <button
                type="button"
                onClick={() => {
                  setBackendStatus('checking')
                  checkBackendHealth()
                    .then(() => setBackendStatus('online'))
                    .catch(() => setBackendStatus('offline'))
                }}
                className="text-violet-400 hover:text-violet-300"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </nav>

      <main>

        {/* Hero */}
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 text-center">

          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
            <Sparkles size={15} />
            Open-source repository intelligence
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Understand any
            <br />
            codebase<span className="text-violet-400">.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            Explore repository architecture, visualize dependencies,
            understand important files and find your way around
            unfamiliar codebases.
          </p>

          {/* Repository form */}
          <form
            onSubmit={handleAnalyze}
            className="mx-auto mt-12 max-w-2xl"
          >
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#111722] p-2 shadow-2xl shadow-violet-950/20 sm:flex-row">

              <div className="flex flex-1 items-center gap-3 px-3">
                <GitBranch
                  className="shrink-0 text-slate-400"
                  size={21}
                />

                <input
                  type="url"
                  value={repoUrl}
                  onChange={(event) => {
                    setRepoUrl(event.target.value)
                    setError('')
                  }}
                  placeholder="https://github.com/owner/repository"
                  className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || backendStatus !== 'online'}
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze repository
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left text-sm text-red-300">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            <p className="mt-4 text-xs text-slate-500">
              Free • No AI API key required • Public GitHub repositories
            </p>
          </form>

          {backendStatus === 'offline' && (
            <p className="mt-5 text-sm text-red-400">
              Backend unavailable. Start your FastAPI server.
            </p>
          )}
        </section>

        {/* Features */}
        <section
          id="features"
          className="mx-auto max-w-6xl px-6 py-16"
        >
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Repository intelligence
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Everything you need to understand a codebase
            </h2>

            <p className="mt-4 text-slate-400">
              From repository structure to developer onboarding.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<FolderTree size={25} />}
              title="Structure Explorer"
              description="Explore directories, files, configurations and programming languages."
            />

            <Feature
              icon={<Network size={25} />}
              title="Dependency Mapping"
              description="Visualize how source files connect through imports and dependencies."
            />

            <Feature
              icon={<BrainCircuit size={25} />}
              title="Code Intelligence"
              description="Understand important files and modules."
            />

            <Feature
              icon={<Route size={25} />}
              title="Learning Roadmap"
              description="Get a recommended reading order to understand unfamiliar projects."
            />

            <Feature
              icon={<Search size={25} />}
              title="Entry Point Detection"
              description="Find application entry points and important configuration files."
            />

            <Feature
              icon={<ShieldCheck size={25} />}
              title="Privacy First"
              description="Analyze public source code without executing repository code."
            />
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="border-t border-white/10 py-20"
        >
          <div className="mx-auto max-w-5xl px-6 text-center">

            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Simple workflow
            </p>

            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Three steps to understand any project
            </h2>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              <Step
                number="01"
                title="Paste repository URL"
                description="Enter any supported public GitHub repository."
              />

              <Step
                number="02"
                title="Analyze codebase"
                description="Our analysis engine examines repository structure."
              />

              <Step
                number="03"
                title="Explore architecture"
                description="Discover important files and project structure."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-6 text-sm text-slate-500 md:flex-row">

          <div className="flex items-center gap-2">
            <Network size={17} />
            <span>CodeAtlas — Understand any codebase.</span>
          </div>

          <span>Built for developers, by developers.</span>
        </div>
      </footer>
    </div>
  )
}

// Feature component
function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#101620] p-7 transition hover:border-violet-500/50">
      <div className="mb-5 text-violet-400">{icon}</div>

      <h3 className="mb-3 text-lg font-semibold">{title}</h3>

      <p className="text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  )
}

// Workflow step component
function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div>
      <div className="mb-4 text-3xl font-bold text-violet-400">
        {number}
      </div>

      <h3 className="mb-3 text-lg font-semibold">{title}</h3>

      <p className="text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  )
}

export default App
