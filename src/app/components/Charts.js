'use client';

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = {
  mood: '#818cf8',
  energy: '#f472b6',
  sleepGood: '#34d399',
  sleepOk: '#fbbf24',
  sleepLow: '#f87171',
  low: '#34d399',
  moderate: '#fbbf24',
  high: '#f87171',
  grid: '#1e293b',
  axis: '#64748b',
  tooltipBg: '#0f172a'
};

function prepareChartData(entries) {
  return [...entries].reverse().map((e) => ({
    date: new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    mood: Number(e.mood),
    energy: Number(e.energy),
    sleepHours: Number(e.sleepHours),
    stressLevel: e.analysis?.stressLevel || 'low'
  }));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function MoodEnergyChart({ entries }) {
  const data = prepareChartData(entries);
  return (
    <div className="chart-card">
      <h3 className="chart-title">Mood and energy over time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="date" tick={{ fill: COLORS.axis, fontSize: 12 }} />
          <YAxis domain={[1, 10]} tick={{ fill: COLORS.axis, fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="mood"
            stroke={COLORS.mood}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS.mood }}
            activeDot={{ r: 6 }}
            name="Mood"
          />
          <Line
            type="monotone"
            dataKey="energy"
            stroke={COLORS.energy}
            strokeWidth={2}
            dot={{ r: 4, fill: COLORS.energy }}
            activeDot={{ r: 6 }}
            name="Energy"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function sleepColor(hours) {
  if (hours < 5) return COLORS.sleepLow;
  if (hours < 7) return COLORS.sleepOk;
  return COLORS.sleepGood;
}

export function SleepChart({ entries }) {
  const data = prepareChartData(entries);
  return (
    <div className="chart-card">
      <h3 className="chart-title">Sleep hours</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="date" tick={{ fill: COLORS.axis, fontSize: 12 }} />
          <YAxis domain={[0, 12]} tick={{ fill: COLORS.axis, fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="sleepHours" name="Sleep" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={sleepColor(entry.sleepHours)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StressDonut({ entries }) {
  const counts = { low: 0, moderate: 0, high: 0 };
  entries.forEach((e) => {
    const level = e.analysis?.stressLevel || 'low';
    counts[level] = (counts[level] || 0) + 1;
  });
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (!data.length) return null;

  return (
    <div className="chart-card">
      <h3 className="chart-title">Stress distribution</h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
