
import { useMemo, useState } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
} from 'lucide-react'

import type { FileItem } from '../types/repository'

interface TreeNode {
  name: string
  path: string
  isDirectory: boolean
  size: number
  children: Map<string, TreeNode>
}

interface FileExplorerProps {
  files: FileItem[]
}

function buildTree(files: FileItem[]): TreeNode {
  const root: TreeNode = {
    name: 'root',
    path: '',
    isDirectory: true,
    size: 0,
    children: new Map(),
  }

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean)
    let current = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath
        ? `${currentPath}/${part}`
        : part

      const isDirectory =
        index < parts.length - 1 || file.type === 'tree'

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: currentPath,
          isDirectory,
          size: isDirectory ? 0 : (file.size ?? 0),
          children: new Map(),
        })
      }

      current = current.children.get(part)!
    })
  }

  return root
}

function TreeItem({
  node,
  depth = 0,
}: {
  node: TreeNode
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 1)

  const isDirectory = node.isDirectory

  return (
    <div>
      <button
        type="button"
        onClick={() => isDirectory && setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-white/5 text-left text-sm"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {isDirectory ? (
          expanded
            ? <ChevronDown size={15} className="text-slate-400 shrink-0"/>
            : <ChevronRight size={15} className="text-slate-400 shrink-0"/>
        ) : (
          <span className="w-[15px] shrink-0" />
        )}

        {isDirectory ? (
          expanded
            ? <FolderOpen size={17} className="text-violet-400 shrink-0"/>
            : <Folder size={17} className="text-violet-400 shrink-0"/>
        ) : (
          <FileCode size={16} className="text-cyan-400 shrink-0"/>
        )}

        <span className="truncate text-slate-300">
          {node.name}
        </span>

        {!isDirectory && (
          <span className="ml-auto text-xs text-slate-500">
            {node.size > 0
              ? `${(node.size / 1024).toFixed(1)} KB`
              : ''}
          </span>
        )}
      </button>

      {isDirectory && expanded && (
        <div>
          {Array.from(node.children.values())
            .sort((a, b) => {
              if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1
              }

              return a.name.localeCompare(b.name)
            })
            .map(child => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  )
}

export default function FileExplorer({
  files,
}: FileExplorerProps) {

  const tree = useMemo(() => buildTree(files), [files])

  return (
    <div className="bg-[#111722] border border-white/10 rounded-2xl p-5">

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Repository explorer
        </h3>

        <span className="text-xs text-slate-400">
          {files.length} entries
        </span>
      </div>

      <div className="max-h-[500px] overflow-y-auto pr-2">

        {Array.from(tree.children.values())
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
              return a.isDirectory ? -1 : 1
            }

            return a.name.localeCompare(b.name)
          })
          .map(node => (
            <TreeItem key={node.path} node={node} />
          ))}

        {files.length === 0 && (
          <p className="text-sm text-slate-400 py-6 text-center">
            No files found.
          </p>
        )}

      </div>
    </div>
  )
}
