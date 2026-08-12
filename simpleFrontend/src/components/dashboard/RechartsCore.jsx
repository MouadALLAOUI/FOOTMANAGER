import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell, Pie, PieChart } from 'recharts'

const tooltipStyle = {
  background: '#0f172a',
  border: 'none',
  borderRadius: '14px',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 700,
  padding: '8px 12px',
  boxShadow: '0 12px 28px rgba(15,23,42,0.25)',
}

export function AreaTrend({ data, xKey = 'label', series, height = 220 }) {
  return (
    <div dir="ltr" style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            dy={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
            width={32}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1' }} />
          {series.map((s) => (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color || '#22c55e'}
              strokeWidth={2.5}
              fill={s.fill || 'url(#trendFill)'}
              fillOpacity={s.fillOpacity ?? 1}
              dot={{ r: 3, fill: s.color || '#22c55e', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const donutColors = ['#22c55e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6']

export function Donut({ data, height = 200, innerRadius = 58, outerRadius = 80, centerLabel, centerValue }) {
  return (
    <div dir="ltr" style={{ height }} className="relative w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            cornerRadius={6}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={data[i].color || donutColors[i % donutColors.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900">{centerValue}</span>
          <span className="text-[11px] font-bold text-slate-400">{centerLabel}</span>
        </div>
      )}
    </div>
  )
}
