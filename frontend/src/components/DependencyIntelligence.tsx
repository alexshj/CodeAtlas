
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Handle,
  Position,
  type Node,
  type NodeProps,
  type Edge,
} from '@xyflow/react'

import '@xyflow/react/dist/style.css'

import {
  Network,
  Search,
  Layers,
  AlertTriangle,
  FileCode2,
  ArrowDownRight,
  ArrowUpRight,
  GitBranch,
  CircleDot,
  X,
  ZoomIn,
  Activity,
} from 'lucide-react'

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type DependencyNodeData = {
  id: string
  label: string
  extension: string
  is_entry_point: boolean
  dependency_count: number
  dependent_count: number
}

type DependencyEdge = {
  source: string
  target: string
}

type DependencyModule = {
  name: string
  files: string[]
  file_count: number
}

type HighlyConnectedFile = {
  path: string
  dependencies: number
  dependents: number
  connections: number
}

type ArchitectureData = {
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
  highly_connected_files: HighlyConnectedFile[]
  largest_module: {
    name: string
    file_count: number
  } | null
}

export interface DependencyAnalysis {
  summary: {
    analyzed_files: number
    dependency_count: number
    entry_point_count: number
    circular_dependency_groups: number
    module_count: number
  }

  nodes: DependencyNodeData[]
  edges: DependencyEdge[]
  entry_points: string[]
  cycles: string[][]
  modules: DependencyModule[]
  architecture?: ArchitectureData

