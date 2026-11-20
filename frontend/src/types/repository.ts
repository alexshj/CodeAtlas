
// ======================================================
// CODEATLAS - SHARED REPOSITORY TYPES
// ======================================================

// ------------------------------------------------------
// REPOSITORY INFORMATION
// ------------------------------------------------------

export interface Repository {
  name: string
  full_name: string
  description: string | null
  url: string
  stars: number
  forks: number
  default_branch: string
  size_kb: number
}

// ------------------------------------------------------
// FILE INFORMATION
// ------------------------------------------------------

export interface FileItem {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

// ------------------------------------------------------
// REPOSITORY STATISTICS
// ------------------------------------------------------

export interface RepositoryStatistics {
  total_files: number
  total_directories: number
  tree_truncated?: boolean
}

// ------------------------------------------------------
// DEPENDENCY SUMMARY
// ------------------------------------------------------

export interface DependencySummary {
  analyzed_files: number
  dependency_count: number
  entry_point_count: number
  circular_dependency_groups: number
  module_count: number
}

// ------------------------------------------------------
// DEPENDENCY GRAPH NODE
// ------------------------------------------------------

export interface DependencyNode {
  id: string
  label: string
  extension: string
  is_entry_point: boolean
  dependency_count: number
  dependent_count: number
}

// ------------------------------------------------------
// DEPENDENCY GRAPH EDGE
// ------------------------------------------------------

export interface DependencyEdge {
  source: string
  target: string
}

// ------------------------------------------------------
// DEPENDENCY MODULE
// ------------------------------------------------------

export interface DependencyModule {
  name: string
  files: string[]
  file_count: number
}

// ------------------------------------------------------
// HIGHLY CONNECTED FILE
// ------------------------------------------------------

export interface HighlyConnectedFile {
  path: string
  dependencies: number
  dependents: number
  connections: number
}

// ------------------------------------------------------
// ARCHITECTURE METRICS
// ------------------------------------------------------

export interface ArchitectureMetrics {
  total_files: number
  total_dependencies: number
  isolated_files: number
  circular_dependency_groups: number
  entry_point_candidates: number
  modules: number
  graph_density: number
}

// ------------------------------------------------------
// ARCHITECTURE DATA
// ------------------------------------------------------

export interface ArchitectureData {
  score: number
  label: string
  score_explanation: string
  metrics: ArchitectureMetrics
  entry_points: string[]
  isolated_file_paths: string[]
  highly_connected_files: HighlyConnectedFile[]

  largest_module: {
    name: string
    file_count: number
  } | null
}

// ------------------------------------------------------
// ADAPTIVE ANALYSIS INFORMATION
// ------------------------------------------------------

export interface DependencyAnalysisInfo {
  strategy: 'full' | 'adaptive' | string
  source_files_discovered: number
  source_files_selected: number
  source_files_fetched: number
  source_files_analyzed: number
  source_files_failed: number
  source_files_skipped: number
  max_source_files: number
  max_file_size_bytes: number
  coverage_percentage: number
  supported_languages: string[]
}

// ------------------------------------------------------
// COMPLETE DEPENDENCY ANALYSIS
// ------------------------------------------------------

export interface DependencyAnalysis {
  summary: DependencySummary
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  entry_points: string[]
  cycles: string[][]
  modules: DependencyModule[]
  architecture?: ArchitectureData
  analysis_info?: DependencyAnalysisInfo
}

// ======================================================
// REPOSITORY EXPLANATION TYPES
// ======================================================

// ------------------------------------------------------
// REPOSITORY OVERVIEW
// ------------------------------------------------------

export interface RepositoryOverview {
  name: string
  full_name: string
  purpose: string
  purpose_source: string
  primary_language: string
  language_count: number
  manifest_count: number
  readme_available: boolean
}

// ------------------------------------------------------
// TECHNOLOGY INFORMATION
// ------------------------------------------------------

export interface Technology {
  name: string
  category: string
  description: string
  bytes?: number
}

// ------------------------------------------------------
// MODULE EXPLANATION
// ------------------------------------------------------

export interface ModuleExplanation {
  name: string
  description: string
  file_count: number
  files: string[]
}

// ------------------------------------------------------
// IMPORTANT FILE EXPLANATION
// ------------------------------------------------------

export interface ImportantFileExplanation {
  path: string
  description: string
}

// ------------------------------------------------------
// READING ORDER
// ------------------------------------------------------

export interface ReadingOrderItem {
  path: string
  reason: string
}

// ------------------------------------------------------
// EXECUTION FLOW
// ------------------------------------------------------

export interface ExecutionFlowStep {
  file: string
  description: string
  detected_dependencies: string[]
}

export interface ExecutionFlow {
  description: string
  steps: ExecutionFlowStep[]
  relationship_count: number
}

// ------------------------------------------------------
// EXPLANATION EVIDENCE
// ------------------------------------------------------

export interface ExplanationEvidence {
  readme_available: boolean
  manifest_files_available: string[]
  dependency_files_analyzed: number
  detected_dependency_relationships: number
  analysis_method: string
}

// ------------------------------------------------------
// COMPLETE REPOSITORY EXPLANATION
// ------------------------------------------------------

export interface RepositoryExplanation {
  overview: RepositoryOverview
  technology_stack: Technology[]
  modules: ModuleExplanation[]
  important_files: ImportantFileExplanation[]
  reading_order: ReadingOrderItem[]
  execution_flow: ExecutionFlow
  evidence: ExplanationEvidence
  limitations: string[]
}

// ======================================================
// COMPLETE REPOSITORY ANALYSIS RESPONSE
// ======================================================

export interface RepositoryAnalysis {
  repository: Repository
  languages: Record<string, number>
  statistics: RepositoryStatistics
  important_files: string[]
  file_tree: FileItem[]
  dependencies: DependencyAnalysis
  repository_explanation?: RepositoryExplanation | null
}

// ======================================================
// API RESPONSE
// ======================================================

export interface AnalyzeResponse {
  success?: boolean
  message?: string
  data?: RepositoryAnalysis

  // Supports APIs that return the analysis directly.
  repository?: Repository
  languages?: Record<string, number>
  statistics?: RepositoryStatistics
  important_files?: string[]
  file_tree?: FileItem[]
  dependencies?: DependencyAnalysis
  repository_explanation?: RepositoryExplanation | null
}
