
import {
  BookOpen,
  Layers,
  Code2,
  FileText,
  Route,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Package,
  Info,
} from 'lucide-react'

import type { RepositoryExplanation as ExplanationData } from '../types/repository'

interface Props {
  explanation?: ExplanationData | null
}

export default function RepositoryExplanation({
  explanation,
}: Props) {
  if (!explanation) {
    return (
      <section className="mb-8 rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="flex items-center gap-3">
          <BookOpen className="text-violet-400" size={23} />
          <h2 className="text-xl font-bold">
            Repository Explanation
          </h2>
        </div>

        <p className="mt-3 text-sm text-slate-400">
          Repository explanation is unavailable. Analyze the repository
          again to generate its developer guide.
        </p>
      </section>
    )
  }

  const {
    overview,
    technology_stack,
    modules,
    important_files,
    reading_order,
    execution_flow,
    evidence,
    limitations,
  } = explanation

  const groupedTechnologies = technology_stack.reduce<
    Record<string, typeof technology_stack>
  >((groups, technology) => {
    const category = technology.category || 'Other'

    if (!groups[category]) {
      groups[category] = []
    }

    groups[category].push(technology)
    return groups
  }, {})

  return (
    <section className="mb-8 space-y-6">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen size={23} className="text-violet-400" />

            <h2 className="text-2xl font-bold">
              Repository Explanation
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Understand the project structure, technologies and
            suggested reading path.
          </p>
        </div>

        <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-300">
          Static analysis
        </span>
      </div>

      {/* PROJECT OVERVIEW */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Info size={20} className="text-violet-400" />

          <h3 className="text-lg font-semibold">
            Project Overview
          </h3>
        </div>

        <h4 className="text-xl font-bold">
          {overview.name}
        </h4>

        <p className="mt-1 text-xs text-slate-500">
          {overview.full_name}
        </p>

        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
          {overview.purpose}
        </p>

        <p className="mt-3 text-xs text-slate-500">
          Source: {overview.purpose_source}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <OverviewMetric
            label="Primary language"
            value={overview.primary_language}
          />

          <OverviewMetric
            label="Languages"
            value={String(overview.language_count)}
          />

          <OverviewMetric
            label="Manifests"
            value={String(overview.manifest_count)}
          />

          <OverviewMetric
            label="README"
            value={overview.readme_available ? 'Available' : 'Missing'}
          />
        </div>
      </div>

      {/* TECHNOLOGY STACK */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Code2 size={20} className="text-violet-400" />

          <h3 className="text-lg font-semibold">
            Technology Stack
          </h3>
        </div>

        {technology_stack.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedTechnologies).map(
              ([category, technologies]) => (
                <div key={category}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {category}
                  </p>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {technologies.map((technology, index) => (
                      <div
                        key={`${technology.name}-${index}`}
                        className="rounded-xl border border-white/10 bg-[#080b12] p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Package
                            size={16}
                            className="shrink-0 text-violet-400"
                          />

                          <h4 className="break-all text-sm font-semibold text-white">
                            {technology.name}
                          </h4>
                        </div>

                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          {technology.description}
                        </p>

                        {typeof technology.bytes === 'number' && (
                          <p className="mt-2 text-[10px] text-slate-500">
                            {formatBytes(technology.bytes)} detected
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <EmptyMessage message="No technology information was detected." />
        )}
      </div>

      {/* MODULE EXPLANATIONS */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="mb-5 flex items-center gap-2">
          <Layers size={20} className="text-violet-400" />

          <h3 className="text-lg font-semibold">
            Module Explorer
          </h3>
        </div>

        {modules.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((module) => (
              <div
                key={module.name}
                className="rounded-xl border border-white/10 bg-[#080b12] p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-semibold text-white">
                    {module.name}
                  </h4>

                  <span className="shrink-0 rounded-md bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
                    {module.file_count} files
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {module.description}
                </p>

                {module.files.length > 0 && (
                  <div className="mt-4 border-t border-white/5 pt-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Sample files
                    </p>

                    <div className="space-y-2">
                      {module.files.slice(0, 5).map((file) => (
                        <p
                          key={file}
                          className="break-all font-mono text-xs text-slate-400"
                        >
                          {file}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage message="No modules were detected." />
        )}
      </div>

      {/* IMPORTANT FILES */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="mb-5 flex items-center gap-2">
          <FileText size={20} className="text-violet-400" />

          <h3 className="text-lg font-semibold">
            Important Files
          </h3>
        </div>

        {important_files.length > 0 ? (
          <div className="space-y-3">
            {important_files.map((file) => (
              <div
                key={file.path}
                className="rounded-xl border border-white/10 bg-[#080b12] p-4"
              >
                <p className="break-all font-mono text-sm font-semibold text-violet-300">
                  {file.path}
                </p>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {file.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage message="No recognized important files were found." />
        )}
      </div>

      {/* DEVELOPER READING ROADMAP */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="mb-5 flex items-center gap-2">
          <GraduationCap size={21} className="text-violet-400" />

          <h3 className="text-lg font-semibold">
            Developer Reading Roadmap
          </h3>
        </div>

        <p className="mb-5 text-sm text-slate-400">
          A suggested order for exploring this repository.
        </p>

        {reading_order.length > 0 ? (
          <div className="space-y-0">
            {reading_order.map((item, index) => (
              <div
                key={`${item.path}-${index}`}
                className="relative flex gap-4 pb-5 last:pb-0"
              >
                <div className="relative flex flex-col items-center">
                  <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-xs font-bold text-violet-300">
                    {index + 1}
                  </span>

                  {index !== reading_order.length - 1 && (
                    <span className="absolute top-8 h-full w-px bg-white/10" />
                  )}
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#080b12] p-4">
                  <p className="break-all font-mono text-sm text-white">
                    {item.path}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {item.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage message="No reading order could be generated." />
        )}
      </div>

      {/* EXECUTION FLOW */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Route size={20} className="text-violet-400" />

          <h3 className="text-lg font-semibold">
            Likely Application Starting Points
          </h3>
        </div>

        <p className="mb-5 text-sm leading-6 text-slate-400">
          {execution_flow.description}
        </p>

        {execution_flow.steps.length > 0 ? (
          <div className="space-y-3">
            {execution_flow.steps.map((step, index) => (
              <div
                key={`${step.file}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#080b12] p-4"
              >
                <ChevronRight
                  size={18}
                  className="mt-0.5 shrink-0 text-violet-400"
                />

                <div className="min-w-0">
                  <p className="break-all font-mono text-sm text-white">
                    {step.file}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyMessage message="No likely starting points were detected." />
        )}

        <p className="mt-4 text-xs text-slate-500">
          {execution_flow.relationship_count} static dependency relationships detected.
        </p>
      </div>

      {/* EVIDENCE AND LIMITATIONS */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 size={19} className="text-emerald-400" />

            <h3 className="font-semibold">
              Analysis Evidence
            </h3>
          </div>

          <div className="space-y-3 text-sm">
            <EvidenceRow
              label="README available"
              value={evidence.readme_available ? 'Yes' : 'No'}
            />

            <EvidenceRow
              label="Manifest files"
              value={String(evidence.manifest_files_available.length)}
            />

            <EvidenceRow
              label="Source files analyzed"
              value={String(evidence.dependency_files_analyzed)}
            />

            <EvidenceRow
              label="Detected relationships"
              value={String(evidence.detected_dependency_relationships)}
            />
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Method: {evidence.analysis_method}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-[#111722] p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle size={19} className="text-amber-400" />

            <h3 className="font-semibold">
              Analysis Limitations
            </h3>
          </div>

          <ul className="space-y-3">
            {limitations.map((limitation, index) => (
              <li
                key={index}
                className="flex gap-2 text-xs leading-5 text-slate-400"
              >
                <span className="text-amber-400">•</span>
                {limitation}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function OverviewMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#080b12] p-4">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-white">
        {value}
      </p>
    </div>
  )
}

function EvidenceRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
      <span className="text-slate-400">
        {label}
      </span>

      <span className="font-semibold text-white">
        {value}
      </span>
    </div>
  )
}

function EmptyMessage({
  message,
}: {
  message: string
}) {
  return (
    <p className="rounded-lg border border-white/5 bg-[#080b12] p-4 text-sm text-slate-500">
      {message}
    </p>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
