
import type { ReactNode } from 'react'
import DependencyIntelligence from './DependencyIntelligence'
import RepositoryExplanation from './RepositoryExplanation'
import type { RepositoryAnalysis } from '../types/repository'

import {
  Star,
  GitFork,
  FileCode,
  Folder,
  ExternalLink,
  ArrowLeft,
  GitBranch,
  HardDrive,
  Activity,
  AlertTriangle,
  Network,
  Layers,
  CircleDot,
  FileWarning,
} from 'lucide-react'

import StatCard from './StatCard'
import LanguageChart from './LanguageChart'
import FileExplorer from './FileExplorer'

interface DashboardProps {
  analysis: RepositoryAnalysis
  onBack: () => void
}

interface ArchitectureData {
  score: number
  label: string
  score_explanation: string
  metrics: {
    total_files: number
    total_dependencies: number
    isolated_files: number
    circular_dependency_groups: number
    entry_point_candidates: number
    modules: number
    graph_density: number
  }
  entry_points: string[]
  isolated_file_paths: string[]
  highly_connected_files: {
    path: string
    dependencies: number
    dependents: number
    connections: number
  }[]
  largest_module: {
    name: string
    file_count: number
  } | null
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export default function Dashboard({
  analysis,
  onBack,
}: DashboardProps) {
  const {
    repository,
    languages,
    statistics,
    important_files,
    file_tree,
    dependencies,
    repository_explanation,
  } = analysis

  // Read architecture data returned by the backend.
  const architecture = dependencies
    ? (
        dependencies as typeof dependencies & {
          architecture?: ArchitectureData
        }
      ).architecture
    : undefined

  const score = architecture?.score ?? 0

  const scoreColor =
    score >= 80
      ? 'text-green-400'
      : score >= 60
        ? 'text-amber-400'
        : 'text-red-400'

  const scoreBarColor =
    score >= 80
      ? 'bg-green-500'
      : score >= 60
        ? 'bg-amber-500'
        : 'bg-red-500'

  return (
    <div className="min-h-screen bg-[#080b12] text-white">

      {/* Navigation */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft size={18} />
            New analysis
          </button>

          <div className="flex items-center gap-2 font-bold text-lg">
            <GitBranch size={21} />
            CodeAtlas
            <span className="text-violet-400">.</span>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Repository Overview */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

            <div>
              <div className="flex items-center gap-2 text-sm text-green-400 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Analysis completed
              </div>

              <h1 className="text-3xl md:text-4xl font-bold">
                {repository.name}
              </h1>

              <p className="text-slate-400 mt-2">
                {repository.full_name}
              </p>

              <p className="text-slate-400 mt-4 max-w-2xl leading-relaxed">
                {repository.description ||
                  'No repository description available.'}
              </p>
            </div>

            <a
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 px-5 py-3 rounded-xl font-semibold transition"
            >
              View on GitHub
              <ExternalLink size={17} />
            </a>

          </div>
        </section>

        {/* Repository Statistics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <StatCard
            title="Stars"
            value={formatNumber(repository.stars)}
            icon={<Star size={21} />}
            description="GitHub stars"
          />

          <StatCard
            title="Forks"
            value={formatNumber(repository.forks)}
            icon={<GitFork size={21} />}
            description="Repository forks"
          />

          <StatCard
            title="Files"
            value={statistics.total_files.toLocaleString()}
            icon={<FileCode size={21} />}
            description="Tracked source files"
          />

          <StatCard
            title="Directories"
            value={statistics.total_directories.toLocaleString()}
            icon={<Folder size={21} />}
            description="Repository folders"
          />

        </section>

        {/* Repository Analytics */}
        <section className="grid lg:grid-cols-2 gap-5 mb-8">

          <LanguageChart languages={languages} />

          <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">

            <h3 className="text-lg font-semibold mb-5">
              Repository details
            </h3>

            <div className="space-y-5">

              <Detail
                label="Default branch"
                value={repository.default_branch}
              />

              <Detail
                label="Repository size"
                value={`${(repository.size_kb / 1024).toFixed(2)} MB`}
                icon={<HardDrive size={16} />}
              />

              <Detail
                label="Languages detected"
                value={String(Object.keys(languages).length)}
              />

              <Detail
                label="Total entries"
                value={file_tree.length.toLocaleString()}
              />

              <Detail
                label="Tree status"
                value={
                  statistics.tree_truncated
                    ? 'Truncated'
                    : 'Complete'
                }
              />

            </div>

            {statistics.tree_truncated && (
              <p className="text-amber-400 text-xs mt-5">
                GitHub truncated this repository tree.
                Some entries may be missing.
              </p>
            )}

          </div>
        </section>

        {/* Important Files */}
        <section className="bg-[#111722] border border-white/10 rounded-2xl p-6 mb-8">

          <h3 className="text-lg font-semibold mb-5">
            Important project files
          </h3>

          {important_files.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {important_files.map((file) => (
                <span
                  key={file}
                  className="text-sm text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-2 rounded-lg"
                >
                  {file}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              No recognized configuration files detected.
            </p>
          )}

        </section>

        {/* Repository Explanation */}
        {repository_explanation && (
          <section className="mb-8">
            <RepositoryExplanation
              explanation={repository_explanation}
            />
          </section>
        )}

        {/* Architecture Insights */}
        {architecture && (
          <section className="bg-[#111722] border border-white/10 rounded-2xl p-6 mb-8">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">

              <div>
                <div className="flex items-center gap-2">
                  <Activity className="text-violet-400" size={21} />
                  <h2 className="text-xl font-bold">
                    Architecture Insights
                  </h2>
                </div>

                <p className="text-sm text-slate-400 mt-2">
                  Static analysis of repository structure and dependencies.
                </p>
              </div>

              <span className="text-xs px-3 py-2 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Architecture analysis
              </span>

            </div>

            {/* Architecture Score */}
            <div className="grid md:grid-cols-3 gap-5 mb-6">

              <div className="md:col-span-1 bg-[#080b12] border border-white/10 rounded-xl p-5">

                <p className="text-sm text-slate-400 mb-3">
                  Structural health score
                </p>

                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${scoreColor}`}>
                    {score}
                  </span>

                  <span className="text-slate-500">
                    / 100
                  </span>
                </div>

                <p className={`text-sm font-semibold mt-3 ${scoreColor}`}>
                  {architecture.label}
                </p>

                <div className="w-full h-2 bg-slate-800 rounded-full mt-4 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${scoreBarColor}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, score))}%`,
                    }}
                  />
                </div>

                <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                  {architecture.score_explanation}
                </p>

              </div>

              {/* Structural Metrics */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3">

                <MetricCard
                  icon={<FileCode size={19} />}
                  label="Analyzed files"
                  value={architecture.metrics.total_files}
                />

                <MetricCard
                  icon={<Network size={19} />}
                  label="Dependencies"
                  value={architecture.metrics.total_dependencies}
                />

                <MetricCard
                  icon={<Layers size={19} />}
                  label="Modules"
                  value={architecture.metrics.modules}
                />

                <MetricCard
                  icon={<CircleDot size={19} />}
                  label="Entry-point candidates"
                  value={architecture.metrics.entry_point_candidates}
                />

                <MetricCard
                  icon={<AlertTriangle size={19} />}
                  label="Circular dependency groups"
                  value={architecture.metrics.circular_dependency_groups}
                  warning={architecture.metrics.circular_dependency_groups > 0}
                />

                <MetricCard
                  icon={<FileWarning size={19} />}
                  label="Isolated files"
                  value={architecture.metrics.isolated_files}
                  warning={architecture.metrics.isolated_files > 0}
                />

              </div>

            </div>

            {/* Highly Connected Files */}
            <div className="bg-[#080b12] border border-white/10 rounded-xl p-5 mb-5">

              <div className="flex items-center gap-2 mb-5">
                <Network className="text-violet-400" size={19} />
                <h3 className="font-semibold">
                  Highly connected files
                </h3>
              </div>

              {architecture.highly_connected_files.length > 0 ? (
                <div className="space-y-4">

                  {architecture.highly_connected_files.slice(0, 5).map((file) => (
                    <div key={file.path}>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">

                        <span
                          className="text-sm text-slate-200 truncate"
                          title={file.path}
                        >
                          {file.path}
                        </span>

                        <span className="text-xs text-slate-400 shrink-0">
                          {file.connections} connections
                        </span>

                      </div>

                      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-800">
                        <div
                          className="bg-violet-500"
                          style={{
                            width: `${Math.max(
                              2,
                              (file.dependencies /
                                Math.max(1, file.connections)) * 100
                            )}%`,
                          }}
                        />

                        <div
                          className="bg-cyan-500"
                          style={{
                            width: `${Math.max(
                              2,
                              (file.dependents /
                                Math.max(1, file.connections)) * 100
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>
                          <span className="text-violet-400">●</span>
                          {' '}Dependencies: {file.dependencies}
                        </span>

                        <span>
                          <span className="text-cyan-400">●</span>
                          {' '}Dependents: {file.dependents}
                        </span>
                      </div>

                    </div>
                  ))}

                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No connected files detected.
                </p>
              )}

            </div>

            {/* Warnings and Entry Points */}
            <div className="grid md:grid-cols-2 gap-5">

              <div className="bg-[#080b12] border border-white/10 rounded-xl p-5">

                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle
                    size={19}
                    className={
                      architecture.metrics.circular_dependency_groups > 0
                        ? 'text-amber-400'
                        : 'text-green-400'
                    }
                  />

                  <h3 className="font-semibold">
                    Structural warnings
                  </h3>
                </div>

                {architecture.metrics.circular_dependency_groups > 0 ? (
                  <div className="text-sm text-amber-300">
                    {architecture.metrics.circular_dependency_groups}
                    {' '}circular dependency group(s) detected.

                    <p className="text-xs text-slate-400 mt-2">
                      Review the dependency graph to inspect strongly connected files.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-green-400">
                    No circular dependency groups detected.
                  </p>
                )}

                {architecture.metrics.isolated_files > 0 && (
                  <p className="text-xs text-slate-400 mt-4">
                    {architecture.metrics.isolated_files} isolated files
                    have no detected incoming or outgoing dependencies.
                  </p>
                )}

              </div>

              <div className="bg-[#080b12] border border-white/10 rounded-xl p-5">

                <div className="flex items-center gap-2 mb-4">
                  <CircleDot className="text-violet-400" size={19} />
                  <h3 className="font-semibold">
                    Entry-point candidates
                  </h3>
                </div>

                <div className="space-y-2 max-h-44 overflow-y-auto">

                  {architecture.entry_points.length > 0 ? (
                    architecture.entry_points.map((path) => (
                      <div
                        key={path}
                        className="text-xs text-slate-300 bg-white/5 rounded-lg px-3 py-2 break-all"
                      >
                        {path}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">
                      No entry-point candidates detected.
                    </p>
                  )}

                </div>

                <p className="text-xs text-slate-500 mt-3">
                  These are heuristic candidates, not confirmed runtime entry points.
                </p>

              </div>

            </div>

            {/* Largest Module */}
            {architecture.largest_module && (
              <div className="mt-5 bg-violet-500/5 border border-violet-500/20 rounded-xl p-5">

                <div className="flex items-center gap-2 text-violet-300 mb-2">
                  <Layers size={19} />
                  <h3 className="font-semibold">
                    Largest detected module
                  </h3>
                </div>

                <p className="text-lg font-bold">
                  {architecture.largest_module.name}
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  {architecture.largest_module.file_count} analyzed files
                </p>

              </div>
            )}

            <p className="text-xs text-slate-500 mt-5 leading-relaxed">
              Architecture indicators are based on statically detected imports
              from the analyzed source files. Missing or unresolved imports can
              affect these results. The score is a heuristic, not a formal
              measure of software quality.
            </p>

          </section>
        )}

        {/* Dependency Intelligence */}
        <section className="mb-8">
          {dependencies ? (
            <DependencyIntelligence
              dependencies={dependencies}
            />
          ) : (
            <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold">
                Dependency Intelligence
              </h3>

              <p className="text-sm text-slate-400 mt-2">
                Dependency analysis is unavailable.
                Analyze the repository again to generate its dependency graph.
              </p>
            </div>
          )}
        </section>

        {/* File Explorer */}
        <FileExplorer files={file_tree} />

        {/* Footer */}
        <footer className="text-center text-xs text-slate-500 py-10">
          CodeAtlas — Repository intelligence powered by GitHub API.
        </footer>

      </main>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  warning = false,
}: {
  icon: ReactNode
  label: string
  value: number
  warning?: boolean
}) {
  return (
    <div className="bg-[#080b12] border border-white/10 rounded-xl p-4">

      <div className={`mb-3 ${warning ? 'text-amber-400' : 'text-violet-400'}`}>
        {icon}
      </div>

      <p className="text-2xl font-bold">
        {value.toLocaleString()}
      </p>

      <p className="text-xs text-slate-400 mt-1">
        {label}
      </p>

    </div>
  )
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 last:border-0 last:pb-0">

      <span className="text-sm text-slate-400">
        {label}
      </span>

      <span className="text-sm text-white font-medium flex items-center gap-2">
        {icon}
        {value}
      </span>

    </div>
  )
}