  analysis_info?: {
    strategy: string
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
}

interface Props {
  dependencies?: DependencyAnalysis | null
}

type FileNodeData = {
  label: string
  extension: string
  isEntryPoint: boolean
  isHighlyConnected: boolean
  isInCycle: boolean
  dependencyCount: number
  dependentCount: number
}

type FileFlowNode = Node<FileNodeData, 'file'>

// --------------------------------------------------
// STABLE EMPTY ARRAYS
// --------------------------------------------------

const EMPTY_NODES: DependencyNodeData[] = []
const EMPTY_EDGES: DependencyEdge[] = []
const EMPTY_MODULES: DependencyModule[] = []
const EMPTY_CYCLES: string[][] = []

// --------------------------------------------------
// NODE COLORS
// --------------------------------------------------

function getNodeColor(data: FileNodeData): string {
  if (data.isInCycle) return '#ef4444'
  if (data.isEntryPoint) return '#10b981'
  if (data.isHighlyConnected) return '#f59e0b'
  return '#8b5cf6'
}

// --------------------------------------------------
// CUSTOM GRAPH NODE
// --------------------------------------------------

function FileNode({ data, selected }: NodeProps<FileFlowNode>) {
  const color = getNodeColor(data)

  const borderClass = data.isInCycle
    ? 'border-red-500/70 bg-[#30191f]'
    : data.isEntryPoint
      ? 'border-emerald-500/60 bg-[#12231f]'
      : data.isHighlyConnected
        ? 'border-amber-500/60 bg-[#292316]'
        : 'border-violet-500/40 bg-[#151c29]'

  const badge = data.isInCycle
    ? 'CIRCULAR'
    : data.isEntryPoint
      ? 'ENTRY POINT'
      : data.isHighlyConnected
        ? 'HIGH CONNECTIVITY'
        : null

  return (
    <div
      className={`relative min-w-[205px] rounded-xl border p-3 shadow-xl ${
        selected ? 'border-white bg-[#27213b]' : borderClass
      }`}
      style={{
        boxShadow: selected
          ? `0 0 0 2px ${color}55, 0 8px 25px #00000055`
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-slate-300 !bg-[#0b1019]"
      />

      <div className="flex items-center gap-2">
        <FileCode2 size={17} className="shrink-0" style={{ color }} />

        <span
          className="max-w-[160px] truncate text-xs font-semibold text-slate-100"
          title={data.label}
        >
          {data.label}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400">
          {data.extension || 'File'}
        </span>

        {badge && (
          <span className="text-[9px] font-bold" style={{ color }}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-2 flex gap-3 text-[10px] text-slate-400">
        <span>Imports: {data.dependencyCount}</span>
        <span>Used by: {data.dependentCount}</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-slate-300 !bg-[#0b1019]"
      />
    </div>
  )
}

const nodeTypes = {
  file: FileNode,
}

// --------------------------------------------------
// GRAPH LAYOUT
// --------------------------------------------------

function calculateGraphLayout(
  nodes: DependencyNodeData[],
  edges: DependencyEdge[],
): Map<string, { x: number; y: number }> {
  const adjacency = new Map<string, Set<string>>()
  const reverse = new Map<string, Set<string>>()

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set())
    reverse.set(node.id, new Set())
  })

  edges.forEach((edge) => {
    if (!adjacency.has(edge.source) || !adjacency.has(edge.target)) {
      return
    }

    adjacency.get(edge.source)!.add(edge.target)
    reverse.get(edge.target)!.add(edge.source)
  })

  const undirected = new Map<string, Set<string>>()

  nodes.forEach((node) => {
    undirected.set(node.id, new Set())
  })

  edges.forEach(({ source, target }) => {
    undirected.get(source)?.add(target)
    undirected.get(target)?.add(source)
  })

  const visited = new Set<string>()
  const components: string[][] = []

  const orderedNodes = [...nodes].sort((a, b) => {
    const degreeA =
      adjacency.get(a.id)!.size + reverse.get(a.id)!.size
    const degreeB =
      adjacency.get(b.id)!.size + reverse.get(b.id)!.size

    return degreeB - degreeA
  })

  for (const node of orderedNodes) {
    if (visited.has(node.id)) continue

    const component: string[] = []
    const queue = [node.id]
    visited.add(node.id)

    while (queue.length) {
      const current = queue.shift()!
      component.push(current)

      for (const neighbor of undirected.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          queue.push(neighbor)
        }
      }
    }

    components.push(component)
  }

  components.sort((a, b) => b.length - a.length)

  const positions = new Map<string, { x: number; y: number }>()
  const nodeWidth = 250
  const nodeHeight = 155
  const componentGap = 260

  let componentY = 0

  for (const component of components) {
    const componentSet = new Set(component)
    const indegree = new Map<string, number>()
    const levels = new Map<string, number>()

    component.forEach((id) => {
      indegree.set(
        id,
        [...(reverse.get(id) ?? [])].filter(
          (parent) => componentSet.has(parent)
        ).length
      )
    })

    const queue = component.filter(
      (id) => indegree.get(id) === 0
    )

    queue.forEach((id) => levels.set(id, 0))

    let index = 0

    while (index < queue.length) {
      const current = queue[index++]
      const currentLevel = levels.get(current) ?? 0

      for (const target of adjacency.get(current) ?? []) {
        if (!componentSet.has(target)) continue

        const nextDegree = (indegree.get(target) ?? 0) - 1
        indegree.set(target, nextDegree)

        levels.set(
          target,
          Math.max(
            levels.get(target) ?? 0,
            currentLevel + 1
          )
        )

        if (nextDegree === 0) {
          queue.push(target)
        }
      }
    }

    // Assign nodes remaining in cycles.
    const fallbackLevel = Math.max(0, ...levels.values()) + 1

    component.forEach((id) => {
      if (!levels.has(id)) {
        levels.set(id, fallbackLevel)
      }
    })

    const groups = new Map<number, string[]>()

    component.forEach((id) => {
      const level = levels.get(id) ?? 0

      if (!groups.has(level)) groups.set(level, [])
      groups.get(level)!.push(id)
    })

    const sortedLevels = [...groups.keys()].sort((a, b) => a - b)

    const maxLayerHeight = Math.max(
      ...[...groups.values()].map((items) => items.length * nodeHeight)
    )

    sortedLevels.forEach((level) => {
      const ids = groups.get(level)!

      ids.sort((a, b) => {
        const degreeA =
          adjacency.get(a)!.size + reverse.get(a)!.size
        const degreeB =
          adjacency.get(b)!.size + reverse.get(b)!.size

        return degreeB - degreeA
      })

      const layerHeight = ids.length * nodeHeight
      const startY = componentY + (maxLayerHeight - layerHeight) / 2

      ids.forEach((id, position) => {
        positions.set(id, {
          x: level * nodeWidth,
          y: startY + position * nodeHeight,
        })
      })
    })

    componentY += maxLayerHeight + componentGap
  }

  return positions
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function DependencyIntelligence({
  dependencies,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedModule, setSelectedModule] = useState('all')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const nodes = dependencies?.nodes ?? EMPTY_NODES
  const edges = dependencies?.edges ?? EMPTY_EDGES
  const modules = dependencies?.modules ?? EMPTY_MODULES
  const cycles = dependencies?.cycles ?? EMPTY_CYCLES
  const summary = dependencies?.summary

  const cyclePaths = useMemo(
    () => new Set(cycles.flat()),
    [cycles]
  )

  const highlyConnectedPaths = useMemo(
    () =>
      new Set(
        (dependencies?.architecture?.highly_connected_files ?? [])
          .map((file) => file.path)
      ),
    [dependencies]
  )

  const visibleNodes = useMemo(() => {
    const selectedModuleData = modules.find(
      (module) => module.name === selectedModule
    )

    return nodes.filter((node) => {
      const term = search.toLowerCase()

      const matchesSearch =
        node.id.toLowerCase().includes(term) ||
        node.label.toLowerCase().includes(term)

      const matchesModule =
        selectedModule === 'all' ||
        Boolean(selectedModuleData?.files.includes(node.id))

      return matchesSearch && matchesModule
    })
  }, [nodes, modules, search, selectedModule])

  const visiblePaths = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  )

  const visibleEdges = useMemo(
    () =>
      edges.filter(
        (edge) =>
          visiblePaths.has(edge.source) &&
          visiblePaths.has(edge.target)
      ),
    [edges, visiblePaths]
  )

  const relatedPaths = useMemo(() => {
    const related = new Set<string>()

    if (!selectedPath) return related

    related.add(selectedPath)

    edges.forEach((edge) => {
      if (edge.source === selectedPath) related.add(edge.target)
      if (edge.target === selectedPath) related.add(edge.source)
    })

    return related
  }, [edges, selectedPath])

  const graphNodes = useMemo<FileFlowNode[]>(() => {
    const positions = calculateGraphLayout(
      visibleNodes,
      visibleEdges
    )

    return visibleNodes.map((node) => ({
      id: node.id,
      type: 'file',
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      selected: selectedPath === node.id,

      style: {
        opacity:
          selectedPath && !relatedPaths.has(node.id)
            ? 0.2
            : 1,
      },

      data: {
        label: node.label,
        extension: node.extension,
        isEntryPoint: node.is_entry_point,
        isHighlyConnected: highlyConnectedPaths.has(node.id),
        isInCycle: cyclePaths.has(node.id),
        dependencyCount: node.dependency_count,
        dependentCount: node.dependent_count,
      },
    }))
  }, [
    visibleNodes,
    visibleEdges,
    selectedPath,
    relatedPaths,
    cyclePaths,
    highlyConnectedPaths,
  ])

  const graphEdges = useMemo<Edge[]>(() => {
    return visibleEdges.map((edge, index) => {
      const highlighted =
        selectedPath !== null &&
        (
          edge.source === selectedPath ||
          edge.target === selectedPath
        )

      const circular =
        cyclePaths.has(edge.source) &&
        cyclePaths.has(edge.target)

      const color = circular
        ? '#ef4444'
        : highlighted
          ? '#c084fc'
          : '#8b5cf6'

      return {
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: highlighted || circular,

        style: {
          stroke: color,
          strokeWidth: highlighted || circular ? 2.5 : 1.5,
          opacity: selectedPath
            ? highlighted ? 1 : 0.12
            : 0.65,
        },

        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 18,
          height: 18,
        },
      }
    })
  }, [visibleEdges, selectedPath, cyclePaths])

  const selectedNode = nodes.find(
    (node) => node.id === selectedPath
  )

  const imports = selectedPath
    ? edges
        .filter((edge) => edge.source === selectedPath)
        .map((edge) => edge.target)
    : []

  const dependents = selectedPath
    ? edges
        .filter((edge) => edge.target === selectedPath)
        .map((edge) => edge.source)
    : []

  if (!dependencies) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-8 text-center">
        <Network className="mx-auto mb-3 text-violet-400" size={35} />
        <h2 className="text-lg font-semibold text-white">
          Dependency Intelligence
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          No dependency analysis data is available.
        </p>
      </div>
    )
  }

