
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface LanguageChartProps {
  languages: Record<string, number>
}

const COLORS = [
  '#8B5CF6',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#6366F1',
  '#F97316',
]

export default function LanguageChart({
  languages,
}: LanguageChartProps) {

  const data = Object.entries(languages)
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes)

  if (data.length === 0) {
    return (
      <div className="text-slate-400 text-sm py-10 text-center">
        No language statistics available.
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.bytes, 0)

  return (
    <div className="bg-[#111722] border border-white/10 rounded-2xl p-6">

      <h3 className="text-lg font-semibold text-white">
        Language distribution
      </h3>

      <p className="text-sm text-slate-400 mt-1">
        Based on GitHub-reported source bytes
      </p>

      <div className="h-72 mt-4">

        <ResponsiveContainer width="100%" height="100%">

          <PieChart>

            <Pie
              data={data}
              dataKey="bytes"
              nameKey="name"
              cx="50%"
              cy="48%"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
            >

              {data.map((item, index) => (
                <Cell
                  key={item.name}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}

            </Pie>

            <Tooltip
              formatter={(value) => {
                const bytes = Number(value)
                const percentage = total
                  ? ((bytes / total) * 100).toFixed(1)
                  : '0.0'

                return [`${percentage}%`, 'Share']
              }}
              contentStyle={{
                backgroundColor: '#111722',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#fff',
              }}
            />

            <Legend
              formatter={(value) => (
                <span style={{ color: '#cbd5e1', fontSize: '12px' }}>
                  {value}
                </span>
              )}
            />

          </PieChart>

        </ResponsiveContainer>

      </div>
    </div>
  )
}
