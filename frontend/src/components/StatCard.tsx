
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string
  icon: ReactNode
  description: string
}

export default function StatCard({
  title,
  value,
  icon,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-5 hover:border-violet-500/40 transition">

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{title}</p>

        <div className="text-violet-400">
          {icon}
        </div>
      </div>

      <h3 className="text-3xl font-bold text-white mt-4">
        {value}
      </h3>

      <p className="text-xs text-slate-500 mt-2">
        {description}
      </p>

    </div>
  )
}