  const coverage = dependencies.analysis_info

  return (
    <section className="space-y-6 text-slate-100">

      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="text-violet-400" size={23} />
            <h2 className="text-2xl font-bold">
              Dependency Intelligence
            </h2>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Explore imports, relationships and architectural connections.
          </p>
        </div>

        <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          Analysis complete
        </span>
      </div>

      {/* STATISTICS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Analyzed files"
          value={summary?.analyzed_files ?? nodes.length}
          icon={<FileCode2 size={20} />}
        />

        <Metric
          label="Dependencies"
          value={summary?.dependency_count ?? edges.length}
          icon={<GitBranch size={20} />}
        />

        <Metric
          label="Entry points"
          value={summary?.entry_point_count ?? 0}
          icon={<CircleDot size={20} />}
        />

        <Metric
          label="Circular groups"
          value={summary?.circular_dependency_groups ?? 0}
          icon={<AlertTriangle size={20} />}
          warning={(summary?.circular_dependency_groups ?? 0) > 0}
        />
      </div>

      {/* GRAPH */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111722]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
          <div>
            <h3 className="font-semibold">
              Interactive Architecture Graph
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              {visibleNodes.length} files · {visibleEdges.length} connections
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setSelectedPath(null)
                }}
                placeholder="Search files..."
                className="w-44 rounded-lg border border-white/10 bg-[#080b12] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-violet-500"
              />
            </div>

            <select
              value={selectedModule}
              onChange={(event) => {
                setSelectedModule(event.target.value)
                setSelectedPath(null)
              }}
              className="rounded-lg border border-white/10 bg-[#080b12] px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="all">All modules</option>

              {modules.map((module) => (
                <option key={module.name} value={module.name}>
                  {module.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedModule('all')
                setSelectedPath(null)
              }}
              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-violet-500"
            >
              <X size={14} />
              Reset
            </button>
          </div>
        </div>

        <div className="h-[760px] w-full bg-[#0b1019]">
          {visibleNodes.length > 0 ? (
            <ReactFlow
              nodes={graphNodes}
              edges={graphEdges}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedPath(node.id)}
              onPaneClick={() => setSelectedPath(null)}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.05}
              maxZoom={2}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background
                variant={BackgroundVariant.Dots}
                color="#334155"
                gap={22}
                size={1}
              />

              <Controls
                showInteractive={false}
                className="!border-white/10 !bg-[#151c29] [&_button]:!border-white/10 [&_button]:!bg-[#151c29] [&_button]:!fill-slate-300"
              />

              <MiniMap
                nodeColor={(node) =>
                  getNodeColor(node.data as FileNodeData)
                }
                maskColor="rgba(8,11,18,0.75)"
                className="!border-white/10 !bg-[#151c29]"
              />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No matching files found.
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-5 border-t border-white/10 px-4 py-3 text-xs text-slate-400">
          <Legend color="bg-violet-500" label="Regular file" />
          <Legend color="bg-emerald-500" label="Entry-point candidate" />
          <Legend color="bg-amber-500" label="Highly connected" />
          <Legend color="bg-red-500" label="Circular dependency" />

          <span className="flex items-center gap-2">
            <span className="h-0.5 w-5 bg-violet-400" />
            Import direction
          </span>

          <span className="flex items-center gap-2">
            <ZoomIn size={14} />
            Select a node to inspect
          </span>
        </div>
      </div>

      {/* FILE INSPECTOR */}
      {selectedNode && (
        <div className="rounded-2xl border border-violet-500/30 bg-[#111722] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCode2 className="text-violet-400" size={20} />
                <h3 className="font-semibold">File Inspector</h3>
              </div>

              <p className="mt-2 break-all font-mono text-sm text-violet-300">
                {selectedNode.id}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {selectedNode.dependency_count} imports · {selectedNode.dependent_count} dependents
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {cyclePaths.has(selectedNode.id) && (
                  <span className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-400">
                    Circular dependency member
                  </span>
                )}

                {selectedNode.is_entry_point && (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                    Entry-point candidate
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPath(null)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5"
            >
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <RelationshipList
              title="Imports"
              items={imports}
              icon={<ArrowDownRight size={17} />}
              onSelect={setSelectedPath}
            />

            <RelationshipList
              title="Used by"
              items={dependents}
              icon={<ArrowUpRight size={17} />}
              onSelect={setSelectedPath}
            />
          </div>
        </div>
      )}

      {/* MODULE EXPLORER */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
        <div className="mb-5 flex items-center gap-2">
          <Layers className="text-violet-400" size={20} />
          <h3 className="font-semibold">Module Explorer</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <button
              type="button"
              key={module.name}
              onClick={() => {
                setSelectedModule(
                  selectedModule === module.name ? 'all' : module.name
                )
                setSelectedPath(null)
              }}
              className={`rounded-xl border p-4 text-left transition ${
                selectedModule === module.name
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/10 bg-[#0b1019] hover:border-violet-500/40'
              }`}
            >
              <div className="font-semibold text-white">
                {module.name}
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {module.file_count} files
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* CIRCULAR DEPENDENCIES */}
      <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-400" size={20} />
          <h3 className="font-semibold">Circular Dependency Groups</h3>
        </div>

        <p className="mb-4 text-xs text-slate-400">
          Strongly connected groups detected by static analysis.
          A group may contain multiple overlapping cycles.
        </p>

        {cycles.length === 0 ? (
          <p className="text-sm text-slate-400">
            No circular dependency groups were detected.
          </p>
        ) : (
          <div className="space-y-3">
            {cycles.map((cycle, index) => (
              <div
                key={index}
                className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
              >
                <p className="mb-3 text-xs font-semibold text-red-400">
                  Group {index + 1} · {cycle.length} files
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {cycle.map((file) => (
                    <button
                      type="button"
                      key={file}
                      onClick={() => {
                        setSearch('')
                        setSelectedModule('all')
                        setSelectedPath(file)
                      }}
                      className="break-all rounded-md border border-red-500/20 bg-[#080b12] px-2 py-1 font-mono text-xs text-slate-300 hover:border-red-400"
                    >
                      {file}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ARCHITECTURE CONNECTION INSIGHTS */}
      {dependencies.architecture && (
        <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="text-violet-400" size={20} />
            <h3 className="font-semibold">
              Architecture Connection Insights
            </h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#0b1019] p-4">
              <p className="text-xs text-slate-400">Graph density</p>
              <p className="mt-2 text-2xl font-bold">
                {(dependencies.architecture.metrics.graph_density * 100).toFixed(2)}%
              </p>
            </div>

            <div className="rounded-xl bg-[#0b1019] p-4">
              <p className="text-xs text-slate-400">Largest module</p>
              <p className="mt-2 text-lg font-bold">
                {dependencies.architecture.largest_module?.name ?? 'Not available'}
              </p>
              <p className="text-xs text-slate-400">
                {dependencies.architecture.largest_module?.file_count ?? 0} files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ANALYSIS COVERAGE */}
      {coverage && (
        <div className="rounded-xl border border-white/10 bg-[#111722] p-5">
          <h3 className="mb-4 font-semibold">Analysis Coverage</h3>

          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <Coverage label="Discovered" value={coverage.source_files_discovered} />
            <Coverage label="Selected" value={coverage.source_files_selected} />
            <Coverage label="Fetched" value={coverage.source_files_fetched} />
            <Coverage label="Analyzed" value={coverage.source_files_analyzed} />
            <Coverage label="Failed" value={coverage.source_files_failed} />
            <Coverage label="Skipped" value={coverage.source_files_skipped} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs text-slate-400">
              <span>Analyzed / discovered</span>
              <span>{coverage.coverage_percentage.toFixed(2)}%</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width: `${Math.min(100, coverage.coverage_percentage)}%`,
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400">
            Strategy: {coverage.strategy}. Maximum selected files: {coverage.max_source_files}.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {coverage.supported_languages.map((language) => (
              <span
                key={language}
                className="rounded-md bg-violet-500/10 px-3 py-1 text-xs text-violet-300"
              >
                {language}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// --------------------------------------------------
// SMALL UI COMPONENTS
// --------------------------------------------------

function Metric({
  label,
  value,
  icon,
  warning = false,
}: {
  label: string
  value: number
  icon: ReactNode
  warning?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#111722] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={warning ? 'text-amber-400' : 'text-violet-400'}>
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold text-white">
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function Legend({
  color,
  label,
}: {
  color: string
  label: string
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

function RelationshipList({
  title,
  items,
  icon,
  onSelect,
}: {
  title: string
  items: string[]
  icon: ReactNode
  onSelect: (path: string) => void
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1019] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-violet-400">{icon}</span>
        {title}
        <span className="text-xs text-slate-500">({items.length})</span>
      </div>

      {items.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => onSelect(item)}
              className="block w-full break-all rounded-md px-2 py-2 text-left font-mono text-xs text-slate-400 hover:bg-violet-500/10 hover:text-violet-300"
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          No relationships found.
        </p>
      )}
    </div>
  )
}

function Coverage({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">
        {value.toLocaleString()}
      </p>
    </div>
  )
}
